package sw.gaemiZIP.dto.kiwoom;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record KiwoomDailyChartResponse(
        @JsonProperty("stk_dt_pole_chart_qry") List<KiwoomDayChartItem> items
) {}
