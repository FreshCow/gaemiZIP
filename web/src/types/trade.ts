export interface TradeHistory {
  id: number;
  stockCode: string;
  stockName: string;
  tradeType: "BUY" | "SELL";
  price: number;
  quantity: number;
  tradeAt: string;
}
