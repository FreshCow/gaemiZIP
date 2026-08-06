package sw.gaemiZIP.service.stock;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import sw.gaemiZIP.dto.kiwoom.KiwoomQuoteResponse;
import sw.gaemiZIP.dto.stock.OrderBookLevel;
import sw.gaemiZIP.dto.stock.OrderBookResponse;
import sw.gaemiZIP.service.kiwoom.KiwoomTokenService;

import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class StockQuoteService {

    @Value("${kiwoom.api.url}")
    private String baseUrl;

    private final KiwoomTokenService tokenService;
    private final WebClient.Builder webClientBuilder;

    public OrderBookResponse getQuote(String code) {
        KiwoomQuoteResponse apiResp = callKa10004(code);
        if(apiResp == null) return null;
        return toOrderBookResponse(code, apiResp);
    }

    private static long abs(String val) {
        return Long.parseLong(StockFetchService.parseAbsPrice(val));
    }

     OrderBookResponse toOrderBookResponse(String code, KiwoomQuoteResponse r) {
        List<OrderBookLevel> asks = List.of(
                new OrderBookLevel(abs(r.getSelFprBid()),      abs(r.getSelFprReq())),
                new OrderBookLevel(abs(r.getSel2thPreBid()),   abs(r.getSel2thPreReq())),
                new OrderBookLevel(abs(r.getSel3thPreBid()),   abs(r.getSel3thPreReq())),
                new OrderBookLevel(abs(r.getSel4thPreBid()),   abs(r.getSel4thPreReq())),
                new OrderBookLevel(abs(r.getSel5thPreBid()),   abs(r.getSel5thPreReq())),
                new OrderBookLevel(abs(r.getSel6thPreBid()),   abs(r.getSel6thPreReq())),
                new OrderBookLevel(abs(r.getSel7thPreBid()),   abs(r.getSel7thPreReq())),
                new OrderBookLevel(abs(r.getSel8thPreBid()),   abs(r.getSel8thPreReq())),
                new OrderBookLevel(abs(r.getSel9thPreBid()),   abs(r.getSel9thPreReq())),
                new OrderBookLevel(abs(r.getSel10thPreBid()),  abs(r.getSel10thPreReq()))
        );
        List<OrderBookLevel> bids = List.of(
                new OrderBookLevel(abs(r.getBuyFprBid()),      abs(r.getBuyFprReq())),
                new OrderBookLevel(abs(r.getBuy2thPreBid()),   abs(r.getBuy2thPreReq())),
                new OrderBookLevel(abs(r.getBuy3thPreBid()),   abs(r.getBuy3thPreReq())),
                new OrderBookLevel(abs(r.getBuy4thPreBid()),   abs(r.getBuy4thPreReq())),
                new OrderBookLevel(abs(r.getBuy5thPreBid()),   abs(r.getBuy5thPreReq())),
                new OrderBookLevel(abs(r.getBuy6thPreBid()),   abs(r.getBuy6thPreReq())),
                new OrderBookLevel(abs(r.getBuy7thPreBid()),   abs(r.getBuy7thPreReq())),
                new OrderBookLevel(abs(r.getBuy8thPreBid()),   abs(r.getBuy8thPreReq())),
                new OrderBookLevel(abs(r.getBuy9thPreBid()),   abs(r.getBuy9thPreReq())),
                new OrderBookLevel(abs(r.getBuy10thPreBid()),  abs(r.getBuy10thPreReq()))
        );
        return new OrderBookResponse(code, asks, bids, abs(r.getTotSelReq()), abs(r.getTotBuyReq()));
    }

    private KiwoomQuoteResponse callKa10004(String code) {
        try {
            return webClientBuilder.build()
                    .post()
                    .uri(baseUrl + "/api/dostk/mrkcond")
                    .header("authorization", "Bearer " + tokenService.getAccessToken())
                    .header("api-id", "ka10004")
                    .header("Content-Type", "application/json;charset=UTF-8")
                    .bodyValue(Map.of("stk_cd", code))
                    .retrieve()
                    .bodyToMono(KiwoomQuoteResponse.class)
                    .block();
        } catch (Exception e) {
            log.error("ka10004 호출 실패 [{}]: {}", code, e.getMessage());
            return null;
        }
    }

}
