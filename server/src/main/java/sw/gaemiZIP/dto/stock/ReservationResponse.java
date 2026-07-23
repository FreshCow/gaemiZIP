package sw.gaemiZIP.dto.stock;

import lombok.Getter;
import sw.gaemiZIP.entity.stock.ReservedOrder;

@Getter
public class ReservationResponse {
    private Long id;
    private String stockCode;
    private String stockName;
    private String tradeType;
    private Long targetPrice;
    private int quantity;
    private String status;
    private String createdAt;
    private String executedAt;

    public static ReservationResponse from(ReservedOrder order) {
        ReservationResponse dto = new ReservationResponse();
        dto.id = order.getId();
        dto.stockCode = order.getStockCode();
        dto.stockName = order.getStockName();
        dto.tradeType = order.getTradeType().name();
        dto.targetPrice = order.getTargetPrice();
        dto.quantity = order.getQuantity();
        dto.status = order.getStatus().name();
        dto.createdAt = order.getCreatedDate().toString();
        dto.executedAt = order.getExcutedAt() != null ? order.getExcutedAt().toString() : null;
        return dto;
    }
}
