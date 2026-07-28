package sw.gaemiZIP.entity.notification;

import jakarta.persistence.*;
import lombok.*;
import sw.gaemiZIP.entity.BaseTimeEntity;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Notification extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long memberId;

    @Column(nullable = false)
    private String stockCode;

    @Column(nullable = false)
    private String message;

    @Column(nullable = false)
    private boolean read;

    public void markAsRead() {
        this.read = true;
    }
}
