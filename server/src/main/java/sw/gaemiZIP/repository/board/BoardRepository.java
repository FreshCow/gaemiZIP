package sw.gaemiZIP.repository.board;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import sw.gaemiZIP.entity.board.Board;
import sw.gaemiZIP.entity.board.BoardTag;

import java.time.LocalDateTime;
import java.util.List;

public interface BoardRepository extends JpaRepository<Board, Long> {
    //최신 작성일 기준으로 내림차순 정렬
    List<Board> findAllByOrderByCreatedAtDesc();

    List<Board> findAllByIsBlindedFalseOrderByCreatedAtDesc();

    @Query("select b from Board b where b.isBlinded = false and (:tag IS null or b.tag = :tag) order by case when b.tag = 'NOTICE' then 0 else 1 end, b.createdAt desc")
    List<Board>findAllForList(@Param("tag") BoardTag tag);

    @Query("select b from Board b where b.isBlinded = false and b.createdAt >= :since and b.likeCount >= :minLikes order by b.likeCount DESC")
    List<Board> findPopular(@Param("since") LocalDateTime since, @Param("minLikes") int minLikes, Pageable pageable);

}
