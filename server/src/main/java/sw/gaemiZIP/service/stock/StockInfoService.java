package sw.gaemiZIP.service.stock;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import sw.gaemiZIP.service.kiwoom.KiwoomRateLimiter;
import sw.gaemiZIP.service.kiwoom.KiwoomTokenService;
import sw.gaemiZIP.dto.kiwoom.KiwoomStockInfoResponse;
import sw.gaemiZIP.dto.stock.StockInfoResponse;
import sw.gaemiZIP.entity.stock.Stock;
import sw.gaemiZIP.repository.stock.StockRepository;

import java.time.Duration;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class StockInfoService {

    @Value("${kiwoom.api.url}")
    private String baseUrl;

    private final KiwoomTokenService tokenService;
    private final WebClient.Builder webClientBuilder;
    private final StockRepository stockRepository;
    private final KiwoomRateLimiter rateLimiter;

    private final StringRedisTemplate  redisTemplate;
    private static final String STOCK_INFO = "stock:info";
    private static final Duration CACHE_TTL  = Duration.ofMinutes(5);

    private final ObjectMapper objectMapper = new ObjectMapper();

    private final ConcurrentHashMap<String, CompletableFuture<Optional<StockInfoResponse>>> inFlight = new ConcurrentHashMap<>();

    public Optional<StockInfoResponse> getStockInfo(String code) {
        // 1차: 락 없이 캐시부터 확인 (웜 캐시일 때 빠른 경로 유지)
        Optional<StockInfoResponse> cached = readFromCache(code);

        //저장된 데이터가 있으면?
        if (cached.isPresent()) return cached;

        // 2차: 같은 code로 진행 중인 요청이 있으면 그 Future를 그대로 받고,
        // 없으면 여기서 딱 한 번만 fetchAndCache를 실행하는 Future를 등록
        CompletableFuture<Optional<StockInfoResponse>> future = inFlight.computeIfAbsent(code, c -> CompletableFuture.supplyAsync(() -> fetchAndCache(c)));

        try {
            return future.join(); // 먼저 온 스레드든 나중 온 스레드든 같은 결과를 기다림
        } finally {
            inFlight.remove(code, future); // 이 future가 여전히 맵에 걸려있을 때만 제거(경합 안전)
        }
    }

    private Optional<StockInfoResponse> readFromCache(String code) {
        String cachedStockInfo = redisTemplate.opsForValue().get(STOCK_INFO + ":" + code);
        if (cachedStockInfo == null) {
            return Optional.empty();
        }
        try {
            return Optional.of(objectMapper.readValue(cachedStockInfo, StockInfoResponse.class));
        } catch (Exception e) {
            log.warn("레디스 주식정보 역직렬화 실패 : {}", e.getMessage());
            return Optional.empty();
        }
    }

    private Optional<StockInfoResponse> fetchAndCache(String code) {
        Stock stock = stockRepository.findById(code).orElse(null);
        if (stock == null) {
            log.warn("Stock 테이블에 없는 종목: {}", code);
            return Optional.empty();
        }

        KiwoomStockInfoResponse apiResp = callStockInfoAPI(code);
        if (apiResp == null) {
            return Optional.empty();
        }

        StockInfoResponse stockInfoResponse = StockInfoResponse.from(apiResp, stock);

        try {
            redisTemplate.opsForValue().set(
                    STOCK_INFO + ":" + code,
                    objectMapper.writeValueAsString(stockInfoResponse),
                    CACHE_TTL);
        } catch (Exception e) {
            log.error("레디스 주식정보 저장 실패 : {}", e.getMessage());
        }

        return Optional.of(stockInfoResponse);
    }


    private KiwoomStockInfoResponse callStockInfoAPI(String code) {

        if(!rateLimiter.acquire()) return null;

        try {
            return webClientBuilder.build()
                    .post()
                    .uri(baseUrl + "/api/dostk/stkinfo")
                    .header("authorization", "Bearer " + tokenService.getAccessToken())
                    .header("api-id", "ka10001")
                    .header("Content-Type", "application/json;charset=UTF-8")
                    .bodyValue(Map.of("stk_cd", code))
                    .retrieve()
                    .bodyToMono(KiwoomStockInfoResponse.class)
                    .block();
        } catch (Exception e) {
            log.error("주식 상세 정보 호출 실패 [{}]: {}", code, e.getMessage());
            return null;
        }
    }
}
