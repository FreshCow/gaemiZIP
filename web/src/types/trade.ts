export interface TradeHistory {
  id: number;
  stockCode: string;
  stockName: string;
  tradeType: "BUY" | "SELL";
  price: number;
  quantity: number;
  profitRate?: number | null;
  tradeAt: string;
  newBalance?: number | null; // 거래 직후 응답에만 포함
}
