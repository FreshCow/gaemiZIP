package sw.gaemiZIP.controller.stock;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import sw.gaemiZIP.dto.stock.*;
import sw.gaemiZIP.service.stock.ReservationService;
import sw.gaemiZIP.service.stock.TradeService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/trades")
@RequiredArgsConstructor
public class TradeController {

    private final TradeService tradeService;
    private final ReservationService reservationService;

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

    //예약주문 생성
    @PostMapping("/reserve")
    public ResponseEntity<?> createReservation(@RequestBody ReservationRequest request, Authentication auth) {
        try{
            return ResponseEntity.ok(reservationService.createReservation(auth.getName(), request));
        }catch (IllegalStateException e){
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    //예약주문내역 가져오기
    @GetMapping("/reserve")
    public ResponseEntity<ReservationListResponse> getMyReservation(Authentication auth) {
        return ResponseEntity.ok(reservationService.getMyReservations(auth.getName()));
    }

    //예약주문 취소
    @DeleteMapping("/reserve/{id}")
    public ResponseEntity<?> cancelReservation(@PathVariable Long id, Authentication auth) {
        try {
            reservationService.cancelReservation(auth.getName(), id);
            return ResponseEntity.ok().build();
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
    public ResponseEntity<Page<TradeResponse>> getMyTradeHistoryPaged(
            Authentication auth,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size)
    {
        return ResponseEntity.ok(tradeService.getMyTradeHistoryPaged(auth.getName(), PageRequest.of(page, size)));
    }


}
