package sw.gaemiZIP.dto.stock;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class OrderBookResponse {
    private String code;
    private List<OrderBookLevel> asks;
    private List<OrderBookLevel> bids;
    private long totalAskQty;
    private long totalBidQty;
}
