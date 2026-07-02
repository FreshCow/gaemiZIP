package sw.gaemiZIP.dto.stock;

import lombok.AllArgsConstructor;
import lombok.Getter;
import sw.gaemiZIP.entity.stock.Stock;
import sw.gaemiZIP.entity.stock.StockInfo;

@Getter
@AllArgsConstructor
public class StockInfoResponse {

    private String code;
    private String name;
    private String market;

    // 기본 정보
    private String setlMm;
    private String cap;
    private String floStk;
    private String crdRt;
    private String oyrHgst;
    private String oyrLwst;
    private String mac;
    private String macWght;
    private String forExhRt;
    private String replPric;

    // 재무 지표
    private String per;
    private String eps;
    private String roe;
    private String pbr;
    private String ev;
    private String bps;
    private String saleAmt;
    private String busPro;
    private String cupNga;

    // 가격 정보
    private String hgst250;
    private String lwst250;
    private String openPric;
    private String highPric;
    private String lowPric;
    private String uptPric;
    private String lstPric;
    private String basePric;
    private String expCntrPric;
    private String expCntrQty;

    // 250일 통계
    private String hgst250PricDt;
    private String hgst250PricPreRt;
    private String lwst250PricDt;
    private String lwst250PricPreRt;

    // 실시간 거래 정보
    private String curPric;
    private String preSig;
    private String predPre;
    private String fluRt;
    private String trdeQty;
    private String trdePre;
    private String favUnit;
    private String dstrStk;
    private String dstrRt;
    private String mktRt;

    public static StockInfoResponse from(StockInfo info, Stock stock) {
        return new StockInfoResponse(
                stock.getCode(),
                stock.getName(),
                stock.getMarket(),
                info.getSetlMm(),
                info.getCap(),
                info.getFloStk(),
                info.getCrdRt(),
                info.getOyrHgst(),
                info.getOyrLwst(),
                info.getMac(),
                info.getMacWght(),
                info.getForExhRt(),
                info.getReplPric(),
                info.getPer(),
                info.getEps(),
                info.getRoe(),
                info.getPbr(),
                info.getEv(),
                info.getBps(),
                info.getSaleAmt(),
                info.getBusPro(),
                info.getCupNga(),
                info.getHgst250(),
                info.getLwst250(),
                info.getOpenPric(),
                info.getHighPric(),
                info.getLowPric(),
                info.getUptPric(),
                info.getLstPric(),
                info.getBasePric(),
                info.getExpCntrPric(),
                info.getExpCntrQty(),
                info.getHgst250PricDt(),
                info.getHgst250PricPreRt(),
                info.getLwst250PricDt(),
                info.getLwst250PricPreRt(),
                info.getCurPric(),
                info.getPreSig(),
                info.getPredPre(),
                info.getFluRt(),
                info.getTrdeQty(),
                info.getTrdePre(),
                info.getFavUnit(),
                info.getDstrStk(),
                info.getDstrRt(),
                info.getMktRt()
        );
    }
}
