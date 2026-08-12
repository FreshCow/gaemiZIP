package sw.gaemiZIP.entity.stock;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
import sw.gaemiZIP.entity.BaseTimeEntity;
import sw.gaemiZIP.entity.member.MemberAnt;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(uniqueConstraints = @UniqueConstraint(columnNames = {"member_id", "stock_code"}))
public class Favorite extends BaseTimeEntity {

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

    @Builder
    public Favorite(MemberAnt member, Stock stock, String stockName) {
        this.member = member;
        this.stock = stock;
        this.stockName = stockName;
    }

    public Long getMemberId() { return member != null ? member.getId() : null; }
    public String getStockCode() { return stock != null ? stock.getCode() : null; }
}
