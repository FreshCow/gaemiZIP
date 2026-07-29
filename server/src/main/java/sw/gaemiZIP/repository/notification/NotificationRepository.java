package sw.gaemiZIP.repository.notification;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import sw.gaemiZIP.entity.notification.Notification;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    Page<Notification> findByMemberIdOrderByCreatedDateDesc(Long memberId, Pageable pageable);

    List<Notification> findByMemberIdAndReadFalse(Long memberId);

    long countByMemberIdAndReadFalse(Long memberId);

    void deleteAllByMemberId(Long memberId);
}
