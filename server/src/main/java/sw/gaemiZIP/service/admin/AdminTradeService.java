package sw.gaemiZIP.service.admin;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sw.gaemiZIP.entity.member.MemberAnt;
import sw.gaemiZIP.entity.stock.TradeHistory;
import sw.gaemiZIP.repository.member.MemberAntRepository;
import sw.gaemiZIP.repository.stock.TradeHistoryRepository;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminTradeService {

    private final MemberAntRepository memberAntRepository;
    private final TradeHistoryRepository tradeHistoryRepository;

    @Transactional(readOnly = true)
    public List<TradeHistory> getAllTrades() {
        return tradeHistoryRepository.findAllByOrderByTradeTimeDesc();
    }

    @Transactional
    public void adjustBalance(long id, long delta) {
        MemberAnt member = memberAntRepository.findById(id)
                .orElseThrow(() -> new IllegalStateException("회원을 찾을 수 없습니다."));

        if(member.getBalance() + delta < 0){
            throw new IllegalStateException("잔고가 음수일 수 없습니다.");
        }else {
            member.updateBalance(delta);
        }
    }

    @Transactional
    public void deleteTrade(long tradeid) {
        TradeHistory tradeHistory = tradeHistoryRepository.findById(tradeid)
                .orElseThrow(()-> new IllegalStateException("거래 기록을 찾을 수 없습니다."));

        tradeHistoryRepository.delete(tradeHistory);
    }

}
