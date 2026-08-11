package sw.gaemiZIP.service.moderation;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.netty.http.client.HttpClient;
import sw.gaemiZIP.dto.moderation.ModerateRequest;
import sw.gaemiZIP.dto.moderation.ModerateResponse;

import java.time.Duration;

@Slf4j
@Service
public class ModerationService {

    private final WebClient webClient;

    public ModerationService(WebClient.Builder builder, @Value("${moderation.service.url}") String baseUrl) {
        HttpClient httpClient = HttpClient.create()
                .responseTimeout(Duration.ofMillis(1500));
        this.webClient = builder.baseUrl(baseUrl)
                .clientConnector(new ReactorClientHttpConnector(httpClient))
                .build();
    }

    public boolean isInappropriate(String text) {
        try {
            ModerateResponse res = webClient.post()
                    .uri("/moderate")
                    .bodyValue(new ModerateRequest(text))
                    .retrieve()
                    .bodyToMono(ModerateResponse.class)
                    .block(Duration.ofMillis(2000));

            return res != null && res.isBlocked();

        }catch (Exception e) {
            log.warn("모더레이션 서비스 호출 실패, 통과처리 : {}", e.getMessage());
            return false;
        }
    }
}
