package sw.gaemiZIP.dto.admin;

import lombok.Builder;
import lombok.Getter;
import sw.gaemiZIP.entity.member.BalanceChargeRequest;

import java.time.LocalDateTime;

@Getter
@Builder
public class AdminChargeRequestResponse {
    private Long id;
    private Long memberId;
    private String memberNickname;
    private long amount;
    private LocalDateTime requestedAt;

    public static AdminChargeRequestResponse from(BalanceChargeRequest r) {
        return AdminChargeRequestResponse.builder()
                .id(r.getId())
                .memberId(r.getMember().getId())
                .memberNickname(r.getMember().getNickname())
                .amount(r.getAmount().getAmount())
                .requestedAt(r.getRequestedAt())
                .build();
    }
}