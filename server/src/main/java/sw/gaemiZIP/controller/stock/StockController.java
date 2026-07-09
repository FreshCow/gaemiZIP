package sw.gaemiZIP.controller.stock;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import sw.gaemiZIP.dto.stock.StockInfoResponse;
import sw.gaemiZIP.dto.stock.StockPriceResponse;
import sw.gaemiZIP.dto.stock.StockRankingResponse;
import sw.gaemiZIP.entity.news.News;
import sw.gaemiZIP.entity.stock.Stock;
import sw.gaemiZIP.repository.stock.StockRepository;
import sw.gaemiZIP.service.news.NewsService;
import sw.gaemiZIP.service.stock.StockFetchService;
import sw.gaemiZIP.service.stock.StockInfoService;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.Optional;

@Slf4j
@RestController
@RequestMapping("/api/stocks")
@RequiredArgsConstructor
public class StockController {

    private final StockRepository stockRepository;
    private final StockInfoService stockInfoService;
    private final StringRedisTemplate redisTemplate;
    private final NewsService newsService;
    private final ObjectMapper objectMapper = new ObjectMapper();

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

    // ka10001: 종목 기본정보 조회 (5분 DB 캐시)
    @GetMapping("/{code}/info")
    public ResponseEntity<StockInfoResponse> getStockInfo(@PathVariable String code) {
        return stockInfoService.getStockInfo(code)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // 특정 종목의 최신 현재가 조회
    @GetMapping("/{code}/price")
    public ResponseEntity<StockPriceResponse> getPrice(@PathVariable String code) {
        // 1. 최근 랭킹 데이터에 현재가가 있으면 반환
        String cached = redisTemplate.opsForValue().get(StockFetchService.PRICE_KEY_PREFIX + code);
        if(cached != null) {
            try{
                StockRankingResponse r = objectMapper.readValue(cached, StockRankingResponse.class);
                return ResponseEntity.ok(new StockPriceResponse(r.getCode(), r.getName(), r.getPrice(), r.getRate()));
            }catch (Exception e){
                log.warn("Reids 가격정보 역직렬화 실패 [{}]: {}", code, e.getMessage());
            }
        }

        Optional<StockInfoResponse> info = stockInfoService.getStockInfo(code);

        if (info.isPresent()) {
           StockInfoResponse i = info.get();
           String price = resolveCurrentPrice(i);
           String rate = normalizeRate(i.getFluRt());
           return ResponseEntity.ok(new StockPriceResponse(i.getCode(), i.getName(), price, rate));
        }

        return stockRepository.findById(code)
                .map(s -> ResponseEntity.ok(new StockPriceResponse(s.getCode(), s.getName(), "-", "0")))
                .orElse(ResponseEntity.notFound().build());
    }

    //종목별 관련 뉴스
    @GetMapping("/{code}/news")
    public ResponseEntity<List<News>> getStockNews(@PathVariable String code) {
        return stockInfoService.getStockInfo(code)
                .map(info -> ResponseEntity.ok(newsService.getStockNews(code, info.getName())))
                .orElse(ResponseEntity.notFound().build());
    }


    private String resolveCurrentPrice(StockInfoResponse i) {
        if(i.getCurPric() != null && !i.getCurPric().isBlank()) {
            return StockFetchService.parseAbsPrice(i.getCurPric());
        }
        try{
            long base = Long.parseLong(StockFetchService.parseAbsPrice(i.getBasePric()));
            long diff = Long.parseLong(i.getPredPre().trim().replace("+",""));
            return String.valueOf(base+diff);
        }catch (Exception e){
            return "0";
        }
    }

    private String normalizeRate(String rate) {
        if( rate == null || rate.isBlank()) return "0";
        try{
            if(Double.parseDouble(rate) == 0) return "0";
        }catch (NumberFormatException e){
        }
        return rate.startsWith("+") || rate.startsWith("-") ? rate : "+" + rate;
    }
}
