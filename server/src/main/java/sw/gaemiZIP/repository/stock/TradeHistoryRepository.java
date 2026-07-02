package sw.gaemiZIP.repository.stock;

import org.springframework.data.jpa.repository.JpaRepository;
import sw.gaemiZIP.entity.stock.TradeHistory;
import java.util.List;

public interface TradeHistoryRepository extends JpaRepository<TradeHistory, Long> {
    List<TradeHistory> findAllByOrderByTradeTimeDesc();
    List<TradeHistory> findByMemberIdOrderByTradeTimeDesc(Long memberId);
    void deleteAllByMemberId(Long memberId);
}

