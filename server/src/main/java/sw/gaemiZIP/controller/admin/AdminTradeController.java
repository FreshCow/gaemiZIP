package sw.gaemiZIP.controller.admin;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import sw.gaemiZIP.dto.admin.AdminAuditLogResponse;
import sw.gaemiZIP.dto.admin.BalanceAdjustRequest;
import sw.gaemiZIP.entity.member.MemberAnt;
import sw.gaemiZIP.entity.stock.TradeHistory;
import sw.gaemiZIP.repository.member.MemberAntRepository;
import sw.gaemiZIP.service.admin.AdminTradeService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminTradeController {

    private final AdminTradeService adminTradeService;
    private final MemberAntRepository memberAntRepository;

    // 전체 회원 거래 내역 조회 (체결시각 내림차순)
    @GetMapping("/trades")
    public ResponseEntity<List<TradeHistory>> getAllTrades() {
        return ResponseEntity.ok(adminTradeService.getAllTrades());
    }

    @PatchMapping("/members/{id}/balanceAdjust")
    public ResponseEntity<?> adjustBalance(
            @PathVariable Long id,
            @RequestBody BalanceAdjustRequest request,
            Authentication auth){
        try{
            MemberAnt admin = memberAntRepository.findByUsernameOrEmail(auth.getName(), auth.getName())
                    .orElseThrow(() -> new IllegalStateException("관리자 계정을 찾을 수 없습니다."));
            adminTradeService.adjustBalance(id, request.getDelta(), admin);
            return ResponseEntity.ok().build();
        }catch (IllegalStateException e){
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/trades/{id}")
    public ResponseEntity<?> deleteTrade(
            @PathVariable Long id,
            Authentication auth){
        try{
            MemberAnt admin = memberAntRepository.findByUsernameOrEmail(auth.getName(), auth.getName())
                    .orElseThrow(() -> new IllegalStateException("관리자 계정을 찾을 수 없습니다."));
            adminTradeService.deleteTrade(id, admin);
            return ResponseEntity.ok().build();
        }catch (IllegalStateException e){
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // 감사 로그 조회 (최신순)
    @GetMapping("/audit-logs")
    public ResponseEntity<List<AdminAuditLogResponse>> getAuditLogs() {
        return ResponseEntity.ok(adminTradeService.getAuditLogs());
    }

}
