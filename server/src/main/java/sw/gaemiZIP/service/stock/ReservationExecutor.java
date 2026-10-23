package sw.gaemiZIP.service.stock;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import sw.gaemiZIP.entity.member.MemberAnt;
import sw.gaemiZIP.entity.stock.*;
import sw.gaemiZIP.repository.member.MemberAntRepository;
import sw.gaemiZIP.repository.stock.HoldingRepository;
import sw.gaemiZIP.repository.stock.ReservedOrderRepository;
import sw.gaemiZIP.repository.stock.TradeHistoryRepository;
import sw.gaemiZIP.service.notification.NotificationService;

@Service
@RequiredArgsConstructor
public class ReservationExecutor {

    private final MemberAntRepository memberAntRepository;
    private final HoldingRepository holdingRepository;
    private final ReservedOrderRepository reservedOrderRepository;
    private final TradeHistoryRepository tradeHistoryRepository;
    private final NotificationService notificationService;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void executeOne(Long orderId, long currentPrice) {

        //주문 -> 회원 락
        ReservedOrder order = reservedOrderRepository.findByIdForUpdate(orderId).orElse(null);
        if (order == null || order.getStatus() != TradeStatus.PENDING || !isPriceMatched(order, currentPrice)) {
            return; // 그 사이 체결·취소됐거나 가격 조건에서 벗어남
        }

        MemberAnt member = memberAntRepository.findByIdForUpdate(order.getMemberId()).orElseThrow(() -> new IllegalStateException("회원을 찾을 수 없습니다."));

        long amount = order.getTargetPrice() * order.getQuantity();

        //매수
        if (order.getTradeType() == TradeType.BUY) {

            member.updateBalance(-amount);
            member.unlockBalance(amount);

            Holding holding = holdingRepository
                    .findByMember_IdAndStock_Code(member.getId(), order.getStockCode())
                    .orElse(Holding.builder()
                            .member(member)
                            .stock(order.getStock())
                            .stockName(order.getStockName())
                            .quantity(0)
                            .avgPrice(0L)
                            .build());

            holding.addPurchase(order.getQuantity(), order.getTargetPrice());
            holdingRepository.save(holding);

            saveHistory(member, order, "BUY", null);

        } else { //매도
            Holding holding = holdingRepository
                    .findByMember_IdAndStock_Code(member.getId(), order.getStockCode())
                    .orElseThrow(() -> new IllegalStateException("보유 종목 정보를 찾을 수 없습니다."));

            double profitRate = ((double) order.getTargetPrice() - holding.getAvgPrice()) / holding.getAvgPrice() * 100.0;

            member.updateBalance(amount);
            holding.sell(order.getQuantity());
            holding.unlock(order.getQuantity());

            if (holding.getQuantity() == 0) {
                holdingRepository.delete(holding);
            }

            saveHistory(member, order, "SELL", profitRate);
        }

        order.excute();

        String tradeLabel = order.getTradeType() == TradeType.BUY ? "매수" : "매도";

        notificationService.notify(member, order.getStock(),String.format("%s %s %d주가 %,d원에 체결되었습니다.", order.getStockName(), tradeLabel, order.getQuantity(), order.getTargetPrice()));

    }

    //REQUIRES_NEW가 선언된 메서드는 새로운 트랜잭션에서 실행된다. 이전에 실행중이던 부모 트랜잭션이 있다면 그 트랜잭션은 잠시 중단하고 새로운 자식 트랜잭션을 실행시킴
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void cancelOne(Long orderId) {
        ReservedOrder order = reservedOrderRepository.findByIdForUpdate(orderId).orElse(null);
        if (order == null || order.getStatus() != TradeStatus.PENDING) {
            return;
        }
        MemberAnt member = memberAntRepository.findByIdForUpdate(order.getMemberId()).orElseThrow(() -> new IllegalStateException("회원을 찾을 수 없습니다."));

        releaseLock(member, order);
        order.cancel();

        notificationService.notify(member, order.getStock(),String.format("장 마감으로 %s 예약 주문이 취소되었습니다.", order.getStockName()));
    }

    public void releaseLock(MemberAnt member, ReservedOrder order) {
        if (order.getTradeType() == TradeType.BUY) {
            member.unlockBalance(order.getTargetPrice() * order.getQuantity());
        } else {
            holdingRepository.findByMember_IdAndStock_Code(member.getId(), order.getStockCode()).ifPresent(h -> h.unlock(order.getQuantity()));
        }
    }

    private void saveHistory(MemberAnt member, ReservedOrder order, String type, Double profitRate) {
        TradeHistory tradeHistory = new TradeHistory();
        tradeHistory.setMember(member);
        tradeHistory.setStock(order.getStock());
        tradeHistory.setStockName(order.getStockName());
        tradeHistory.setTradeType(type);
        tradeHistory.setPrice(order.getTargetPrice().intValue());
        tradeHistory.setQuantity(order.getQuantity());
        tradeHistory.setProfitRate(profitRate);
        tradeHistoryRepository.save(tradeHistory);
    }

    public boolean isPriceMatched(ReservedOrder order, long currentPrice) {
        return order.getTradeType() == TradeType.BUY? currentPrice <= order.getTargetPrice() : currentPrice >= order.getTargetPrice();
    }
}
