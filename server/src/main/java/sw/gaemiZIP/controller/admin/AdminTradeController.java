package sw.gaemiZIP.controller.admin;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import sw.gaemiZIP.dto.admin.BalanceAdjustRequest;
import sw.gaemiZIP.entity.TradeHistory;
import sw.gaemiZIP.service.admin.AdminTradeService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
public class AdminTradeController {

    private final AdminTradeService adminTradeService;

    // 전체 회원 거래 내역 조회 (체결시각 내림차순)
    @GetMapping("/trades")
    public ResponseEntity<List<TradeHistory>> getAllTrades() {
        return ResponseEntity.ok(adminTradeService.getAllTrades());
    }

    @PatchMapping("/members/{id}/balanceAdjust")
    public ResponseEntity<?> adjustBalance(
            @PathVariable Long id,
            @RequestBody BalanceAdjustRequest request){
        try{
            adminTradeService.adjustBalance(id, request.getDelta());
            return ResponseEntity.ok().build();
        }catch (IllegalStateException e){
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/trades/{id}")
    public ResponseEntity<?> deleteTrade(
            @PathVariable Long id){
        try{
            adminTradeService.deleteTrade(id);
            return ResponseEntity.ok().build();
        }catch (IllegalStateException e){
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

}
