package sw.gaemiZIP.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import sw.gaemiZIP.dto.auth.SignUpRequestDto;
import sw.gaemiZIP.entity.MemberAnt;
import sw.gaemiZIP.entity.Role;
import sw.gaemiZIP.repository.member.MemberAntRepository;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.AssertionsForClassTypes.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock // 가짜 리포 객체 생성
    private MemberAntRepository memberAntRepository;

    @Mock // 가짜 인코더 객체 생성
    private BCryptPasswordEncoder passwordEncoder;

    @InjectMocks // @Mock 가짜 객체들을 AuthService 객체 안에 자동 주입
    private AuthService authService;

    @Test
    @DisplayName("회원가입 성공 테스트")
    void auth() {
        //가짜 환경설정
        SignUpRequestDto requestDto = new SignUpRequestDto("test@ant.com", "1234");

        //이메일 중복 조회하면 빈 값이 나온다고 가정
        given(memberAntRepository.findByEmail(requestDto.getEmail())).willReturn(Optional.empty());

        //비밀번호 인코더를 호출하면 암호화된 문자열이 나온다고 가정
        given(passwordEncoder.encode(requestDto.getPassword())).willReturn("encoded_password123");

        MemberAnt saveMemberAnt = MemberAnt.builder()
                .email(requestDto.getEmail())
                .password("encoded_password123")
                .role(Role.USER)
                .provider("LOCAL")
                .build();

        ReflectionTestUtils.setField(saveMemberAnt, "id", 1L);

        given(memberAntRepository.save(any(MemberAnt.class))).willReturn(saveMemberAnt);

        //실제 서비스 메서드 실행
        Long saveId = authService.signUp(requestDto);

        //검증
        assertThat(saveId).isEqualTo(1L); //반환된 ID가 1L이 맞는지 확인
        verify(passwordEncoder).encode("1234"); // 비밀번호 암호화 로직이 제대로 호출된지 확인
        verify(memberAntRepository).save(any(MemberAnt.class)); //DB 저장 로직이 호출되었는지 확인
    }

    @Test
    @DisplayName("회원가입 실패 테스트 - 이메일 중복")
    void signUpFailTest() {
        // 1. Given
        SignUpRequestDto requestDto = new SignUpRequestDto("duplicate@ant.com", "1234");
        MemberAnt existingMember = MemberAnt.builder().email("duplicate@ant.com").build();

        // 해당 이메일로 조회하면 이미 존재하는 회원이 나온다고 가정 (중복 발생)
        given(memberAntRepository.findByEmail(requestDto.getEmail())).willReturn(Optional.of(existingMember));

        // 2. When & 3. Then (예외가 정상적으로 터지는지 검증)
        assertThatThrownBy(() -> authService.signUp(requestDto)) // - 이 메서드를 실행했을 때
                .isInstanceOf(IllegalArgumentException.class)    // - 이 예외 클래스가 터져야 하고
                .hasMessage("이미 존재하는 이메일입니다.");           // - 에러 메시지는 이것이어야 함
    }

}