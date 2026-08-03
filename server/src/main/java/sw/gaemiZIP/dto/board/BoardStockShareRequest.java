package sw.gaemiZIP.dto.board;

public record BoardStockShareRequest( String stockCode, String stockName, int quantity,
                                      long avgPrice, long priceAtShare, long profitLossAmount, double profitLossRate) {

}
