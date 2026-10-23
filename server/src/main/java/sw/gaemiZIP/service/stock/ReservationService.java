package sw.gaemiZIP.service.stock;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
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
import sw.gaemiZIP.repository.stock.StockRepository;
import sw.gaemiZIP.repository.stock.TradeHistoryRepository;
import sw.gaemiZIP.util.MarketHoursUtil;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReservationService {


    private final MemberAntRepository memberAntRepository;
    private final HoldingRepository holdingRepository;
    private final ReservedOrderRepository reservedOrderRepository;
    private final TradeHistoryRepository tradeHistoryRepository;
    private final StockRepository stockRepository;
    private final ReservationExecutor reservationExecutor;


    public void matchAndExecute(String stockCode, long currentPrice){

        List<ReservedOrder> candidates = reservedOrderRepository.findPendingByStockCode(stockCode, TradeStatus.PENDING);

        for (ReservedOrder order : candidates) {

            if (!reservationExecutor.isPriceMatched(order, currentPrice)) continue;

            try {
                reservationExecutor.executeOne(order.getId(), currentPrice);
            } catch (Exception e) {
                log.error("예약 주문 체결 실패 orderId={}, stock={}: {}", order.getId(), stockCode, e.getMessage());
            }
        }
    }

    // 매수: 지정가 이하면 체결, 매도: 지정가 이상이면 체결 (실제 증권사 지정가 방식)
    private boolean isPriceMatched(ReservedOrder order, long currentPrice) {
        return order.getTradeType() == TradeType.BUY
                ? currentPrice <= order.getTargetPrice()
                : currentPrice >= order.getTargetPrice();
    }

    private void saveHistory(MemberAnt member, ReservedOrder order, String type, Double profitRate) {
        TradeHistory tradeHistory = new TradeHistory();
        tradeHistory.setMember(member);
        tradeHistory.setStock(order.getStock()); //종목코드
        tradeHistory.setStockName(order.getStockName()); //종목이름
        tradeHistory.setTradeType(type);
        tradeHistory.setPrice(order.getTargetPrice().intValue());
        tradeHistory.setQuantity(order.getQuantity());
        tradeHistory.setProfitRate(profitRate);
        tradeHistoryRepository.save(tradeHistory);
    }

    //예약주문 체결
    @Transactional
    public ReservationResponse createReservation(String email, ReservationRequest request) {

        //주문은 오전9시부터 오후3시30분까지만 가능
        if (!MarketHoursUtil.isMarketHours()) {throw new IllegalStateException("주문은 오전 9시부터 오후 3시30분까지만 가능합니다.");}

        MemberAnt member = findMemberForUpdate(email);

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

            Holding holding = holdingRepository.findByMember_IdAndStock_Code(member.getId(), request.getStockCode()).orElseThrow(()-> new IllegalStateException("보유하지 않은 종목입니다."));
            int available = holding.getQuantity() - holding.getLockedQuantity();

            //
            if(available < request.getQuantity()) {
                throw new IllegalStateException("매도 가능 수량이 부족합니다. 가능 : " + available + "주");
            }

            holding.lock(request.getQuantity());
        }

        ReservedOrder order = ReservedOrder.builder()
                .member(member)
                .stock(stockRepository.getReferenceById(request.getStockCode()))
                .stockName(request.getStockName())
                .tradeType(tradeType)
                .targetPrice(request.getPrice().longValue())
                .quantity(request.getQuantity())
                .status(TradeStatus.PENDING)
                .build();

        return ReservationResponse.from(reservedOrderRepository.save(order));
    }

    //예약 주문 정보 가져오기
    @Transactional(readOnly = true)
    public ReservationListResponse getMyReservations(String email) {
        MemberAnt member = findMember(email);
        List<ReservationResponse> reservations = reservedOrderRepository
                .findByMember_IdAndStatus(member.getId(), TradeStatus.PENDING)
                .stream()
                .map(ReservationResponse::from)
                .toList();
        return new ReservationListResponse(reservations, member.getBalance(), member.getLockedBalance());
    }

    //예약 주문 취소
    @Transactional
    public void cancelReservation(String email, Long reservationId) {

        //락 순서 - 주문 -> 회원
        ReservedOrder order = reservedOrderRepository.findByIdForUpdate(reservationId).orElseThrow(() -> new IllegalStateException("예약된 체결 내역을 찾을 수 없습니다."));

        MemberAnt member = findMemberForUpdate(email);

        if(!order.getMemberId().equals(member.getId())) {
            throw new IllegalStateException("본인의 예약만 취소할 수 있습니다.");
        }

        if(order.getStatus() != TradeStatus.PENDING) {
            throw new IllegalStateException("대기 중인 예약만 취소할 수 있습니다.");
        }

        reservationExecutor.releaseLock(member, order);

        order.cancel();
    }

    //예약주문 전용 - 회원 행을 잠가 같은 계정의 동시 주문을 직렬화
    private MemberAnt findMemberForUpdate(String loginId) {
        return memberAntRepository.findByLoginIdForUpdate(loginId).orElseThrow(() -> new IllegalStateException("회원을 찾을 수 없습니다."));
    }

    private MemberAnt findMember(String loginId) {
        return memberAntRepository.findByUsernameOrEmail(loginId, loginId).orElseThrow(() -> new IllegalStateException("회원을 찾을 수 없습니다."));
    }

    @Scheduled(cron = "0 30 15 * * MON-FRI", zone = "Asia/Seoul")
    public void cancelAllPendingAtMarketClose() {

        for (ReservedOrder order : reservedOrderRepository.findAllByStatus(TradeStatus.PENDING)) {
            try {
                reservationExecutor.cancelOne(order.getId());
            } catch (Exception e) {
                log.error("장 마감 예약 취소 실패 orderId={}: {}", order.getId(), e.getMessage());
            }
        }

    }
}
