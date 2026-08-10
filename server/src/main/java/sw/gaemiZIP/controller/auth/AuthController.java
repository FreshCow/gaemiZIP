package sw.gaemiZIP.controller.auth;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import sw.gaemiZIP.dto.auth.FindPasswordRequestDto;
import sw.gaemiZIP.dto.auth.GoogleLoginRequest;
import sw.gaemiZIP.dto.auth.LoginReqeustDto;
import sw.gaemiZIP.dto.auth.LoginResponseDto;
import sw.gaemiZIP.dto.auth.SignUpRequestDto;
import sw.gaemiZIP.dto.auth.SignUpResponseDto;
import sw.gaemiZIP.dto.auth.VerifySecurityCodeRequestDto;
import sw.gaemiZIP.service.auth.AuthService;

import java.util.Map;

@RestController//데이터(JSON)를 반환하는 컨트롤러 명시
@RequestMapping("/api/auth") // 이 컨트롤러의 모든 API 주소 앞에 "/api/auth"를 기본으로 붙임
@RequiredArgsConstructor //final 붙은 AuthService의 의존성 자동 주입
public class AuthController {

    private final AuthService authService;

    @PostMapping("/signup") //http post 메서드로 "/api/auth/signup" 주소로 요청이 오면 이 메서드를 실행
    public ResponseEntity<?> sighUp(@RequestBody SignUpRequestDto signUpRequestDto) {
        // @RequestBody: - 클라이언트(Next.js)가 보낸 JSON 데이터를 자바 객체(SignUpRequestDto)로 변환

        try{
            SignUpResponseDto responseDto = authService.signUp(signUpRequestDto);
            return ResponseEntity.status(HttpStatus.CREATED).body(responseDto);
        }catch (IllegalStateException e){
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }

    }

    //패스워드 찾기
    @PostMapping("/find-password")
    public ResponseEntity<?> findPassword(@RequestBody FindPasswordRequestDto requestDto) {
        try {
            authService.resetPassword(requestDto);
            return ResponseEntity.ok().build();
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    //보안코드확인
    @PostMapping("/verify-security-code")
    public ResponseEntity<?> verifySecurityCode(@RequestBody VerifySecurityCodeRequestDto requestDto) {
        try {
            authService.verifySecurityCode(requestDto.getUsername(), requestDto.getSecurityCode());
            return ResponseEntity.ok().build();
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    //로그인
    @PostMapping("/login") // POST /api/auth/login 으로 요청이 오면 실행
    public ResponseEntity<?> login(@RequestBody LoginReqeustDto reqeustDto) {
        try {
            LoginResponseDto responseDto = authService.login(reqeustDto);
            return ResponseEntity.ok(responseDto);
        }catch (IllegalStateException e){
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    //구글계정으로 로그인
    @PostMapping("/google")
    public ResponseEntity<?> googleLogin(@RequestBody GoogleLoginRequest request) {
        try {
            LoginResponseDto responseDto = authService.googleLogin(request.getIdToken());
            return ResponseEntity.ok(responseDto);
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("구글 로그인 처리 중 오류가 발생했습니다.");
        }
    }

    //패스워드 확인
    @PostMapping("/verify-password")
    public ResponseEntity<?> verifyPassword(Authentication auth, @RequestBody Map<String, String> body) {
        try {
            authService.verifyPassword(auth.getName(), body.get("password"));
            return ResponseEntity.ok().build();
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    //회원탈퇴
    @DeleteMapping("/me")
    public ResponseEntity<?> withdraw(Authentication auth) {
        try {
            authService.withdraw(auth.getName());
            return ResponseEntity.ok("회원 탈퇴가 완료되었습니다.");
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    //로그아웃
    @PostMapping("/logout")
    public ResponseEntity<?> logout(Authentication auth) {
        authService.logout(auth.getName());
        return ResponseEntity.ok().build();
    }

    //패스워드 변경
    @PutMapping("/password")
    public ResponseEntity<?> changePassword(Authentication auth, @RequestBody Map<String, String> body) {
        try{
            authService.changePassword(auth.getName(), body.get("currentPassword"), body.get("newPassword"));
            return ResponseEntity.ok().build();
        }
        catch (IllegalStateException e){
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }
}
