package sw.scalperagent.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import sw.scalperagent.dto.StockRankingResponse;
import sw.scalperagent.service.StockFetchService;

import java.util.List;

@RestController
@RequestMapping("/api/stocks")
@RequiredArgsConstructor
public class StockRankingController {

    private final StockFetchService stockFetchService;

    // 현재 거래량 상위 10개 종목 조회 (StockFetchService의 인메모리 캐시 반환)
    @GetMapping("/ranking")
    public ResponseEntity<List<StockRankingResponse>> getRanking() {
        return ResponseEntity.ok(stockFetchService.getCurrentRankings());
    }
}