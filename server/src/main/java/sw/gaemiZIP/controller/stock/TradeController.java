package sw.gaemiZIP.controller.stock;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import sw.gaemiZIP.dto.stock.HoldingResponse;
import sw.gaemiZIP.dto.stock.TradeRequest;
import sw.gaemiZIP.dto.stock.TradeResponse;
import sw.gaemiZIP.service.stock.TradeService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/trades")
@RequiredArgsConstructor
public class TradeController {

    private final TradeService tradeService;

    // 매수/매도 실행 — JWT에서 회원 식별, 잔고·보유수량 검증 후 체결
    @PostMapping
    public ResponseEntity<?> executeTrade(@RequestBody TradeRequest request, Authentication auth) {
        try {
            String email = auth.getName();
            TradeResponse response = "BUY".equals(request.getTradeType())
                    ? tradeService.executeBuy(email, request)
                    : tradeService.executeSell(email, request);
            return ResponseEntity.ok(response);
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // 내 거래 이력 조회 (본인 것만)
    @GetMapping
    public ResponseEntity<List<TradeResponse>> getMyTradeHistory(Authentication auth) {
        return ResponseEntity.ok(tradeService.getMyTradeHistory(auth.getName()));
    }

    // 내 보유 종목 조회
    @GetMapping("/holdings")
    public ResponseEntity<List<HoldingResponse>> getMyHoldings(Authentication auth) {
        return ResponseEntity.ok(tradeService.getMyHoldings(auth.getName()));
    }

    @GetMapping("/paged")
    public ResponseEntity<Page<TradeResponse>> getMyTradeHistoryPaged(Authentication auth,
                                                                      @RequestParam(defaultValue = "0") int page,
                                                                      @RequestParam(defaultValue = "10") int size)
    {
        return ResponseEntity.ok(tradeService.getMyTradeHistoryPaged(auth.getName(), PageRequest.of(page, size)));
    }
}
