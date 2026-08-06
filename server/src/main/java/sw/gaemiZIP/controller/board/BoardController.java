package sw.gaemiZIP.controller.board;

import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import sw.gaemiZIP.dto.board.BoardCreateRequest;
import sw.gaemiZIP.dto.board.BoardDetailResponse;
import sw.gaemiZIP.dto.board.BoardListResponse;
import sw.gaemiZIP.dto.board.BoardStockShareRequest;
import sw.gaemiZIP.entity.board.Board;
import sw.gaemiZIP.entity.board.BoardLike;
import sw.gaemiZIP.entity.board.BoardStockShare;
import sw.gaemiZIP.entity.board.BoardTag;
import sw.gaemiZIP.entity.member.MemberAnt;
import sw.gaemiZIP.entity.member.Role;
import sw.gaemiZIP.repository.board.*;
import sw.gaemiZIP.repository.member.MemberAntRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/boards")
@RequiredArgsConstructor
public class BoardController {

    private static final int MAX_SHARED_STOCKS = 5;
    private static final int POPULAR_MIN_LIKES = 15;

    private final BoardRepository boardRepository;
    private final CommentRepository commentRepository;
    private final MemberAntRepository memberAntRepository;
    private final BoardLikeRepository boardLikeRepository;
    private final BoardStockShareRepository boardStockShareRepository;

    // 게시글 전체 목록 조회 (최신순)
    @GetMapping
    public ResponseEntity<List<BoardListResponse>> getAllBoards(@RequestParam(required = false) BoardTag tag) {
        List<Board> boards = boardRepository.findAllForList(tag);

        Map<Long, Long> commentCounts = commentRepository.countByBoardIdGroup().stream()
                .collect(Collectors.toMap(BoardIdCount::getBoardId, BoardIdCount::getCnt));

        List<BoardListResponse> response = boards.stream()
                .map(b -> new BoardListResponse(
                        b.getId(),
                        b.getTitle(),
                        b.getAuthor(),
                        b.getLikeCount(),
                        commentCounts.getOrDefault(b.getId(), 0L),
                        b.getCreatedAt(),
                        b.getStockCode(),
                        b.getStockName(),
                        b.isBlinded(),
                        b.getTag()
                ))
                .toList();

        return ResponseEntity.ok(response);
    }

    // 게시글 단건 조회
    @GetMapping("/{id}")
    public ResponseEntity<BoardDetailResponse> getBoard(@PathVariable Long id) {
        Board board = boardRepository.findById(id).orElse(null);
        if (board == null) return ResponseEntity.status(404).body(null);
        List<BoardStockShare> shares = boardStockShareRepository.findAllByBoardId(id);
        return ResponseEntity.ok(BoardDetailResponse.from(board, shares));
    }


    //최근 N일 이내 + 좋아요 15개 이상인 인기글 가져오기
    @GetMapping("/popular")
    public ResponseEntity<List<BoardListResponse>> getPopularBoards(@RequestParam(defaultValue = "7") int days,
                                                                    @RequestParam(defaultValue = "5") int limit) {
        List<Board> boards = boardRepository.findPopular(
                LocalDateTime.now().minusDays(days), POPULAR_MIN_LIKES, PageRequest.of(0, limit));

        Map<Long, Long> commentCounts = commentRepository.countByBoardIdGroup().stream()
                .collect(Collectors.toMap(BoardIdCount::getBoardId, BoardIdCount::getCnt));

        List<BoardListResponse> response = boards.stream()
                .map(b -> new BoardListResponse(
                        b.getId(),
                        b.getTitle(),
                        b.getAuthor(),
                        b.getLikeCount(),
                        commentCounts.getOrDefault(b.getId(), 0L),
                        b.getCreatedAt(),
                        b.getStockCode(),
                        b.getStockName(),
                        b.isBlinded(),
                        b.getTag()
                ))
                .toList();

        return ResponseEntity.ok(response);
    }


    // 게시글 추천
    @Transactional
    @PostMapping("/{id}/like")
    public ResponseEntity<Board> likeBoard(@PathVariable Long id, Authentication auth) {
        Board board = boardRepository.findById(id).orElse(null);
        if (board == null) return ResponseEntity.status(404).body(null);

        MemberAnt member = memberAntRepository.findByUsernameOrEmail(auth.getName(), auth.getName())
                .orElseThrow(() -> new IllegalStateException("회원을 찾을 수 없습니다."));

        if (boardLikeRepository.existsByMemberIdAndBoardId(member.getId(), id)){
            //좋아요 해제
            if(boardLikeRepository.deleteByMemberIdAndBoardId(member.getId(), id) != 0) board.setLikeCount(board.getLikeCount() - 1);

        }else{

            //좋아요~
            BoardLike like =  new BoardLike();
            like.setBoardId(id);
            like.setMemberId(member.getId());
            try{
                boardLikeRepository.save(like);
                board.setLikeCount(board.getLikeCount() + 1);
            }catch (DataIntegrityViolationException e){
                return ResponseEntity.status(409).body(null);
            }
        }

        return ResponseEntity.ok(boardRepository.save(board));
    }

    // 게시글 작성
    @Transactional
    @PostMapping
    public ResponseEntity<?> createBoard(@RequestBody BoardCreateRequest request, Authentication auth) {

        MemberAnt member = memberAntRepository.findByUsernameOrEmail(auth.getName(), auth.getName())
                .orElseThrow(() -> new IllegalStateException("회원을 찾을 수 없습니다."));

        //공지사항 작성 권한 확인
        if (request.tag() == BoardTag.NOTICE && member.getRole() != Role.ADMIN) {
            return ResponseEntity.status(403).body("공지사항은 관리자만 작성할 수 있습니다.");
        }

        List<BoardStockShareRequest> sharedStocks = request.sharedStocks();
        if (sharedStocks != null && sharedStocks.size() > MAX_SHARED_STOCKS) {
            return ResponseEntity.status(400).body("공유 종목은 최대 " + MAX_SHARED_STOCKS + "개까지 선택할 수 있습니다.");
        }

        Board board = new Board();
        board.setTitle(request.title());
        board.setContent(request.content());
        board.setTag(request.tag() != null ? request.tag() : BoardTag.DAILY);
        board.setAuthor(member.getNickname()); // 클라이언트가 보낸 author는 무시하고 서버가 덮어씀
        board.setMemberId(member.getId());
        Board saved = boardRepository.save(board);

        List<BoardStockShare> savedShares = List.of();
        if (sharedStocks != null && !sharedStocks.isEmpty()) {
            savedShares = sharedStocks.stream().map(s -> {
                BoardStockShare share = new BoardStockShare();
                share.setBoardId(saved.getId());
                share.setStockCode(s.stockCode());
                share.setStockName(s.stockName());
                share.setQuantity(s.quantity());
                share.setAvgPrice(s.avgPrice());
                share.setPriceAtShare(s.priceAtShare());
                share.setProfitLossAmount(s.profitLossAmount());
                share.setProfitLossRate(s.profitLossRate());
                return boardStockShareRepository.save(share);
            }).toList();
        }

        return ResponseEntity.ok(BoardDetailResponse.from(saved, savedShares));
    }


    // 게시글 삭제: 익명 작성글은 비밀번호 검증 후 삭제
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteBoard(@PathVariable Long id, Authentication auth) {
        Board board = boardRepository.findById(id).orElse(null);
        if (board == null) return ResponseEntity.status(404).body("게시글을 찾을 수 없습니다.");

        MemberAnt member = memberAntRepository.findByUsernameOrEmail(auth.getName(), auth.getName())
                .orElseThrow(() -> new IllegalStateException("회원을 찾을 수 없습니다."));

        if (board.getMemberId() != null && board.getMemberId().equals(member.getId())) {
            boardRepository.deleteById(id);
            return ResponseEntity.ok("삭제 완료");
        }else{
            return ResponseEntity.status(403).body("본인이 작성한 글만 삭제할 수 있습니다.");
        }
    }


    //게시글 수정
    @Transactional
    @PutMapping("/{id}")
    public ResponseEntity<?> udateBoard(@PathVariable Long id, @RequestBody BoardCreateRequest request, Authentication auth) {

        //작성한 게시글 찾기
        Board board = boardRepository.findById(id).orElse(null);
        if(board == null) return ResponseEntity.status(404).body("게시글을 찾을 수 없습니다.");

        MemberAnt member = memberAntRepository.findByUsernameOrEmail(auth.getName(), auth.getName())
                .orElseThrow(() -> new IllegalStateException("회원을 찾을 수 없습니다."));

        if(board.getMemberId() == null || !board.getMemberId().equals(member.getId())) {
            return ResponseEntity.status(403).body("본인이 작성한 글만 수정할 수 있습니다.");
        }

        if(request.tag() == BoardTag.NOTICE && member.getRole() != Role.ADMIN) {
            return ResponseEntity.status(403).body("공지사항은 관리자만 작성할 수 있습니다.");
        }

        List<BoardStockShareRequest> sharedStocks = request.sharedStocks();
        if(sharedStocks != null && sharedStocks.size() > MAX_SHARED_STOCKS) {
            return ResponseEntity.status(400).body("공유 종목은 최대 " + MAX_SHARED_STOCKS + "개까지 선택할 수 있습니다. ");
        }

        board.setTitle(request.title());
        board.setContent(request.content());
        board.setTag(request.tag() != null ? request.tag() : BoardTag.DAILY);
        Board saved = boardRepository.save(board);

        boardStockShareRepository.deleteAllByBoardId(id);
        List<BoardStockShare> savedShares = List.of();
        if(sharedStocks != null && !sharedStocks.isEmpty()) {
            savedShares = sharedStocks.stream().map(s ->{
                BoardStockShare share = new BoardStockShare();
                share.setBoardId(id);
                share.setStockCode(s.stockCode());
                share.setStockName(s.stockName());
                share.setQuantity(s.quantity());
                share.setAvgPrice(s.avgPrice());
                share.setPriceAtShare(s.priceAtShare());
                share.setProfitLossAmount(s.profitLossAmount());
                share.setProfitLossRate(s.profitLossRate());
                return boardStockShareRepository.save(share);
            }).toList();
        }

        return ResponseEntity.ok(BoardDetailResponse.from(saved, savedShares));
    }
}
