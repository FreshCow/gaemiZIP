package sw.gaemiZIP.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor //테스트 환경에서 객체 쉽게 생성하기 위해 추가
public class LoginResponseDto {
    private String token;
    private String nickname;
    private Long balance;
}
