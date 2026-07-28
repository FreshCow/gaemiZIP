package sw.gaemiZIP.entity.stock;

import jakarta.persistence.*;
import lombok.*;
import sw.gaemiZIP.entity.BaseTimeEntity;
import sw.gaemiZIP.entity.member.MemberAnt;

import java.time.LocalDateTime;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class ReservedOrder extends BaseTimeEntity {

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
    @Enumerated(EnumType.STRING)
    private TradeType tradeType;

    @Column(nullable = false)
    private Long targetPrice;

    @Column(nullable = false)
    private int quantity;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private TradeStatus status;

    @Column(nullable = true)
    private LocalDateTime excutedAt;

    public void excute() {
        this.status = TradeStatus.EXECUTED;
        this.excutedAt = LocalDateTime.now();
    }

    public void cancel() {
        this.status = TradeStatus.CANCELLED;
    }

}
