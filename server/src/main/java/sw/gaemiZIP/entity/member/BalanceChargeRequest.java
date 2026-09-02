package sw.gaemiZIP.entity.member;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
import java.time.LocalDateTime;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class BalanceChargeRequest{

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id",  nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @JsonIgnore
    private MemberAnt member; //작성자 계정

    //예산
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ChargeAmount amount;

    //예수금 충전 요청 상태
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ChargeRequestStatus status;

    @Column(nullable = false)
    private LocalDateTime requestedAt;

    private LocalDateTime processedAt;

    private String reason;



    @Builder
    public BalanceChargeRequest(MemberAnt member, ChargeAmount amount) {
        this.member = member;
        this.amount = amount;
        this.status = ChargeRequestStatus.PENDING;
        this.requestedAt = LocalDateTime.now();
    }

    //승인
    public void approve() {
        this.status = ChargeRequestStatus.APPROVED;
        this.processedAt = LocalDateTime.now();
    }

    //거절
    public void reject(String reason) {
        this.status = ChargeRequestStatus.REJECTED;
        this.reason = reason;
        this.processedAt = LocalDateTime.now();
    }

}
