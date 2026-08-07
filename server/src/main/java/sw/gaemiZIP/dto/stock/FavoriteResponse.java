package sw.gaemiZIP.dto.stock;

import lombok.Getter;
import sw.gaemiZIP.entity.stock.Favorite;

import java.time.LocalDateTime;

@Getter
public class FavoriteResponse {
    private String stockCode;
    private String stockName;
    private LocalDateTime createdAt;

    public static FavoriteResponse from(Favorite favorite) {
        FavoriteResponse dto = new FavoriteResponse();
        dto.stockCode = favorite.getStockCode();
        dto.stockName = favorite.getStockName();
        dto.createdAt = favorite.getCreatedDate();
        return dto;
    }
}
