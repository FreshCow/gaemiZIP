package sw.gaemiZIP.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor //기본 생성자 자동 생성
@AllArgsConstructor //테스트 환경에서 객체 쉽게 생성하기 위해 추가
public class LoginReqeustDto {
    private String email;
    private String password;
}
