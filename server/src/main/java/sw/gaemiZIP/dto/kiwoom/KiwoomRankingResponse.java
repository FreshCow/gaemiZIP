package sw.gaemiZIP.dto.kiwoom;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record KiwoomRankingResponse(
        @JsonProperty("item_inq_rank") List<KiwoomRankingItem> itemInqRank,
        @JsonProperty("return_code")   Integer returnCode,
        @JsonProperty("return_msg")    String returnMsg
) {}
