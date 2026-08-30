package sw.gaemiZIP.service.stock;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;
import sw.gaemiZIP.service.kiwoom.KiwoomRateLimiter;
import sw.gaemiZIP.service.kiwoom.KiwoomTokenService;
import sw.gaemiZIP.service.kiwoom.KiwoomRealtimeService;
import sw.gaemiZIP.dto.kiwoom.KiwoomRankingItem;
import sw.gaemiZIP.dto.kiwoom.KiwoomRankingResponse;
import sw.gaemiZIP.dto.stock.StockRankingResponse;
import sw.gaemiZIP.websocket.StockWebSocketHandler;

import jakarta.annotation.PostConstruct;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;

// 키움증권 ka00198 (실시간종목조회순위) REST API 호출
// DB에 저장하고 웹 클라이언트에 브로드캐스트
@Slf4j
@Service
@RequiredArgsConstructor
public class StockFetchService {

    @Value("${kiwoom.api.url}")
    private String baseUrl;

    private final KiwoomTokenService tokenService;
    private final StockWebSocketHandler webSocketHandler;
    private final WebClient.Builder webClientBuilder;
    private final KiwoomRealtimeService kiwoomRealtimeService;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final KiwoomRateLimiter rateLimiter;

    private final StringRedisTemplate redisTemplate;

    private static final String RANKING_CACHE_KEY = "stock:ranking:top10";

    //컨트롤로에서도 참조할거기 때문에 public으로 설정
    public static final  String PRICE_KEY_PREFIX = "stock:price:";

    private volatile List<StockRankingResponse> currentRankings = Collections.emptyList();

    public List<StockRankingResponse> getCurrentRankings() {
        return currentRankings;
    }

    //Redis기반
    @PostConstruct
    public void initCache() {
        Optional<List<StockRankingResponse>> recent = loadRankingsFromRedis();
        if (recent.isPresent()) {
            currentRankings = recent.get();
            log.info("Redis에서 초기 랭킹 {}개 로드 완료", currentRankings.size());
            try {
                String payload = "STOCK_UPDATE:" + objectMapper.writeValueAsString(currentRankings);
                webSocketHandler.broadcast(payload);
            } catch (Exception e) {
                log.warn("초기 랭킹 캐시 설정 실패: {}", e.getMessage());
            }
        }
    }

    private Optional<List<StockRankingResponse>> loadRankingsFromRedis() {
        try {
            String cached = redisTemplate.opsForValue().get(RANKING_CACHE_KEY);
            if(cached == null) return Optional.empty();
            return Optional.of(objectMapper.readValue(cached, new TypeReference<List<StockRankingResponse>>() {}));
        }catch (Exception e) {
            log.warn("Redis 랭킹 역직렬화 실패 : {}", e.getMessage());
            return Optional.empty();
        }
    }

    @Scheduled(fixedDelay = 30_000, initialDelay = 30_000)
    @Transactional
    public void fetchTopStocks() {
        try {
            List<StockRankingResponse> rankings = fetchKiwoomRanking();
            if (rankings.isEmpty()) {
                log.warn("랭킹순위 응답 결과 없음 — 이전 캐시 유지");
                return;
            }

            String jsonRankings = objectMapper.writeValueAsString(rankings);
            redisTemplate.opsForValue().set(RANKING_CACHE_KEY, jsonRankings);
            rankings.forEach(r -> {
                try {
                    redisTemplate.opsForValue().set(
                            PRICE_KEY_PREFIX + r.getCode(),
                            objectMapper.writeValueAsString(r),
                            java.time.Duration.ofMinutes(10)
                    );
                } catch (JsonProcessingException e) {
                    throw new RuntimeException(e);
                }
            });

            currentRankings = rankings;

            String payload = "STOCK_UPDATE:" + objectMapper.writeValueAsString(rankings);
            webSocketHandler.broadcast(payload);

            // 랭킹 종목 전체를 실시간 WebSocket 구독 (신규 종목만 추가)
            List<String> codes = rankings.stream().map(StockRankingResponse::getCode).toList();
            kiwoomRealtimeService.subscribeAll(codes);

            log.info("주식 랭킹 갱신 완료: {}개 종목", rankings.size());
        }
        catch (org.springframework.web.reactive.function.UnsupportedMediaTypeException e) {
            // 키움 서버가 JSON이 아닌 HTML을 던질 때 방어 (주말 점검 등)
            log.warn("키움 서버 응답 타입 오류(HTML 반환)");
            fallbackToRedisCache();
        }
        catch (Exception e) {
            log.error("주식 랭킹 갱신 실패: {}", e.getMessage());
            fallbackToRedisCache();
        }
    }

    private List<StockRankingResponse> fetchKiwoomRanking() {
        return fetchKiwoomRankingWithRetry(false);
    }

    private List<StockRankingResponse> fetchKiwoomRankingWithRetry(boolean isRetry) {

        if(!rateLimiter.acquire()) return null;

        String token = tokenService.getAccessToken();

//       log.debug("실시간 종목 조회 요청 — 토큰 앞 20자: {}", token != null ? token.substring(0, Math.min(20, token.length())) + "..." : "null");

        KiwoomRankingResponse response = webClientBuilder.build()
                .post()
                .uri(baseUrl + "/api/dostk/stkinfo")
                .header("authorization", "Bearer " + token)
                .header("api-id", "ka00198")
                .header("Content-Type", "application/json;charset=UTF-8")
                .bodyValue(Map.of("qry_tp", "5"))  // 1:1분, 2:10분, 3:1시간, 4:당일 누적, 5:30초
                .retrieve()
                .bodyToMono(KiwoomRankingResponse.class)
                .block();

        // 8005 인증 실패 → 토큰 강제 갱신 후 1회 재시도
        if (response != null && Integer.valueOf(3).equals(response.returnCode())) {
            log.warn("실시간 종목 조회 인증 실패(return_code=3): {}", response.returnMsg());
            if (!isRetry) {
                log.info("토큰 강제 갱신 후 재시도");
                tokenService.forceRefresh();
                return fetchKiwoomRankingWithRetry(true);
            }
            log.error("재시도 후에도 인증 실패 — 토큰 원문 응답 로그 확인 필요 (app-key/secret 또는 필드명 불일치 의심)");
            return Collections.emptyList();
        }

        if (response == null || response.itemInqRank() == null || response.itemInqRank().isEmpty()) {
            log.warn("실시간 종목 조회 빈 응답 (return_code={})", response != null ? response.returnCode() : "null");
            return Collections.emptyList();
        }

        return response.itemInqRank().stream()
                .map(this::toRankingResponse)
                .toList();
    }

    private StockRankingResponse toRankingResponse(KiwoomRankingItem item) {
        return new StockRankingResponse(
                item.stkCd() != null ? item.stkCd().trim() : "",
                item.stkNm() != null ? item.stkNm().trim() : "",
                parseAbsPrice(item.pastCurrPrc()),
                buildRate(item.baseCompSign(), item.baseCompChgr()),
                0L  // ka00198은 거래량 미제공
        );
    }

    // 음수로 값이 올 수 있기 때문에ㅔ 절대값으로 변환
    public static String parseAbsPrice(String val) {
        if (val == null || val.isBlank()) return "0";
        try {
            return String.valueOf(Math.abs(Long.parseLong(val.trim())));
        } catch (NumberFormatException e) {
            return val.trim().replaceFirst("^-", "");
        }
    }

    //"1"상한/"2"상승/"3"보합/"4"하한/"5"하락
    private String buildRate(String sign, String chgr) {
        if (chgr == null || chgr.isBlank()) return "0";
        String raw = chgr.trim();
        return switch (sign) {
            case "1", "2" -> raw;
            case "4", "5" -> raw;
            default        -> "0";
        };
    }

    private void fallbackToRedisCache() {
        try {
            Optional<List<StockRankingResponse>> cached = loadRankingsFromRedis();
            if (cached.isPresent()) {
                currentRankings = cached.get();
                log.info("Redis 폴백 성공: 마지막 랭킹 데이터를 사용합니다.");
                try{
                    String payload = "STOCK_UPDATE:" + objectMapper.writeValueAsString(currentRankings);
                    // 프론트엔드로 브로드캐스트 (웹소켓 전송 등 기존 처리 로직 연결)
                    webSocketHandler.broadcast(payload);

                }catch (Exception e){
                    log.warn("풀백 브로드캐스트 실패 : {}", e.getMessage());
                }
            } else {
                log.warn("Redis에 저장된 랭킹 캐시 데이터가 없습니다.");
            }
        } catch (Exception e) {
            log.error("Redis 폴백 처리 중 에러: {}", e.getMessage());
        }
    }


}
