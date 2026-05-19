package sw.gaemiZIP.service;


import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;
import sw.gaemiZIP.dto.kiwoom.KiwoomStockInfoResponse;
import sw.gaemiZIP.dto.kiwoom.KiwoomStockItem;
import sw.gaemiZIP.entity.Stock;
import sw.gaemiZIP.repository.StockRepository;
import sw.gaemiZIP.service.KiwoomTokenService;
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
    private final KiwoomTokenService tokenService;
    private final WebClient.Builder webClientBuilder;

    private final String API_ID = "stkinfo";


    @Transactional
    public void syncAllStocks() {
       log.info("주식 종목 동기화 시작....");

       fetchAndSaveMarket("0", "KOSPI");
       fetchAndSaveMarket("0", "KOSPI");
    }

    private void fetchAndSaveMarket(String marketType, String marketName) {
        try{
            KiwoomStockInfoResponse response = webClientBuilder.build()
                    .post()
                    .uri(baseUrl + "/api/dostk/stkinfo")
                    .header("authorization", "Bearer " + tokenService.getAccessToken())
                    .header("api-id", API_ID)
                    .header("cont-yn", "N") // 연속조회 일단 N
                    .header("Content-Type", "application/json;charset=UTF-8")
                    .bodyValue(Map.of("mrkt_tp", marketType))
                    .retrieve()
                    .bodyToMono(KiwoomStockInfoResponse.class)
                    .block();

            if(response == null || response.getList() == null || response.getList().isEmpty()) {
                log.warn("[{}] 데이터가 없습니다.", marketName);
                return;
            }

            List<Stock> newStocks = new ArrayList<>();
            for(KiwoomStockItem item : response.getList()) {
                if(item.getCode() == null ||  item.getName() == null) continue;

                Stock stock = Stock.builder()
                        .code(item.getCode().trim())
                        .name(item.getName().trim())
                        .initial(InitialUtil.getInitial(item.getName().trim()))
                        .build();

                newStocks.add(stock);
            }

            stockRepository.saveAll(newStocks);
            log.info("[{}] {}개 종목 저장 완료", marketName, newStocks.size());

        }catch (Exception e){
            log.error("[{}] 동기화 에러: {}", marketName, e.getMessage());
        }
    }

    private Stock createStock(String code, String name) {
        return Stock.builder()
                .code(code)
                .name(name)
                .initial(InitialUtil.getInitial(name))
                .build();
    }
}
