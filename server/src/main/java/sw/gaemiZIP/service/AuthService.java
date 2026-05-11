package sw.gaemiZIP.service;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import sw.gaemiZIP.dto.LoginReqeustDto;
import sw.gaemiZIP.dto.LoginResponseDto;
import sw.gaemiZIP.dto.SignUpRequestDto;
import sw.gaemiZIP.entity.MemberAnt;
import sw.gaemiZIP.entity.Role;
import sw.gaemiZIP.repository.MemberAntRepository;
import sw.gaemiZIP.util.JwtUtil;

import java.util.Collections;

@Service // 서비스 계층 명시
@RequiredArgsConstructor // final이 붙은 필드의 생성자를 자동으로 만들어서 의존성 주입 편리
public class AuthService {

    private final MemberAntRepository memberAntRepository;
    private final BCryptPasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil; // 토큰 발급을 위해 추가 주입

    @Transactional // 하나의 트랜잭션으로 묶음 실패시 롤백
    public Long signUp(SignUpRequestDto signUpRequestDto) {

        //이메일 중복 체크
        if(memberAntRepository.findByEmail(signUpRequestDto.getEmail()).isPresent()){
            throw new IllegalStateException("이미 존재하는 이메일입니다.");
        }

        //비밀번호 단반향 암호화
        String encodedPassword = passwordEncoder.encode(signUpRequestDto.getPassword());

        MemberAnt memberAnt = MemberAnt.builder()
                .email(signUpRequestDto.getEmail())
                .password(encodedPassword)
                .role(Role.USER)
                .provider("LOCAL")
                .build();

        return memberAntRepository.save(memberAnt).getId();
    }

    @org.springframework.transaction.annotation.Transactional(readOnly = true)// 조회만 함
    public LoginResponseDto login(LoginReqeustDto reqeustDto) {

        //이메일 검증
        MemberAnt member = memberAntRepository.findByEmail(reqeustDto.getEmail())
                .orElseThrow(() -> new IllegalStateException("가입되지 않은 이메일입니다."));


        //비밀번호 검증
        // passwordEncoder.matches(입력된 평문 비번, DB에 저장된 암호화 비번)
        if (!passwordEncoder.matches(reqeustDto.getPassword(), member.getPassword())) {
            throw new IllegalStateException("비밀번호가 일치하지 않습니다.");
        }

        //인증 성공 시 JWT 토큰 생성
        String token = jwtUtil.generateToken(member.getEmail(), member.getRole().getKey());

        //토큰과 닉네임 반환
        return new LoginResponseDto(token, member.getNickname(), member.getBalance());
    }

    @Value("${oauth.google.client-id}")
    private String googleClientId;

    public LoginResponseDto googleLogin(String idTokenString) throws Exception {

        //구글 토큰 검증기 생성
        GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), new GsonFactory())
                .setAudience(Collections.singletonList(googleClientId))
                .build();

        //프론트가 보낸 토큰 검증
        GoogleIdToken idToken = verifier.verify(idTokenString);
        if(idToken == null){
            throw new IllegalStateException("유효하지 않은 구글 토큰입니다.");
        }

        //토큰에서 이메일, 이름 추출
        GoogleIdToken.Payload payload = idToken.getPayload();
        String email = payload.getEmail();
        String name = (String) payload.get("name");

        MemberAnt member = memberAntRepository.findByEmail(email).orElseGet(() -> {
            MemberAnt newMember = MemberAnt.builder()
                    .email(email)
                    .password("")
                    .nickname(name + " 개미")
                    .balance(100000000L) // 🟢 신규 가입 시 초기 자산 1억 지급
                    .provider("GOOGLE")
                    .role(Role.USER)
                    .build();
            return memberAntRepository.save(newMember);
        });

        // 5. 우리 서비스 전용 JWT 발급
        String gaemiToken = jwtUtil.generateToken(member.getEmail(), member.getRole().getKey());

        // 6. 🟢 기존 LoginResponseDto에 담아서 반환
        return new LoginResponseDto(gaemiToken, member.getNickname(), member.getBalance());
    }
}
