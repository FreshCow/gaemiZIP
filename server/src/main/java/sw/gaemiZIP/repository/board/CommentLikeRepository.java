package sw.gaemiZIP.repository.board;

import org.springframework.data.jpa.repository.JpaRepository;
import sw.gaemiZIP.entity.board.CommentLike;

public interface CommentLikeRepository extends JpaRepository<CommentLike, Long> {

    //중복확인
    boolean existsByMember_IdAndComment_Id(Long memberId, Long commentId);

    //좋아요 취소
    long deleteByMember_IdAndComment_Id(Long memberId, Long commentId);

    //전체삭제
    void deleteAllByMember_Id(Long memberId);
}
