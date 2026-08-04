package sw.gaemiZIP.entity.admin;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import sw.gaemiZIP.entity.BaseTimeEntity;

// 잔고 조정/거래 삭제 등 되돌리기 어려운 관리자 조작 이력
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AdminAuditLog extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long adminId;

    @Column(nullable = false)
    private String adminNickname; // 조작 시점 닉네임 스냅샷

    @Column(nullable = false)
    private String action; // DELETE_TRADE, ADJUST_BALANCE

    @Column(nullable = false)
    private Long targetId; // 대상 거래 id 또는 회원 id

    @Column(nullable = false)
    private String detail;

    @Builder
    public AdminAuditLog(Long adminId, String adminNickname, String action, Long targetId, String detail) {
        this.adminId = adminId;
        this.adminNickname = adminNickname;
        this.action = action;
        this.targetId = targetId;
        this.detail = detail;
    }
}
