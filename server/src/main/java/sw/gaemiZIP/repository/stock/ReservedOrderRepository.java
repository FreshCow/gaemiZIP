package sw.gaemiZIP.repository.stock;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import sw.gaemiZIP.entity.stock.ReservedOrder;
import sw.gaemiZIP.entity.stock.TradeStatus;

import java.util.List;
import java.util.Optional;

public interface ReservedOrderRepository extends JpaRepository<ReservedOrder, Long> {

    List<ReservedOrder> findByMember_IdAndStatus(Long memberId, TradeStatus status);

    //비관적 락
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from ReservedOrder o where o.stock.code = :stockCode and o.status = :status order by o.id")
    List<ReservedOrder> findByStockCodeAndStatusForUpdate(@Param("stockCode") String stockCode, @Param("status") TradeStatus status);

    //예약 취소용 - 주문행 먼저 잠그고 상태 다시확인
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from ReservedOrder o where o.id = :id")
    Optional<ReservedOrder> findByIdForUpdate(@Param("id") Long id);

    //장마감 일괄 취소용
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from ReservedOrder o where o.status = :status order by o.id")
    List<ReservedOrder> findAllByStatusForUpdate(@Param("status") TradeStatus status);

    List<ReservedOrder> findAllByStatus(TradeStatus status);

    void deleteAllByMember_Id(Long memberId);
}
