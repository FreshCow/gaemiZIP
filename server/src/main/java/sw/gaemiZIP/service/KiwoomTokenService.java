package sw.gaemiZIP.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import sw.gaemiZIP.dto.kiwoom.KiwoomTokenResponse;

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

    private String accessToken;
    private final WebClient.Builder webClientBuilder;

    // 토큰 발급 및 갱신 로직
    public void refreshAccessToken() {
        Map<String, String> body = Map.of(
                "grant_type", "client_credentials",
                "appkey", appKey,
                "secretkey", appSecret
        );

        try {
            // 단일 요청으로 통합 및 JSON 헤더 추가
            KiwoomTokenResponse response = webClientBuilder.build()
                    .post()
                    .uri(baseUrl + "/oauth2/token")
                    .header("Content-Type", "application/json;charset=UTF-8")
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(KiwoomTokenResponse.class)
                    .block();

            if (response != null && response.accessToken() != null) {
                this.accessToken = response.accessToken();
                // 전체 토큰 대신 앞부분만 잘라서 발급 성공 여부 로깅
                log.info("액세스 토큰 발급 완료: {}", this.accessToken.substring(0, 15) + "...");
            } else {
                log.error("토큰 발급 실패: 객체가 비어있습니다. 응답값: {}", response);
            }
        } catch (org.springframework.web.reactive.function.client.WebClientResponseException e) {
            // 4xx, 5xx 에러 발생 시 키움이 보낸 원본 에러 메시지 출력
            log.error("API 통신 에러 - 상태코드: {}, 응답내용: {}", e.getStatusCode(), e.getResponseBodyAsString());
        } catch (Exception e) {
            log.error("토큰 발급 중 알 수 없는 예외 발생: {}", e.getMessage());
        }
    }

    public String getAccessToken() {
        if (accessToken == null) refreshAccessToken();
        return accessToken;
    }

    // 12시간마다 자동으로 토큰 갱신 (만료 시간 고려)
    @Scheduled(fixedRate = 1000 * 60 * 60 * 12)
    public void scheduledTokenRefresh() {
        refreshAccessToken();
    }
}
