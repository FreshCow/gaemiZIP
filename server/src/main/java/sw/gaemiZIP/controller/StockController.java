package sw.gaemiZIP.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import sw.gaemiZIP.dto.stock.StockPriceResponse;
import sw.gaemiZIP.entity.Stock;
import sw.gaemiZIP.entity.StockRanking;
import sw.gaemiZIP.repository.StockRankingRepository;
import sw.gaemiZIP.repository.StockRepository;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/stocks")
@RequiredArgsConstructor
public class StockController {

    private final StockRepository stockRepository;
    private final StockRankingRepository stockRankingRepository;

    // 종목명·초성 검색 (최대 10건)
    @GetMapping("/search")
    public ResponseEntity<List<Stock>> search(@RequestParam String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return ResponseEntity.ok(List.of());
        }
        return ResponseEntity.ok(
                stockRepository.findTop10ByNameContainingOrInitialContaining(keyword, keyword)
        );
    }

    // 특정 종목의 최신 현재가 조회
    @GetMapping("/{code}/price")
    public ResponseEntity<StockPriceResponse> getPrice(@PathVariable String code) {
        // 1. 최근 랭킹 데이터에 현재가가 있으면 반환
        Optional<StockRanking> ranking = stockRankingRepository.findTopByCodeOrderByCreatedAtDesc(code);
        if (ranking.isPresent()) {
            StockRanking r = ranking.get();
            return ResponseEntity.ok(new StockPriceResponse(r.getCode(), r.getName(), r.getPrice(), r.getChangeRate()));
        }

        // 2. 랭킹에 없으면 Stock 테이블에서 종목명만 조회 (가격 미제공)
        return stockRepository.findById(code)
                .map(s -> ResponseEntity.ok(new StockPriceResponse(s.getCode(), s.getName(), "—", "0")))
                .orElse(ResponseEntity.notFound().build());
    }
}
