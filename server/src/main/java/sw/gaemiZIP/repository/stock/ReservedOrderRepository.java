package sw.gaemiZIP.repository.stock;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import sw.gaemiZIP.entity.stock.ReservedOrder;
import sw.gaemiZIP.entity.stock.TradeStatus;

import java.util.List;

public interface ReservedOrderRepository extends JpaRepository<ReservedOrder, Long> {

    List<ReservedOrder> findByMember_IdAndStatus(Long memberId, TradeStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from ReservedOrder o where o.stock.code = :stockCode and o.status = :status")
    List<ReservedOrder> findByStockCodeAndStatusForUpdate(@Param("stockCode") String stockCode, @Param("status") TradeStatus status);

    List<ReservedOrder> findAllByStatus(TradeStatus status);

    void deleteAllByMember_Id(Long memberId);
}
