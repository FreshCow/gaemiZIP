package sw.gaemiZIP.dto.admin;

import lombok.Getter;
import sw.gaemiZIP.entity.member.MemberStatus;

@Getter
public class MemberStatusUpdateRequest {
    private MemberStatus status;
}
