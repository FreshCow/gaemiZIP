package sw.scalperagent.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import sw.scalperagent.entity.TradeHistory;
import java.util.List;

public interface TradeHistoryRepository extends JpaRepository<TradeHistory, Long> {
    List<TradeHistory> findAllByOrderByTradeTimeDesc();
}

