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

// 예약(지정가) 주문 — 실시간 현재가가 targetPrice와 정확히 일치할 때 자동 체결
export interface ReservedOrder {
  id: number;
  stockCode: string;
  stockName: string;
  tradeType: "BUY" | "SELL";
  targetPrice: number;
  quantity: number;
  status: "PENDING" | "EXECUTED" | "CANCELLED";
  createdAt: string;
  executedAt?: string | null;
}

// GET /api/trades/reserve 응답 — balance/lockedBalance를 함께 내려받아
// 별도의 잔고 조회 API 없이 폴링만으로 잔고를 최신화한다.
export interface ReservationListResponse {
  reservations: ReservedOrder[];
  balance: number;
  lockedBalance: number;
}
