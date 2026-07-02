package sw.gaemiZIP.entity.stock;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Holding {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long memberId;

    @Column(nullable = false)
    private String stockCode;

    @Column(nullable = false)
    private String stockName;

    @Column(nullable = false)
    private int quantity;

    @Column(nullable = false)
    private long avgPrice; // 가중평균 매수단가

    // 매수: 가중평균 단가 재계산 후 수량 증가
    public void addPurchase(int qty, long price) {
        long totalCost = (long) this.quantity * this.avgPrice + (long) qty * price;
        this.quantity += qty;
        this.avgPrice = totalCost / this.quantity;
    }

    // 매도: 수량만 감소 (평균단가 유지)
    public void sell(int qty) {
        this.quantity -= qty;
    }
}
