package sw.gaemiZIP.dto.kiwoom;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record KiwoomWeeklyChartResponse(
        @JsonProperty("stk_stk_pole_chart_qry") List<KiwoomDayChartItem> items
) {}
