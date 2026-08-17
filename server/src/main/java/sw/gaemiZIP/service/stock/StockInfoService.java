package sw.gaemiZIP.service.stock;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import sw.gaemiZIP.service.kiwoom.KiwoomTokenService;
import sw.gaemiZIP.dto.kiwoom.KiwoomStockInfoResponse;
import sw.gaemiZIP.dto.stock.StockInfoResponse;
import sw.gaemiZIP.entity.stock.Stock;
import sw.gaemiZIP.repository.stock.StockRepository;

import java.time.Duration;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class StockInfoService {

    @Value("${kiwoom.api.url}")
    private String baseUrl;

    private final KiwoomTokenService tokenService;
    private final WebClient.Builder webClientBuilder;
    private final StockRepository stockRepository;

    private final StringRedisTemplate  redisTemplate;
    private static final String STOCK_INFO = "stock:info";
    private static final Duration CACHE_TTL  = Duration.ofMinutes(5);

    private final ObjectMapper objectMapper = new ObjectMapper();

    public Optional<StockInfoResponse> getStockInfo(String code) {

        String stockInfoCode = STOCK_INFO+":"+code;

        //레디스에서 확인 후 있으면 값 리턴
        String cachedStockInfo = redisTemplate.opsForValue().get(stockInfoCode);
        if (cachedStockInfo != null) {
            try{
                return Optional.of(objectMapper.readValue(cachedStockInfo, StockInfoResponse.class));
            }catch (Exception e){
                log.warn("레디스 주식정보 역직렬화 실패 : {}", e.getMessage());
            }
        }

        //주식테이블에서 코드로 주식찾고 없으면 null값 리턴
        Stock stock = stockRepository.findById(code).orElse(null);
        if (stock == null) {
            log.warn("Stock 테이블에 없는 종목: {}", code);
            return Optional.empty();
        }

        //키움증권RestAPI에 값 요청하기
        KiwoomStockInfoResponse apiResp = callKa10001(code);
        if (apiResp == null) {
            return Optional.empty();
        }

        StockInfoResponse stockInfoResponse = StockInfoResponse.from(apiResp, stock);

        try{
            redisTemplate.opsForValue().set(stockInfoCode, objectMapper.writeValueAsString(stockInfoResponse), CACHE_TTL);
        }catch (Exception e){
            log.error("레디스 주식정보 저장 실패 : {}", e.getMessage());
        }

        return Optional.of(stockInfoResponse);
    }

    private KiwoomStockInfoResponse callKa10001(String code) {
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
            log.error("ka10001 호출 실패 [{}]: {}", code, e.getMessage());
            return null;
        }
    }
}
