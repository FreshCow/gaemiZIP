package sw.gaemiZIP.repository.board;

import org.springframework.data.jpa.repository.JpaRepository;
import sw.gaemiZIP.entity.board.BoardLike;

public interface BoardLikeRepository extends JpaRepository<BoardLike, Long> {

    // 중복확인
    boolean existsByMember_IdAndBoard_Id(Long memberId, Long boardId);

    //개별 삭제
    long deleteByMember_IdAndBoard_Id(Long memberId, Long boardId);

    //전체 삭제
    void deleteAllByMember_Id(Long memberId);
}
