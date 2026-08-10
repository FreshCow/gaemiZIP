package sw.gaemiZIP.repository.stock;

import org.springframework.data.jpa.repository.JpaRepository;
import sw.gaemiZIP.entity.stock.Favorite;

import java.util.List;

public interface FavoriteRepository extends JpaRepository<Favorite, Long> {

    List<Favorite> findAllByMemberIdOrderByCreatedDateDesc(Long memberId);

    boolean existsByMemberIdAndStockCode(Long memberId, String stockCode);

    void deleteByMemberIdAndStockCode(Long memberId, String stockCode);

    void deleteAllByMemberId(Long memberId);

}
