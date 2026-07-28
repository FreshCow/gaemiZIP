package sw.gaemiZIP.service.notification;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sw.gaemiZIP.dto.notification.NotificationResponse;
import sw.gaemiZIP.entity.member.MemberAnt;
import sw.gaemiZIP.entity.notification.Notification;
import sw.gaemiZIP.repository.member.MemberAntRepository;
import sw.gaemiZIP.repository.notification.NotificationRepository;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final MemberAntRepository memberAntRepository;

    // 예약 체결 등 이벤트 발생 시 알림 생성 — memberId를 이미 알고 있는 호출부(ReservationService)에서 직접 호출
    @Transactional
    public void notify(Long memberId, String stockCode, String message) {
        notificationRepository.save(Notification.builder()
                .memberId(memberId)
                .stockCode(stockCode)
                .message(message)
                .read(false)
                .build());
    }

    @Transactional(readOnly = true)
    public Page<NotificationResponse> getMyNotifications(String email, Pageable pageable) {
        Long memberId = findMemberId(email);
        return notificationRepository.findByMemberIdOrderByCreatedDateDesc(memberId, pageable)
                .map(NotificationResponse::from);
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(String email) {
        return notificationRepository.countByMemberIdAndReadFalse(findMemberId(email));
    }

    @Transactional
    public void markAsRead(String email, Long id) {
        Long memberId = findMemberId(email);
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new IllegalStateException("알림을 찾을 수 없습니다."));

        if (!notification.getMemberId().equals(memberId)) {
            throw new IllegalStateException("본인의 알림만 읽음 처리할 수 있습니다.");
        }

        notification.markAsRead();
    }

    @Transactional
    public void markAllAsRead(String email) {
        Long memberId = findMemberId(email);
        notificationRepository.findByMemberIdAndReadFalse(memberId)
                .forEach(Notification::markAsRead);
    }

    private Long findMemberId(String loginId) {
        MemberAnt member = memberAntRepository.findByUsernameOrEmail(loginId, loginId)
                .orElseThrow(() -> new IllegalStateException("회원을 찾을 수 없습니다."));
        return member.getId();
    }
}
