package sw.gaemiZIP.entity.stock;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
import sw.gaemiZIP.entity.member.MemberAnt;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(uniqueConstraints = @UniqueConstraint(columnNames = {"member_id", "stock_code"}))
@AllArgsConstructor
@Builder
public class Holding {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @JsonIgnore
    private MemberAnt member;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stock_code", nullable = false)
    @JsonIgnore
    private Stock stock;

    @Column(nullable = false)
    private String stockName;

    @Column(nullable = false)
    private int quantity;

    @Column(nullable = false, columnDefinition = "integer default 0")
    private int lockedQuantity;

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

    public void lock(int qty) {
        this.lockedQuantity += qty;
    }

    public void unlock(int qty) {
        this.lockedQuantity = Math.max(0, this.lockedQuantity - qty);
    }

    public Long getMemberId() { return member != null ? member.getId() : null; }
    public String getStockCode() { return stock != null ? stock.getCode() : null; }
}
