package sw.gaemiZIP.dto.kiwoom;

import com.fasterxml.jackson.annotation.JsonProperty;

public record KiwoomMinuteChartItem(
        @JsonProperty("cur_prc")   String curPrc,
        @JsonProperty("trde_qty")  String trdeQty,
        @JsonProperty("cntr_tm")   String cntrTm,    // yyyyMMddHHmmss
        @JsonProperty("open_pric") String openPric,
        @JsonProperty("high_pric") String highPric,
        @JsonProperty("low_pric")  String lowPric
) {}
