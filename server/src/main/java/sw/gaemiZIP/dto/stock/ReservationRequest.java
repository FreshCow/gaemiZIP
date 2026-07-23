package sw.gaemiZIP.dto.stock;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ReservationRequest {
    private String stockCode;
    private String stockName;
    private String tradeType; // BUY / SELL
    private Integer price;
    private Integer quantity;
}
