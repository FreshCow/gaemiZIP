package sw.gaemiZIP.service.admin;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sw.gaemiZIP.dto.admin.AdminAuditLogResponse;
import sw.gaemiZIP.entity.admin.AdminAuditLog;
import sw.gaemiZIP.entity.member.MemberAnt;
import sw.gaemiZIP.entity.stock.TradeHistory;
import sw.gaemiZIP.repository.admin.AdminAuditLogRepository;
import sw.gaemiZIP.repository.member.MemberAntRepository;
import sw.gaemiZIP.repository.stock.TradeHistoryRepository;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminTradeService {

    private static final String ACTION_ADJUST_BALANCE = "ADJUST_BALANCE";
    private static final String ACTION_DELETE_TRADE = "DELETE_TRADE";

    private final MemberAntRepository memberAntRepository;
    private final TradeHistoryRepository tradeHistoryRepository;
    private final AdminAuditLogRepository adminAuditLogRepository;

    @Transactional(readOnly = true)
    public List<TradeHistory> getAllTrades() {
        return tradeHistoryRepository.findAllByOrderByTradeTimeDesc();
    }

    @Transactional
    public void adjustBalance(long id, long delta, MemberAnt admin) {
        MemberAnt member = memberAntRepository.findById(id)
                .orElseThrow(() -> new IllegalStateException("회원을 찾을 수 없습니다."));

        if(member.getBalance() + delta < 0){
            throw new IllegalStateException("잔고가 음수일 수 없습니다.");
        }else {
            member.updateBalance(delta);
        }

        adminAuditLogRepository.save(AdminAuditLog.builder()
                .adminId(admin.getId())
                .adminNickname(admin.getNickname())
                .action(ACTION_ADJUST_BALANCE)
                .targetId(id)
                .detail(String.format("memberId=%d, delta=%s%d, balanceAfter=%d",
                        id, delta >= 0 ? "+" : "", delta, member.getBalance()))
                .build());
    }

    @Transactional
    public void deleteTrade(long tradeid, MemberAnt admin) {
        TradeHistory tradeHistory = tradeHistoryRepository.findById(tradeid)
                .orElseThrow(()-> new IllegalStateException("거래 기록을 찾을 수 없습니다."));

        String detail = String.format("memberId=%s, stockCode=%s, tradeType=%s, price=%d, quantity=%d",
                tradeHistory.getMemberId(), tradeHistory.getStockCode(), tradeHistory.getTradeType(),
                tradeHistory.getPrice(), tradeHistory.getQuantity());

        tradeHistoryRepository.delete(tradeHistory);

        adminAuditLogRepository.save(AdminAuditLog.builder()
                .adminId(admin.getId())
                .adminNickname(admin.getNickname())
                .action(ACTION_DELETE_TRADE)
                .targetId(tradeid)
                .detail(detail)
                .build());
    }

    @Transactional(readOnly = true)
    public List<AdminAuditLogResponse> getAuditLogs() {
        return adminAuditLogRepository.findAllByOrderByCreatedDateDesc().stream()
                .map(AdminAuditLogResponse::from)
                .toList();
    }

}
