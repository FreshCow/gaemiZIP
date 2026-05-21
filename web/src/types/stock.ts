export interface StockItem {
  code: string;
  name: string;
  price: string;
  rate: string;
  volume: number;
}

export interface HoldingItem {
  code: string;
  name: string;
  buyPrice: number;
  currentPrice: number;
  quantity: number;
  profitRate: number;
}

export interface CandlePoint {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export type ChartInterval = "1" | "D" | "W";

export interface StockSearchResult {
  code: string;
  name: string;
  chosung: string;
}

export interface StockPriceItem {
  code: string;
  name: string;
  price: string; // 랭킹 이력 없으면 "—"
  rate: string;  // 부호 포함, % 제외 (예: "+1.49")
}

export interface TickData {
  code: string;
  time: number;   // 분 경계 epoch seconds (KST 기준)
  price: number;
}

// REALTIME_UPDATE 수신용 — name 제외 (기존 name 보존)
export interface StockUpdate {
  code: string;
  price?: string;
  rate?: string;
  volume?: number;
}
