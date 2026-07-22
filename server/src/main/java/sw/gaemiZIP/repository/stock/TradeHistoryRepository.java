package sw.gaemiZIP.repository.stock;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import sw.gaemiZIP.entity.stock.TradeHistory;
import java.util.List;

public interface TradeHistoryRepository extends JpaRepository<TradeHistory, Long> {

    List<TradeHistory> findAllByOrderByTradeTimeDesc();

    List<TradeHistory> findByMemberIdOrderByTradeTimeDesc(Long memberId);

    Page<TradeHistory> findByMemberIdOrderByTradeTimeDesc(Long memberId, Pageable pageable);

    void deleteAllByMemberId(Long memberId);
}

