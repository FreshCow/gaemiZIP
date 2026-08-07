"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  Star,
  TrendingUp,
  TrendingDown,
  Minus,
  Plus,
  Newspaper,
  Sparkles,
  ChevronLeft,
  Clock,
  Loader2,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { CandlestickChart } from "@/components/chart/CandlestickChart";
import { OrderBook } from "@/components/stock/OrderBook";
import { fetchStockInfo, fetchStockPrice, fetchStockNews, fetchStockQuote, subscribeStock } from "@/services/stockApi";
import { fetchStockAiAnalysis } from "@/services/newsApi";
import { tradeApi } from "@/services/tradeApi";
import { useAppStore } from "@/store/useAppStore";
import { useAuthStore } from "@/store/useAuthStore";
import { Pagination } from "@/components/ui/pagination";
import type { StockInfoData, StockPriceItem, OrderBookData } from "@/types/stock";
import type { NewsItem, AiStockAnalysisResponse } from "@/types/news";
import type { ReservedOrder } from "@/types/trade";

const NEWS_MIN_PAGE_SIZE = 5;
const NEWS_ITEM_HEIGHT = 76; // 뉴스 li 1개의 대략적 렌더 높이(px) — 제목 2줄 + 메타 정보 + 패딩

const RATIOS = [
  { label: "25%", value: 0.25 },
  { label: "50%", value: 0.5 },
  { label: "100%", value: 1 },
] as const;

// ── 유틸 ────────────────────────────────────────────────────────────────────────

function absNum(val: string | undefined): number {
  if (!val) return 0;
  return Math.abs(Number(val.replace(/[^0-9.-]/g, "")));
}

function isUp(val: string | undefined): boolean {
  if (!val) return true;
  return !val.trim().startsWith("-");
}

function fmt(val: string | undefined, suffix = ""): string {
  if (!val || val === "0" || val.trim() === "") return "—";
  const n = absNum(val);
  return n > 0 ? `${n.toLocaleString()}${suffix}` : "—";
}

// 키움 API가 "YYYYMMDD" 형식으로 내려주는 날짜 필드(예: 250일 최고/최저가 발생일) 포맷팅
function fmtDate(val: string | undefined): string {
  if (!val || val.length !== 8) return "—";
  return `${val.slice(0, 4)}-${val.slice(4, 6)}-${val.slice(6, 8)}`;
}

// ── 정보 행 컴포넌트 ───────────────────────────────────────────────────────────

function InfoRow({ label, value, colored }: { label: string; value: string; colored?: boolean }) {
  const up = isUp(value);
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-neutral-800 last:border-0">
      <span className="text-xs text-gray-500 dark:text-neutral-500">{label}</span>
      <span className={`text-xs font-medium ${colored ? (up ? "text-emerald-500" : "text-rose-500") : "text-gray-900 dark:text-white"}`}>
        {value || "—"}
      </span>
    </div>
  );
}

// ── 페이지 ────────────────────────────────────────────────────────────────────

export default function StockDetailPage() {
  const params = useParams();
  const code = (params?.code as string) ?? "";

  const [info, setInfo] = useState<StockInfoData | null>(null);
  const [price, setPrice] = useState<StockPriceItem | null>(null);
  const [quoteSnapshot, setQuoteSnapshot] = useState<OrderBookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  // AI 종목 분석 / 관련 뉴스 — 지연이 있을 수 있어 본문 로딩과 분리
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [newsPage, setNewsPage] = useState(0);
  const [newsPageSize, setNewsPageSize] = useState(NEWS_MIN_PAGE_SIZE);
  const newsListRef = useRef<HTMLUListElement>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AiStockAnalysisResponse | null>(null);
  const [aiLoading, setAiLoading] = useState(true);

  // 매수/매도 주문
  const [tradeTab, setTradeTab] = useState<"BUY" | "SELL">("BUY");
  const [orderPrice, setOrderPrice] = useState("");
  const [qty, setQty] = useState("");
  const [isTrading, setIsTrading] = useState(false);
  const [tradeMsg, setTradeMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // 예약(지정가) 주문 — 주문가가 현재가와 다르면 즉시 체결 대신 예약으로 등록
  const [reservations, setReservations] = useState<ReservedOrder[]>([]);
  const [lockedBalance, setLockedBalance] = useState(0);
  const [isReserving, setIsReserving] = useState(false);

  // 실시간 랭킹에서 현재가 fallback
  const rankStock = useAppStore((s) => s.stocks.find((s) => s.code === code));
  // 키움 실시간 구독으로 들어오는 최신 시세 (top10 랭킹 밖 종목도 포함)
  const liveUpdate = useAppStore((s) => s.livePrices[code]);
  // 실시간 호가(0D) — 아직 안 왔으면 REST 초기 스냅샷으로 대체
  const liveOrderBook = useAppStore((s) => s.orderBooks[code]);
  const orderBook = liveOrderBook ?? quoteSnapshot;
  const holding = useAppStore((s) => s.holdings.find((h) => h.code === code));
  const setHoldings = useAppStore((s) => s.setHoldings);
  const { isLoggedIn, balance, updateBalance } = useAuthStore();

  useEffect(() => {
    if (!code) return;
    setLoading(true);
    setError(false);
    setQuoteSnapshot(null);
    Promise.all([
      fetchStockInfo(code),
      fetchStockPrice(code).catch(() => null),
      fetchStockQuote(code).catch(() => null),
    ])
      .then(([infoRes, priceRes, quoteRes]) => {
        setInfo(infoRes);
        setPrice(priceRes);
        setQuoteSnapshot(quoteRes);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));

    // 실시간 시세를 받을 수 있도록 키움 구독에 편입 요청
    subscribeStock(code).catch(() => {});
    // 서버 구독 TTL(5분)보다 여유 있게 재요청해 장시간 체류 시에도 구독 해제되지 않도록 유지
    const heartbeat = setInterval(() => {
      subscribeStock(code).catch(() => {});
    }, 2 * 60 * 1000);

    return () => clearInterval(heartbeat);
  }, [code]);

  useEffect(() => {
    if (!code) return;

    setNewsLoading(true);
    setNewsPage(0);
    fetchStockNews(code)
      .then(setNews)
      .catch(() => setNews([]))
      .finally(() => setNewsLoading(false));

    setAiLoading(true);
    setAiAnalysis(null);
    fetchStockAiAnalysis(code)
      .then(setAiAnalysis)
      .catch(() => setAiAnalysis(null))
      .finally(() => setAiLoading(false));
  }, [code]);

  // 관련 뉴스 카드는 좌측 컬럼 높이에 맞춰 늘어나므로, 실제 보이는 영역 높이에 맞게 페이지당 개수를 계산
  // (lg 미만에서는 좌우 컬럼이 세로로 쌓여 "좌측 높이에 맞춘다"는 전제가 깨지므로 고정 개수만 사용)
  useEffect(() => {
    const el = newsListRef.current;
    if (!el) return;

    const desktopQuery = window.matchMedia("(min-width: 1024px)");
    const updatePageSize = () => {
      if (!desktopQuery.matches) {
        setNewsPageSize(NEWS_MIN_PAGE_SIZE);
        return;
      }
      setNewsPageSize(Math.max(NEWS_MIN_PAGE_SIZE, Math.floor(el.clientHeight / NEWS_ITEM_HEIGHT)));
    };

    updatePageSize();
    const observer = new ResizeObserver(updatePageSize);
    observer.observe(el);
    desktopQuery.addEventListener("change", updatePageSize);
    return () => {
      observer.disconnect();
      desktopQuery.removeEventListener("change", updatePageSize);
    };
  }, [news.length]);

  // 예약 주문 목록 폴링 — balance/lockedBalance도 함께 갱신되어
  // 서버에서 자동 체결된 예약을 별도 알림 없이도 감지할 수 있다.
  const refreshReservations = async () => {
    try {
      const res = await tradeApi.getReservations();
      setLockedBalance(res.lockedBalance);
      updateBalance(res.balance);
      setReservations((prev) => {
        const prevPendingIds = prev.filter((r) => r.status === "PENDING").map((r) => r.id);
        const nextIds = res.reservations.map((r) => r.id);
        const autoExecuted = prevPendingIds.some((id) => !nextIds.includes(id));
        if (autoExecuted) {
          tradeApi.getHoldingsWithLivePrice().then(setHoldings);
          setTradeMsg({ type: "ok", text: "예약 주문이 체결되었습니다." });
        }
        return res.reservations;
      });
    } catch {
      // 폴링 실패는 조용히 무시
    }
  };

  useEffect(() => {
    if (!isLoggedIn) return;
    refreshReservations();
    const timer = setInterval(refreshReservations, 5000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  // 우선순위: 실시간 구독 시세 > /price(Redis→ka10001→마스터 폴백) > 랭킹 데이터
  const livePrice = absNum(liveUpdate?.price);
  const apiPrice  = absNum(price?.price);
  const curPrice  = livePrice > 0 ? livePrice : apiPrice > 0 ? apiPrice : absNum(rankStock?.price);
  const apiRate   =
    liveUpdate?.rate && liveUpdate.rate !== "0"
      ? liveUpdate.rate
      : price?.rate && price.rate !== "0"
      ? price.rate
      : rankStock?.rate ?? "0";
  const basePrice = absNum(info?.basePric);
  // 등락폭(원화)은 REST 응답에 고정값이라, 라이브 현재가와 기준가 차이로 매 틱 재계산한다.
  const predPre   = curPrice > 0 && basePrice > 0 ? Math.abs(curPrice - basePrice) : absNum(info?.predPre);
  const fluRt     = apiRate;
  const priceUp   = isUp(fluRt);

  // 종목 변경 시 주문가격을 현재가로 초기화
  useEffect(() => {
    if (!code) return;
    setTradeTab("BUY");
    setOrderPrice(curPrice > 0 ? curPrice.toLocaleString() : "");
    setQty("");
    setTradeMsg(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const orderPriceNum = Math.max(0, Number(orderPrice.replace(/,/g, "")) || 0);
  const qtyNum        = Math.max(0, Number(qty) || 0);
  const totalAmount   = orderPriceNum * qtyNum;

  // 호가 단위(틱 사이즈) — 가격대별 공식 호가단위 표 대신, 호가창에 실제로 찍힌
  // 같은 쪽(매도끼리/매수끼리) 인접 호가 가격차를 그대로 사용(스프레드는 제외)
  const tickSize = (() => {
    const diffsOf = (levels: { price: number }[]) => {
      const prices = levels.map((l) => l.price).filter((p) => p > 0).sort((a, b) => a - b);
      const diffs: number[] = [];
      for (let i = 1; i < prices.length; i++) {
        const d = prices[i] - prices[i - 1];
        if (d > 0) diffs.push(d);
      }
      return diffs;
    };
    const diffs = [...diffsOf(orderBook?.asks ?? []), ...diffsOf(orderBook?.bids ?? [])];
    return diffs.length > 0 ? Math.min(...diffs) : 1;
  })();

  // 주문가 = 실시간 현재가일 때만 즉시 체결, 다르면 예약 주문으로 등록
  const isPriceMatch    = curPrice > 0 && orderPriceNum === curPrice;
  const availableBalance = Math.max(0, (balance ?? 0) - lockedBalance);
  const availableQty     = Math.max(0, (holding?.quantity ?? 0) - (holding?.lockedQuantity ?? 0));
  const codeReservations = reservations.filter((r) => r.stockCode === code && r.status === "PENDING");

  // 비율 버튼: 매수 → 주문가능 잔고 기준, 매도 → 매도가능 수량 기준
  const handleRatio = (ratio: number) => {
    if (orderPriceNum <= 0 && tradeTab === "BUY") return;
    if (tradeTab === "BUY") {
      const maxQty = Math.floor((availableBalance * ratio) / orderPriceNum);
      setQty(String(maxQty));
    } else {
      setQty(String(Math.floor(availableQty * ratio)));
    }
  };

  // 호가창 클릭 — 가격만 채우고 현재 선택된 매수/매도 탭은 그대로 유지
  const handleSelectPrice = (selectedPrice: number) => {
    if (selectedPrice <= 0) return;
    setOrderPrice(selectedPrice.toLocaleString());
    setQty("");
  };

  // 주문가 좌우 -/+ 버튼 — 직접 입력 대신 호가 단위만큼 증감
  // 연속 클릭 시 stale closure로 한 스텝만 반영되지 않도록 이전 state 기반 함수형 업데이트 사용
  const handlePriceStep = (direction: 1 | -1) => {
    setOrderPrice((prev) => {
      const prevNum = Math.max(0, Number(prev.replace(/,/g, "")) || 0);
      const base = prevNum > 0 ? prevNum : curPrice;
      const next = Math.max(0, base + direction * tickSize);
      return next > 0 ? next.toLocaleString() : "";
    });
    setQty("");
  };

  const canSubmit =
    !isTrading &&
    !isReserving &&
    orderPriceNum > 0 &&
    qtyNum > 0 &&
    (tradeTab === "BUY" ? totalAmount <= availableBalance : qtyNum <= availableQty);

  const handleTrade = async () => {
    if (!canSubmit) return;
    setIsTrading(true);
    setTradeMsg(null);
    try {
      const result = await tradeApi.executeTrade({
        stockCode: code,
        stockName: info?.name ?? "",
        tradeType: tradeTab,
        price: orderPriceNum,
        quantity: qtyNum,
      });
      if (result.newBalance != null) updateBalance(result.newBalance);
      await tradeApi.getHoldingsWithLivePrice().then(setHoldings);
      setTradeMsg({ type: "ok", text: tradeTab === "BUY" ? "매수 완료" : "매도 완료" });
      setQty("");
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        "거래 처리 중 오류가 발생했습니다.";
      setTradeMsg({ type: "err", text: msg });
    } finally {
      setIsTrading(false);
    }
  };

  const handleReserve = async () => {
    if (!canSubmit) return;
    setIsReserving(true);
    setTradeMsg(null);
    try {
      await tradeApi.createReservation({
        stockCode: code,
        stockName: info?.name ?? "",
        tradeType: tradeTab,
        price: orderPriceNum,
        quantity: qtyNum,
      });
      await refreshReservations();
      await tradeApi.getHoldingsWithLivePrice().then(setHoldings);
      setTradeMsg({ type: "ok", text: "예약 주문이 등록되었습니다." });
      setQty("");
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        "예약 등록 중 오류가 발생했습니다.";
      setTradeMsg({ type: "err", text: msg });
    } finally {
      setIsReserving(false);
    }
  };

  const handleSubmit = () => (isPriceMatch ? handleTrade() : handleReserve());

  const handleCancelReservation = async (id: number) => {
    try {
      await tradeApi.cancelReservation(id);
      await refreshReservations();
      await tradeApi.getHoldingsWithLivePrice().then(setHoldings);
      setTradeMsg({ type: "ok", text: "예약이 취소되었습니다." });
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        "예약 취소 중 오류가 발생했습니다.";
      setTradeMsg({ type: "err", text: msg });
    }
  };

  const newsTotalPages = Math.ceil(news.length / newsPageSize);
  const clampedNewsPage = Math.min(newsPage, Math.max(0, newsTotalPages - 1));
  const pagedNews = news.slice(clampedNewsPage * newsPageSize, clampedNewsPage * newsPageSize + newsPageSize);

  return (
    <div className="p-4 space-y-4 sm:p-6 sm:space-y-5">
      {/* 뒤로가기 */}
      <Link
        href="/stocks"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 dark:text-neutral-500 dark:hover:text-neutral-200 transition-colors"
      >
        <ChevronLeft size={16} />
        AI 탐색으로 돌아가기
      </Link>

      {loading && (
        <div className="flex items-center justify-center h-64">
          <Loader2 size={28} className="animate-spin text-emerald-500" />
        </div>
      )}

      {!loading && error && (
        <div className="flex items-center justify-center h-64 rounded-xl border border-rose-200 bg-rose-50 dark:border-rose-900/50 dark:bg-rose-950/30">
          <p className="text-sm text-rose-500 dark:text-rose-400">종목 정보를 불러오지 못했습니다.</p>
        </div>
      )}

      {!loading && info && (
        <>
          {/* AI 종목 분석 */}
          <div className="rounded-xl border border-violet-200 bg-gradient-to-r from-violet-50 to-purple-50 p-5 shadow-sm dark:border-violet-900/50 dark:from-violet-950/40 dark:to-purple-950/40">
            <div className="mb-2 flex items-center gap-2">
              <Sparkles size={16} className="text-violet-500" />
              <span className="text-sm font-semibold text-violet-700 dark:text-violet-400">AI 종목 분석</span>
              {aiAnalysis && (
                <span
                  className={`flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs font-medium ${
                    aiAnalysis.trend === "UP"
                      ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400"
                      : aiAnalysis.trend === "DOWN"
                      ? "bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400"
                      : "bg-gray-100 text-gray-500 dark:bg-neutral-800 dark:text-neutral-400"
                  }`}
                >
                  {aiAnalysis.trend === "UP" ? (
                    <TrendingUp size={11} />
                  ) : aiAnalysis.trend === "DOWN" ? (
                    <TrendingDown size={11} />
                  ) : (
                    <Minus size={11} />
                  )}
                </span>
              )}
              <span className="ml-auto rounded bg-violet-100 px-2 py-0.5 text-xs text-violet-500 dark:bg-violet-900/50 dark:text-violet-400">
                Gemini 2.5 Flash
              </span>
            </div>
            {aiLoading ? (
              <div className="flex items-center gap-2 py-2 text-sm text-gray-400 dark:text-neutral-500">
                <Loader2 size={14} className="animate-spin" />
                분석 생성 중...
              </div>
            ) : aiAnalysis ? (
              <p className="text-sm leading-relaxed text-gray-700 dark:text-neutral-300">
                {aiAnalysis.summary}
              </p>
            ) : (
              <p className="text-sm text-gray-400 dark:text-neutral-500">
                AI 분석을 준비하지 못했습니다. 잠시 후 다시 시도해주세요.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">

            {/* ── 좌측 ────────────────────────────────────────────────────── */}
            <div className="flex flex-col gap-5">

            {/* 종목 헤더 */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium bg-gray-100 text-gray-500 rounded px-2 py-0.5 dark:bg-neutral-800 dark:text-neutral-400">
                      {info.market || "KOSPI"}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-neutral-500">{code}</span>
                  </div>
                  <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{info.name}</h1>
                </div>

                <button
                  onClick={() => setIsFavorite((p) => !p)}
                  className="flex flex-col items-center gap-0.5 transition-transform active:scale-90"
                >
                  <Star
                    size={26}
                    className={isFavorite ? "fill-yellow-400 text-yellow-400" : "text-gray-300 dark:text-neutral-600"}
                  />
                </button>
              </div>

              {/* 현재가 */}
              <div className="mt-4 flex items-end gap-3">
                <span className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
                  {curPrice > 0 ? curPrice.toLocaleString() : "시세 없음"}
                  <span className="ml-1 text-xl font-medium text-gray-400 dark:text-neutral-500">
                    {curPrice > 0 ? "원" : ""}
                  </span>
                </span>
                {curPrice > 0 && fluRt !== "0" && (
                  <div className={`flex items-center gap-1 pb-1 text-lg font-semibold ${priceUp ? "text-emerald-500" : "text-rose-500"}`}>
                    {priceUp ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                    <span>
                      {predPre > 0 ? `${priceUp ? "+" : "-"}${predPre.toLocaleString()}원 ` : ""}
                      ({fluRt}%)
                    </span>
                  </div>
                )}
              </div>

              {info.basePric && info.basePric !== "0" && (
                <p className="mt-1 text-xs text-gray-400 dark:text-neutral-500">
                  기준가 {absNum(info.basePric).toLocaleString()}원
                </p>
              )}

              {/* 오늘 OHLC + 상하한가 */}
              <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
                {[
                  { label: "시가",   val: info.openPric },
                  { label: "고가",   val: info.highPric },
                  { label: "저가",   val: info.lowPric  },
                  { label: "상한가", val: info.uptPric  },
                  { label: "하한가", val: info.lstPric  },
                ].map(({ label, val }) => (
                  <div key={label} className="rounded-lg bg-gray-50 px-3 py-2 dark:bg-neutral-800">
                    <p className="text-[10px] text-gray-400 dark:text-neutral-500">{label}</p>
                    <p className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">
                      {fmt(val)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* 매수/매도 주문 (UI 우선 배치 — 실제 매매 API 연동은 다음 단계에서 진행) */}
            <div className="relative rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              {!isLoggedIn && (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/70 dark:bg-neutral-900/70">
                  <p className="text-base font-medium text-gray-500 dark:text-neutral-400">
                    로그인 후 사용할 수 있습니다
                  </p>
                </div>
              )}
              <div className={!isLoggedIn ? "pointer-events-none opacity-40" : ""}>
              {/* 잔고 / 보유 정보 */}
              <div className="mb-4 text-sm text-gray-500 dark:text-neutral-500">
                {tradeTab === "BUY" ? (
                  <span>
                    주문 가능 잔고{" "}
                    <span className="font-semibold text-gray-900 dark:text-white">
                      ₩{availableBalance.toLocaleString()}
                    </span>
                    {lockedBalance > 0 && ` (예약 잠금 ₩${lockedBalance.toLocaleString()})`}
                  </span>
                ) : (
                  <span>
                    매도 가능 수량{" "}
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {availableQty.toLocaleString()}주
                    </span>
                    {holding ? ` · 평균 ₩${holding.buyPrice.toLocaleString()}` : ""}
                    {(holding?.lockedQuantity ?? 0) > 0 && ` (예약 잠금 ${holding?.lockedQuantity}주)`}
                  </span>
                )}
              </div>

              <div className="mr-[10%] grid grid-cols-[140px_1fr] gap-2 sm:mx-[10%] sm:grid-cols-[minmax(0,400px)_minmax(0,400px)] sm:justify-center sm:gap-6">
                {/* 호가창 */}
                <OrderBook data={orderBook} currentPrice={curPrice} onSelectPrice={handleSelectPrice} />

                {/* 주문 폼 (세로 배치, 호가창과 높이를 맞춰 하단에 예상금액/버튼 고정) */}
                <div className="flex flex-col gap-2">
                  {/* 매수/매도 탭 */}
                  <div className="flex overflow-hidden rounded-lg border border-gray-200 dark:border-neutral-700">
                    {(["BUY", "SELL"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => { setTradeTab(t); setQty(""); }}
                        className={`flex-1 py-1.5 text-xs font-bold transition-colors ${
                          tradeTab === t
                            ? t === "BUY"
                              ? "bg-emerald-500 text-white"
                              : "bg-rose-500 text-white"
                            : "text-gray-500 hover:bg-gray-50 dark:text-neutral-400 dark:hover:bg-neutral-800"
                        }`}
                      >
                        {t === "BUY" ? "매수" : "매도"}
                      </button>
                    ))}
                  </div>

                  {/* 주문 가격 */}
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-gray-700 dark:text-neutral-300">주문 가격</label>
                      <button
                        onClick={() => setOrderPrice(curPrice > 0 ? curPrice.toLocaleString() : "")}
                        className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-emerald-500 dark:text-neutral-500 dark:hover:text-emerald-400 transition-colors"
                      >
                        <RefreshCw size={10} />
                        현재가
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handlePriceStep(-1)}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:border-emerald-400 hover:text-emerald-600 dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-emerald-500 dark:hover:text-emerald-400"
                      >
                        <Minus size={14} />
                      </button>
                      <div className="flex flex-1 items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 dark:border-neutral-700">
                        <input
                          type="text"
                          readOnly
                          value={orderPrice}
                          placeholder="0"
                          className="w-full bg-transparent text-sm font-semibold text-gray-900 outline-none dark:text-white"
                        />
                        <span className="shrink-0 text-xs text-gray-400 dark:text-neutral-500">원</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handlePriceStep(1)}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:border-emerald-400 hover:text-emerald-600 dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-emerald-500 dark:hover:text-emerald-400"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>

                  {/* 수량 */}
                  <div className="space-y-0.5">
                    <label className="text-xs font-medium text-gray-700 dark:text-neutral-300">수량</label>
                    <div className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 dark:border-neutral-700 focus-within:border-emerald-400 dark:focus-within:border-emerald-500 transition-colors">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={qty}
                        onChange={(e) => setQty(e.target.value.replace(/[^0-9]/g, ""))}
                        placeholder="0"
                        className="w-full bg-transparent text-sm font-semibold text-gray-900 outline-none dark:text-white"
                      />
                      <span className="shrink-0 text-xs text-gray-400 dark:text-neutral-500">주</span>
                    </div>
                  </div>

                  {/* 비율 버튼 */}
                  <div className="grid grid-cols-3 gap-1">
                    {RATIOS.map(({ label, value }) => (
                      <button
                        key={label}
                        onClick={() => handleRatio(value)}
                        disabled={tradeTab === "BUY" && orderPriceNum <= 0}
                        className="rounded-lg border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-600 hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-40 dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-emerald-500 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400 transition-colors"
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* 예상 금액 + 실행 버튼 — 호가창 하단과 높이 맞춤 */}
                  <div className="mt-auto flex flex-col gap-1.5">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-neutral-500">
                        예상 {tradeTab === "BUY" ? "매수" : "매도"}금액
                      </p>
                      <p className="text-base font-bold text-gray-900 dark:text-white">
                        {totalAmount > 0 ? `₩${totalAmount.toLocaleString()}` : "—"}
                      </p>
                    </div>

                    {/* 실행 버튼 */}
                    <button
                      disabled={!isLoggedIn || !canSubmit}
                      onClick={handleSubmit}
                      className={`w-full rounded-lg px-4 py-2 text-sm font-bold text-white transition-colors disabled:opacity-40 ${
                        tradeTab === "BUY"
                          ? "bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700"
                          : "bg-rose-500 hover:bg-rose-600 active:bg-rose-700"
                      }`}
                    >
                      {isTrading || isReserving
                        ? "처리 중..."
                        : tradeTab === "BUY"
                        ? `${qtyNum > 0 ? `${qtyNum}주 ` : ""}매수하기`
                        : `${qtyNum > 0 ? `${qtyNum}주 ` : ""}매도하기`}
                    </button>
                  </div>
                </div>
              </div>

              {tradeMsg && (
                <p
                  className={`mt-3 text-right text-sm font-medium ${
                    tradeMsg.type === "ok" ? "text-emerald-500" : "text-rose-500"
                  }`}
                >
                  {tradeMsg.text}
                </p>
              )}

              {codeReservations.length > 0 && (
                <div className="mt-4 space-y-2 border-t border-gray-100 pt-4 dark:border-neutral-800">
                  <p className="text-xs font-medium text-gray-500 dark:text-neutral-500">예약 중인 주문</p>
                  {codeReservations.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm dark:bg-neutral-800"
                    >
                      <span
                        className={`font-semibold ${r.tradeType === "BUY" ? "text-emerald-500" : "text-rose-500"}`}
                      >
                        {r.tradeType === "BUY" ? "매수" : "매도"}
                      </span>
                      <span className="text-gray-700 dark:text-neutral-300">
                        {r.targetPrice.toLocaleString()}원 · {r.quantity.toLocaleString()}주
                      </span>
                      <button
                        onClick={() => handleCancelReservation(r.id)}
                        className="text-xs text-gray-400 hover:text-rose-500 dark:text-neutral-500 dark:hover:text-rose-400 transition-colors"
                      >
                        취소
                      </button>
                    </div>
                  ))}
                </div>
              )}
              </div>
            </div>

            {/* 차트 */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <h2 className="mb-3 text-sm font-medium text-gray-700 dark:text-neutral-300">주가 차트</h2>
              <div className="h-64 sm:h-72">
                <CandlestickChart stockCode={code} />
              </div>
            </div>

            {/* 재무·시장 지표 */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <h2 className="mb-3 text-sm font-medium text-gray-700 dark:text-neutral-300">재무 지표</h2>
              <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
                <div>
                  <InfoRow label="PER"       value={info.per  || "—"} />
                  <InfoRow label="EPS"       value={info.eps  || "—"} />
                  <InfoRow label="ROE"       value={info.roe  || "—"} />
                  <InfoRow label="PBR"       value={info.pbr  || "—"} />
                  <InfoRow label="BPS"       value={fmt(info.bps)} />
                  <InfoRow label="EV"        value={info.ev   || "—"} />
                </div>
                <div>
                  <InfoRow label="매출액"       value={fmt(info.saleAmt, "억")} />
                  <InfoRow label="영업이익"     value={fmt(info.busPro,  "억")} />
                  <InfoRow label="당기순이익"   value={fmt(info.cupNga,  "억")} />
                  <InfoRow label="시가총액"     value={fmt(info.mac,     "억")} />
                  <InfoRow label="자본금"       value={fmt(info.cap,     "억")} />
                  <InfoRow label="신용비율"     value={info.crdRt || "—"} />
                </div>
              </div>
            </div>

            </div>

            {/* ── 우측 ────────────────────────────────────────────────────── */}
            {/* h-full은 lg 이상(좌우 컬럼 배치)에서만 적용 — lg 미만에서는 세로로 쌓이므로 콘텐츠 높이 그대로 사용 */}
            <div className="flex flex-col gap-5 lg:h-full">

            {/* 시장 정보 */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <h2 className="mb-3 text-sm font-medium text-gray-700 dark:text-neutral-300">시장 정보</h2>
              <InfoRow label="거래량"       value={fmt(info.trdeQty, "주")} />
              <InfoRow label="거래대금"     value={fmt(info.trdePre, "원")} />
              <InfoRow label="외인소진율"   value={info.forExhRt ? `${info.forExhRt}%` : "—"} />
              <InfoRow label="연중최고"     value={fmt(info.oyrHgst)} colored />
              <InfoRow label="연중최저"     value={fmt(info.oyrLwst)} colored />
              <InfoRow label="250일최고"    value={`${fmt(info.hgst250)} (${fmtDate(info.hgst250PricDt)})`} />
              <InfoRow label="250일최저"    value={`${fmt(info.lwst250)} (${fmtDate(info.lwst250PricDt)})`} />
              <InfoRow label="결산월"       value={info.setlMm ? `${info.setlMm}월` : "—"} />
              <InfoRow label="매매단위"     value={info.favUnit ? `${info.favUnit}주` : "—"} />
              <InfoRow label="대용가"       value={fmt(info.replPric)} />
            </div>

            {/* 관련 뉴스 — flex-1로 남은 공간을 채워 좌측(재무 지표) 하단과 높이를 맞춤 */}
            <div className="flex flex-1 min-h-0 flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <div className="mb-3 flex items-center gap-2">
                <Newspaper size={16} className="text-gray-400 dark:text-neutral-500" />
                <h2 className="text-sm font-medium text-gray-700 dark:text-neutral-300">관련 뉴스</h2>
              </div>
              {newsLoading ? (
                <div className="flex items-center gap-2 py-3 text-sm text-gray-400 dark:text-neutral-500">
                  <Loader2 size={14} className="animate-spin" />
                  뉴스 불러오는 중...
                </div>
              ) : news.length === 0 ? (
                <p className="py-3 text-sm text-gray-400 dark:text-neutral-500">관련 뉴스가 없습니다.</p>
              ) : (
                <>
                  <ul ref={newsListRef} className="flex-1 min-h-0 divide-y divide-gray-100 overflow-y-auto dark:divide-neutral-800">
                    {pagedNews.map((item) => (
                      <li key={item.id ?? item.link} className="py-3 first:pt-0 last:pb-0">
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium leading-snug text-gray-800 hover:text-blue-600 dark:text-neutral-200 dark:hover:text-blue-400 transition-colors line-clamp-2"
                        >
                          {item.title}
                        </a>
                        <div className="mt-1 flex items-center gap-2 text-xs text-gray-400 dark:text-neutral-500">
                          <span>{item.publisher}</span>
                          <span>·</span>
                          <Clock size={11} />
                          <span>{item.publishDate}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <Pagination
                    page={clampedNewsPage}
                    totalPages={newsTotalPages}
                    onPageChange={setNewsPage}
                    className="mt-3 border-t border-gray-100 pt-3 dark:border-neutral-800"
                  />
                </>
              )}
            </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
