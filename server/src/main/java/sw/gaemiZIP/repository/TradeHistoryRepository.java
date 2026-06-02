package sw.gaemiZIP.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import sw.gaemiZIP.entity.TradeHistory;
import java.util.List;

public interface TradeHistoryRepository extends JpaRepository<TradeHistory, Long> {
    List<TradeHistory> findAllByOrderByTradeTimeDesc();
    List<TradeHistory> findByMemberIdOrderByTradeTimeDesc(Long memberId);
}

