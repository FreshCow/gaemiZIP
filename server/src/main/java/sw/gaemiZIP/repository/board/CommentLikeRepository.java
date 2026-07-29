package sw.gaemiZIP.repository.board;

import org.springframework.data.jpa.repository.JpaRepository;
import sw.gaemiZIP.entity.board.CommentLike;

public interface CommentLikeRepository extends JpaRepository<CommentLike, Long> {

    //중복확인
    boolean existsByMemberIdAndCommentId(Long memberId, Long commentId);

    //좋아요 취소
    long deleteByMemberIdAndCommentId(Long memberId, Long commentId);
}
