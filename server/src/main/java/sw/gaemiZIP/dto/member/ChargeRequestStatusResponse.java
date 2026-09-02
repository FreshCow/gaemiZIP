package sw.gaemiZIP.dto.member;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class ChargeRequestStatusResponse {
    private boolean canRequest;
    private LocalDateTime nextAvailableAt;
}
