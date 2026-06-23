package sw.gaemiZIP.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDate;

@Getter
@AllArgsConstructor
public class TradeVolumeResponse {
    private LocalDate date;
    private long count;
    private Long totalAmount; // 체결단가 * 수량 합계
}
