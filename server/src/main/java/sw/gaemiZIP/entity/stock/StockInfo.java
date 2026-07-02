package sw.gaemiZIP.entity.stock;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "stock_info")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockInfo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stock_code", unique = true)
    private Stock stock;

    // 기본 정보
    private String stkNm;
    private String setlMm;
    private String fav;
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
    private String fluStk;
    private String mktRt;

    private LocalDateTime updatedAt;

    @PrePersist
    @PreUpdate
    public void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
