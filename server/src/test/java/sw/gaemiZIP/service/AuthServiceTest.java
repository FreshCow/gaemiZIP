package sw.gaemiZIP.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import sw.gaemiZIP.dto.auth.FindPasswordRequestDto;
import sw.gaemiZIP.dto.auth.SignUpRequestDto;
import sw.gaemiZIP.dto.auth.SignUpResponseDto;
import sw.gaemiZIP.entity.member.MemberAnt;
import sw.gaemiZIP.entity.member.Role;
import sw.gaemiZIP.repository.member.MemberAntRepository;
import sw.gaemiZIP.service.auth.AuthService;

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
        //가짜 환경설정 (아이디 8자 영문+숫자, 비밀번호 확인 일치)
        SignUpRequestDto requestDto = new SignUpRequestDto("testant1", "1234", "1234");

        //아이디 중복 조회하면 빈 값이 나온다고 가정
        given(memberAntRepository.findByUsername(requestDto.getUsername())).willReturn(Optional.empty());

        //비밀번호/보안코드 인코더를 호출하면 암호화된 문자열이 나온다고 가정
        given(passwordEncoder.encode(any())).willReturn("encoded_value");

        MemberAnt saveMemberAnt = MemberAnt.builder()
                .username(requestDto.getUsername())
                .password("encoded_value")
                .role(Role.USER)
                .provider("LOCAL")
                .securityCodeHash("encoded_value")
                .build();

        ReflectionTestUtils.setField(saveMemberAnt, "id", 1L);

        given(memberAntRepository.save(any(MemberAnt.class))).willReturn(saveMemberAnt);

        //실제 서비스 메서드 실행
        SignUpResponseDto response = authService.signUp(requestDto);

        //검증
        assertThat(response.getSecurityCode()).hasSize(20); // 20자리 보안코드가 평문으로 반환됨
        verify(passwordEncoder).encode("1234"); // 비밀번호 암호화 로직이 제대로 호출된지 확인
        verify(memberAntRepository).save(any(MemberAnt.class)); //DB 저장 로직이 호출되었는지 확인
    }

    @Test
    @DisplayName("회원가입 실패 테스트 - 아이디 중복")
    void signUpFailTest() {
        // 1. Given
        SignUpRequestDto requestDto = new SignUpRequestDto("duplicatex", "1234", "1234");
        MemberAnt existingMember = MemberAnt.builder().username("duplicatex").build();

        // 해당 아이디로 조회하면 이미 존재하는 회원이 나온다고 가정 (중복 발생)
        given(memberAntRepository.findByUsername(requestDto.getUsername())).willReturn(Optional.of(existingMember));

        // 2. When & 3. Then (예외가 정상적으로 터지는지 검증)
        assertThatThrownBy(() -> authService.signUp(requestDto)) // - 이 메서드를 실행했을 때
                .isInstanceOf(IllegalStateException.class)       // - 이 예외 클래스가 터져야 하고
                .hasMessage("이미 존재하는 아이디입니다.");             // - 에러 메시지는 이것이어야 함
    }

    @Test
    @DisplayName("회원가입 실패 테스트 - 비밀번호 확인 불일치")
    void signUpPasswordMismatchTest() {
        SignUpRequestDto requestDto = new SignUpRequestDto("testant1", "1234", "5678");

        assertThatThrownBy(() -> authService.signUp(requestDto))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("비밀번호가 일치하지 않습니다.");
    }

    @Test
    @DisplayName("회원가입 실패 테스트 - 아이디 형식 오류")
    void signUpInvalidUsernameTest() {
        SignUpRequestDto requestDto = new SignUpRequestDto("ab", "1234", "1234");

        assertThatThrownBy(() -> authService.signUp(requestDto))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("아이디는 영문+숫자 4~20자로 입력해주세요.");
    }

    @Test
    @DisplayName("비밀번호 재설정 성공 테스트")
    void resetPasswordTest() {
        MemberAnt member = MemberAnt.builder()
                .username("testant1")
                .password("old_encoded")
                .securityCodeHash("encoded_code")
                .build();

        given(memberAntRepository.findByUsername("testant1")).willReturn(Optional.of(member));
        given(passwordEncoder.matches("REALCODE12345678ABCD", "encoded_code")).willReturn(true);
        given(passwordEncoder.encode("newPassword1")).willReturn("new_encoded");

        authService.resetPassword(new FindPasswordRequestDto("testant1", "REALCODE12345678ABCD", "newPassword1"));

        assertThat(member.getPassword()).isEqualTo("new_encoded");
    }

    @Test
    @DisplayName("비밀번호 재설정 실패 테스트 - 보안코드 불일치")
    void resetPasswordWrongCodeTest() {
        MemberAnt member = MemberAnt.builder()
                .username("testant1")
                .password("old_encoded")
                .securityCodeHash("encoded_code")
                .build();

        given(memberAntRepository.findByUsername("testant1")).willReturn(Optional.of(member));
        given(passwordEncoder.matches("WRONGCODE", "encoded_code")).willReturn(false);

        assertThatThrownBy(() -> authService.resetPassword(
                new FindPasswordRequestDto("testant1", "WRONGCODE", "newPassword1")))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("아이디 또는 보안코드가 일치하지 않습니다.");
    }

    @Test
    @DisplayName("보안코드 검증 성공 테스트")
    void verifySecurityCodeTest() {
        MemberAnt member = MemberAnt.builder()
                .username("testant1")
                .securityCodeHash("encoded_code")
                .build();

        given(memberAntRepository.findByUsername("testant1")).willReturn(Optional.of(member));
        given(passwordEncoder.matches("REALCODE12345678ABCD", "encoded_code")).willReturn(true);

        authService.verifySecurityCode("testant1", "REALCODE12345678ABCD");
        // 예외 없이 통과하면 성공
    }

    @Test
    @DisplayName("보안코드 검증 실패 테스트 - 존재하지 않는 아이디")
    void verifySecurityCodeUnknownUserTest() {
        given(memberAntRepository.findByUsername("nobody")).willReturn(Optional.empty());

        assertThatThrownBy(() -> authService.verifySecurityCode("nobody", "ANYCODE"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("가입되지 않은 아이디입니다.");
    }

}