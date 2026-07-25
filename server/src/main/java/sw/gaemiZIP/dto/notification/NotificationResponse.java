package sw.gaemiZIP.dto.notification;

import lombok.Builder;
import lombok.Getter;
import sw.gaemiZIP.entity.notification.Notification;

import java.time.LocalDateTime;

@Getter
@Builder
public class NotificationResponse {

    private Long id;
    private String stockCode;
    private String message;
    private boolean read;
    private LocalDateTime createdAt;

    public static NotificationResponse from(Notification n) {
        return NotificationResponse.builder()
                .id(n.getId())
                .stockCode(n.getStockCode())
                .message(n.getMessage())
                .read(n.isRead())
                .createdAt(n.getCreatedDate())
                .build();
    }
}
