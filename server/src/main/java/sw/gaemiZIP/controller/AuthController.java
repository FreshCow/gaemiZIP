package sw.gaemiZIP.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import sw.gaemiZIP.dto.LoginReqeustDto;
import sw.gaemiZIP.dto.LoginResponseDto;
import sw.gaemiZIP.dto.SignUpRequestDto;
import sw.gaemiZIP.service.AuthService;

@RestController//데이터(JSON)를 반환하는 컨트롤러 명시
@RequestMapping("/api/auth") // 이 컨트롤러의 모든 API 주소 앞에 "/api/auth"를 기본으로 붙임
@RequiredArgsConstructor //final 붙은 AuthService의 의존성 자동 주입
public class AuthController {

    private final AuthService authService;

    @PostMapping("/signup") //http post 메서드로 "/api/auth/signup" 주소로 요청이 오면 이 메서드를 실행
    public ResponseEntity<String> sighUp(@RequestBody SignUpRequestDto signUpRequestDto) {
        // @RequestBody: - 클라이언트(Next.js)가 보낸 JSON 데이터를 자바 객체(SignUpRequestDto)로 변환

        try{
            Long memberId = authService.signUp(signUpRequestDto);

            //성공 시 201 상태 코드 반환
            return ResponseEntity.status(HttpStatus.CREATED).body("회원가입 성공");
        }catch (IllegalArgumentException e){
            //실패 시 400 상태 코드 반환
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }

    }

    @PostMapping("/login") // POST /api/auth/login 으로 요청이 오면 실행
    public ResponseEntity<?> login(@RequestBody LoginReqeustDto reqeustDto) {
        try {
            //서비스 계층에서 검증 및 토큰 발급
            LoginResponseDto responseDto = authService.login(reqeustDto);

            //성공 시 200 상태 반환
            return ResponseEntity.ok(responseDto);
        }catch (IllegalArgumentException e){
            //비번 틀림, 아이디 없음 등의 에러 발생 시 401 에러 반환
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

}
