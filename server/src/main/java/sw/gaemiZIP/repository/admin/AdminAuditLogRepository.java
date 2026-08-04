package sw.gaemiZIP.repository.admin;

import org.springframework.data.jpa.repository.JpaRepository;
import sw.gaemiZIP.entity.admin.AdminAuditLog;

import java.util.List;

public interface AdminAuditLogRepository extends JpaRepository<AdminAuditLog, Long> {

    List<AdminAuditLog> findAllByOrderByCreatedDateDesc();
}
