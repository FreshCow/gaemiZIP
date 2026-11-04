package sw.gaemiZIP.repository.board;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Page;
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

    // 공지는 소량이라 별도 조회 (상한은 Pageable로)
    @Query("select b from Board b where b.isBlinded = false and b.tag = 'NOTICE' order by b.createdAt desc")
    List<Board> findNotices(Pageable pageable);

    // 전체(공지 제외) — 번호 페이지네이션용 count 쿼리 명시(id 기준)
    @Query(value = "select b from Board b where b.isBlinded = false and b.tag <> 'NOTICE' order by b.createdAt desc",
           countQuery = "select count(b.id) from Board b where b.isBlinded = false and b.tag <> 'NOTICE'")
    Page<Board> findPage(Pageable pageable);

    // 태그별
    @Query(value = "select b from Board b where b.isBlinded = false and b.tag = :tag order by b.createdAt desc",
           countQuery = "select count(b.id) from Board b where b.isBlinded = false and b.tag = :tag")
    Page<Board> findPageByTag(@Param("tag") BoardTag tag, Pageable pageable);

}
