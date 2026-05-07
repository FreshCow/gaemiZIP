package sw.gaemiZIP.service;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import sw.gaemiZIP.dto.LoginReqeustDto;
import sw.gaemiZIP.dto.LoginResponseDto;
import sw.gaemiZIP.dto.SignUpRequestDto;
import sw.gaemiZIP.entity.MemberAnt;
import sw.gaemiZIP.entity.Role;
import sw.gaemiZIP.repository.MemberAntRepository;
import sw.gaemiZIP.util.JwtUtil;

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
        return new LoginResponseDto(token, member.getNickname());
    }
}
