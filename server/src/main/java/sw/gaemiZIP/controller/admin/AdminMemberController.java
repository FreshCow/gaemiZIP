package sw.gaemiZIP.controller.admin;


import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import sw.gaemiZIP.dto.admin.MemberStatusUpdateRequest;
import sw.gaemiZIP.service.admin.AdminMemberService;

import java.util.Map;

@RestController
@RequestMapping("/admin/members")
@RequiredArgsConstructor
public class AdminMemberController {
    private final AdminMemberService adminMemberService;

    @PatchMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(
            @PathVariable Long id,
            @RequestBody MemberStatusUpdateRequest request){
        try{
            adminMemberService.updateStatus(id, request.getStatus());
            return ResponseEntity.ok().build();
        }catch (IllegalStateException e){
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
