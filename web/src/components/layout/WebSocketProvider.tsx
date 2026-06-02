"use client";

import { useEffect } from "react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useAuthStore } from "@/store/useAuthStore";
import { useAppStore } from "@/store/useAppStore";
import { tradeApi } from "@/services/tradeApi";
import { boardApi } from "@/services/boardApi";
import type { HoldingItem } from "@/types/stock";

// HoldingData(서버) → HoldingItem(스토어) 변환
function toHoldingItem(h: { stockCode: string; stockName: string; quantity: number; avgPrice: number }): HoldingItem {
  return {
    code: h.stockCode,
    name: h.stockName,
    buyPrice: h.avgPrice,
    currentPrice: h.avgPrice, // WebSocket REALTIME_UPDATE로 이후 실시간 갱신
    quantity: h.quantity,
    profitRate: 0,
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
      .then((data) => setHoldings(data.map(toHoldingItem)))
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
