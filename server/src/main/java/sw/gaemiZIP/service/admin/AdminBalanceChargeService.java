package sw.gaemiZIP.service.admin;

import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sw.gaemiZIP.dto.admin.AdminChargeRequestResponse;
import sw.gaemiZIP.entity.admin.AdminAuditLog;
import sw.gaemiZIP.entity.member.BalanceChargeRequest;
import sw.gaemiZIP.entity.member.ChargeRequestStatus;
import sw.gaemiZIP.entity.member.MemberAnt;
import sw.gaemiZIP.repository.admin.AdminAuditLogRepository;
import sw.gaemiZIP.repository.member.BalanceChargeRequestRepository;

import java.util.List;

@Service
@AllArgsConstructor
public class AdminBalanceChargeService {

    private final BalanceChargeRequestRepository chargeRequestRepository;
    private final AdminAuditLogRepository adminAuditLogRepository;

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
        BalanceChargeRequest request = chargeRequestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalStateException("요청을 찾을 수 없습니다."));

        if (request.getStatus() != ChargeRequestStatus.PENDING) {
            throw new IllegalStateException("이미 처리된 요청입니다.");
        }

        request.reject(reason);

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
