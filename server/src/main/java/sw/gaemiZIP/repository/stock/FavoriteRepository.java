package sw.gaemiZIP.repository.stock;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import sw.gaemiZIP.entity.stock.Favorite;

import java.time.LocalDateTime;
import java.util.List;

public interface FavoriteRepository extends JpaRepository<Favorite, Long> {

    List<Favorite> findAllByMember_IdOrderByCreatedDateDesc(Long memberId);

    boolean existsByMember_IdAndStock_Code(Long memberId, String stockCode);

    long countByStock_Code(String stockCode);

    @Modifying
    @Query(value = """
            INSERT INTO favorite (member_id, stock_code, stock_name, created_date, modified_date)
            VALUES (:memberId, :stockCode, :stockName, :now, :now)
            ON CONFLICT (member_id, stock_code) DO NOTHING
            """, nativeQuery = true)
    int insertIfAbsent(@Param("memberId") Long memberId,
                       @Param("stockCode") String stockCode,
                       @Param("stockName") String stockName,
                       @Param("now") LocalDateTime now);

    void deleteByMember_IdAndStock_Code(Long memberId, String stockCode);

    void deleteAllByMember_Id(Long memberId);

}
