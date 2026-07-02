package sw.gaemiZIP.dto.stock;

import lombok.Getter;
import sw.gaemiZIP.entity.stock.Holding;

@Getter
public class HoldingResponse {
    private String stockCode;
    private String stockName;
    private int quantity;
    private long avgPrice;

    public static HoldingResponse from(Holding holding) {
        HoldingResponse dto = new HoldingResponse();
        dto.stockCode = holding.getStockCode();
        dto.stockName = holding.getStockName();
        dto.quantity   = holding.getQuantity();
        dto.avgPrice   = holding.getAvgPrice();
        return dto;
    }
}
