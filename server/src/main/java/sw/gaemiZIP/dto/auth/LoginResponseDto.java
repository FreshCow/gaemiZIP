package sw.gaemiZIP.dto.auth;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor //테스트 환경에서 객체 쉽게 생성하기 위해 추가
public class LoginResponseDto {
    private String token;
    private String nickname;
    private Long balance;
    private String provider;
    private String role; // ROLE_USER / ROLE_ADMIN — JWT의 role claim과 동일한 값
}
