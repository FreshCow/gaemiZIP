package sw.gaemiZIP.dto.auth;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class VerifySecurityCodeRequestDto {

    private String username;
    private String securityCode;

}
