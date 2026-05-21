package sw.gaemiZIP.dto.stock;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class StockPriceResponse {
    private String code;
    private String name;
    private String price;  // StockRanking에 없으면 "—"
    private String rate;   // 부호 포함, % 제외 (예: "+1.49") / 없으면 "0"
}
