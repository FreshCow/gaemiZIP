"use client";

import { useEffect, useRef, useState } from "react";
import { createChart, ColorType, CrosshairMode, CandlestickSeries, LineSeries } from "lightweight-charts";
import type { UTCTimestamp } from "lightweight-charts";
import { useTheme } from "next-themes";
import { fetchChart } from "@/services/chartApi";
import { useAppStore } from "@/store/useAppStore";
import type { ChartInterval, CandlePoint } from "@/types/stock";

interface Props {
  stockCode: string;
}

const INTERVALS: { label: string; value: ChartInterval }[] = [
  { label: "1분", value: "1" },
  { label: "일봉", value: "D" },
  { label: "주봉", value: "W" },
];

// interval별 초기 표시 바 개수
const BARS_TO_SHOW: Record<ChartInterval, number> = {
  "1": 30,  // 30분
  "D": 5,   // 5 거래일
  "W": 4,   // 4주 (~1달)
};

const RIGHT_PAD = 3; // 오른쪽 여백 바 개수 (새 캔들 자동 표시 공간)
const POLL_INTERVAL_MS = 30_000; // 30초마다 폴링

export function CandlestickChart({ stockCode }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const seriesRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lineSeriesRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartRef = useRef<any>(null);
  const tickCandleRef = useRef<{ time: number; open: number; high: number; low: number; close: number } | null>(null);
  const lastLoadedCandleRef = useRef<CandlePoint | null>(null);

  const [interval, setIntervalState] = useState<ChartInterval>("D");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { resolvedTheme } = useTheme();
  const latestTick  = useAppStore((s) => s.latestTick);
  // REALTIME_UPDATE 로 갱신되는 현재가 — 틱 라인 전용
  const livePrice = useAppStore((s) => {
    const found = s.stocks.find((x) => x.code === stockCode);
    return found ? Number(found.price) : 0;
  });

  useEffect(() => {
    if (!containerRef.current) return;

    const isDark = resolvedTheme !== "light";

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: isDark ? "#a3a3a3" : "#6b7280",
      },
      grid: {
        vertLines: { color: isDark ? "#262626" : "#f3f4f6" },
        horzLines: { color: isDark ? "#262626" : "#f3f4f6" },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: isDark ? "#404040" : "#e5e7eb" },
      timeScale: {
        borderColor: isDark ? "#404040" : "#e5e7eb",
        timeVisible: interval === "1",
        secondsVisible: false,
        rightOffset: RIGHT_PAD,
      },
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    });

    chartRef.current = chart;

    const series = chart.addSeries(CandlestickSeries, {
      upColor:         "#10b981",
      downColor:       "#f43f5e",
      borderUpColor:   "#10b981",
      borderDownColor: "#f43f5e",
      wickUpColor:     "#10b981",
      wickDownColor:   "#f43f5e",
    });

    seriesRef.current = series;

    // 1분봉에서만 실시간 틱 라인 표시
    if (interval === "1") {
      const line = chart.addSeries(LineSeries, {
        color:                  "#38bdf8",
        lineWidth:              1,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius:  3,
        priceLineVisible:       false,
        lastValueVisible:       false,
      });
      lineSeriesRef.current = line;
    } else {
      lineSeriesRef.current = null;
    }

    tickCandleRef.current = null;
    lastLoadedCandleRef.current = null;

    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      chart.resize(width, height);
    });
    ro.observe(containerRef.current);

    const toBar = (c: CandlePoint) => ({
      time: c.time as UTCTimestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    });

    // 로드된 바 수를 closure 안에서 관리 (poll에서 공유)
    let totalBars = 0;

    const applyZoom = () => {
      const from = Math.max(0, totalBars - BARS_TO_SHOW[interval]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      chart.timeScale().setVisibleLogicalRange({ from: from as any, to: (totalBars + RIGHT_PAD) as any });
    };

    // 초기 데이터 로드
    const loadInitial = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const candles = await fetchChart(stockCode, interval);
        if (candles.length === 0) { setError("데이터가 없습니다."); return; }
        series.setData(candles.map(toBar));
        totalBars = candles.length;
        lastLoadedCandleRef.current = candles[candles.length - 1];
        tickCandleRef.current = null;
        applyZoom();
      } catch {
        setError("차트 데이터를 불러오지 못했습니다.");
      } finally {
        setIsLoading(false);
      }
    };

    // 30초마다 새 분봉 캔들 확인 (1분봉 전용)
    const pollUpdate = async () => {
      if (interval !== "1") return;
      const lastKnownTime = lastLoadedCandleRef.current?.time ?? 0;
      try {
        const candles = await fetchChart(stockCode, interval);
        if (candles.length === 0) return;

        // 마지막 알려진 시각 이상인 바만 update (마지막 바 갱신 + 새 바 추가)
        const toUpdate = candles.filter((c) => c.time >= lastKnownTime);
        let hasNewBar = false;
        for (const c of toUpdate) {
          series.update(toBar(c));
          if (c.time > lastKnownTime) hasNewBar = true;
        }

        const newLast = candles[candles.length - 1];
        if (newLast.time > lastKnownTime) {
          lastLoadedCandleRef.current = newLast;
          totalBars = candles.length;
          tickCandleRef.current = null;
        }

        // 새 바가 추가됐고 사용자가 오른쪽 근처에 있으면 자동 스크롤
        if (hasNewBar) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const range = chart.timeScale().getVisibleLogicalRange() as any;
          if (!range || (range.to as number) >= totalBars - 3) {
            chart.timeScale().scrollToRealTime();
          }
        }
      } catch {
        // 폴링 실패는 무시 (다음 주기에 재시도)
      }
    };

    loadInitial();

    let pollTimer: ReturnType<typeof setInterval> | null = null;
    if (interval === "1") {
      pollTimer = setInterval(pollUpdate, POLL_INTERVAL_MS);
    }

    return () => {
      if (pollTimer) clearInterval(pollTimer);
      ro.disconnect();
      seriesRef.current = null;
      lineSeriesRef.current = null;
      chartRef.current = null;
      tickCandleRef.current = null;
      lastLoadedCandleRef.current = null;
      chart.remove();
    };
  }, [stockCode, interval, resolvedTheme]);

  // WebSocket 틱 → 1분봉 현재 캔들 실시간 업데이트 + 틱 라인
  useEffect(() => {
    if (!latestTick || latestTick.code !== stockCode || interval !== "1") return;
    if (!seriesRef.current) return;

    const { time, tickTime, price } = latestTick;
    const prev = tickCandleRef.current;

    // ── 캔들 업데이트 ───────────────────────────────────────────────
    if (!prev) {
      const lastCandle = lastLoadedCandleRef.current;
      if (lastCandle && lastCandle.time === time) {
        tickCandleRef.current = {
          time,
          open: lastCandle.open,
          high: Math.max(lastCandle.high, price),
          low: Math.min(lastCandle.low, price),
          close: price,
        };
      } else {
        tickCandleRef.current = { time, open: price, high: price, low: price, close: price };
      }
    } else if (prev.time === time) {
      tickCandleRef.current = {
        time,
        open: prev.open,
        high: Math.max(prev.high, price),
        low: Math.min(prev.low, price),
        close: price,
      };
    } else {
      // 새 분 시작 — 폴링이 곧 정식 캔들 추가, 틱은 선행 표시
      tickCandleRef.current = { time, open: price, high: price, low: price, close: price };
    }

    seriesRef.current.update({
      time: tickCandleRef.current.time as UTCTimestamp,
      open: tickCandleRef.current.open,
      high: tickCandleRef.current.high,
      low: tickCandleRef.current.low,
      close: tickCandleRef.current.close,
    });
  }, [latestTick, stockCode, interval]);

  // REALTIME_UPDATE 도착 즉시 벽시계 시간(Date.now)으로 틱 라인 업데이트
  useEffect(() => {
    if (!livePrice || livePrice <= 0 || interval !== "1") return;
    if (!lineSeriesRef.current) return;
    lineSeriesRef.current.update({
      time:  Math.floor(Date.now() / 1000) as UTCTimestamp,
      value: livePrice,
    });
  }, [livePrice, interval]);

  return (
    <div className="flex flex-col h-full gap-2">
      <div className="flex gap-1">
        {INTERVALS.map((item) => (
          <button
            key={item.value}
            onClick={() => setIntervalState(item.value)}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              interval === item.value
                ? "bg-gray-200 text-gray-900 dark:bg-neutral-700 dark:text-white"
                : "text-gray-500 hover:text-gray-700 dark:text-neutral-500 dark:hover:text-neutral-300"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="relative flex-1">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <span className="text-xs text-gray-500 dark:text-neutral-500">로딩 중...</span>
          </div>
        )}
        {!isLoading && error && (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <span className="text-xs text-rose-400">{error}</span>
          </div>
        )}
        <div ref={containerRef} className="h-full w-full" />
      </div>
    </div>
  );
}
