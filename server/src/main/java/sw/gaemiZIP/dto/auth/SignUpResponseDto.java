package sw.gaemiZIP.dto.auth;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class SignUpResponseDto {

    private String securityCode; // 이 응답에서만 평문으로 노출됨, 이후엔 해시로만 존재

}
