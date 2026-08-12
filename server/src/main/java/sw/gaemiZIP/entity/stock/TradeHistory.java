package sw.gaemiZIP.entity.stock;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
import sw.gaemiZIP.entity.member.MemberAnt;

import java.time.LocalDateTime;

@Entity
@Table(name = "trade_history")
@Getter
@Setter
public class TradeHistory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 기존 레코드 호환을 위해 nullable — 신규 거래는 반드시 값이 채워짐
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id")
    @OnDelete(action = OnDeleteAction.CASCADE)
    @JsonIgnore
    private MemberAnt member;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stock_code", nullable = false)
    @JsonIgnore
    private Stock stock;

    @Column(nullable = false)
    private String stockName;

    public Long getMemberId() { return member != null ? member.getId() : null; }
    public String getStockCode() { return stock != null ? stock.getCode() : null; }

    @Column(nullable = false)
    private String tradeType;

    @Column(nullable = false)
    private Integer price; //체결단가

    @Column(nullable = false)
    private Integer quantity; //수량

    @Column(nullable = true)
    private Double profitRate; //매도 시 수익률

    @Column(nullable = false)
    private LocalDateTime tradeTime = LocalDateTime.now();
}
