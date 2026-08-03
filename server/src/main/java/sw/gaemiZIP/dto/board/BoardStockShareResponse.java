package sw.gaemiZIP.dto.board;

import sw.gaemiZIP.entity.board.BoardStockShare;

public record BoardStockShareResponse(String stockCode, String stockName, int quantity,
                                       long avgPrice, long priceAtShare, long profitLossAmount, double profitLossRate) {

    public static BoardStockShareResponse from(BoardStockShare s) {
        return new BoardStockShareResponse(s.getStockCode(), s.getStockName(), s.getQuantity(),
                s.getAvgPrice(), s.getPriceAtShare(), s.getProfitLossAmount(), s.getProfitLossRate());
    }
}
