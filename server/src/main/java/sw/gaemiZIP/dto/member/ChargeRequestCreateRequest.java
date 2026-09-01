package sw.gaemiZIP.dto.member;

import lombok.Getter;
import sw.gaemiZIP.entity.member.ChargeAmount;

@Getter
public class ChargeRequestCreateRequest {
    private ChargeAmount amount;
}
