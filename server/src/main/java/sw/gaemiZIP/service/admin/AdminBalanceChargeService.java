package sw.gaemiZIP.service.admin;

import lombok.AllArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sw.gaemiZIP.dto.admin.AdminChargeRequestResponse;
import sw.gaemiZIP.entity.admin.AdminAuditLog;
import sw.gaemiZIP.entity.member.BalanceChargeRequest;
import sw.gaemiZIP.entity.member.ChargeRequestStatus;
import sw.gaemiZIP.entity.member.MemberAnt;
import sw.gaemiZIP.repository.admin.AdminAuditLogRepository;
import sw.gaemiZIP.repository.member.BalanceChargeRequestRepository;
import sw.gaemiZIP.service.notification.NotificationService;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminBalanceChargeService {

    private final BalanceChargeRequestRepository chargeRequestRepository;
    private final AdminAuditLogRepository adminAuditLogRepository;
    private final NotificationService notificationService;

    //승인
    @Transactional
    public void approve(Long requestId, MemberAnt admin) {
        BalanceChargeRequest request = chargeRequestRepository.findById(requestId).orElseThrow(() -> new IllegalStateException("요청을 찾을 수 없습니다."));

        if (request.getStatus() != ChargeRequestStatus.PENDING) {
            throw new IllegalStateException("이미 처리된 요청입니다.");
        }

        MemberAnt member = request.getMember();
        member.updateBalance(request.getAmount().getAmount());
        request.approve();

        notificationService.notify(member, String.format("예수금 충전 신청이 승인되어 %,d원이 지급되었습니다!", request.getAmount().getAmount()));

        adminAuditLogRepository.save(AdminAuditLog.builder()
                .admin(admin)
                .adminNickname(admin.getNickname())
                .action("APPROVE_CHARGE_REQUEST")
                .targetId(request.getId())
                .detail(String.format("memberId=%d, amount=%d, balanceAfter=%d",member.getId(), request.getAmount().getAmount(), member.getBalance()))
                .build());
    }

    @Transactional(readOnly = true)
    public List<AdminChargeRequestResponse> getPendingRequests() {
        return chargeRequestRepository.findAllByStatusOrderByRequestedAtAsc(ChargeRequestStatus.PENDING).stream()
                .map(AdminChargeRequestResponse::from)
                .toList();
    }

    @Transactional
    public void reject(Long requestId, MemberAnt admin, String reason) {
        BalanceChargeRequest request = chargeRequestRepository.findById(requestId).orElseThrow(() -> new IllegalStateException("요청을 찾을 수 없습니다."));

        if (request.getStatus() != ChargeRequestStatus.PENDING) {
            throw new IllegalStateException("이미 처리된 요청입니다.");
        }

        request.reject(reason);

        String reasonText = (reason == null || reason.isBlank()) ? "사유 없음" : reason;

        notificationService.notify(request.getMember(), "예수금 충전 신청이 거절되었습니다. 사유: " + reasonText);

        adminAuditLogRepository.save(AdminAuditLog.builder()
                .admin(admin)
                .adminNickname(admin.getNickname())
                .action("REJECT_CHARGE_REQUEST")
                .targetId(request.getId())
                .detail(String.format("memberId=%d, amount=%d, reason=%s",
                        request.getMember().getId(), request.getAmount().getAmount(), reason))
                .build());
    }
}
