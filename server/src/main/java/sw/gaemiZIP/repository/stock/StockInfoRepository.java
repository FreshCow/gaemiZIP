package sw.gaemiZIP.repository.stock;

import org.springframework.data.jpa.repository.JpaRepository;
import sw.gaemiZIP.entity.stock.StockInfo;

import java.util.Optional;

public interface StockInfoRepository extends JpaRepository<StockInfo, Long> {

    Optional<StockInfo> findByStock_Code(String code);
}
