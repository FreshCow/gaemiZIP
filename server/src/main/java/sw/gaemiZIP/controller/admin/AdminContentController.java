package sw.gaemiZIP.controller.admin;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import sw.gaemiZIP.service.admin.AdminContentService;

import java.util.Map;

@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
public class AdminContentController {
    private final AdminContentService adminContentService;

    @PatchMapping("/board/{id}/blind")
    public ResponseEntity<?> updateBlindedBoard(
            @PathVariable Long id) {
        try{

            adminContentService.blindBoard(id);
            return ResponseEntity.ok().build();

        }catch (IllegalStateException e){
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PatchMapping("/comment/{id}/blind")
    public ResponseEntity<?> updateBlindedComment(
            @PathVariable Long id) {
        try{

            adminContentService.blindComment(id);
            return ResponseEntity.ok().build();

        }catch (IllegalStateException e){
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

}
