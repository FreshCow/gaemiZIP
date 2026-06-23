package sw.gaemiZIP.controller.admin;


import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import sw.gaemiZIP.dto.admin.MemberResponse;
import sw.gaemiZIP.dto.admin.MemberStatusUpdateRequest;
import sw.gaemiZIP.service.admin.AdminMemberService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin/members")
@RequiredArgsConstructor
public class AdminMemberController {
    private final AdminMemberService adminMemberService;

    // 회원 전체 목록 조회
    @GetMapping
    public ResponseEntity<List<MemberResponse>> getAllMembers() {
        return ResponseEntity.ok(adminMemberService.getAllMembers());
    }

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
