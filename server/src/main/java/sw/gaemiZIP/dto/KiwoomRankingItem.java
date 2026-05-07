package sw.gaemiZIP.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record KiwoomRankingItem(
        @JsonProperty("stk_nm")         String stkNm,
        @JsonProperty("stk_cd")         String stkCd,
        @JsonProperty("bigd_rank")       String bigdRank,
        @JsonProperty("past_curr_prc")   String pastCurrPrc,
        @JsonProperty("base_comp_sign")  String baseCompSign,
        @JsonProperty("base_comp_chgr")  String baseCompChgr
) {}
