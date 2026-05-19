package sw.gaemiZIP.dto.kiwoom;

import com.fasterxml.jackson.annotation.JsonProperty;

public record KiwoomTokenResponse(
        @JsonProperty("token") String accessToken,
        @JsonProperty("token_type") String tokenType,
        @JsonProperty("expires_dt") String expiresDt
) {
}
