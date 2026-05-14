package sw.gaemiZIP.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import sw.gaemiZIP.entity.Board;
import sw.gaemiZIP.repository.BoardRepository;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/boards")
@RequiredArgsConstructor
public class BoardController {

    private final BoardRepository boardRepository;

    // 게시글 전체 목록 조회 (최신순)
    @GetMapping
    public ResponseEntity<List<Board>> getAllBoards() {
        return ResponseEntity.ok(boardRepository.findAllByOrderByCreatedAtDesc());
    }

    // 게시글 단건 조회
    @GetMapping("/{id}")
    public ResponseEntity<Board> getBoard(@PathVariable Long id) {
        Board board = boardRepository.findById(id).orElse(null);
        if (board == null) return ResponseEntity.status(404).body(null);
        return ResponseEntity.ok(board);
    }

    // 게시글 추천
    @PostMapping("/{id}/like")
    public ResponseEntity<Board> likeBoard(@PathVariable Long id) {
        Board board = boardRepository.findById(id).orElse(null);
        if (board == null) return ResponseEntity.status(404).body(null);
        board.setLikeCount(board.getLikeCount() + 1);
        return ResponseEntity.ok(boardRepository.save(board));
    }

    // 게시글 작성
    @PostMapping
    public ResponseEntity<Board> createBoard(@RequestBody Board board) {
        return ResponseEntity.ok(boardRepository.save(board));
    }

    // 게시글 삭제: 익명 작성글은 비밀번호 검증 후 삭제
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteBoard(
            @PathVariable Long id,
            @RequestParam(value = "password", required = false, defaultValue = "") String password) {

        log.info("게시글 삭제 요청: id={}", id);

        Board board = boardRepository.findById(id).orElse(null);
        if (board == null) return ResponseEntity.status(404).body("게시글을 찾을 수 없습니다.");

        // 익명 작성자인 경우에만 비밀번호 검증
        if ("익명".equals(board.getAuthor())) {
            if (board.getPassword() == null || !board.getPassword().equals(password)) {
                log.warn("게시글 삭제 비밀번호 불일치: id={}", id);
                return ResponseEntity.status(403).body("비밀번호가 일치하지 않습니다.");
            }
        }

        boardRepository.deleteById(id);
        log.info("게시글 삭제 완료: id={}", id);
        return ResponseEntity.ok("삭제 완료");
    }
}
