package sw.gaemiZIP.controller.board;

import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import sw.gaemiZIP.dto.board.BoardCreateRequest;
import sw.gaemiZIP.dto.board.BoardDetailResponse;
import sw.gaemiZIP.dto.board.BoardListPageResponse;
import sw.gaemiZIP.dto.board.BoardListResponse;
import sw.gaemiZIP.dto.board.BoardStockShareRequest;
import sw.gaemiZIP.entity.board.Board;
import sw.gaemiZIP.entity.board.BoardLike;
import sw.gaemiZIP.entity.board.BoardStockShare;
import sw.gaemiZIP.entity.board.BoardTag;
import sw.gaemiZIP.entity.member.MemberAnt;
import sw.gaemiZIP.entity.member.Role;
import sw.gaemiZIP.repository.board.*;
import sw.gaemiZIP.exception.InappropriateContentException;
import sw.gaemiZIP.repository.member.MemberAntRepository;
import sw.gaemiZIP.repository.stock.StockRepository;
import sw.gaemiZIP.service.moderation.ModerationService;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/boards")
@RequiredArgsConstructor
public class BoardController {

    private static final int MAX_SHARED_STOCKS = 5;
    private static final int MAX_NOTICES = 5;
    private static final int POPULAR_MIN_LIKES = 15;

    private final BoardRepository boardRepository;
    private final CommentRepository commentRepository;
    private final MemberAntRepository memberAntRepository;
    private final BoardLikeRepository boardLikeRepository;
    private final BoardStockShareRepository boardStockShareRepository;
    private final StockRepository stockRepository;
    private final ModerationService moderationService;

    // 게시글 전체 목록 조회 (최신순)
    @GetMapping
    public ResponseEntity<BoardListPageResponse> getAllBoards(@RequestParam(required = false) BoardTag tag, @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {

        page = Math.max(page, 0);
        size = Math.min(Math.max(size, 1), 100);

        PageRequest pr = PageRequest.of(page, size);

        List<Board> boards = new ArrayList<>();
        Page<Board> result;
        if (tag == null) {
            if (page == 0) boards.addAll(boardRepository.findNotices(PageRequest.of(0, MAX_NOTICES)));
            result = boardRepository.findPage(pr);
        } else {
            result = boardRepository.findPageByTag(tag, pr);
        }
        boards.addAll(result.getContent());

        Map<Long, Long> commentCounts = commentCountsOf(boards);

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

        return ResponseEntity.ok(new BoardListPageResponse(
                response, page, size, result.getTotalPages(), result.getTotalElements()));
    }

    // 게시글 단건 조회
    @GetMapping("/{id}")
    public ResponseEntity<BoardDetailResponse> getBoard(@PathVariable Long id) {
        Board board = boardRepository.findById(id).orElse(null);
        if (board == null) return ResponseEntity.status(404).body(null);
        List<BoardStockShare> shares = boardStockShareRepository.findAllByBoard_Id(id);
        return ResponseEntity.ok(BoardDetailResponse.from(board, shares));
    }


    //최근 N일 이내 + 좋아요 15개 이상인 인기글 가져오기
    @GetMapping("/popular")
    public ResponseEntity<List<BoardListResponse>> getPopularBoards(@RequestParam(defaultValue = "7") int days,
                                                                    @RequestParam(defaultValue = "5") int limit) {
        List<Board> boards = boardRepository.findPopular(
                LocalDateTime.now().minusDays(days), POPULAR_MIN_LIKES, PageRequest.of(0, limit));

        Map<Long, Long> commentCounts = commentCountsOf(boards);

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

        if (boardLikeRepository.existsByMember_IdAndBoard_Id(member.getId(), id)){
            //좋아요 해제
            if(boardLikeRepository.deleteByMember_IdAndBoard_Id(member.getId(), id) != 0) board.setLikeCount(board.getLikeCount() - 1);

        }else{

            //좋아요~
            BoardLike like =  new BoardLike();
            like.setBoard(board);
            like.setMember(member);
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
        board.setMember(member);

        //불적절한 내용 포함확인
        if(moderationService.isInappropriate(request.title() + " " + request.content())){
            throw new InappropriateContentException("부적절한 내용이 포함되어 있습니다.");
        }

        Board saved = boardRepository.save(board);

        List<BoardStockShare> savedShares = List.of();
        if (sharedStocks != null && !sharedStocks.isEmpty()) {
            savedShares = sharedStocks.stream().map(s -> {
                BoardStockShare share = new BoardStockShare();
                share.setBoard(saved);
                share.setStock(stockRepository.getReferenceById(s.stockCode()));
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
    public ResponseEntity<?> updateBoard(@PathVariable Long id, @RequestBody BoardCreateRequest request, Authentication auth) {

        //작성한 게시글
        Board board = boardRepository.findById(id).orElse(null);
        if(board == null) return ResponseEntity.status(404).body("게시글을 찾을 수 없습니다.");

        //id가져오기
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

        boardStockShareRepository.deleteAllByBoard_Id(id);
        List<BoardStockShare> savedShares = List.of();
        if(sharedStocks != null && !sharedStocks.isEmpty()) {
            savedShares = sharedStocks.stream().map(s ->{
                BoardStockShare share = new BoardStockShare();
                share.setBoard(saved);
                share.setStock(stockRepository.getReferenceById(s.stockCode()));
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


    private Map<Long, Long> commentCountsOf(List<Board> boards) {
        if (boards.isEmpty()) return Map.of();
        List<Long> ids = boards.stream().map(Board::getId).toList();
        return commentRepository.countByBoardIdIn(ids).stream()
                .collect(Collectors.toMap(BoardIdCount::getBoardId, BoardIdCount::getCnt));
    }
}
