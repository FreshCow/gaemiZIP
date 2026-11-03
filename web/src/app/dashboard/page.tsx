"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useAppStore } from "@/store/useAppStore";
import { useAuthStore } from "@/store/useAuthStore";
import { tradeApi } from "@/services/tradeApi";
import { fetchStockPrice } from "@/services/stockApi";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, RefreshCw, Plus } from "lucide-react";
import { Pagination } from "@/components/ui/pagination";
import { ChargeRequestModal } from "@/components/auth/ChargeRequestModal";
import { StockLogo } from "@/components/stock/StockLogo";
import Link from "next/link";
import { formatDateTime } from "@/lib/utils";
import type { StockItem } from "@/types/stock";
import type { TradeHistory, ReservedOrder } from "@/types/trade";

const HOLDINGS_PAGE_SIZE = 5;
const POSTS_PAGE_SIZE = 5;
const RESERVATIONS_PAGE_SIZE = 10;

// 키움 API 레이트리밋(초당 3건)을 넘기지 않도록 관심종목 현재가 조회를 배치로 나눠 순차 처리
const PRICE_FETCH_BATCH_SIZE = 3;
const PRICE_FETCH_BATCH_DELAY_MS = 1200;

async function fetchPricesInBatches(codes: string[]) {
  const results: PromiseSettledResult<Awaited<ReturnType<typeof fetchStockPrice>>>[] = [];
  for (let i = 0; i < codes.length; i += PRICE_FETCH_BATCH_SIZE) {
    const batch = codes.slice(i, i + PRICE_FETCH_BATCH_SIZE);
    results.push(...(await Promise.allSettled(batch.map((code) => fetchStockPrice(code)))));
    if (i + PRICE_FETCH_BATCH_SIZE < codes.length) {
      await new Promise((resolve) => setTimeout(resolve, PRICE_FETCH_BATCH_DELAY_MS));
    }
  }
  return results;
}

export default function DashboardPage() {
  const { stocks, holdings, watchlist, isAutoTrading, toggleAutoTrading, boards } = useAppStore();
  const { nickname, balance, isLoggedIn, updateBalance } = useAuthStore();
  const setHoldings = useAppStore((s) => s.setHoldings);
  const [reservations, setReservations] = useState<ReservedOrder[]>([]);
  const [cancelingId, setCancelingId] = useState<number | null>(null);
  const [reservationsPage, setReservationsPage] = useState(0);
  const [holdingsPage, setHoldingsPage] = useState(0);
  const [postsPage, setPostsPage] = useState(0);

  const [chargeModalOpen, setChargeModalOpen] = useState(false);

  const [mounted, setMounted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [refreshingHoldings, setRefreshingHoldings] = useState(false);
  // 랭킹 top10 밖이라 stocks에 없는 관심 종목의 현재가를 보강 조회한 결과
  const [extraWatchedStocks, setExtraWatchedStocks] = useState<Record<string, StockItem>>({});
  const [tradeHistories, setTradeHistories] = useState<TradeHistory[]>([]);
  const [tradePage, setTradePage] = useState(0);
  const [tradeTotalPages, setTradeTotalPages] = useState(0);

  useEffect(() => {
    if (!isLoggedIn) return;
    tradeApi.getHistoryPaged(tradePage, 10)
      .then((res) => {
        setTradeHistories(res.content);
        setTradeTotalPages(res.totalPages);
      })
      .catch(() => {});
  }, [isLoggedIn, tradePage]);

  // 예약 대기중 주문 폴링 — 자동 체결/취소로 목록이 바뀌는 것을 감지
  useEffect(() => {
    if (!isLoggedIn) return;
    const load = () => {
      tradeApi.getReservations()
        .then((res) => {
          setReservations(res.reservations.filter((r) => r.status === "PENDING"));
          updateBalance(res.balance);
        })
        .catch(() => {});
    };
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  const handleCancelReservation = async (id: number) => {
    setCancelingId(id);
    try {
      await tradeApi.cancelReservation(id);
      const res = await tradeApi.getReservations();
      setReservations(res.reservations.filter((r) => r.status === "PENDING"));
      updateBalance(res.balance);
      tradeApi.getHoldingsWithLivePrice().then(setHoldings).catch(() => {});
    } catch {
      // 취소 실패는 조용히 무시
    } finally {
      setCancelingId(null);
    }
  };

  const holdingsTotalPages = Math.ceil(holdings.length / HOLDINGS_PAGE_SIZE);
  const clampedHoldingsPage = Math.min(holdingsPage, Math.max(0, holdingsTotalPages - 1));
  const pagedHoldings = holdings.slice(clampedHoldingsPage * HOLDINGS_PAGE_SIZE, clampedHoldingsPage * HOLDINGS_PAGE_SIZE + HOLDINGS_PAGE_SIZE);

  const reservationsTotalPages = Math.ceil(reservations.length / RESERVATIONS_PAGE_SIZE);
  const clampedReservationsPage = Math.min(reservationsPage, Math.max(0, reservationsTotalPages - 1));
  const pagedReservations = reservations.slice(clampedReservationsPage * RESERVATIONS_PAGE_SIZE, clampedReservationsPage * RESERVATIONS_PAGE_SIZE + RESERVATIONS_PAGE_SIZE);

  const stockValue = holdings.reduce((sum, h) => sum + h.currentPrice * h.quantity, 0);
  const cashBalance = balance ?? 0;
  const totalAssets = cashBalance + stockValue;
  const cashRatio = totalAssets > 0 ? (cashBalance / totalAssets) * 100 : 100;
  const stockRatio = 100 - cashRatio;

  // 즐겨찾기 상태는 클라이언트 마운트 후에 참조
  // → 서버/클라이언트 초기 렌더 결과를 동일하게 유지해 hydration 오류 방지
  const watchedStocks = mounted
    ? watchlist
        .map((code) => stocks.find((s) => s.code === code) ?? extraWatchedStocks[code])
        .filter((s): s is NonNullable<typeof s> => s !== undefined)
    : [];

  // 관심 종목 중 랭킹 데이터에 없는 코드는 현재가를 별도 조회
  useEffect(() => {
    if (!mounted) return;
    const missing = watchlist.filter(
      (code) => !stocks.some((s) => s.code === code) && !extraWatchedStocks[code]
    );
    if (missing.length === 0) return;

    fetchPricesInBatches(missing).then((results) => {
      setExtraWatchedStocks((prev) => {
        const next = { ...prev };
        results.forEach((r, i) => {
          if (r.status !== "fulfilled") return;
          const p = r.value;
          // 레이트리밋 등으로 현재가를 못 받아온 경우("—", "0")는 저장하지 않고 다음 갱신 때 재조회
          const priceNum = Number(p.price);
          if (!Number.isFinite(priceNum) || priceNum <= 0) return;
          next[missing[i]] = { code: p.code, name: p.name, price: p.price, rate: p.rate, volume: 0 };
        });
        return next;
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, watchlist, stocks]);

  const handleRefreshHoldings = useCallback(() => {
    setRefreshingHoldings(true);
    tradeApi
      .getHoldingsWithLivePrice()
      .then(setHoldings)
      .catch(() => {})
      .finally(() => setRefreshingHoldings(false));
  }, [setHoldings]);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    updateScrollState();
    const el = scrollRef.current;
    el?.addEventListener("scroll", updateScrollState);
    window.addEventListener("resize", updateScrollState);
    return () => {
      el?.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [mounted, watchedStocks, updateScrollState]);

  const scrollBy = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: dir === "right" ? 220 : -220, behavior: "smooth" });
  };

  // 상승 빨강 · 하락 파랑 (국내 증권앱 관례), 0은 회색
  const tone = (v: number) =>
    v > 0
      ? "text-rose-600 dark:text-rose-400"
      : v < 0
        ? "text-blue-600 dark:text-blue-400"
        : "text-gray-500 dark:text-neutral-400";
  const signOf = (v: number) => (v > 0 ? "+" : v < 0 ? "−" : "");

  const costBasis = holdings.reduce((sum, h) => sum + h.buyPrice * h.quantity, 0);
  const pnl = stockValue - costBasis;
  const pnlRate = costBasis > 0 ? (pnl / costBasis) * 100 : 0;

  const cardCls = "min-w-0 rounded-lg border border-gray-200 bg-white dark:border-neutral-800 dark:bg-neutral-900";
  const titleCls = "text-sm font-semibold text-gray-900 dark:text-white";
  const emptyCls = "flex h-20 items-center justify-center text-sm text-gray-500 dark:text-neutral-500";
  const num = "tabular-nums";

  return (
    <div className="space-y-4 p-6">
      {/* Title row */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">대시보드</h1>
          <p className="mt-0.5 truncate text-sm text-gray-600 dark:text-neutral-400">
            {nickname ?? "투자자"}님의 모의투자 계좌
          </p>
        </div>
        {isLoggedIn && (
          <button
            onClick={() => setChargeModalOpen(true)}
            className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md bg-gray-900 px-3 text-sm font-medium text-white transition-colors hover:bg-gray-700 dark:bg-white dark:text-gray-900 dark:hover:bg-neutral-200"
          >
            <Plus size={14} />
            충전 신청
          </button>
        )}
      </div>

      {/* 자산 현황: 하나의 컨테이너를 1px 선으로 나눔 */}
      <section className={`${cardCls} overflow-hidden`}>
        {isLoggedIn ? (
          <>
            <div className="grid grid-cols-2 gap-px bg-gray-200 lg:grid-cols-[1.5fr_1fr_1fr_1fr] dark:bg-neutral-800">
              <div className="col-span-2 bg-white p-5 lg:col-span-1 dark:bg-neutral-900">
                <p className="text-xs text-gray-600 dark:text-neutral-400">총 자산</p>
                <p className={`mt-1 text-[32px] font-semibold leading-10 text-gray-900 dark:text-white ${num}`}>
                  ₩{totalAssets.toLocaleString()}
                </p>
              </div>
              <div className="bg-white p-5 dark:bg-neutral-900">
                <p className="text-xs text-gray-600 dark:text-neutral-400">예수금</p>
                <p className={`mt-1 text-xl font-semibold text-gray-900 dark:text-white ${num}`}>
                  ₩{cashBalance.toLocaleString()}
                </p>
              </div>
              <div className="bg-white p-5 dark:bg-neutral-900">
                <p className="text-xs text-gray-600 dark:text-neutral-400">주식 평가액</p>
                <p className={`mt-1 text-xl font-semibold text-gray-900 dark:text-white ${num}`}>
                  ₩{stockValue.toLocaleString()}
                </p>
              </div>
              <div className="col-span-2 bg-white p-5 lg:col-span-1 dark:bg-neutral-900">
                <p className="text-xs text-gray-600 dark:text-neutral-400">평가손익</p>
                {holdings.length === 0 ? (
                  <p className="mt-1 text-xl font-semibold text-gray-400 dark:text-neutral-600">—</p>
                ) : (
                  <>
                    <p className={`mt-1 whitespace-nowrap text-xl font-semibold ${tone(pnl)} ${num}`}>
                      {signOf(pnl)}₩{Math.abs(pnl).toLocaleString()}
                    </p>
                    <p className={`mt-0.5 text-xs font-medium ${tone(pnl)} ${num}`}>
                      {signOf(pnl)}{Math.abs(pnlRate).toFixed(2)}% · 매수금액 대비
                    </p>
                  </>
                )}
              </div>
            </div>
            {/* 자산 구성 비율 */}
            <div className="border-t border-gray-200 px-5 py-3 dark:border-neutral-800">
              <div className="flex h-2 gap-0.5 overflow-hidden rounded-full">
                <div className="rounded-full bg-sky-200 transition-all duration-700 dark:bg-sky-300/70" style={{ width: `${cashRatio}%` }} />
                <div className="rounded-full bg-emerald-400 transition-all duration-700 dark:bg-emerald-400" style={{ width: `${stockRatio}%` }} />
              </div>
              <div className={`mt-2 flex justify-between text-xs text-gray-600 dark:text-neutral-400 ${num}`}>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-sky-200 dark:bg-sky-300/70" />
                  현금 {cashRatio.toFixed(1)}%
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  주식 {stockRatio.toFixed(1)}%
                </span>
              </div>
            </div>
          </>
        ) : (
          <p className={`${emptyCls} h-24`}>로그인 후 확인하세요</p>
        )}
      </section>

      {/* 관심 종목 */}
      <section className={`${cardCls} p-5`}>
        <h2 className={`${titleCls} mb-3`}>관심 종목</h2>

        {watchedStocks.length === 0 ? (
          <div className="flex h-16 items-center justify-center rounded-md border border-dashed border-gray-300 dark:border-neutral-700">
            <p className="text-sm text-gray-500 dark:text-neutral-500">
              주식 랭킹에서 ★를 눌러 관심 종목을 추가하세요
            </p>
          </div>
        ) : (
          <div className="relative overflow-hidden">
            {canScrollLeft && (
              <>
                <button
                  onClick={() => scrollBy("left")}
                  aria-label="이전 종목"
                  className="absolute left-1 top-1/2 z-20 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-gray-300 bg-white transition-colors hover:bg-gray-50 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700"
                >
                  <ChevronLeft size={14} className="text-gray-700 dark:text-neutral-300" />
                </button>
              </>
            )}
            {canScrollRight && (
              <>
                <button
                  onClick={() => scrollBy("right")}
                  aria-label="다음 종목"
                  className="absolute right-1 top-1/2 z-20 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-gray-300 bg-white transition-colors hover:bg-gray-50 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700"
                >
                  <ChevronRight size={14} className="text-gray-700 dark:text-neutral-300" />
                </button>
              </>
            )}

            <div
              ref={scrollRef}
              className="flex gap-4 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {watchedStocks.map((stock) => {
                const rateNum = Number(stock.rate);
                return (
                  <Link
                    key={stock.code}
                    href={`/stocks/${stock.code}`}
                    className="w-52 shrink-0 rounded-lg border border-gray-200 bg-gray-50 p-4 transition-colors hover:border-gray-300 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-600"
                  >
                    <div className="flex items-center gap-2.5">
                      <StockLogo code={stock.code} name={stock.name} className="h-8 w-8 shrink-0" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{stock.name}</p>
                        <p className={`text-xs text-gray-600 dark:text-neutral-400 ${num}`}>{stock.code}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-baseline justify-between gap-2">
                      <p className={`text-xl font-semibold text-gray-900 dark:text-white ${num}`}>
                        {Number(stock.price).toLocaleString()}
                        <span className="ml-0.5 text-xs font-normal text-gray-600 dark:text-neutral-400">원</span>
                      </p>
                      <p className={`text-sm font-medium ${tone(rateNum)} ${num}`}>{stock.rate}%</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* 보유 종목 + 예약 대기 */}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[3fr_2fr]">
        <section className={`${cardCls} p-5`}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className={titleCls}>
              보유 종목
              {holdings.length > 0 && (
                <span className={`ml-1.5 text-xs font-normal text-gray-600 dark:text-neutral-400 ${num}`}>
                  {holdings.length}
                </span>
              )}
            </h2>
            <button
              onClick={handleRefreshHoldings}
              disabled={refreshingHoldings}
              className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"
              aria-label="보유 종목 가격 새로고침"
            >
              <RefreshCw size={14} className={refreshingHoldings ? "animate-spin" : ""} />
            </button>
          </div>
          {holdings.length === 0 ? (
            <p className={emptyCls}>보유 종목이 없습니다</p>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-neutral-800">
              {pagedHoldings.map((h) => {
                const profit = (h.currentPrice - h.buyPrice) * h.quantity;
                return (
                  <Link
                    key={h.code}
                    href={`/stocks/${h.code}`}
                    className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0 transition-colors hover:bg-gray-50 dark:hover:bg-neutral-800/40"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{h.name}</p>
                      <p className={`mt-0.5 text-xs text-gray-600 dark:text-neutral-400 ${num}`}>
                        {h.quantity.toLocaleString()}주 · 평균 ₩{h.buyPrice.toLocaleString()}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={`text-sm font-medium text-gray-900 dark:text-white ${num}`}>
                        ₩{(h.currentPrice * h.quantity).toLocaleString()}
                      </p>
                      <p className={`mt-0.5 text-xs font-medium ${tone(h.profitRate)} ${num}`}>
                        {signOf(profit)}₩{Math.abs(profit).toLocaleString()} · {signOf(h.profitRate)}{Math.abs(h.profitRate).toFixed(2)}%
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
          {holdingsTotalPages > 1 && (
            <Pagination
              page={clampedHoldingsPage}
              totalPages={holdingsTotalPages}
              onPageChange={setHoldingsPage}
              className="pt-4"
            />
          )}
        </section>

        <section className={`${cardCls} p-5`}>
          <div className="mb-3 flex items-center gap-2">
            <h2 className={titleCls}>예약 체결 대기중</h2>
            {reservations.length > 0 && (
              <span className={`rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 ${num}`}>
                {reservations.length}
              </span>
            )}
          </div>
          {!isLoggedIn ? (
            <p className={emptyCls}>로그인 후 확인하세요</p>
          ) : reservations.length === 0 ? (
            <p className={emptyCls}>예약 대기중인 주문이 없습니다</p>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-neutral-800">
              {pagedReservations.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <Link href={`/stocks/${r.stockCode}`} className="min-w-0 transition-opacity hover:opacity-70">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{r.stockName}</p>
                    <p className={`mt-0.5 text-xs text-gray-600 dark:text-neutral-400 ${num}`}>{formatDateTime(r.createdAt)}</p>
                  </Link>
                  <div className="flex shrink-0 flex-col items-end gap-0.5">
                    <p className={`text-sm text-gray-900 dark:text-white ${num}`}>
                      <span className={`mr-1.5 text-xs font-semibold ${r.tradeType === "BUY" ? tone(1) : tone(-1)}`}>
                        {r.tradeType === "BUY" ? "매수" : "매도"}
                      </span>
                      {r.targetPrice.toLocaleString()}원 · {r.quantity.toLocaleString()}주
                    </p>
                    <button
                      onClick={() => handleCancelReservation(r.id)}
                      disabled={cancelingId === r.id}
                      className="text-xs text-gray-600 transition-colors hover:text-rose-600 disabled:opacity-40 dark:text-neutral-400 dark:hover:text-rose-400"
                    >
                      {cancelingId === r.id ? "취소 중..." : "취소"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {reservationsTotalPages > 1 && (
            <Pagination
              page={clampedReservationsPage}
              totalPages={reservationsTotalPages}
              onPageChange={setReservationsPage}
              className="pt-4"
            />
          )}
        </section>
      </div>

      {/* 거래 이력 + 내 게시글 */}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[3fr_2fr]">
        <section className={`${cardCls} py-5`}>
          <h2 className={`${titleCls} mb-3 px-5`}>거래 이력</h2>
          {tradeHistories.length === 0 ? (
            <p className={emptyCls}>거래 내역이 없습니다</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y border-gray-200 text-xs text-gray-600 dark:border-neutral-800 dark:text-neutral-400">
                    <th className="px-5 py-2.5 text-left font-normal">종목</th>
                    <th className="px-3 py-2.5 text-left font-normal">유형</th>
                    <th className="px-3 py-2.5 text-right font-normal">체결가</th>
                    <th className="px-3 py-2.5 text-right font-normal">수량</th>
                    <th className="px-5 py-2.5 text-right font-normal">체결일시</th>
                  </tr>
                </thead>
                <tbody>
                  {tradeHistories.map((t) => (
                    <tr
                      key={t.id}
                      className="border-b border-gray-100 transition-colors last:border-0 hover:bg-gray-50 dark:border-neutral-800/60 dark:hover:bg-neutral-800/40"
                    >
                      <td className="whitespace-nowrap px-5 py-3">
                        <p className="font-medium text-gray-900 dark:text-white">{t.stockName}</p>
                        <p className={`text-xs text-gray-600 dark:text-neutral-400 ${num}`}>{t.stockCode}</p>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex h-5 shrink-0 items-center whitespace-nowrap rounded px-1.5 text-xs font-medium ${
                            t.tradeType === "BUY"
                              ? "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
                              : "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                          }`}
                        >
                          {t.tradeType === "BUY" ? "매수" : "매도"}
                        </span>
                      </td>
                      <td className={`whitespace-nowrap px-3 py-3 text-right text-gray-900 dark:text-white ${num}`}>
                        {t.price.toLocaleString()}원
                      </td>
                      <td className={`whitespace-nowrap px-3 py-3 text-right text-gray-700 dark:text-neutral-300 ${num}`}>
                        {t.quantity.toLocaleString()}주
                      </td>
                      <td className={`whitespace-nowrap px-5 py-3 text-right text-xs text-gray-600 dark:text-neutral-400 ${num}`}>
                        {formatDateTime(t.tradeAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {tradeTotalPages > 1 && (
            <Pagination page={tradePage} totalPages={tradeTotalPages} onPageChange={setTradePage} className="pt-4" />
          )}
        </section>

        <section className={`${cardCls} p-5`}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className={titleCls}>내 게시글</h2>
            <Link
              href="/board"
              className="text-xs text-gray-600 transition-colors hover:text-gray-900 dark:text-neutral-400 dark:hover:text-white"
            >
              전체 보기
            </Link>
          </div>
          {(() => {
            const myPosts = boards.filter((b) => b.author === nickname);
            if (myPosts.length === 0) {
              return <p className={emptyCls}>작성한 게시글이 없습니다</p>;
            }
            const postsTotalPages = Math.ceil(myPosts.length / POSTS_PAGE_SIZE);
            const clampedPostsPage = Math.min(postsPage, Math.max(0, postsTotalPages - 1));
            const pagedPosts = myPosts.slice(clampedPostsPage * POSTS_PAGE_SIZE, clampedPostsPage * POSTS_PAGE_SIZE + POSTS_PAGE_SIZE);
            return (
              <>
                <div className="divide-y divide-gray-100 dark:divide-neutral-800">
                  {pagedPosts.map((post) => (
                    <Link
                      key={post.id}
                      href={`/board/${post.id}`}
                      className="block py-3 first:pt-0 last:pb-0 transition-opacity hover:opacity-70"
                    >
                      <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{post.title}</p>
                      <p className={`mt-0.5 text-xs text-gray-600 dark:text-neutral-400 ${num}`}>{formatDateTime(post.createdAt)}</p>
                    </Link>
                  ))}
                </div>
                {postsTotalPages > 1 && (
                  <Pagination
                    page={clampedPostsPage}
                    totalPages={postsTotalPages}
                    onPageChange={setPostsPage}
                    className="pt-4"
                  />
                )}
              </>
            );
          })()}
        </section>
      </div>

      <ChargeRequestModal open={chargeModalOpen} onClose={() => setChargeModalOpen(false)} />
    </div>
  );
}
