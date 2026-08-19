package sw.gaemiZIP.service.stock;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;
import sw.gaemiZIP.entity.stock.StockAlias;
import sw.gaemiZIP.repository.stock.StockAliasRepository;
import sw.gaemiZIP.service.kiwoom.KiwoomTokenService;
import sw.gaemiZIP.dto.kiwoom.KiwoomStockListResponse;
import sw.gaemiZIP.dto.kiwoom.KiwoomStockItem;
import sw.gaemiZIP.entity.stock.Stock;
import sw.gaemiZIP.repository.stock.StockRepository;
import sw.gaemiZIP.util.EnglishAcronymUtil;
import sw.gaemiZIP.util.InitialUtil;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class StockSyncService {

    @Value("${kiwoom.api.url}")
    private String baseUrl;

    private final StockRepository stockRepository;
    private final StockAliasRepository stockAliasRepository;
    private final KiwoomTokenService tokenService;
    private final WebClient.Builder webClientBuilder;

    // DB가 비어있을 때만 실행 — 첫 서버 기동 시 초기 데이터 적재
    @PostConstruct
    public void initSync() {

        if (stockRepository.count() == 0) {
            log.info("Stock 테이블이 비어있어 초기 동기화를 실행합니다.");
            syncAllStocks();
        }
        if (stockAliasRepository.count() == 0) {
            log.info("StockAlias 테이블이 비어있어 기존 종목 별칭 백필을 실행합니다.");
            generateAliases(stockRepository.findAll());
        }
    }

    private void generateAliases(List<Stock> stocks) {
        List<StockAlias> stockAliases = new ArrayList<>();
        for (Stock stock : stocks) {
            String alias = EnglishAcronymUtil.toAlias(stock.getName());
            if (alias == null) continue;
            if (stockAliasRepository.existsByStock_CodeAndAlias(stock.getCode(), alias)) continue;

            stockAliases.add(StockAlias.builder()
                    .stock(stock)
                    .alias(alias)
                    .build());
        }
        stockAliasRepository.saveAll(stockAliases);
    }


    // 매일 오전 8시 갱신 — 신규 상장/폐지 반영
    @Scheduled(cron = "0 0 8 * * *")
    @Transactional
    public void syncAllStocks() {
        log.info("주식 종목 동기화 시작...");
        fetchAndSave("0", "KOSPI");
        try {
            Thread.sleep(3000); // 429 방지: KOSPI 응답 후 3초 대기
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        fetchAndSave("10", "KOSDAQ");
    }

    private void fetchAndSave(String mrktTp, String market) {
        try {
            KiwoomStockListResponse response = webClientBuilder.build()
                    .post()
                    .uri(baseUrl + "/api/dostk/stkinfo")
                    .header("authorization", "Bearer " + tokenService.getAccessToken())
                    .header("api-id", "ka10099")
                    .header("cont-yn", "N")
                    .header("Content-Type", "application/json;charset=UTF-8")
                    .bodyValue(Map.of("mrkt_tp", mrktTp))
                    .retrieve()
                    .bodyToMono(KiwoomStockListResponse.class)
                    .block();

            if (response == null || response.getList() == null || response.getList().isEmpty()) {
                log.warn("[{}] 응답 데이터 없음", market);
                return;
            }

            List<Stock> stocks = new ArrayList<>();
            for (KiwoomStockItem item : response.getList()) {
                if (item.getCode() == null || item.getName() == null) continue;
                stocks.add(Stock.builder()
                        .code(item.getCode().trim())
                        .name(item.getName().trim())
                        .initial(InitialUtil.getInitial(item.getName().trim()))
                        .market(market)
                        .build());
            }

            //주식 종목 저장
            stockRepository.saveAll(stocks);

            generateAliases(stocks);

            log.info("[{}] {}개 종목 저장 완료", market, stocks.size());

        } catch (Exception e) {
            log.error("[{}] 동기화 실패: {}", market, e.getMessage());
        }
    }
}
