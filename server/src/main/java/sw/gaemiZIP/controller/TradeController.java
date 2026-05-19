package sw.gaemiZIP.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import sw.gaemiZIP.dto.stock.TradeRequest;
import sw.gaemiZIP.dto.stock.TradeResponse;
import sw.gaemiZIP.entity.TradeHistory;
import sw.gaemiZIP.repository.TradeHistoryRepository;

import java.util.List;

@RestController
@RequestMapping("/api/trades")
@RequiredArgsConstructor
public class TradeController {

    private final TradeHistoryRepository tradeHistoryRepository;

    // 매매 기록 저장 (웹 클라이언트 TradeRequest → TradeHistory 엔티티 변환)
    @PostMapping
    public ResponseEntity<TradeResponse> saveTradeLog(@RequestBody TradeRequest request) {
        TradeHistory entity = new TradeHistory();
        entity.setStockCode(request.getStockCode());
        entity.setStockName(request.getStockName());
        entity.setTradeType(request.getTradeType());
        entity.setPrice(request.getPrice());
        entity.setQuantity(request.getQuantity());
        entity.setProfitRate(request.getProfitRate());
        return ResponseEntity.ok(TradeResponse.from(tradeHistoryRepository.save(entity)));
    }

    // 매매 이력 전체 조회 (최신순, tradeTime → tradeAt으로 직렬화)
    @GetMapping
    public ResponseEntity<List<TradeResponse>> getTradeHistory() {
        List<TradeResponse> responses = tradeHistoryRepository
                .findAllByOrderByTradeTimeDesc()
                .stream()
                .map(TradeResponse::from)
                .toList();
        return ResponseEntity.ok(responses);
    }
}
