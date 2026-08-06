"use client";

import { useEffect, useRef, useCallback } from "react";
import { useAppStore } from "@/store/useAppStore";
import type { StockItem, StockUpdate, TickData, IndexItem, OrderBookData } from "@/types/stock";

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
  const updateLivePrice = useAppStore((s) => s.updateLivePrice);
  const updateOrderBook = useAppStore((s) => s.updateOrderBook);

  // 정규장 고빈도 구간(종목당 초당 수십 건)에서는 메시지마다 그대로 상태를 갱신하면
  // 리렌더가 수신 속도를 못 따라가 쌓이면서 "Maximum update depth exceeded"로 탭이
  // 죽는 문제가 있었음(원인 분석은 TROUBLESHOOTING.md 참고) — 프레임당 1회로 모아
  // 반영(같은 종목은 그 프레임의 마지막 값만 유지)해 리렌더 빈도를 rAF 상한으로 제한
  const pendingUpdatesRef = useRef<Map<string, StockUpdate>>(new Map());
  const pendingTickRef = useRef<TickData | null>(null);
  const pendingIndicesRef = useRef<IndexItem[] | null>(null);
  const pendingOrderBooksRef = useRef<Map<string, OrderBookData>>(new Map());
  const rafIdRef = useRef<number | null>(null);

  const flushPending = useCallback(() => {
    rafIdRef.current = null;

    if (pendingUpdatesRef.current.size > 0) {
      for (const update of pendingUpdatesRef.current.values()) {
        updateStock(update);
        updateLivePrice(update);
        if (update.price) updateHoldingPrice(update.code, Number(update.price));
      }
      pendingUpdatesRef.current.clear();
    }
    if (pendingTickRef.current) {
      setLatestTick(pendingTickRef.current);
      pendingTickRef.current = null;
    }
    if (pendingIndicesRef.current) {
      setIndices(pendingIndicesRef.current);
      pendingIndicesRef.current = null;
    }
    if (pendingOrderBooksRef.current.size > 0) {
      for (const orderBook of pendingOrderBooksRef.current.values()) {
        updateOrderBook(orderBook);
      }
      pendingOrderBooksRef.current.clear();
    }
  }, [updateStock, updateLivePrice, updateHoldingPrice, setLatestTick, setIndices, updateOrderBook]);

  const scheduleFlush = useCallback(() => {
    if (rafIdRef.current == null) {
      rafIdRef.current = requestAnimationFrame(flushPending);
    }
  }, [flushPending]);

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
          pendingUpdatesRef.current.set(update.code, update);
          scheduleFlush();
        } catch (err) {
          console.error("[WS] REALTIME_UPDATE 파싱 실패:", err, "raw:", data.slice("REALTIME_UPDATE:".length, 300));
        }
      } else if (data.startsWith("TICK_UPDATE:")) {
        try {
          const tick: TickData = JSON.parse(data.slice("TICK_UPDATE:".length));
          pendingTickRef.current = tick;
          scheduleFlush();
        } catch (err) {
          console.error("[WS] TICK_UPDATE 파싱 실패:", err, "raw:", data.slice("TICK_UPDATE:".length, 300));
        }
      } else if (data.startsWith("INDEX_UPDATE:")) {
        try {
          const indices: IndexItem[] = JSON.parse(data.slice("INDEX_UPDATE:".length));
          pendingIndicesRef.current = indices;
          scheduleFlush();
        } catch (err) {
          console.error("[WS] INDEX_UPDATE 파싱 실패:", err, "raw:", data.slice("INDEX_UPDATE:".length, 300));
        }
      } else if (data.startsWith("QUOTE_UPDATE:")) {
        try {
          const orderBook: OrderBookData = JSON.parse(data.slice("QUOTE_UPDATE:".length));
          pendingOrderBooksRef.current.set(orderBook.code, orderBook);
          scheduleFlush();
        } catch (err) {
          console.error("[WS] QUOTE_UPDATE 파싱 실패:", err, "raw:", data.slice("QUOTE_UPDATE:".length, 300));
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
  }, [setStocks, setWsConnected, scheduleFlush]);

  useEffect(() => {
    connect();
    return () => {
      timerRef.current && clearTimeout(timerRef.current);
      if (rafIdRef.current != null) cancelAnimationFrame(rafIdRef.current);
      // pendingUpdatesRef는 DOM이 아닌 순수 버퍼용 ref라 최신값 참조로도 안전
      // eslint-disable-next-line react-hooks/exhaustive-deps
      pendingUpdatesRef.current.clear();
      pendingTickRef.current = null;
      pendingIndicesRef.current = null;
      // eslint-disable-next-line react-hooks/exhaustive-deps
      pendingOrderBooksRef.current.clear();
      // 언마운트로 인한 의도적인 종료는 에러/재연결 핸들러를 타지 않도록 먼저 해제
      const ws = wsRef.current;
      if (ws) {
        ws.onopen = null;
        ws.onmessage = null;
        ws.onerror = null;
        ws.onclose = null;
        ws.close();
      }
    };
  }, [connect]);
}
