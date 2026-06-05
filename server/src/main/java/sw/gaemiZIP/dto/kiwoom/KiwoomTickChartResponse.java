package sw.gaemiZIP.dto.kiwoom;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record KiwoomTickChartResponse(
        @JsonProperty("stk_tic_chart_qry") List<KiwoomTickChartItem> items
) {}
