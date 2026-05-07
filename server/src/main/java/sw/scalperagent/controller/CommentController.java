package sw.scalperagent.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import sw.scalperagent.dto.CommentRequest;
import sw.scalperagent.entity.Comment;
import sw.scalperagent.repository.CommentRepository;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class CommentController {

    private final CommentRepository commentRepository;

    // 댓글 목록 조회 (작성 시간 오름차순)
    @GetMapping("/api/boards/{boardId}/comments")
    public ResponseEntity<List<Comment>> getComments(@PathVariable Long boardId) {
        List<Comment> comments = commentRepository.findAllByBoardIdOrderByCreatedAtAsc(boardId);
        return ResponseEntity.ok(comments);
    }

    // 댓글 / 대댓글 작성
    @PostMapping("/api/boards/{boardId}/comments")
    public ResponseEntity<Comment> createComment(
            @PathVariable Long boardId,
            @RequestBody CommentRequest request) {

        Comment comment = new Comment();
        comment.setBoardId(boardId);
        comment.setAuthor(request.getAuthor());
        comment.setContent(request.getContent());
        comment.setParentCommentId(request.getParentCommentId()); // null이면 일반 댓글

        Comment saved = commentRepository.save(comment);
        return ResponseEntity.ok(saved);
    }

    // 댓글 좋아요
    @PostMapping("/api/comments/{id}/like")
    public ResponseEntity<Comment> likeComment(@PathVariable Long id) {
        Comment comment = commentRepository.findById(id).orElse(null);
        if (comment == null) return ResponseEntity.status(404).body(null);

        comment.setLikeCount(comment.getLikeCount() + 1);
        return ResponseEntity.ok(commentRepository.save(comment));
    }

    // 댓글 싫어요
    @PostMapping("/api/comments/{id}/dislike")
    public ResponseEntity<Comment> dislikeComment(@PathVariable Long id) {
        Comment comment = commentRepository.findById(id).orElse(null);
        if (comment == null) return ResponseEntity.status(404).body(null);

        comment.setDislikeCount(comment.getDislikeCount() + 1);
        return ResponseEntity.ok(commentRepository.save(comment));
    }
}
