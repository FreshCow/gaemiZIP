package sw.gaemiZIP.repository.stock;

import org.springframework.data.jpa.repository.JpaRepository;
import sw.gaemiZIP.entity.stock.Holding;

import java.util.List;
import java.util.Optional;

public interface HoldingRepository extends JpaRepository<Holding, Long> {

    List<Holding> findAllByMember_Id(Long memberId);

    Optional<Holding> findByMember_IdAndStock_Code(Long memberId, String stockCode);

    void deleteAllByMember_Id(Long memberId);
}
