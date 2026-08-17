package sw.gaemiZIP.repository.notification;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import sw.gaemiZIP.entity.notification.Notification;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    Page<Notification> findByMember_IdOrderByCreatedDateDesc(Long memberId, Pageable pageable);

    List<Notification> findByMember_IdAndReadFalse(Long memberId);

    long countByMember_IdAndReadFalse(Long memberId);

    void deleteAllByMember_Id(Long memberId);
}
