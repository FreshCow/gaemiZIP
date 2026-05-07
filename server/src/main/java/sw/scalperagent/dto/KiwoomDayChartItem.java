package sw.scalperagent.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

// 일봉(ka10081) / 주봉(ka10082) 공용 캔들 항목
public record KiwoomDayChartItem(
        @JsonProperty("cur_prc")   String curPrc,
        @JsonProperty("trde_qty")  String trdeQty,
        @JsonProperty("dt")        String dt,         // yyyyMMdd
        @JsonProperty("open_pric") String openPric,
        @JsonProperty("high_pric") String highPric,
        @JsonProperty("low_pric")  String lowPric
) {}
