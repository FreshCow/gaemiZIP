package sw.gaemiZIP.service.moderation;

import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.web.reactive.function.client.WebClient;

import java.io.IOException;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

class ModerationServiceTest {

    private MockWebServer server;
    private ModerationService moderationService;

    @BeforeEach
    void setUp() throws IOException {
        server = new MockWebServer();
        server.start();
        moderationService = new ModerationService(WebClient.builder(), server.url("/").toString());
    }

    @AfterEach
    void tearDown() throws IOException {
        server.shutdown();
    }

    @Test
    @DisplayName("정상 문장 - clean 응답이면 통과 처리")
    void isInappropriate_returnsFalse_whenClean() {
        server.enqueue(new MockResponse()
                .setHeader("Content-Type", "application/json")
                .setBody("""
                        {"is_blocked": false, "clean_score": 0.9, "labels": {"clean": 0.9}, "triggered_labels": []}
                        """));

        boolean result = moderationService.isInappropriate("오늘 주가 진짜 좋다 ㅋㅋ");

        assertThat(result).isFalse();
    }

    @Test
    @DisplayName("욕설 문장 - is_blocked=true 응답이면 차단 처리")
    void isInappropriate_returnsTrue_whenBlocked() {
        server.enqueue(new MockResponse()
                .setHeader("Content-Type", "application/json")
                .setBody("""
                        {"is_blocked": true, "clean_score": 0.05, "labels": {"악플/욕설": 0.9}, "triggered_labels": ["악플/욕설"]}
                        """));

        boolean result = moderationService.isInappropriate("씨발 진짜 짜증나게 하네");

        assertThat(result).isTrue();
    }

    @Test
    @DisplayName("모더레이션 서비스 5xx 응답 - fail-open으로 통과 처리")
    void isInappropriate_returnsFalse_whenServerError() {
        server.enqueue(new MockResponse().setResponseCode(500));

        boolean result = moderationService.isInappropriate("아무 텍스트");

        assertThat(result).isFalse();
    }

    @Test
    @DisplayName("모더레이션 서비스 응답 지연 - 타임아웃으로 fail-open 통과 처리")
    void isInappropriate_returnsFalse_whenTimeout() {
        // 실제 is_blocked=true를 응답하더라도, 타임아웃보다 늦게 도착하면 통과 처리되어야 함
        server.enqueue(new MockResponse()
                .setHeader("Content-Type", "application/json")
                .setBody("{\"is_blocked\": true, \"clean_score\": 0.01, \"labels\": {}, \"triggered_labels\": []}")
                .setBodyDelay(5, TimeUnit.SECONDS));

        boolean result = moderationService.isInappropriate("아무 텍스트");

        assertThat(result).isFalse();
    }
}
