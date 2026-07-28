"use client";

import { useEffect, useRef, useState } from "react";
import { createChart, ColorType, CrosshairMode, CandlestickSeries, LineStyle } from "lightweight-charts";
import type { UTCTimestamp } from "lightweight-charts";
import { ChevronDown } from "lucide-react";
import { useTheme } from "next-themes";
import { fetchChart } from "@/services/chartApi";
import { useAppStore } from "@/store/useAppStore";
import type { ChartInterval, CandlePoint } from "@/types/stock";

interface Props {
  stockCode: string;
}

const MAIN_INTERVALS: { label: string; value: ChartInterval }[] = [
  { label: "일봉", value: "D" },
  { label: "주봉", value: "W" },
  { label: "1분", value: "1" },
];

// 개별 버튼 대신 드롭다운으로 묶어서 선택 (키움이 실제 지원하는 틱 단위: 1/3/5/10/30 중 1~10만 사용)
const TICK_INTERVALS: { label: string; value: ChartInterval }[] = [
  { label: "1틱",  value: "T1" },
  { label: "3틱",  value: "T3" },
  { label: "5틱",  value: "T5" },
  { label: "10틱", value: "T10" },
];

function isTickInterval(v: ChartInterval): boolean {
  return v.startsWith("T");
}

// interval별 초기 표시 바 개수
const BARS_TO_SHOW: Record<ChartInterval, number> = {
  "T1":  60,  // 최근 60봉 (=60틱)
  "T3":  45,  // 최근 45봉 (=135틱)
  "T5":  40,  // 최근 40봉 (=200틱)
  "T10": 30,  // 최근 30봉 (=300틱)
  "1": 30,    // 30분
  "D": 22,    // 약 22 거래일 (~1개월)
  "W": 4,     // 4주 (~1달)
};

// interval → 캔들 하나에 묶을 틱 개수 (틱봉 라이브 조립용)
const TICK_GROUP_SIZE: Partial<Record<ChartInterval, number>> = { T1: 1, T3: 3, T5: 5, T10: 10 };

const RIGHT_PAD = 3; // 오른쪽 여백 바 개수 (새 캔들 자동 표시 공간)
const POLL_INTERVAL_MS = 30_000; // 30초마다 폴링

// 키움 틱 데이터는 초 단위 정밀도까지만 제공 — 같은 초에 여러 체결이 있으면 time이 중복됨.
// lightweight-charts는 오름차순 유일 시간을 요구하므로, 같은 시각의 캔들은 하나로 병합한다.
function collapseSameTime(candles: CandlePoint[]): CandlePoint[] {
  const merged: CandlePoint[] = [];
  for (const c of candles) {
    const last = merged[merged.length - 1];
    if (last && last.time === c.time) {
      last.high = Math.max(last.high, c.high);
      last.low = Math.min(last.low, c.low);
      last.close = c.close;
    } else {
      merged.push({ ...c });
    }
  }
  return merged;
}

export function CandlestickChart({ stockCode }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const seriesRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartRef = useRef<any>(null);
  const tickCandleRef = useRef<{ time: number; open: number; high: number; low: number; close: number } | null>(null);
  const tickCountRef = useRef<number>(0); // 현재 형성 중인 틱봉에 쌓인 틱 개수 (틱봉 전용)
  const lastLoadedCandleRef = useRef<CandlePoint | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const priceLineRef = useRef<any>(null); // 실시간 현재가 수평선 — 캔들 자체 변동폭이 작아 보이는 인터벌(일봉/주봉)에서도 움직임이 잘 보이도록
  const tickMenuRef = useRef<HTMLDivElement>(null);

  const [interval, setIntervalState] = useState<ChartInterval>("D");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tickMenuOpen, setTickMenuOpen] = useState(false);
  const { resolvedTheme } = useTheme();
  // REALTIME_UPDATE 로 갱신되는 현재가 — 형성 중인 캔들 갱신용
  // top10 랭킹 밖 종목(검색/트레이딩 화면)도 반영되도록 livePrices 맵을 우선 사용, 없으면 랭킹 배열로 폴백
  const livePrice = useAppStore((s) => {
    const live = s.livePrices[stockCode]?.price;
    if (live) return Number(live);
    const found = s.stocks.find((x) => x.code === stockCode);
    return found ? Number(found.price) : 0;
  });

  useEffect(() => {
    if (!tickMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (tickMenuRef.current && !tickMenuRef.current.contains(e.target as Node)) {
        setTickMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [tickMenuOpen]);

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
        timeVisible: interval === "1" || isTickInterval(interval),
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

    tickCandleRef.current = null;
    tickCountRef.current = 0;
    lastLoadedCandleRef.current = null;
    priceLineRef.current = null;

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
        const candles = collapseSameTime(await fetchChart(stockCode, interval));
        if (candles.length === 0) { setError("데이터가 없습니다."); return; }
        series.setData(candles.map(toBar));
        totalBars = candles.length;
        lastLoadedCandleRef.current = candles[candles.length - 1];
        tickCandleRef.current = null;
        applyZoom();
      } catch (e) {
        console.error("차트 데이터 로드 실패:", e);
        setError("차트 데이터를 불러오지 못했습니다.");
      } finally {
        setIsLoading(false);
      }
    };

    // 30초마다 새 캔들 확인 (1분봉·틱봉 전용)
    const pollUpdate = async () => {
      if (interval !== "1" && !isTickInterval(interval)) return;
      const lastKnownTime = lastLoadedCandleRef.current?.time ?? 0;
      try {
        const candles = collapseSameTime(await fetchChart(stockCode, interval));
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
          tickCountRef.current = 0;
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
    if (interval === "1" || isTickInterval(interval)) {
      pollTimer = setInterval(pollUpdate, POLL_INTERVAL_MS);
    }

    return () => {
      if (pollTimer) clearInterval(pollTimer);
      ro.disconnect();
      seriesRef.current = null;
      chartRef.current = null;
      tickCandleRef.current = null;
      tickCountRef.current = 0;
      lastLoadedCandleRef.current = null;
      priceLineRef.current = null;
      chart.remove();
    };
  }, [stockCode, interval, resolvedTheme]);

  // REALTIME_UPDATE 도착 즉시 형성 중인 캔들 갱신
  // 타임스탬프: KST 시각을 UTC처럼 취급 (ChartService와 동일 규칙)
  useEffect(() => {
    if (!livePrice || livePrice <= 0 || !seriesRef.current) return;

    // 실시간 현재가 수평선 — 모든 인터벌에 적용. 일봉/주봉처럼 표시 범위가 넓어
    // 캔들 한 칸의 변동폭 자체는 잘 안 보이는 인터벌에서도 가격 움직임이 뚜렷하게 드러나도록 보조
    if (!priceLineRef.current) {
      priceLineRef.current = seriesRef.current.createPriceLine({
        price: livePrice,
        color: "#f59e0b",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: "현재가",
      });
    } else {
      priceLineRef.current.applyOptions({ price: livePrice });
    }

    if (interval !== "1" && !isTickInterval(interval) && interval !== "D") return;

    // KST = UTC+9 → Date.now()에 9h 더해 KST-as-UTC 에포크 생성
    const kstNow = Date.now() + 9 * 3600 * 1000;

    // ── 일봉(D): 오늘자 캔들의 고가/저가/종가만 실시간 갱신 (ChartService.parseDayTime과 동일한 KST 자정 epoch 규칙) ──
    if (interval === "D") {
      if (!seriesRef.current) return;
      const kstDate = new Date(kstNow);
      const dayBoundary = Math.floor(
        (Date.UTC(kstDate.getUTCFullYear(), kstDate.getUTCMonth(), kstDate.getUTCDate()) - 9 * 3600 * 1000) / 1000
      );
      const last = lastLoadedCandleRef.current;
      if (!last || last.time !== dayBoundary) return; // 오늘자 캔들이 아직 없으면 갱신 생략

      const prev = tickCandleRef.current;
      const base = prev && prev.time === dayBoundary ? prev : last;
      tickCandleRef.current = {
        time: dayBoundary,
        open: base.open,
        high: Math.max(base.high, livePrice),
        low: Math.min(base.low, livePrice),
        close: livePrice,
      };

      seriesRef.current.update({
        time:  tickCandleRef.current.time as UTCTimestamp,
        open:  tickCandleRef.current.open,
        high:  tickCandleRef.current.high,
        low:   tickCandleRef.current.low,
        close: tickCandleRef.current.close,
      });
      return;
    }

    // ── 틱봉(T5/T10): 틱 N개 = 캔들 1개 — N개 모일 때까지 고가/저가/종가를 누적하다가, 다 채워지면 새 캔들 시작 ──
    const groupSize = TICK_GROUP_SIZE[interval];
    if (groupSize) {
      if (!seriesRef.current) return;
      const nowSec = Math.floor(kstNow / 1000);
      const prev = tickCandleRef.current;

      if (!prev || tickCountRef.current >= groupSize) {
        tickCandleRef.current = { time: nowSec, open: livePrice, high: livePrice, low: livePrice, close: livePrice };
        tickCountRef.current = 1;
      } else {
        tickCandleRef.current = {
          time:  prev.time, // 그룹이 다 찰 때까지 같은 봉 유지
          open:  prev.open,
          high:  Math.max(prev.high, livePrice),
          low:   Math.min(prev.low,  livePrice),
          close: livePrice,
        };
        tickCountRef.current += 1;
      }

      seriesRef.current.update({
        time:  tickCandleRef.current.time as UTCTimestamp,
        open:  tickCandleRef.current.open,
        high:  tickCandleRef.current.high,
        low:   tickCandleRef.current.low,
        close: tickCandleRef.current.close,
      });
      return;
    }

    const minuteBoundary = Math.floor(kstNow / 60000) * 60; // 분 경계 (캔들용)

    // ── 캔들 실시간 업데이트 (1분봉) ──────────────────────────────────
    if (seriesRef.current) {
      const prev = tickCandleRef.current;

      if (!prev) {
        const lastCandle = lastLoadedCandleRef.current;
        if (lastCandle && lastCandle.time === minuteBoundary) {
          tickCandleRef.current = {
            time: minuteBoundary,
            open: lastCandle.open,
            high: Math.max(lastCandle.high, livePrice),
            low:  Math.min(lastCandle.low,  livePrice),
            close: livePrice,
          };
        } else {
          tickCandleRef.current = { time: minuteBoundary, open: livePrice, high: livePrice, low: livePrice, close: livePrice };
        }
      } else if (prev.time === minuteBoundary) {
        tickCandleRef.current = {
          time: minuteBoundary,
          open: prev.open,
          high: Math.max(prev.high, livePrice),
          low:  Math.min(prev.low,  livePrice),
          close: livePrice,
        };
      } else {
        // 새 분 시작 — 폴링이 곧 정식 캔들 추가, 틱은 선행 표시
        tickCandleRef.current = { time: minuteBoundary, open: livePrice, high: livePrice, low: livePrice, close: livePrice };
      }

      seriesRef.current.update({
        time:  tickCandleRef.current.time as UTCTimestamp,
        open:  tickCandleRef.current.open,
        high:  tickCandleRef.current.high,
        low:   tickCandleRef.current.low,
        close: tickCandleRef.current.close,
      });
    }
  }, [livePrice, interval]);

  return (
    <div className="flex flex-col h-full gap-2">
      <div className="flex items-center gap-1">
        {MAIN_INTERVALS.map((item) => (
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

        <div ref={tickMenuRef} className="relative">
          <button
            onClick={() => setTickMenuOpen((v) => !v)}
            className={`flex items-center gap-0.5 px-3 py-1 text-xs rounded-md transition-colors ${
              isTickInterval(interval)
                ? "bg-gray-200 text-gray-900 dark:bg-neutral-700 dark:text-white"
                : "text-gray-500 hover:text-gray-700 dark:text-neutral-500 dark:hover:text-neutral-300"
            }`}
          >
            {TICK_INTERVALS.find((t) => t.value === interval)?.label ?? "틱봉"}
            <ChevronDown size={12} />
          </button>

          {tickMenuOpen && (
            <div className="absolute top-full left-0 z-20 mt-1 min-w-[4.5rem] overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
              {TICK_INTERVALS.map((item) => (
                <button
                  key={item.value}
                  onClick={() => { setIntervalState(item.value); setTickMenuOpen(false); }}
                  className={`block w-full px-3 py-1.5 text-left text-xs transition-colors ${
                    interval === item.value
                      ? "bg-gray-100 font-medium text-gray-900 dark:bg-neutral-700 dark:text-white"
                      : "text-gray-600 hover:bg-gray-50 dark:text-neutral-300 dark:hover:bg-neutral-700"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
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
