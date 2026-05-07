package sw.gaemiZIP.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record KiwoomRankingResponse(
        @JsonProperty("item_inq_rank") List<KiwoomRankingItem> itemInqRank
) {}
