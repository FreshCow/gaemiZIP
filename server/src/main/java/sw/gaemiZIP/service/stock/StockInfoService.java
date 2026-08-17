package sw.gaemiZIP.service.stock;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import sw.gaemiZIP.service.kiwoom.KiwoomTokenService;
import sw.gaemiZIP.dto.kiwoom.KiwoomStockInfoResponse;
import sw.gaemiZIP.dto.stock.StockInfoResponse;
import sw.gaemiZIP.entity.stock.Stock;
import sw.gaemiZIP.repository.stock.StockRepository;

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

    /**
     * 종목 기본정보 조회. 매 호출마다 ka10001 실시간 조회.
     * TODO: Redis 캐싱 적용 예정
     */
    public Optional<StockInfoResponse> getStockInfo(String code) {
        Stock stock = stockRepository.findById(code).orElse(null);
        if (stock == null) {
            log.warn("Stock 마스터에 없는 종목: {}", code);
            return Optional.empty();
        }

        KiwoomStockInfoResponse apiResp = callKa10001(code);
        if (apiResp == null) {
            return Optional.empty();
        }

        return Optional.of(StockInfoResponse.from(apiResp, stock));
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
