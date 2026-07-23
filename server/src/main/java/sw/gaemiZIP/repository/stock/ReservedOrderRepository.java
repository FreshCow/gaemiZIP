package sw.gaemiZIP.repository.stock;

import org.springframework.data.jpa.repository.JpaRepository;
import sw.gaemiZIP.entity.stock.ReservedOrder;
import sw.gaemiZIP.entity.stock.TradeStatus;

import java.util.List;

public interface ReservedOrderRepository extends JpaRepository<ReservedOrder, Long> {

    List<ReservedOrder> findByMemberIdAndStatus(Long memberId, TradeStatus status);

    List<ReservedOrder> findByStockCodeAndStatus(String stockCode, TradeStatus status);
}
