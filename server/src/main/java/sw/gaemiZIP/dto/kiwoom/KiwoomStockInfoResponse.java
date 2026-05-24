package sw.gaemiZIP.dto.kiwoom;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.Setter;

/**
 * 키움 ka10001 (주식기본정보조회) 응답 바디 DTO
 */
@Getter
@Setter
public class KiwoomStockInfoResponse {

    @JsonProperty("stk_cd")    private String stkCd;
    @JsonProperty("stk_nm")    private String stkNm;
    @JsonProperty("setl_mm")   private String setlMm;
    @JsonProperty("fav")       private String fav;
    @JsonProperty("cap")       private String cap;
    @JsonProperty("flo_stk")   private String floStk;
    @JsonProperty("crd_rt")    private String crdRt;
    @JsonProperty("oyr_hgst")  private String oyrHgst;
    @JsonProperty("oyr_lwst")  private String oyrLwst;
    @JsonProperty("mac")       private String mac;
    @JsonProperty("mac_wght")  private String macWght;
    @JsonProperty("for_exh_rt") private String forExhRt;
    @JsonProperty("repl_pric") private String replPric;

    @JsonProperty("per")       private String per;
    @JsonProperty("eps")       private String eps;
    @JsonProperty("roe")       private String roe;
    @JsonProperty("pbr")       private String pbr;
    @JsonProperty("ev")        private String ev;
    @JsonProperty("bps")       private String bps;
    @JsonProperty("sale_amt")  private String saleAmt;
    @JsonProperty("bus_pro")   private String busPro;
    @JsonProperty("cup_nga")   private String cupNga;

    @JsonProperty("250hgst")           private String hgst250;
    @JsonProperty("250lwst")           private String lwst250;
    @JsonProperty("open_pric")         private String openPric;
    @JsonProperty("high_pric")         private String highPric;
    @JsonProperty("low_pric")          private String lowPric;
    @JsonProperty("upt_pric")          private String uptPric;
    @JsonProperty("lst_pric")          private String lstPric;
    @JsonProperty("base_pric")         private String basePric;
    @JsonProperty("exp_cntr_pric")     private String expCntrPric;
    @JsonProperty("exp_cntr_qty")      private String expCntrQty;

    @JsonProperty("250hgst_pric_dt")      private String hgst250PricDt;
    @JsonProperty("250hgst_pric_pre_rt")  private String hgst250PricPreRt;
    @JsonProperty("250lwst_pric_dt")      private String lwst250PricDt;
    @JsonProperty("250lwst_pric_pre_rt")  private String lwst250PricPreRt;

    @JsonProperty("cur_pric")  private String curPric;
    @JsonProperty("pre_sig")   private String preSig;
    @JsonProperty("pred_pre")  private String predPre;
    @JsonProperty("flu_rt")    private String fluRt;
    @JsonProperty("trde_qty")  private String trdeQty;
    @JsonProperty("trde_pre")  private String trdePre;
    @JsonProperty("fav_unit")  private String favUnit;
    @JsonProperty("dstr_stk")  private String dstrStk;
    @JsonProperty("dstr_rt")   private String dstrRt;
    @JsonProperty("flu_stk")   private String fluStk;
    @JsonProperty("mkt_rt")    private String mktRt;

    @JsonProperty("return_code") private Integer returnCode;
    @JsonProperty("return_msg")  private String returnMsg;
}
