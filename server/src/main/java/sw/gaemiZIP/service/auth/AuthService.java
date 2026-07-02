package sw.gaemiZIP.service.auth;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import sw.gaemiZIP.dto.auth.LoginReqeustDto;
import sw.gaemiZIP.dto.auth.LoginResponseDto;
import sw.gaemiZIP.dto.auth.SignUpRequestDto;
import sw.gaemiZIP.entity.member.MemberAnt;
import sw.gaemiZIP.entity.member.MemberStatus;
import sw.gaemiZIP.entity.member.Role;
import sw.gaemiZIP.repository.stock.HoldingRepository;
import sw.gaemiZIP.repository.member.MemberAntRepository;
import sw.gaemiZIP.repository.stock.TradeHistoryRepository;
import sw.gaemiZIP.util.JwtUtil;

import java.util.Collections;

@Service // 서비스 계층 명시
@RequiredArgsConstructor // final이 붙은 필드의 생성자를 자동으로 만들어서 의존성 주입 편리
public class AuthService {

    private final MemberAntRepository memberAntRepository;
    private final BCryptPasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final TradeHistoryRepository tradeHistoryRepository;
    private final HoldingRepository holdingRepository;

    @Transactional
    public Long signUp(SignUpRequestDto signUpRequestDto) {

        if(memberAntRepository.findByUsername(signUpRequestDto.getUsername()).isPresent()){
            throw new IllegalStateException("이미 존재하는 아이디입니다.");
        }

        String encodedPassword = passwordEncoder.encode(signUpRequestDto.getPassword());

        MemberAnt memberAnt = MemberAnt.builder()
                .username(signUpRequestDto.getUsername())
                .password(encodedPassword)
                .role(Role.USER)
                .provider("LOCAL")
                .build();

        return memberAntRepository.save(memberAnt).getId();
    }

    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public LoginResponseDto login(LoginReqeustDto reqeustDto) {

        MemberAnt member = memberAntRepository.findByUsername(reqeustDto.getUsername())
                .orElseThrow(() -> new IllegalStateException("가입되지 않은 아이디입니다."));

        if (!passwordEncoder.matches(reqeustDto.getPassword(), member.getPassword())) {
            throw new IllegalStateException("비밀번호가 일치하지 않습니다.");
        }

        if(member.getStatus() == MemberStatus.SUSPENDED){
            throw new  IllegalStateException("정지된 계정입니다.");
        }

        String token = jwtUtil.generateToken(member.getUsername(), member.getRole().getKey());

        return new LoginResponseDto(token, member.getNickname(), member.getBalance(), member.getProvider(), member.getRole().getKey());
    }

    public void verifyPassword(String loginId, String password) {
        MemberAnt member = memberAntRepository.findByUsernameOrEmail(loginId, loginId)
                .orElseThrow(() -> new IllegalStateException("회원을 찾을 수 없습니다."));
        if (!passwordEncoder.matches(password, member.getPassword())) {
            throw new IllegalStateException("비밀번호가 일치하지 않습니다.");
        }
    }

    @Transactional
    public void withdraw(String loginId) {
        MemberAnt member = memberAntRepository.findByUsernameOrEmail(loginId, loginId)
                .orElseThrow(() -> new IllegalStateException("회원을 찾을 수 없습니다."));
        tradeHistoryRepository.deleteAllByMemberId(member.getId());
        holdingRepository.deleteAllByMemberId(member.getId());
        memberAntRepository.delete(member);
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
                    .balance(100000000L)
                    .provider("GOOGLE")
                    .role(Role.USER)
                    .build();
            return memberAntRepository.save(newMember);
        });

        if(member.getStatus() == MemberStatus.SUSPENDED){
            throw new  IllegalStateException("정지된 계정입니다.");
        }

        // 5. 우리 서비스 전용 JWT 발급
        String gaemiToken = jwtUtil.generateToken(member.getEmail(), member.getRole().getKey());

        return new LoginResponseDto(gaemiToken, member.getNickname(), member.getBalance(), member.getProvider(), member.getRole().getKey());
    }
}
