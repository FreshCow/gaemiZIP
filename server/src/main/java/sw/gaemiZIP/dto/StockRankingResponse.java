package sw.gaemiZIP.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

// 웹 클라이언트 StockItem 인터페이스와 일치하는 응답 DTO
@Getter
@AllArgsConstructor
public class StockRankingResponse {
    private String code;
    private String name;
    private String price;
    private String rate;    // 부호 포함, % 제외 (예: "+1.49", "-0.50")
    private long volume;
}
