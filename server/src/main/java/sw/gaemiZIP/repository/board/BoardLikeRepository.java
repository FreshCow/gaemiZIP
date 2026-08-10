package sw.gaemiZIP.repository.board;

import org.springframework.data.jpa.repository.JpaRepository;
import sw.gaemiZIP.entity.board.BoardLike;

public interface BoardLikeRepository extends JpaRepository<BoardLike, Long> {

    // 중복확인
    boolean existsByMemberIdAndBoardId(Long memberId, Long boardId);

    //개별 삭제
    long deleteByMemberIdAndBoardId(Long memberId, Long boardId);

    //전체 삭제
    void deleteAllByMemberId(Long memberId);
}
