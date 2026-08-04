package sw.gaemiZIP.entity.board;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Getter
@Setter
public class BoardStockShare {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long boardId;

    @Column(nullable = false)
    private String stockCode;

    @Column(nullable = false)
    private String stockName;

    @Column(nullable = false)
    private int quantity;

    @Column(nullable = false)
    private long avgPrice;

    @Column(nullable = false)
    private long priceAtShare;      // 공유 시점 현재가

    @Column(nullable = false)
    private long profitLossAmount;  // (priceAtShare - avgPrice) * quantity

    @Column(nullable = false)
    private double profitLossRate;
}
