package sw.gaemiZIP.service.stock;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sw.gaemiZIP.dto.stock.ReservationListResponse;
import sw.gaemiZIP.dto.stock.ReservationRequest;
import sw.gaemiZIP.dto.stock.ReservationResponse;
import sw.gaemiZIP.entity.member.MemberAnt;
import sw.gaemiZIP.entity.stock.Holding;
import sw.gaemiZIP.entity.stock.ReservedOrder;
import sw.gaemiZIP.entity.stock.TradeStatus;
import sw.gaemiZIP.entity.stock.TradeType;
import sw.gaemiZIP.repository.member.MemberAntRepository;
import sw.gaemiZIP.repository.stock.HoldingRepository;
import sw.gaemiZIP.repository.stock.ReservedOrderRepository;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ReservationService {
    private final MemberAntRepository memberAntRepository;
    private final HoldingRepository holdingRepository;
    private final ReservedOrderRepository reservedOrderRepository;

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
