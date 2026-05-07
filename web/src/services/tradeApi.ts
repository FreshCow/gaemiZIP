import api from "./api";
import type { TradeHistory } from "@/types/trade";
import type { StockItem } from "@/types/stock";

export const tradeApi = {
  // 매매 이력 조회 (서버는 tradeAt 필드로 응답)
  getHistory: () => api.get<TradeHistory[]>("/trades").then((r) => r.data),

  // 매매 기록 저장
  sendTradeLog: (payload: Omit<TradeHistory, "id" | "tradeAt">) =>
    api.post<TradeHistory>("/trades", payload).then((r) => r.data),

  // 현재 거래량 상위 10개 종목 조회 (초기 로드 또는 폴링 용도)
  getRanking: () => api.get<StockItem[]>("/stocks/ranking").then((r) => r.data),
};
