package sw.gaemiZIP.service.kiwoom;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import sw.gaemiZIP.dto.kiwoom.KiwoomTokenResponse;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class KiwoomTokenService {
    @Value("${kiwoom.api.app-key}")
    private String appKey;

    @Value("${kiwoom.api.app-secret}")
    private String appSecret;

    @Value("${kiwoom.api.url}")
    private String baseUrl;

    private volatile String accessToken;
    private volatile Instant tokenExpiresAt = Instant.EPOCH;

    private final WebClient.Builder webClientBuilder;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final DateTimeFormatter EXPIRES_FMT = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");

    // KST = UTC+9
    private static final ZoneOffset KST = ZoneOffset.ofHours(9);

    public synchronized void refreshAccessToken() {
        Map<String, String> body = Map.of(
                "grant_type", "client_credentials",
                "appkey", appKey,
                "secretkey", appSecret
        );

        try {
            // au10001(토큰 발급) 엔드포인트는 rate limit이 엄격하므로 절대 두 번 호출하지 않음
            String raw = webClientBuilder.build()
                    .post()
                    .uri(baseUrl + "/oauth2/token")
                    .header("Content-Type", "application/json;charset=UTF-8")
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            if (raw == null || raw.isBlank()) {
                log.error("토큰 발급 실패: 빈 응답");
                return;
            }


            KiwoomTokenResponse response = objectMapper.readValue(raw, KiwoomTokenResponse.class);

            if (response.accessToken() != null) {
                this.accessToken = response.accessToken();
                this.tokenExpiresAt = parseExpiry(response.expiresDt());
                log.info("액세스 토큰 발급 완료 (만료: {}): {}...",
                        tokenExpiresAt, this.accessToken.substring(0, Math.min(20, this.accessToken.length())));
            } else {
                log.error("토큰 발급 실패: accessToken 필드 null. 원문: {}", raw);
            }


        } catch (org.springframework.web.reactive.function.client.WebClientResponseException e) {
            log.error("API 통신 에러 - 상태코드: {}, 응답내용: {}", e.getStatusCode(), e.getResponseBodyAsString());
        } catch (Exception e) {
            log.error("토큰 발급 중 예외 발생: {}", e.getMessage());
        }
    }

    /** 8005 등 인증 실패 시 외부에서 강제 갱신 요청 */
    public void forceRefresh() {
        this.accessToken = null;
        refreshAccessToken();
    }

    public String getAccessToken() {
        // 만료 5분 전 또는 null이면 재발급
        if (accessToken == null || Instant.now().isAfter(tokenExpiresAt.minusSeconds(300))) {
            refreshAccessToken();
        }
        return accessToken;
    }

    // 초기 지연 10초 후 시작, 이후 6시간마다 갱신
    @Scheduled(initialDelay = 10_000, fixedRate = 1000L * 60 * 60 * 6)
    public void scheduledTokenRefresh() {
        refreshAccessToken();
    }

    private Instant parseExpiry(String expiresDt) {
        if (expiresDt == null || expiresDt.isBlank()) {
            return Instant.now().plusSeconds(3600); // 기본 1시간
        }
        try {
            return LocalDateTime.parse(expiresDt, EXPIRES_FMT).toInstant(KST);
        } catch (Exception e) {
            log.warn("expires_dt 파싱 실패({}), 기본 1시간 적용", expiresDt);
            return Instant.now().plusSeconds(3600);
        }
    }
}
