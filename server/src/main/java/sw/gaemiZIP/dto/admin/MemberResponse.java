package sw.gaemiZIP.dto.admin;

import lombok.Getter;
import sw.gaemiZIP.entity.member.MemberAnt;
import sw.gaemiZIP.entity.member.MemberStatus;
import sw.gaemiZIP.entity.member.Role;

import java.time.LocalDateTime;

// 비밀번호 해시를 제외하고 관리자 화면에 필요한 필드만 노출
@Getter
public class MemberResponse {
    private Long id;
    private String email;
    private String username;
    private String nickname;
    private Role role;
    private MemberStatus status;
    private String provider;
    private Long balance;
    private LocalDateTime createdDate;

    public static MemberResponse from(MemberAnt member) {
        MemberResponse dto = new MemberResponse();
        dto.id = member.getId();
        dto.email = member.getEmail();
        dto.username = member.getUsername();
        dto.nickname = member.getNickname();
        dto.role = member.getRole();
        dto.status = member.getStatus();
        dto.provider = member.getProvider();
        dto.balance = member.getBalance();
        dto.createdDate = member.getCreatedDate();
        return dto;
    }
}
