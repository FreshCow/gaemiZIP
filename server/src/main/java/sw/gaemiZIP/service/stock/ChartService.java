package sw.gaemiZIP.service.stock;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.util.retry.Retry;
import sw.gaemiZIP.service.kiwoom.KiwoomTokenService;
import sw.gaemiZIP.dto.kiwoom.KiwoomDailyChartResponse;
import sw.gaemiZIP.dto.kiwoom.KiwoomMinuteChartResponse;
import sw.gaemiZIP.dto.kiwoom.KiwoomTickChartResponse;
import sw.gaemiZIP.dto.kiwoom.KiwoomWeeklyChartResponse;
import sw.gaemiZIP.dto.stock.CandleResponse;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChartService {

    @Value("${kiwoom.api.url}")
    private String baseUrl;

    private final KiwoomTokenService tokenService;
    private final WebClient.Builder webClientBuilder;

    private static final String CHART_URL = "/api/dostk/chart";
    private static final DateTimeFormatter MINUTE_FMT = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.BASIC_ISO_DATE;
    private static final ZoneOffset KST = ZoneOffset.ofHours(9);

    // 분봉 조회 (ticScope: "1","3","5","10","15","30","45","60")
    public List<CandleResponse> getMinuteChart(String stockCode, String ticScope) {
        KiwoomMinuteChartResponse res = post("ka10080",
                Map.of("stk_cd", stockCode, "tic_scope", ticScope, "upd_stkpc_tp", "1"),
                KiwoomMinuteChartResponse.class);

        if (res == null || res.items() == null) {
            log.warn("ka10080 빈 응답 (code={}, tic={})", stockCode, ticScope);
            return Collections.emptyList();
        }

        return res.items().stream()
                .map(item -> new CandleResponse(
                        parseMinuteTime(item.cntrTm()),
                        parsePrice(item.openPric()),
                        parsePrice(item.highPric()),
                        parsePrice(item.lowPric()),
                        parsePrice(item.curPrc()),
                        parseLong(item.trdeQty())
                ))
                .filter(c -> c.time() > 0)
                .sorted(Comparator.comparingLong(CandleResponse::time))  // 키움은 최신순 → 오름차순 정렬
                .toList();
    }

    // 틱봉 조회 (ticScope: "1","3","5","10","30")
    public List<CandleResponse> getTickChart(String stockCode, String ticScope) {
        KiwoomTickChartResponse res = post("ka10079",
                Map.of("stk_cd", stockCode, "tic_scope", ticScope, "upd_stkpc_tp", "1"),
                KiwoomTickChartResponse.class);

        if (res == null || res.items() == null) {
            log.warn("ka10079 빈 응답 (code={}, tic={})", stockCode, ticScope);
            return Collections.emptyList();
        }

        return res.items().stream()
                .map(item -> new CandleResponse(
                        parseMinuteTime(item.cntrTm()),
                        parsePrice(item.openPric()),
                        parsePrice(item.highPric()),
                        parsePrice(item.lowPric()),
                        parsePrice(item.curPrc()),
                        parseLong(item.trdeQty())
                ))
                .filter(c -> c.time() > 0)
                .sorted(Comparator.comparingLong(CandleResponse::time))
                .toList();
    }

    // 일봉 조회
    public List<CandleResponse> getDailyChart(String stockCode) {
        String today = LocalDate.now().format(DATE_FMT);
        KiwoomDailyChartResponse res = post("ka10081",
                Map.of("stk_cd", stockCode, "base_dt", today, "upd_stkpc_tp", "1"),
                KiwoomDailyChartResponse.class);

        if (res == null || res.items() == null) {
            log.warn("ka10081 빈 응답 (code={})", stockCode);
            return Collections.emptyList();
        }

        return res.items().stream()
                .map(item -> new CandleResponse(
                        parseDayTime(item.dt()),
                        parsePrice(item.openPric()),
                        parsePrice(item.highPric()),
                        parsePrice(item.lowPric()),
                        parsePrice(item.curPrc()),
                        parseLong(item.trdeQty())
                ))
                .filter(c -> c.time() > 0)
                .sorted(Comparator.comparingLong(CandleResponse::time))
                .toList();
    }

    // 주봉 조회
    public List<CandleResponse> getWeeklyChart(String stockCode) {
        String today = LocalDate.now().format(DATE_FMT);
        KiwoomWeeklyChartResponse res = post("ka10082",
                Map.of("stk_cd", stockCode, "base_dt", today, "upd_stkpc_tp", "1"),
                KiwoomWeeklyChartResponse.class);

        if (res == null || res.items() == null) {
            log.warn("ka10082 빈 응답 (code={})", stockCode);
            return Collections.emptyList();
        }

        return res.items().stream()
                .map(item -> new CandleResponse(
                        parseDayTime(item.dt()),
                        parsePrice(item.openPric()),
                        parsePrice(item.highPric()),
                        parsePrice(item.lowPric()),
                        parsePrice(item.curPrc()),
                        parseLong(item.trdeQty())
                ))
                .filter(c -> c.time() > 0)
                .sorted(Comparator.comparingLong(CandleResponse::time))
                .toList();
    }

    private <T> T post(String apiId, Map<String, String> body, Class<T> clazz) {
        try {
            return webClientBuilder.build()
                    .post()
                    .uri(baseUrl + CHART_URL)
                    .header("authorization", "Bearer " + tokenService.getAccessToken())
                    .header("api-id", apiId)
                    .header("Content-Type", "application/json;charset=UTF-8")
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(clazz)
                    .retryWhen(Retry.backoff(2, Duration.ofMillis(500))
                        .filter(this::isTooManyRequest)
                        .doBeforeRetry(sig -> log.warn("{} 429 재시도 ({}번째)", apiId, sig.totalRetries()+1)))
                    .block();
        } catch (Exception e) {
            log.error("{} 호출 실패: {}", apiId, e.getMessage());
            return null;
        }
    }

    private boolean isTooManyRequest(Throwable e) {
        return e instanceof WebClientResponseException webClientResponseException && webClientResponseException.getStatusCode().value() == 429;
    }

    // "20250917132000" → epoch seconds (UTC 오프셋으로 저장 → 차트가 UTC 기준으로 표시하므로 KST 시각 그대로 보임)
    private long parseMinuteTime(String cntrTm) {
        if (cntrTm == null || cntrTm.isBlank()) return 0;
        try {
            return LocalDateTime.parse(cntrTm.trim(), MINUTE_FMT).toEpochSecond(ZoneOffset.UTC);
        } catch (Exception e) {
            return 0;
        }
    }

    // "20250908" → epoch seconds (KST 자정)
    private long parseDayTime(String dt) {
        if (dt == null || dt.isBlank()) return 0;
        try {
            return LocalDate.parse(dt.trim(), DATE_FMT).atStartOfDay(KST).toEpochSecond();
        } catch (Exception e) {
            return 0;
        }
    }

    // 키움 응답값은 하락 시 음수 접두사("-78800")로 올 수 있음 → 절댓값 사용
    private double parsePrice(String val) {
        if (val == null || val.isBlank()) return 0;
        try {
            return Math.abs(Double.parseDouble(val.trim()));
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private long parseLong(String val) {
        if (val == null || val.isBlank()) return 0;
        try {
            return Math.abs(Long.parseLong(val.trim().replace(",", "")));
        } catch (NumberFormatException e) {
            return 0;
        }
    }
}
