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
  time: number;      // 분 경계 epoch seconds — 캔들 집계용
  tickTime: number;  // 초 단위 epoch seconds — 틱 라인용
  price: number;
}

export interface StockInfoData {
  code: string;
  name: string;
  market: string;
  // 기본 정보
  setlMm: string;
  cap: string;
  floStk: string;
  crdRt: string;
  oyrHgst: string;
  oyrLwst: string;
  mac: string;
  macWght: string;
  forExhRt: string;
  replPric: string;
  // 재무 지표
  per: string;
  eps: string;
  roe: string;
  pbr: string;
  ev: string;
  bps: string;
  saleAmt: string;
  busPro: string;
  cupNga: string;
  // 가격 정보
  hgst250: string;
  lwst250: string;
  openPric: string;
  highPric: string;
  lowPric: string;
  uptPric: string;
  lstPric: string;
  basePric: string;
  expCntrPric: string;
  expCntrQty: string;
  // 250일 통계
  hgst250PricDt: string;
  hgst250PricPreRt: string;
  lwst250PricDt: string;
  lwst250PricPreRt: string;
  // 실시간 거래
  curPric: string;
  preSig: string;
  predPre: string;
  fluRt: string;
  trdeQty: string;
  trdePre: string;
  favUnit: string;
  dstrStk: string;
  dstrRt: string;
  mktRt: string;
}

// REALTIME_UPDATE 수신용 — name 제외 (기존 name 보존)
export interface StockUpdate {
  code: string;
  price?: string;
  rate?: string;
  volume?: number;
}

// INDEX_UPDATE 수신용 — 코스피("001")/코스닥("101") 지수
export interface IndexItem {
  code: string;
  name: string;
  price: string;
  rate: string; // 부호 포함, % 제외 (예: "+1.58")
}

// GET /api/trades/holdings 서버 응답
export interface HoldingData {
  stockCode: string;
  stockName: string;
  quantity: number;
  avgPrice: number;
}
