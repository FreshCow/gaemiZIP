package sw.gaemiZIP.controller.board;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import sw.gaemiZIP.dto.board.BoardDetailResponse;
import sw.gaemiZIP.dto.board.BoardListResponse;
import sw.gaemiZIP.entity.board.Board;
import sw.gaemiZIP.entity.board.BoardLike;
import sw.gaemiZIP.entity.member.MemberAnt;
import sw.gaemiZIP.repository.board.*;
import sw.gaemiZIP.repository.member.MemberAntRepository;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/boards")
@RequiredArgsConstructor
public class BoardController {

    private final BoardRepository boardRepository;
    private final CommentRepository commentRepository;
    private final MemberAntRepository memberAntRepository;
    private final BoardLikeRepository boardLikeRepository;

    // 게시글 전체 목록 조회 (최신순)
    @GetMapping
    public ResponseEntity<List<BoardListResponse>> getAllBoards() {
        List<Board> boards = boardRepository.findAllByIsBlindedFalseOrderByCreatedAtDesc();

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
                        b.isBlinded()
                ))
                .toList();


        return ResponseEntity.ok(response);
    }

    // 게시글 단건 조회
    @GetMapping("/{id}")
    public ResponseEntity<BoardDetailResponse> getBoard(@PathVariable Long id) {
        Board board = boardRepository.findById(id).orElse(null);
        if (board == null) return ResponseEntity.status(404).body(null);
        return ResponseEntity.ok(BoardDetailResponse.from(board));
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
            //좋아요  해제
            boardLikeRepository.deleteByMemberIdAndBoardId(member.getId(), id);
            board.setLikeCount(board.getLikeCount() - 1);
        }else{
            BoardLike like =  new BoardLike();
            like.setBoardId(id);
            like.setMemberId(member.getId());
            boardLikeRepository.save(like);
            board.setLikeCount(board.getLikeCount() + 1);
        }

        return ResponseEntity.ok(boardRepository.save(board));
    }

    // 게시글 작성
    @PostMapping
    public ResponseEntity<Board> createBoard(@RequestBody Board board, Authentication auth) {
        MemberAnt member = memberAntRepository.findByUsernameOrEmail(auth.getName(), auth.getName())
                .orElseThrow(() -> new IllegalStateException("회원을 찾을 수 없습니다."));
        board.setAuthor(member.getNickname()); // 클라이언트가 보낸 author는 무시하고 서버가 덮어씀
        return ResponseEntity.ok(boardRepository.save(board));
    }

    // 게시글 삭제: 익명 작성글은 비밀번호 검증 후 삭제
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteBoard(@PathVariable Long id, Authentication auth) {
        Board board = boardRepository.findById(id).orElse(null);
        if (board == null) return ResponseEntity.status(404).body("게시글을 찾을 수 없습니다.");

        MemberAnt member = memberAntRepository.findByUsernameOrEmail(auth.getName(), auth.getName())
                .orElseThrow(() -> new IllegalStateException("회원을 찾을 수 없습니다."));

        if (!board.getAuthor().equals(member.getNickname())) {
            return ResponseEntity.status(403).body("본인이 작성한 글만 삭제할 수 있습니다.");
        }

        boardRepository.deleteById(id);
        return ResponseEntity.ok("삭제 완료");
    }
}
