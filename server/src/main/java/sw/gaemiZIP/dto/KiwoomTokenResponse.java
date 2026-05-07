package sw.gaemiZIP.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record KiwoomTokenResponse(
        @JsonProperty("token") String accessToken,
        @JsonProperty("token_type") String tokenType,
        @JsonProperty("expires_dt") String expiresDt
) {
}
