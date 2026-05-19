package sw.gaemiZIP.dto.kiwoom;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record KiwoomMinuteChartResponse(
        @JsonProperty("stk_min_pole_chart_qry") List<KiwoomMinuteChartItem> items
) {}
