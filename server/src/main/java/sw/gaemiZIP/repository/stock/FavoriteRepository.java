package sw.gaemiZIP.repository.stock;

import org.springframework.data.jpa.repository.JpaRepository;
import sw.gaemiZIP.entity.stock.Favorite;

import java.util.List;

public interface FavoriteRepository extends JpaRepository<Favorite, Long> {

    List<Favorite> findAllByMember_IdOrderByCreatedDateDesc(Long memberId);

    boolean existsByMember_IdAndStock_Code(Long memberId, String stockCode);

    void deleteByMember_IdAndStock_Code(Long memberId, String stockCode);

    void deleteAllByMember_Id(Long memberId);

}
