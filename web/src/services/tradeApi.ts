import api from "./api";
import type { TradeHistory } from "@/types/trade";
import type { StockItem, HoldingData } from "@/types/stock";

export const tradeApi = {
  // 내 거래 이력 조회
  getHistory: () => api.get<TradeHistory[]>("/trades").then((r) => r.data),

  // 매수/매도 실행 — 응답에 newBalance 포함
  executeTrade: (payload: Omit<TradeHistory, "id" | "tradeAt" | "newBalance">) =>
    api.post<TradeHistory>("/trades", payload).then((r) => r.data),

  // 내 보유 종목 조회
  getHoldings: () =>
    api.get<HoldingData[]>("/trades/holdings").then((r) => r.data),

  // 거래량 상위 10개 종목 조회
  getRanking: () => api.get<StockItem[]>("/stocks/ranking").then((r) => r.data),
};
