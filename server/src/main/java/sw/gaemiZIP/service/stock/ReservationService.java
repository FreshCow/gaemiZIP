package sw.gaemiZIP.service.stock;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sw.gaemiZIP.dto.stock.ReservationListResponse;
import sw.gaemiZIP.dto.stock.ReservationRequest;
import sw.gaemiZIP.dto.stock.ReservationResponse;
import sw.gaemiZIP.entity.member.MemberAnt;
import sw.gaemiZIP.entity.stock.*;
import sw.gaemiZIP.repository.member.MemberAntRepository;
import sw.gaemiZIP.repository.stock.HoldingRepository;
import sw.gaemiZIP.repository.stock.ReservedOrderRepository;
import sw.gaemiZIP.repository.stock.TradeHistoryRepository;
import sw.gaemiZIP.service.notification.NotificationService;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ReservationService {
    private final MemberAntRepository memberAntRepository;
    private final HoldingRepository holdingRepository;
    private final ReservedOrderRepository reservedOrderRepository;
    private final TradeHistoryRepository tradeHistoryRepository;
    private final NotificationService notificationService;


    @Transactional
    public void matchAndExecute(String stockCode, long currentPrice){
        List<ReservedOrder> matches = reservedOrderRepository
                .findByStockCodeAndStatus(stockCode, TradeStatus.PENDING)
                .stream()
                .filter(o -> isPriceMatched(o, currentPrice))
                .toList();

        for(ReservedOrder order : matches){
            MemberAnt member = memberAntRepository.findById(order.getMemberId())
                    .orElseThrow(() -> new IllegalStateException("회원을 찾을 수 없습니다."));

            long amount = order.getTargetPrice() * order.getQuantity();

            if(order.getTradeType() == TradeType.BUY){
                member.updateBalance(-amount); //자산에서 체결금액 뺀걸로 업데이트
                member.unlockBalance(amount); //체결금액 뺀 자산으로 lock 해제

                Holding holding = holdingRepository
                        .findByMemberIdAndStockCode(member.getId(), order.getStockCode())
                        .orElse(Holding.builder()
                                .memberId(member.getId())
                                .stockCode(order.getStockCode())
                                .stockName(order.getStockName())
                                .quantity(0)
                                .avgPrice(0L)
                                .build());

                holding.addPurchase(order.getQuantity(), order.getTargetPrice());
                holdingRepository.save(holding);

                saveHistory(member.getId(), order, "BUY", null);
            }else{
                Holding holding = holdingRepository
                        .findByMemberIdAndStockCode(member.getId(), order.getStockCode())
                        .orElseThrow(() -> new IllegalStateException("보유 종목 정보를 찾을 수 없습니다."));
                double profitRate = ((double) order.getTargetPrice() - holding.getAvgPrice()) / holding.getAvgPrice() * 100.0;

                member.updateBalance(amount);
                holding.sell(order.getQuantity());
                holding.unlock(order.getQuantity());
                if(holding.getQuantity() == 0){
                    holdingRepository.delete(holding);
                }

                saveHistory(member.getId(), order, "SELL", profitRate);
            }

            order.excute();

            String tradeLabel = order.getTradeType() == TradeType.BUY ? "매수" : "매도";
            notificationService.notify(member.getId(), order.getStockCode(),
                    String.format("%s %s %d주가 %,d원에 체결되었습니다.", order.getStockName(), tradeLabel, order.getQuantity(), order.getTargetPrice()));
        }
    }

    // 매수: 지정가 이하면 체결, 매도: 지정가 이상이면 체결 (실제 증권사 지정가 방식)
    private boolean isPriceMatched(ReservedOrder order, long currentPrice) {
        return order.getTradeType() == TradeType.BUY
                ? currentPrice <= order.getTargetPrice()
                : currentPrice >= order.getTargetPrice();
    }

    private void saveHistory(Long id, ReservedOrder order, String type, Double profitRate) {
        TradeHistory tradeHistory = new TradeHistory();
        tradeHistory.setMemberId(id);
        tradeHistory.setStockCode(order.getStockCode()); //종목코드
        tradeHistory.setStockName(order.getStockName()); //종목이름
        tradeHistory.setTradeType(type);
        tradeHistory.setPrice(order.getTargetPrice().intValue());
        tradeHistory.setQuantity(order.getQuantity());
        tradeHistory.setProfitRate(profitRate);
        tradeHistoryRepository.save(tradeHistory);
    }

    @Transactional
    public ReservationResponse createReservation(String email, ReservationRequest request) {
        MemberAnt member = findMember(email);

        TradeType tradeType;
        try {
            tradeType = TradeType.valueOf(request.getTradeType());
        } catch (IllegalArgumentException | NullPointerException e) {
            throw new IllegalStateException("올바르지 않은 거래 유형입니다: " + request.getTradeType());
        }

        //매수
        if(tradeType == TradeType.BUY) {
            long amount = (long)request.getPrice() * request.getQuantity();
            long available = member.getBalance() - member.getLockedBalance();

            //주문금액이 더 큰 경우
            if(available < amount) {
                throw new IllegalStateException("주문 가능 잔고가 부족합니다. 필요 : " + amount + "원, 가능 : " + available + "원");
            }

            //정상동작
            member.lockBalance(amount);
        }
        else { //매도

            Holding holding = holdingRepository.findByMemberIdAndStockCode(member.getId(), request.getStockCode()).orElseThrow(()-> new IllegalStateException("보유하지 않은 종목입니다."));
            int available = holding.getQuantity() - holding.getLockedQuantity();

            //
            if(available < request.getQuantity()) {
                throw new IllegalStateException("매도 가능 수량이 부족합니다. 가능 : " + available + "주");
            }

            holding.lock(request.getQuantity());
        }

        ReservedOrder order = ReservedOrder.builder()
                .memberId(member.getId())
                .stockCode(request.getStockCode())
                .stockName(request.getStockName())
                .tradeType(tradeType)
                .targetPrice(request.getPrice().longValue())
                .quantity(request.getQuantity())
                .status(TradeStatus.PENDING)
                .build();

        return ReservationResponse.from(reservedOrderRepository.save(order));
    }


    @Transactional(readOnly = true)
    public ReservationListResponse getMyReservations(String email) {
        MemberAnt member = findMember(email);
        List<ReservationResponse> reservations = reservedOrderRepository
                .findByMemberIdAndStatus(member.getId(), TradeStatus.PENDING)
                .stream()
                .map(ReservationResponse::from)
                .toList();
        return new ReservationListResponse(reservations, member.getBalance(), member.getLockedBalance());
    }

    @Transactional
    public void cancelReservation(String email, Long reservationId) {
        MemberAnt member = findMember(email);
        ReservedOrder order = reservedOrderRepository.findById(reservationId).orElseThrow(() -> new IllegalStateException("예약된 체결 내역을 찾을 수 없습니다."));

        if(!order.getMemberId().equals(member.getId())) {
            throw new IllegalStateException("본인의 예약만 취소할 수 있습니다.");
        }

        if(order.getStatus() != TradeStatus.PENDING) {
            throw new IllegalStateException("대기 중인 예약만 취소할 수 있습니다.");
        }

        if(order.getTradeType() == TradeType.BUY) {
            member.unlockBalance(order.getTargetPrice() * order.getQuantity());
        }
        else{
            Holding holding = holdingRepository.findByMemberIdAndStockCode(member.getId(), order.getStockCode()).orElseThrow(() -> new IllegalStateException("보유 종목 정보를 찾을 수 없습니다."));
            holding.unlock(order.getQuantity());
        }

        order.cancel();
    }

    private MemberAnt findMember(String loginId) {
        return memberAntRepository.findByUsernameOrEmail(loginId, loginId).orElseThrow(() -> new IllegalStateException("회원을 찾을 수 없습니다."));
    }
}
