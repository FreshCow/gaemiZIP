package sw.gaemiZIP.dto.auth;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true) //json의 데이터와 달라도 무시하고 진행
public record KakaoUserResponse(Long id) {
}
