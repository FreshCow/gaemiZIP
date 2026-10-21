package sw.gaemiZIP.service.auth;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import sw.gaemiZIP.dto.auth.KakaoTokenResponse;
import sw.gaemiZIP.dto.auth.KakaoUserResponse;

import java.time.Duration;

@Slf4j
@Component
public class KakaoOAuthClient {

    private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(10);

    private final   WebClient webClient;
    private final  String restApiKey;
    private final  String clientSecret;
    private final  String redirectUri;
    private final  String tokenUri;
    private final  String userInfoUri;

    public KakaoOAuthClient(WebClient.Builder webClientBuilder,
            @Value("${oauth.kakao.rest-api-key}")
            String restApiKey,
            @Value("${oauth.kakao.client-secret}")
            String clientSecret,
            @Value("${oauth.kakao.redirect-uri}")
            String redirectUri,
            @Value("${oauth.kakao.token-uri}")
            String tokenUri,
            @Value("${oauth.kakao.user-info-uri}")
            String userInfoUri
    )
    {
        this.webClient = webClientBuilder.clone().build();
        this.restApiKey = restApiKey;
        this.clientSecret = clientSecret;
        this.redirectUri = redirectUri;
        this.tokenUri = tokenUri;
        this.userInfoUri = userInfoUri;
    }

    public  KakaoTokenResponse exchangeToken(String code) {

        if(code == null || code.isBlank()) {
            throw new IllegalArgumentException("카카오 인가 코드가 없습니다.");
        }

        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("grant_type", "authorization_code");
        form.add("client_id", restApiKey);
        form.add("client_secret", clientSecret);
        form.add("redirect_uri", redirectUri);
        form.add("code", code);

        try {
            KakaoTokenResponse response = webClient
                    .post()
                    .uri(tokenUri)
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(BodyInserters.fromFormData(form))
                    .retrieve()
                    .bodyToMono(KakaoTokenResponse.class)
                    .block(REQUEST_TIMEOUT);

            if (response == null || response.accessToken() == null|| response.accessToken().isBlank()) {
                throw new KakaoOAuthException(
                        "카카오에서 액세스 토큰을 받지 못했습니다."
                );
            }

            return response;

        }
        catch (WebClientResponseException e) {
            log.warn("카카오 토큰 요청 실패: status={}",e.getStatusCode());

            throw new KakaoOAuthException("카카오 인증 토큰 발급에 실패했습니다.", e);

        }
        catch (KakaoOAuthException e) {
            throw e;

        }
        catch (Exception e) {
            log.error("카카오 토큰 요청 중 통신 오류가 발생했습니다.",e);

            throw new KakaoOAuthException("카카오 인증 서버에 연결할 수 없습니다.",e);
        }

    }

    public  KakaoUserResponse getUserInfo(String accessToken) {

        if (accessToken == null || accessToken.isBlank()) {
            throw new IllegalArgumentException("카카오 액세스 토큰이 없습니다.");
        }

        try {
            KakaoUserResponse response = webClient
                    .get()
                    .uri(userInfoUri)
                    .headers(headers -> headers.setBearerAuth(accessToken))
                    .accept(MediaType.APPLICATION_JSON)
                    .retrieve()
                    .bodyToMono(KakaoUserResponse.class)
                    .block(REQUEST_TIMEOUT);

            if (response == null || response.id() == null) {
                throw new KakaoOAuthException("카카오 회원정보를 받지 못했습니다.");
            }

            return response;

        }
        catch (WebClientResponseException e) {
            log.warn("카카오 사용자 정보 요청 실패: status={}", e.getStatusCode());

            throw new KakaoOAuthException("카카오 사용자 정보 조회에 실패했습니다.",e);
        }
        catch (KakaoOAuthException e) {
            throw e;
        }
        catch (Exception e) {
            log.error("카카오 사용자 정보 요청 중 통신 오류가 발생했습니다.",e);
            throw new KakaoOAuthException("카카오 인증 서버에 연결할 수 없습니다.",e);
        }
    }
}
