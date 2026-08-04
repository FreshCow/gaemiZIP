package sw.gaemiZIP.dto.admin;

import lombok.Getter;
import sw.gaemiZIP.entity.admin.AdminAuditLog;

import java.time.LocalDateTime;

@Getter
public class AdminAuditLogResponse {
    private Long id;
    private Long adminId;
    private String adminNickname;
    private String action;
    private Long targetId;
    private String detail;
    private LocalDateTime createdAt;

    public static AdminAuditLogResponse from(AdminAuditLog log) {
        AdminAuditLogResponse dto = new AdminAuditLogResponse();
        dto.id = log.getId();
        dto.adminId = log.getAdminId();
        dto.adminNickname = log.getAdminNickname();
        dto.action = log.getAction();
        dto.targetId = log.getTargetId();
        dto.detail = log.getDetail();
        dto.createdAt = log.getCreatedDate();
        return dto;
    }
}
