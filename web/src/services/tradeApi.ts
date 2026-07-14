import api from "./api";
import { fetchStockPrice } from "./stockApi";
import type { TradeHistory } from "@/types/trade";
import type { StockItem, HoldingData, HoldingItem } from "@/types/stock";
import type { PageResponse } from "@/types/common";

export const tradeApi = {
  // 내 거래 이력 조회 (전체)
  getHistory: () => api.get<TradeHistory[]>("/trades").then((r) => r.data),

  // 내 거래 이력 페이지 단위 조회
  getHistoryPaged: (page = 0, size = 10) =>
    api.get<PageResponse<TradeHistory>>("/trades/paged", { params: { page, size } }).then((r) => r.data),

  // 매수/매도 실행 — 응답에 newBalance 포함
  executeTrade: (payload: Omit<TradeHistory, "id" | "tradeAt" | "newBalance">) =>
    api.post<TradeHistory>("/trades", payload).then((r) => r.data),

  // 내 보유 종목 조회
  getHoldings: () =>
    api.get<HoldingData[]>("/trades/holdings").then((r) => r.data),

  // 보유 종목 조회 + 종목별 현재가를 병렬 조회해 병합 (랭킹 top10 밖 종목도 최신가 반영)
  getHoldingsWithLivePrice: async (): Promise<HoldingItem[]> => {
    const raw = await api.get<HoldingData[]>("/trades/holdings").then((r) => r.data);
    const priceResults = await Promise.allSettled(raw.map((h) => fetchStockPrice(h.stockCode)));
    return raw.map((h, i) => {
      const result = priceResults[i];
      const livePrice = result.status === "fulfilled" ? Number(result.value.price) : NaN;
      const currentPrice = Number.isFinite(livePrice) && livePrice > 0 ? livePrice : h.avgPrice;
      return {
        code: h.stockCode,
        name: h.stockName,
        buyPrice: h.avgPrice,
        currentPrice,
        quantity: h.quantity,
        profitRate: h.avgPrice > 0 ? ((currentPrice - h.avgPrice) / h.avgPrice) * 100 : 0,
      };
    });
  },

  // 거래량 상위 10개 종목 조회
  getRanking: () => api.get<StockItem[]>("/stocks/ranking").then((r) => r.data),
};
