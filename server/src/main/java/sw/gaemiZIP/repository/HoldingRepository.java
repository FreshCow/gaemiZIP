package sw.gaemiZIP.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import sw.gaemiZIP.entity.Holding;

import java.util.List;
import java.util.Optional;

public interface HoldingRepository extends JpaRepository<Holding, Long> {

    List<Holding> findAllByMemberId(Long memberId);

    Optional<Holding> findByMemberIdAndStockCode(Long memberId, String stockCode);

    void deleteAllByMemberId(Long memberId);
}
