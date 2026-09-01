package sw.gaemiZIP.controller.member;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import sw.gaemiZIP.dto.member.ChargeRequestCreateRequest;
import sw.gaemiZIP.dto.member.ChargeRequestStatusResponse;
import sw.gaemiZIP.service.member.MemberBalanceChargeService;

import java.util.Map;

@RestController
@RequestMapping("/api/balance")
@RequiredArgsConstructor
public class MemberBalanceChargeController {

    private final MemberBalanceChargeService memberBalanceChargeService;

    @PostMapping("/charge-requests")
    public ResponseEntity<?> balanceChargeRequest(@RequestBody ChargeRequestCreateRequest request, Authentication auth) {
        try {
            memberBalanceChargeService.createChargeRequest(auth.getName(), request.getAmount());
            return ResponseEntity.ok().build();
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/charge-requests/me")
    public ResponseEntity<ChargeRequestStatusResponse> getMyChargeStatus(Authentication auth) {
        return ResponseEntity.ok(memberBalanceChargeService.getMyChargeStatus(auth.getName()));
    }

}
