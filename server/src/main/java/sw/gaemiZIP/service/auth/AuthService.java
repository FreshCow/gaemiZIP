package sw.gaemiZIP.service.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import sw.gaemiZIP.dto.auth.FindPasswordRequestDto;
import sw.gaemiZIP.dto.auth.LoginReqeustDto;
import sw.gaemiZIP.dto.auth.LoginResponseDto;
import sw.gaemiZIP.dto.auth.SignUpRequestDto;
import sw.gaemiZIP.dto.auth.SignUpResponseDto;
import sw.gaemiZIP.entity.member.MemberAnt;
import sw.gaemiZIP.entity.member.MemberStatus;
import sw.gaemiZIP.entity.member.Role;
import sw.gaemiZIP.repository.stock.HoldingRepository;
import sw.gaemiZIP.repository.member.MemberAntRepository;
import sw.gaemiZIP.repository.stock.TradeHistoryRepository;
import sw.gaemiZIP.util.JwtUtil;
import sw.gaemiZIP.util.SecurityCodeGenerator;

import java.util.Collections;
import java.util.concurrent.TimeUnit;
import java.util.regex.Pattern;

@Slf4j
@Service // 서비스 계층 명시
@RequiredArgsConstructor // final이 붙은 필드의 생성자를 자동으로 만들어서 의존성 주입 편리
public class AuthService {

    private final MemberAntRepository memberAntRepository;
    private final BCryptPasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final TradeHistoryRepository tradeHistoryRepository;
    private final HoldingRepository holdingRepository;

    private final StringRedisTemplate redisTemplate;
    private static final String LOGIN_CACHE_KEY = "auth:session:";

    private static final Pattern USERNAME_PATTERN = Pattern.compile("^[a-zA-Z0-9]{4,20}$");

    @Value("${jwt.expiration_time}")
    private long expirationTime;


    @Transactional
    public SignUpResponseDto signUp(SignUpRequestDto signUpRequestDto) {

        if (!USERNAME_PATTERN.matcher(signUpRequestDto.getUsername()).matches()) {
            throw new IllegalStateException("아이디는 영문+숫자 4~20자로 입력해주세요.");
        }

        if (!signUpRequestDto.getPassword().equals(signUpRequestDto.getPasswordConfirm())) {
            throw new IllegalStateException("비밀번호가 일치하지 않습니다.");
        }

        if(memberAntRepository.findByUsername(signUpRequestDto.getUsername()).isPresent()){
            throw new IllegalStateException("이미 존재하는 아이디입니다.");
        }

        String encodedPassword = passwordEncoder.encode(signUpRequestDto.getPassword());
        String securityCode = SecurityCodeGenerator.generate();
        String encodedSecurityCode = passwordEncoder.encode(securityCode);

        MemberAnt memberAnt = MemberAnt.builder()
                .username(signUpRequestDto.getUsername())
                .password(encodedPassword)
                .role(Role.USER)
                .provider("LOCAL")
                .securityCodeHash(encodedSecurityCode)
                .build();

        memberAntRepository.save(memberAnt);

        return new SignUpResponseDto(securityCode);
    }

    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public void verifySecurityCode(String username, String securityCode) {
        findMemberBySecurityCode(username, securityCode);
    }

    @Transactional
    public void resetPassword(FindPasswordRequestDto requestDto) {
        MemberAnt member = findMemberBySecurityCode(requestDto.getUsername(), requestDto.getSecurityCode());
        member.changePassword(passwordEncoder.encode(requestDto.getNewPassword()));
    }

    private MemberAnt findMemberBySecurityCode(String username, String securityCode) {
        MemberAnt member = memberAntRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalStateException("가입되지 않은 아이디입니다."));

        if (member.getSecurityCodeHash() == null
                || !passwordEncoder.matches(securityCode, member.getSecurityCodeHash())) {
            throw new IllegalStateException("아이디 또는 보안코드가 일치하지 않습니다.");
        }

        return member;
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

        String sessionKey = LOGIN_CACHE_KEY + member.getUsername();
        if(Boolean.TRUE.equals(redisTemplate.hasKey(sessionKey))){
            throw new IllegalStateException("이미 다른 곳에서 로그인 중입니다.");
        }

        String token = jwtUtil.generateToken(member.getUsername(), member.getRole().getKey());
        redisTemplate.opsForValue().set(sessionKey, token, expirationTime, TimeUnit.MILLISECONDS);

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

    //구글 계정으로 로그인
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

        String sessionKey = LOGIN_CACHE_KEY + member.getEmail();
        if (Boolean.TRUE.equals(redisTemplate.hasKey(sessionKey))) {
            throw new IllegalStateException("이미 다른 곳에서 로그인 중입니다.");
        }

        String gaemiToken = jwtUtil.generateToken(member.getEmail(), member.getRole().getKey());
        redisTemplate.opsForValue().set(sessionKey, gaemiToken, expirationTime, TimeUnit.MILLISECONDS);

        return new LoginResponseDto(gaemiToken, member.getNickname(), member.getBalance(), member.getProvider(), member.getRole().getKey());
    }

    //로그아웃
    public void logout(String loginId) {
        redisTemplate.delete(LOGIN_CACHE_KEY + loginId);
    }
}
