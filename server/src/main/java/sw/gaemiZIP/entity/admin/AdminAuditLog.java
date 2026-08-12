package sw.gaemiZIP.entity.admin;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import sw.gaemiZIP.entity.BaseTimeEntity;
import sw.gaemiZIP.entity.member.MemberAnt;

// 잔고 조정/거래 삭제 등 되돌리기 어려운 관리자 조작 이력
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AdminAuditLog extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "admin_id", nullable = false)
    @JsonIgnore
    private MemberAnt admin; // 감사 이력 보존 목적 — admin 계정 삭제를 막는 게 의도적으로 맞아 ON DELETE 정책 없음(RESTRICT)

    @Column(nullable = false)
    private String adminNickname; // 조작 시점 닉네임 스냅샷

    @Column(nullable = false)
    private String action; // DELETE_TRADE, ADJUST_BALANCE

    // targetId는 action에 따라 TradeHistory.id 또는 MemberAnt.id를 가리키는 다형적 참조라 FK로 표현하지 않음
    @Column(nullable = false)
    private Long targetId; // 대상 거래 id 또는 회원 id

    @Column(nullable = false)
    private String detail;

    @Builder
    public AdminAuditLog(MemberAnt admin, String adminNickname, String action, Long targetId, String detail) {
        this.admin = admin;
        this.adminNickname = adminNickname;
        this.action = action;
        this.targetId = targetId;
        this.detail = detail;
    }

    public Long getAdminId() { return admin != null ? admin.getId() : null; }
}
