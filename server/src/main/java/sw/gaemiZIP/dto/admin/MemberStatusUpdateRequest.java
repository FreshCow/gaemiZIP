package sw.gaemiZIP.dto.admin;

import lombok.Getter;
import sw.gaemiZIP.entity.MemberStatus;

@Getter
public class MemberStatusUpdateRequest {
    private MemberStatus status;
}
