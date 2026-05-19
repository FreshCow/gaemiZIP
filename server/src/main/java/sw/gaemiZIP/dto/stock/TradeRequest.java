package sw.gaemiZIP.dto.stock;

import lombok.Getter;
import lombok.Setter;

// 웹 클라이언트 매매 기록 저장 요청 DTO
@Getter
@Setter
public class TradeRequest {
    private String stockCode;
    private String stockName;
    private String tradeType;   // "BUY" | "SELL"
    private Integer price;
    private Integer quantity;
    private Double profitRate;  // 매도 시 수익률, 매수 시 null
}
