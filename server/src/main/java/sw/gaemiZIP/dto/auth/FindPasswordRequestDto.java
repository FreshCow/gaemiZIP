package sw.gaemiZIP.dto.auth;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class FindPasswordRequestDto {

    private String username;
    private String securityCode;
    private String newPassword;

}
