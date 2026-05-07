package sw.gaemiZIP.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "trade_history")
@Getter
@Setter
public class TradeHistory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String stockCode;

    @Column(nullable = false)
    private String stockName;

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
