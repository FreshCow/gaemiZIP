package sw.gaemiZIP.controller.board;

import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import sw.gaemiZIP.dto.board.CommentRequest;
import sw.gaemiZIP.entity.board.Comment;
import sw.gaemiZIP.entity.board.CommentLike;
import sw.gaemiZIP.entity.member.MemberAnt;
import sw.gaemiZIP.exception.InappropriateContentException;
import sw.gaemiZIP.repository.board.CommentLikeRepository;
import sw.gaemiZIP.repository.board.CommentRepository;
import sw.gaemiZIP.repository.member.MemberAntRepository;
import sw.gaemiZIP.service.moderation.ModerationService;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class CommentController {

    private final CommentRepository commentRepository;
    private final CommentLikeRepository commentLikeRepository;
    private final MemberAntRepository memberAntRepository;
    private final ModerationService moderationService;

    // 댓글 목록 조회 (작성 시간 오름차순)
    @GetMapping("/api/boards/{boardId}/comments")
    public ResponseEntity<List<Comment>> getComments(@PathVariable Long boardId) {
        List<Comment> comments = commentRepository.findAllByBoardIdAndIsBlindedFalseOrderByCreatedAtAsc(boardId);
        return ResponseEntity.ok(comments);
    }

    // 댓글 / 대댓글 작성
    @PostMapping("/api/boards/{boardId}/comments")
    public ResponseEntity<Comment> createComment(
            @PathVariable Long boardId,
            @RequestBody CommentRequest request,
            Authentication auth) {

        MemberAnt member = memberAntRepository.findByUsernameOrEmail(auth.getName(), auth.getName())
                .orElseThrow(() -> new IllegalStateException("회원을 찾을 수 없습니다."));

        Comment comment = new Comment();
        comment.setBoardId(boardId);
        comment.setAuthor(member.getNickname());
        comment.setContent(request.getContent());
        comment.setParentCommentId(request.getParentCommentId()); // null이면 일반 댓글

        //불적절한 내용 포함확인
        if(moderationService.isInappropriate(comment.getContent())){
            throw new InappropriateContentException("부적절한 내용이 포함되어 있습니다.");
        }

        Comment saved = commentRepository.save(comment);
        return ResponseEntity.ok(saved);
    }

    // 댓글 좋아요
    @Transactional
    @PostMapping("/api/comments/{id}/like")
    public ResponseEntity<Comment> likeComment(@PathVariable Long id, Authentication auth) {
        Comment comment = commentRepository.findById(id).orElse(null);
        if (comment == null) return ResponseEntity.status(404).body(null);

        MemberAnt member = memberAntRepository.findByUsernameOrEmail(auth.getName(), auth.getName())
                .orElseThrow(() -> new IllegalStateException("회원을 찾을 수 없습니다."));

        if(commentLikeRepository.existsByMemberIdAndCommentId(member.getId(), id)) {
            //좋아요 해제
            if(commentLikeRepository.deleteByMemberIdAndCommentId(member.getId(), id) != 0) comment.setLikeCount(comment.getLikeCount() - 1);

        }else{
            CommentLike commentLike = new CommentLike();
            commentLike.setCommentId(id);
            commentLike.setMemberId(member.getId());

            try{
                commentLikeRepository.save(commentLike);
                comment.setLikeCount(comment.getLikeCount() + 1);
            }catch (DataIntegrityViolationException e){
                return ResponseEntity.status(409).body(null);
            }
        }

        return ResponseEntity.ok(commentRepository.save(comment));
    }
}
