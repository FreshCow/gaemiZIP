package sw.scalperagent.dto;

import lombok.Getter;
import sw.scalperagent.entity.TradeHistory;

// 웹 클라이언트 TradeHistory 인터페이스와 필드명을 맞춘 응답 DTO
// entity의 tradeTime → tradeAt으로 변환
@Getter
public class TradeResponse {
    private Long id;
    private String stockCode;
    private String stockName;
    private String tradeType;
    private Integer price;
    private Integer quantity;
    private Double profitRate;
    private String tradeAt;

    public static TradeResponse from(TradeHistory entity) {
        TradeResponse dto = new TradeResponse();
        dto.id = entity.getId();
        dto.stockCode = entity.getStockCode();
        dto.stockName = entity.getStockName();
        dto.tradeType = entity.getTradeType();
        dto.price = entity.getPrice();
        dto.quantity = entity.getQuantity();
        dto.profitRate = entity.getProfitRate();
        dto.tradeAt = entity.getTradeTime().toString();
        return dto;
    }
}
