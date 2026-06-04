"use client";

import { useEffect } from "react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useAuthStore } from "@/store/useAuthStore";
import { useAppStore } from "@/store/useAppStore";
import { tradeApi } from "@/services/tradeApi";
import { boardApi } from "@/services/boardApi";
import type { HoldingItem, StockItem } from "@/types/stock";

function toHoldingItem(
  h: { stockCode: string; stockName: string; quantity: number; avgPrice: number },
  stocks: StockItem[]
): HoldingItem {
  const stock = stocks.find((s) => s.code === h.stockCode);
  const currentPrice = stock ? Number(stock.price) : h.avgPrice;
  return {
    code: h.stockCode,
    name: h.stockName,
    buyPrice: h.avgPrice,
    currentPrice,
    quantity: h.quantity,
    profitRate: h.avgPrice > 0 ? ((currentPrice - h.avgPrice) / h.avgPrice) * 100 : 0,
  };
}

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  useWebSocket();

  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const setHoldings = useAppStore((s) => s.setHoldings);
  const setTradeHistories = useAppStore((s) => s.setTradeHistories);
  const setBoards = useAppStore((s) => s.setBoards);

  // 로그인 상태가 확정되면 사용자 데이터 일괄 로드
  useEffect(() => {
    if (!isLoggedIn) return;

    tradeApi.getHoldings()
      .then((data) => {
        const stocks = useAppStore.getState().stocks;
        setHoldings(data.map((h) => toHoldingItem(h, stocks)));
      })
      .catch(() => {});

    tradeApi.getHistory()
      .then(setTradeHistories)
      .catch(() => {});

    boardApi.getList()
      .then(setBoards)
      .catch(() => {});
  }, [isLoggedIn, setHoldings, setTradeHistories, setBoards]);

  return <>{children}</>;
}
