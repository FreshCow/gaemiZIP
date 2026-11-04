package sw.gaemiZIP.entity.board;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
import sw.gaemiZIP.entity.stock.Stock;

@Table(name = "board_stock_share", indexes = @Index(name = "idx_bss_board", columnList = "board_id"))
@Entity
@Getter
@Setter
public class BoardStockShare {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "board_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @JsonIgnore
    private Board board;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stock_code", nullable = false)
    @JsonIgnore
    private Stock stock;

    @Column(nullable = false)
    private String stockName;

    public Long getBoardId() { return board != null ? board.getId() : null; }
    public String getStockCode() { return stock != null ? stock.getCode() : null; }

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
