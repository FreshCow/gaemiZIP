package sw.gaemiZIP.service.stock;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sw.gaemiZIP.dto.stock.HoldingResponse;
import sw.gaemiZIP.dto.stock.TradeRequest;
import sw.gaemiZIP.dto.stock.TradeResponse;
import sw.gaemiZIP.entity.stock.Holding;
import sw.gaemiZIP.entity.member.MemberAnt;
import sw.gaemiZIP.entity.stock.TradeHistory;
import sw.gaemiZIP.repository.stock.HoldingRepository;
import sw.gaemiZIP.repository.member.MemberAntRepository;
import sw.gaemiZIP.repository.stock.TradeHistoryRepository;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TradeService {

    private final MemberAntRepository memberAntRepository;
    private final TradeHistoryRepository tradeHistoryRepository;
    private final HoldingRepository holdingRepository;

    @Transactional
    public TradeResponse executeBuy(String email, TradeRequest request) {
        MemberAnt member = findMember(email);

        long totalCost = (long) request.getPrice() * request.getQuantity();
        if (member.getBalance() < totalCost) {
            throw new IllegalStateException("잔고가 부족합니다. 필요: " + totalCost + "원, 보유: " + member.getBalance() + "원");
        }

        // 잔고 차감 — @Transactional 범위 안이므로 dirty checking이 자동 반영
        member.updateBalance(-totalCost);

        // 보유 종목 가중평균 업데이트 (없으면 신규 생성)
        Holding holding = holdingRepository
                .findByMemberIdAndStockCode(member.getId(), request.getStockCode())
                .orElse(Holding.builder()
                        .memberId(member.getId())
                        .stockCode(request.getStockCode())
                        .stockName(request.getStockName())
                        .quantity(0)
                        .avgPrice(0L)
                        .build());

        holding.addPurchase(request.getQuantity(), request.getPrice());
        holdingRepository.save(holding);

        TradeHistory saved = tradeHistoryRepository.save(buildHistory(member.getId(), request, "BUY", null));
        return TradeResponse.from(saved, member.getBalance());
    }

    @Transactional
    public TradeResponse executeSell(String email, TradeRequest request) {
        MemberAnt member = findMember(email);

        Holding holding = holdingRepository
                .findByMemberIdAndStockCode(member.getId(), request.getStockCode())
                .orElseThrow(() -> new IllegalStateException("보유하지 않은 종목입니다."));

        if (holding.getQuantity() < request.getQuantity()) {
            throw new IllegalStateException("보유 수량이 부족합니다. 보유: " + holding.getQuantity() + "주");
        }

        double profitRate = ((double) request.getPrice() - holding.getAvgPrice()) / holding.getAvgPrice() * 100.0;

        // 잔고 증가
        member.updateBalance((long) request.getPrice() * request.getQuantity());

        // 수량 감소, 전량 매도 시 보유 레코드 삭제
        holding.sell(request.getQuantity());
        if (holding.getQuantity() == 0) {
            holdingRepository.delete(holding);
        }

        TradeHistory saved = tradeHistoryRepository.save(buildHistory(member.getId(), request, "SELL", profitRate));
        return TradeResponse.from(saved, member.getBalance());
    }

    @Transactional(readOnly = true)
    public List<TradeResponse> getMyTradeHistory(String email) {
        MemberAnt member = findMember(email);
        return tradeHistoryRepository.findByMemberIdOrderByTradeTimeDesc(member.getId())
                .stream()
                .map(h -> TradeResponse.from(h, null))
                .toList();
    }

    @Transactional(readOnly = true)
    public Page<TradeResponse> getMyTradeHistoryPaged(String email, Pageable pageable) {
        MemberAnt member = findMember(email);
        return tradeHistoryRepository.findByMemberIdOrderByTradeTimeDesc(member.getId(), pageable).map(h -> TradeResponse.from(h, null));
    }


    @Transactional(readOnly = true)
    public List<HoldingResponse> getMyHoldings(String email) {
        MemberAnt member = findMember(email);
        return holdingRepository.findAllByMemberId(member.getId())
                .stream()
                .map(HoldingResponse::from)
                .toList();
    }

    private MemberAnt findMember(String loginId) {
        return memberAntRepository.findByUsernameOrEmail(loginId, loginId)
                .orElseThrow(() -> new IllegalStateException("회원을 찾을 수 없습니다."));
    }

    private TradeHistory buildHistory(Long memberId, TradeRequest request, String type, Double profitRate) {
        TradeHistory h = new TradeHistory();
        h.setMemberId(memberId);
        h.setStockCode(request.getStockCode());
        h.setStockName(request.getStockName());
        h.setTradeType(type);
        h.setPrice(request.getPrice());
        h.setQuantity(request.getQuantity());
        h.setProfitRate(profitRate);
        return h;
    }
}
