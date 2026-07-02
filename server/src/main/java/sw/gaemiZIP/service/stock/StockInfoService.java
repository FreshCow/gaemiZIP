package sw.gaemiZIP.service.stock;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;
import sw.gaemiZIP.service.kiwoom.KiwoomTokenService;
import sw.gaemiZIP.dto.kiwoom.KiwoomStockInfoResponse;
import sw.gaemiZIP.dto.stock.StockInfoResponse;
import sw.gaemiZIP.entity.stock.Stock;
import sw.gaemiZIP.entity.stock.StockInfo;
import sw.gaemiZIP.repository.stock.StockInfoRepository;
import sw.gaemiZIP.repository.stock.StockRepository;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class StockInfoService {

    @Value("${kiwoom.api.url}")
    private String baseUrl;

    private static final int CACHE_MINUTES = 5;

    private final KiwoomTokenService tokenService;
    private final WebClient.Builder webClientBuilder;
    private final StockRepository stockRepository;
    private final StockInfoRepository stockInfoRepository;

    /**
     * 종목 기본정보 조회.
     * DB 캐시가 5분 이내이면 DB 반환, 이후이거나 없으면 ka10001 호출 후 저장.
     */
    @Transactional
    public Optional<StockInfoResponse> getStockInfo(String code) {
        Stock stock = stockRepository.findById(code).orElse(null);
        if (stock == null) {
            log.warn("Stock 마스터에 없는 종목: {}", code);
            return Optional.empty();
        }

        Optional<StockInfo> cached = stockInfoRepository.findByStock_Code(code);

        if (cached.isPresent()) {
            StockInfo info = cached.get();
            if (info.getUpdatedAt().isAfter(LocalDateTime.now().minusMinutes(CACHE_MINUTES))) {
                log.debug("캐시 사용: {}", code);
                return Optional.of(StockInfoResponse.from(info, stock));
            }
        }

        // 캐시 만료 또는 첫 조회 → API 호출
        KiwoomStockInfoResponse apiResp = callKa10001(code);
        if (apiResp == null) {
            // API 실패 시 만료된 캐시라도 반환
            return cached.map(info -> StockInfoResponse.from(info, stock));
        }

        StockInfo info = cached.orElseGet(StockInfo::new);
        info.setStock(stock);
        applyApiResponse(info, apiResp);
        stockInfoRepository.save(info);

        log.info("ka10001 저장 완료 [{}]: curPric={}, mac={}, oyrHgst={}",
                code, apiResp.getCurPric(), apiResp.getMac(), apiResp.getOyrHgst());

        return Optional.of(StockInfoResponse.from(info, stock));
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

    private void applyApiResponse(StockInfo info, KiwoomStockInfoResponse r) {
        info.setStkNm(r.getStkNm());
        info.setSetlMm(r.getSetlMm());
        info.setFav(r.getFav());
        info.setCap(r.getCap());
        info.setFloStk(r.getFloStk());
        info.setCrdRt(r.getCrdRt());
        info.setOyrHgst(r.getOyrHgst());
        info.setOyrLwst(r.getOyrLwst());
        info.setMac(r.getMac());
        info.setMacWght(r.getMacWght());
        info.setForExhRt(r.getForExhRt());
        info.setReplPric(r.getReplPric());
        info.setPer(r.getPer());
        info.setEps(r.getEps());
        info.setRoe(r.getRoe());
        info.setPbr(r.getPbr());
        info.setEv(r.getEv());
        info.setBps(r.getBps());
        info.setSaleAmt(r.getSaleAmt());
        info.setBusPro(r.getBusPro());
        info.setCupNga(r.getCupNga());
        info.setHgst250(r.getHgst250());
        info.setLwst250(r.getLwst250());
        info.setOpenPric(r.getOpenPric());
        info.setHighPric(r.getHighPric());
        info.setLowPric(r.getLowPric());
        info.setUptPric(r.getUptPric());
        info.setLstPric(r.getLstPric());
        info.setBasePric(r.getBasePric());
        info.setExpCntrPric(r.getExpCntrPric());
        info.setExpCntrQty(r.getExpCntrQty());
        info.setHgst250PricDt(r.getHgst250PricDt());
        info.setHgst250PricPreRt(r.getHgst250PricPreRt());
        info.setLwst250PricDt(r.getLwst250PricDt());
        info.setLwst250PricPreRt(r.getLwst250PricPreRt());
        info.setCurPric(r.getCurPric());
        info.setPreSig(r.getPreSig());
        info.setPredPre(r.getPredPre());
        info.setFluRt(r.getFluRt());
        info.setTrdeQty(r.getTrdeQty());
        info.setTrdePre(r.getTrdePre());
        info.setFavUnit(r.getFavUnit());
        info.setDstrStk(r.getDstrStk());
        info.setDstrRt(r.getDstrRt());
        info.setFluStk(r.getFluStk());
        info.setMktRt(r.getMktRt());
    }
}
