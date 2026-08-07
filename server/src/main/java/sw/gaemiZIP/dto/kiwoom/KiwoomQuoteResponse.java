package sw.gaemiZIP.dto.kiwoom;


import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class KiwoomQuoteResponse {
    @JsonProperty("sel_fpr_bid")        private String selFprBid;
    @JsonProperty("sel_fpr_req")        private String selFprReq;
    @JsonProperty("sel_2th_pre_bid")    private String sel2thPreBid;
    @JsonProperty("sel_2th_pre_req")    private String sel2thPreReq;
    @JsonProperty("sel_3th_pre_bid")    private String sel3thPreBid;
    @JsonProperty("sel_3th_pre_req")    private String sel3thPreReq;
    @JsonProperty("sel_4th_pre_bid")    private String sel4thPreBid;
    @JsonProperty("sel_4th_pre_req")    private String sel4thPreReq;
    @JsonProperty("sel_5th_pre_bid")    private String sel5thPreBid;
    @JsonProperty("sel_5th_pre_req")    private String sel5thPreReq;
    @JsonProperty("sel_6th_pre_bid")    private String sel6thPreBid;
    @JsonProperty("sel_6th_pre_req")    private String sel6thPreReq;
    @JsonProperty("sel_7th_pre_bid")    private String sel7thPreBid;
    @JsonProperty("sel_7th_pre_req")    private String sel7thPreReq;
    @JsonProperty("sel_8th_pre_bid")    private String sel8thPreBid;
    @JsonProperty("sel_8th_pre_req")    private String sel8thPreReq;
    @JsonProperty("sel_9th_pre_bid")    private String sel9thPreBid;
    @JsonProperty("sel_9th_pre_req")    private String sel9thPreReq;
    @JsonProperty("sel_10th_pre_bid")   private String sel10thPreBid;
    @JsonProperty("sel_10th_pre_req")   private String sel10thPreReq;

    @JsonProperty("buy_fpr_bid")        private String buyFprBid;
    @JsonProperty("buy_fpr_req")        private String buyFprReq;
    @JsonProperty("buy_2th_pre_bid")    private String buy2thPreBid;
    @JsonProperty("buy_2th_pre_req")    private String buy2thPreReq;
    @JsonProperty("buy_3th_pre_bid")    private String buy3thPreBid;
    @JsonProperty("buy_3th_pre_req")    private String buy3thPreReq;
    @JsonProperty("buy_4th_pre_bid")    private String buy4thPreBid;
    @JsonProperty("buy_4th_pre_req")    private String buy4thPreReq;
    @JsonProperty("buy_5th_pre_bid")    private String buy5thPreBid;
    @JsonProperty("buy_5th_pre_req")    private String buy5thPreReq;
    @JsonProperty("buy_6th_pre_bid")    private String buy6thPreBid;
    @JsonProperty("buy_6th_pre_req")    private String buy6thPreReq;
    @JsonProperty("buy_7th_pre_bid")    private String buy7thPreBid;
    @JsonProperty("buy_7th_pre_req")    private String buy7thPreReq;
    @JsonProperty("buy_8th_pre_bid")    private String buy8thPreBid;
    @JsonProperty("buy_8th_pre_req")    private String buy8thPreReq;
    @JsonProperty("buy_9th_pre_bid")    private String buy9thPreBid;
    @JsonProperty("buy_9th_pre_req")    private String buy9thPreReq;
    @JsonProperty("buy_10th_pre_bid")   private String buy10thPreBid;
    @JsonProperty("buy_10th_pre_req")   private String buy10thPreReq;

    @JsonProperty("tot_sel_req")        private String totSelReq;
    @JsonProperty("tot_buy_req")        private String totBuyReq;

    @JsonProperty("return_code") private Integer returnCode;
    @JsonProperty("return_msg")  private String returnMsg;
}
