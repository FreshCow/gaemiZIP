package sw.gaemiZIP.controller.admin;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import sw.gaemiZIP.dto.admin.AdminChargeRequestResponse;
import sw.gaemiZIP.dto.admin.ChargeRequestRejectRequest;
import sw.gaemiZIP.entity.member.MemberAnt;
import sw.gaemiZIP.repository.member.MemberAntRepository;
import sw.gaemiZIP.service.admin.AdminBalanceChargeService;

import java.util.List;
import java.util.Map;


@RestController
@RequestMapping("/api/admin/balance-charges")
@RequiredArgsConstructor
public class AdminBalanceChargeController {

    private final AdminBalanceChargeService adminBalanceChargeService;
    private final MemberAntRepository memberAntRepository;

    @GetMapping
    public ResponseEntity<List<AdminChargeRequestResponse>> getPendingRequests() {
        return ResponseEntity.ok(adminBalanceChargeService.getPendingRequests());
    }

    @PatchMapping("/{id}/approve")
    public ResponseEntity<?> approve(@PathVariable Long id, Authentication auth) {
        try {
            MemberAnt admin = memberAntRepository.findByUsernameOrEmail(auth.getName(), auth.getName())
                    .orElseThrow(() -> new IllegalStateException("관리자 계정을 찾을 수 없습니다."));
            adminBalanceChargeService.approve(id, admin);
            return ResponseEntity.ok().build();
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PatchMapping("/{id}/reject")
    public ResponseEntity<?> reject(@PathVariable Long id, @RequestBody ChargeRequestRejectRequest request, Authentication auth) {
        try {
            MemberAnt admin = memberAntRepository.findByUsernameOrEmail(auth.getName(), auth.getName())
                    .orElseThrow(() -> new IllegalStateException("관리자 계정을 찾을 수 없습니다."));
            adminBalanceChargeService.reject(id, admin, request.getReason());
            return ResponseEntity.ok().build();
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }


}
