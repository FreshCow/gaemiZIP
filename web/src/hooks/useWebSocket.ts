"use client";

import { useEffect, useRef, useCallback } from "react";
import { useAppStore } from "@/store/useAppStore";
import type { StockItem, StockUpdate, TickData, IndexItem } from "@/types/stock";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://127.0.0.1:8080/ws";
const RECONNECT_DELAY = 5000;

// 서버 WebSocket에 연결하여 실시간 주식 데이터를 수신하고 전역 스토어를 업데이트하는 훅
// 연결이 끊기면 5초 후 자동 재연결
export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setStocks = useAppStore((s) => s.setStocks);
  const updateStock = useAppStore((s) => s.updateStock);
  const setWsConnected = useAppStore((s) => s.setWsConnected);
  const setLatestTick = useAppStore((s) => s.setLatestTick);
  const updateHoldingPrice = useAppStore((s) => s.updateHoldingPrice);
  const setIndices = useAppStore((s) => s.setIndices);

  const connect = useCallback(() => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("[WS] 연결됨:", WS_URL);
      setWsConnected(true);
    };

    ws.onmessage = (e) => {
      const data = e.data as string;
      console.log("[WS] 메시지 수신 (raw):", data.slice(0, 200));

      if (data.startsWith("STOCK_UPDATE:")) {
        try {
          const stocks: StockItem[] = JSON.parse(data.slice("STOCK_UPDATE:".length));
          console.log("[WS] STOCK_UPDATE 수신:", stocks);
          setStocks(stocks);
        } catch (err) {
          console.error("[WS] STOCK_UPDATE 파싱 실패:", err, "raw:", data.slice("STOCK_UPDATE:".length, 300));
        }
      } else if (data.startsWith("REALTIME_UPDATE:")) {
        try {
          const update: StockUpdate = JSON.parse(data.slice("REALTIME_UPDATE:".length));
          updateStock(update);
          // 보유 종목의 현재가·수익률 실시간 갱신
          if (update.price) updateHoldingPrice(update.code, Number(update.price));
        } catch (err) {
          console.error("[WS] REALTIME_UPDATE 파싱 실패:", err, "raw:", data.slice("REALTIME_UPDATE:".length, 300));
        }
      } else if (data.startsWith("TICK_UPDATE:")) {
        try {
          const tick: TickData = JSON.parse(data.slice("TICK_UPDATE:".length));
          setLatestTick(tick);
        } catch (err) {
          console.error("[WS] TICK_UPDATE 파싱 실패:", err, "raw:", data.slice("TICK_UPDATE:".length, 300));
        }
      } else if (data.startsWith("INDEX_UPDATE:")) {
        try {
          const indices: IndexItem[] = JSON.parse(data.slice("INDEX_UPDATE:".length));
          setIndices(indices);
        } catch (err) {
          console.error("[WS] INDEX_UPDATE 파싱 실패:", err, "raw:", data.slice("INDEX_UPDATE:".length, 300));
        }
      } else {
        console.warn("[WS] 알 수 없는 메시지:", data.slice(0, 100));
      }
    };

    ws.onclose = (e) => {
      console.log("[WS] 연결 종료 (code=%d, reason=%s)", e.code, e.reason);
      setWsConnected(false);
      timerRef.current = setTimeout(connect, RECONNECT_DELAY);
    };

    ws.onerror = (e) => {
      console.error("[WS] 에러:", e);
      ws.close();
    };
  }, [setStocks, updateStock, setWsConnected, setLatestTick, updateHoldingPrice, setIndices]);

  useEffect(() => {
    connect();
    return () => {
      timerRef.current && clearTimeout(timerRef.current);
      wsRef.current?.close();
    };
  }, [connect]);
}
