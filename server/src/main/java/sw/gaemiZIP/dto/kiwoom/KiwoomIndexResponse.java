package sw.gaemiZIP.dto.kiwoom;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class KiwoomIndexResponse {

    @JsonProperty("cur_prc") private String curPrc; //현재가
    @JsonProperty("pred_pre_sig") private String predPreSig; //전일대비기호
    @JsonProperty("pred_pre") private String predPre; //전일대비
    @JsonProperty("flu_rt") private String fluRt; //등락률
}
