"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useAppStore } from "@/store/useAppStore";
import { useAuthStore } from "@/store/useAuthStore";
import { tradeApi } from "@/services/tradeApi";
import { fetchStockPrice } from "@/services/stockApi";
import { motion } from "framer-motion";
import { Star, ChevronLeft, ChevronRight, Wallet, TrendingUp, History, FileText, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import type { StockItem } from "@/types/stock";

export default function DashboardPage() {
  const { stocks, holdings, watchlist, isAutoTrading, toggleAutoTrading, tradeHistories, boards } = useAppStore();
  const { nickname, balance, isLoggedIn } = useAuthStore();
  const setHoldings = useAppStore((s) => s.setHoldings);

  const [mounted, setMounted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [refreshingHoldings, setRefreshingHoldings] = useState(false);
  // 랭킹 top10 밖이라 stocks에 없는 관심 종목의 현재가를 보강 조회한 결과
  const [extraWatchedStocks, setExtraWatchedStocks] = useState<Record<string, StockItem>>({});

  const stockValue = holdings.reduce((sum, h) => sum + h.currentPrice * h.quantity, 0);
  const cashBalance = balance ?? 0;
  const totalAssets = cashBalance + stockValue;
  const cashRatio = totalAssets > 0 ? (cashBalance / totalAssets) * 100 : 100;
  const stockRatio = 100 - cashRatio;

  // localStorage를 읽는 watchlist는 클라이언트 마운트 후에만 참조
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

    Promise.allSettled(missing.map((code) => fetchStockPrice(code))).then((results) => {
      setExtraWatchedStocks((prev) => {
        const next = { ...prev };
        results.forEach((r, i) => {
          if (r.status === "fulfilled") {
            const p = r.value;
            next[missing[i]] = { code: p.code, name: p.name, price: p.price, rate: p.rate, volume: 0 };
          }
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            안녕하세요, {nickname ?? "투자자"}님
          </h1>
          <p className="text-sm text-gray-500 mt-0.5 dark:text-neutral-500">
            오늘도 성공적인 투자 되세요
          </p>
        </div>
        {/* <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={toggleAutoTrading}
          className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
            isAutoTrading
              ? "bg-emerald-500 text-black hover:bg-emerald-400"
              : "bg-gray-200 text-gray-600 hover:bg-gray-300 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
          }`}
        >
          자동매매 {isAutoTrading ? "ON" : "OFF"}
        </motion.button> */}
      </div>

      {/* My Stocks */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center gap-2 mb-4">
          <Star size={15} className="fill-yellow-400 text-yellow-400" />
          <h2 className="text-sm font-medium text-gray-700 dark:text-neutral-300">My Stocks</h2>
        </div>

        {watchedStocks.length === 0 ? (
          <div className="flex items-center justify-center h-20 rounded-lg border border-dashed border-gray-200 dark:border-neutral-700">
            <p className="text-sm text-gray-400 dark:text-neutral-600">
              주식 랭킹에서 ★를 눌러 관심 종목을 추가하세요
            </p>
          </div>
        ) : (
          <div className="relative overflow-hidden">
            {/* Left fade + button */}
            {canScrollLeft && (
              <>
                <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-16 z-10 bg-gradient-to-r from-white dark:from-neutral-900 to-transparent" />
                <button
                  onClick={() => scrollBy("left")}
                  className="absolute left-1 top-1/2 -translate-y-1/2 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors"
                >
                  <ChevronLeft size={14} className="text-gray-600 dark:text-neutral-300" />
                </button>
              </>
            )}

            {/* Right fade + button */}
            {canScrollRight && (
              <>
                <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-16 z-10 bg-gradient-to-l from-white dark:from-neutral-900 to-transparent" />
                <button
                  onClick={() => scrollBy("right")}
                  className="absolute right-1 top-1/2 -translate-y-1/2 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors"
                >
                  <ChevronRight size={14} className="text-gray-600 dark:text-neutral-300" />
                </button>
              </>
            )}

            {/* Scroll container */}
            <div
              ref={scrollRef}
              className="flex gap-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pb-0.5"
            >
              {watchedStocks.map((stock) => {
                const isPos = !stock.rate.startsWith("-");
                return (
                  <Link
                    key={stock.code}
                    href={`/stocks/${stock.code}`}
                    className="flex-shrink-0 w-52 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-colors hover:border-gray-300 dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-lg dark:hover:border-neutral-700"
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500 dark:text-neutral-500">{stock.code}</p>
                        <p className="mt-0.5 text-base font-semibold text-gray-900 dark:text-white truncate">
                          {stock.name}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={`ml-2 shrink-0 ${
                          isPos
                            ? "border-emerald-700 text-emerald-500 dark:text-emerald-400"
                            : "border-rose-700 text-rose-500 dark:text-rose-400"
                        }`}
                      >
                        {stock.rate}%
                      </Badge>
                    </div>
                    <p className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">
                      {Number(stock.price).toLocaleString()}
                      <span className="ml-1 text-sm font-normal text-gray-500 dark:text-neutral-400">원</span>
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Balance + Holdings + My Posts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Balance card (with bar chart) */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center gap-2 mb-4">
            <Wallet size={14} className="text-gray-400 dark:text-neutral-500" />
            <p className="text-xs font-medium text-gray-500 dark:text-neutral-500">예수금</p>
          </div>
          {isLoggedIn ? (
            <>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                ₩{cashBalance.toLocaleString()}
              </p>

              <div className="mt-4 space-y-1.5 pt-4 border-t border-gray-100 dark:border-neutral-800">
                <div className="flex justify-between text-xs text-gray-500 dark:text-neutral-500">
                  <span>주식 평가액</span>
                  <span className="font-medium text-gray-700 dark:text-neutral-300">
                    ₩{stockValue.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-gray-500 dark:text-neutral-500">
                  <span>총 자산</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    ₩{totalAssets.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* 자산 비율 바 */}
              <div className="mt-5">
                <div className="flex h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-neutral-800">
                  <div
                    className="bg-emerald-500 transition-all duration-700"
                    style={{ width: `${cashRatio}%` }}
                  />
                  <div
                    className="bg-indigo-400 transition-all duration-700"
                    style={{ width: `${stockRatio}%` }}
                  />
                </div>
                <div className="mt-2 flex justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                    <span className="text-xs text-gray-500 dark:text-neutral-500">
                      현금 {cashRatio.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 shrink-0 rounded-full bg-indigo-400" />
                    <span className="text-xs text-gray-500 dark:text-neutral-500">
                      주식 {stockRatio.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <p className="mt-2 text-sm text-gray-400 dark:text-neutral-600">로그인 후 확인하세요</p>
          )}
        </div>

        {/* Holdings list card */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp size={14} className="text-gray-400 dark:text-neutral-500" />
              <p className="text-xs font-medium text-gray-500 dark:text-neutral-500">보유 종목</p>
            </div>
            <button
              onClick={handleRefreshHoldings}
              disabled={refreshingHoldings}
              className="rounded-full p-1 text-gray-400 transition-colors hover:text-gray-700 disabled:opacity-50 dark:text-neutral-600 dark:hover:text-neutral-300"
              aria-label="보유 종목 가격 새로고침"
            >
              <RefreshCw size={13} className={refreshingHoldings ? "animate-spin" : ""} />
            </button>
          </div>
          {holdings.length === 0 ? (
            <div className="flex items-center justify-center h-20">
              <p className="text-sm text-gray-400 dark:text-neutral-600">보유 종목이 없습니다</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-neutral-800">
              {holdings.map((h) => (
                <Link
                  key={h.code}
                  href={`/stocks/${h.code}`}
                  className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0 transition-colors hover:opacity-70"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{h.name}</p>
                    <p className="mt-0.5 text-xs text-gray-400 dark:text-neutral-500">
                      {h.quantity.toLocaleString()}주 · 평균 ₩{h.buyPrice.toLocaleString()}
                    </p>
                  </div>
                  <div className="ml-4 shrink-0 text-right">
                    <p className="text-xs text-gray-400 dark:text-neutral-500">
                      매수 ₩{(h.buyPrice * h.quantity).toLocaleString()}
                    </p>
                    <div className="flex items-center justify-end gap-1.5 mt-0.5">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        ₩{(h.currentPrice * h.quantity).toLocaleString()}
                      </p>
                      <span
                        className={`text-xs font-semibold ${
                          h.profitRate >= 0 ? "text-emerald-500" : "text-rose-500"
                        }`}
                      >
                        {h.profitRate >= 0 ? "+" : ""}{h.profitRate.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* My Posts card */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText size={14} className="text-gray-400 dark:text-neutral-500" />
              <p className="text-xs font-medium text-gray-500 dark:text-neutral-500">내 게시글</p>
            </div>
            <Link
              href="/board"
              className="text-xs text-gray-400 hover:text-gray-700 dark:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
            >
              전체 보기
            </Link>
          </div>
          {(() => {
            const myPosts = boards.filter((b) => b.author === nickname);
            if (myPosts.length === 0) {
              return (
                <div className="flex items-center justify-center h-20">
                  <p className="text-sm text-gray-400 dark:text-neutral-600">작성한 게시글이 없습니다</p>
                </div>
              );
            }
            return (
              <div className="divide-y divide-gray-100 dark:divide-neutral-800">
                {myPosts.slice(0, 5).map((post) => (
                  <Link
                    key={post.id}
                    href={`/board/${post.id}`}
                    className="block py-2.5 first:pt-0 last:pb-0 transition-colors hover:opacity-70"
                  >
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{post.title}</p>
                    <p className="mt-0.5 text-xs text-gray-400 dark:text-neutral-500">{post.createdAt}</p>
                  </Link>
                ))}
              </div>
            );
          })()}
        </div>
      </div>
      {/* Trade History */}
      <section className="rounded-xl border border-gray-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 dark:border-neutral-800">
          <History size={14} className="text-gray-400 dark:text-neutral-500" />
          <h2 className="text-sm font-medium text-gray-700 dark:text-neutral-300">거래 이력</h2>
        </div>
        {tradeHistories.length === 0 ? (
          <div className="flex items-center justify-center h-20">
            <p className="text-sm text-gray-400 dark:text-neutral-600">거래 내역이 없습니다</p>
          </div>
        ) : (
          <div className="overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-gray-500 dark:border-neutral-800 dark:text-neutral-500">
                  <th className="px-5 py-3 text-left font-medium">종목</th>
                  <th className="px-5 py-3 text-left font-medium">유형</th>
                  <th className="px-5 py-3 text-right font-medium">가격</th>
                  <th className="px-5 py-3 text-right font-medium">수량</th>
                  <th className="px-5 py-3 text-right font-medium">체결일시</th>
                </tr>
              </thead>
              <tbody>
                {tradeHistories.map((t) => (
                  <tr key={t.id} className="border-b border-gray-100 last:border-0 transition-colors hover:bg-gray-50 dark:border-neutral-800/60 dark:hover:bg-neutral-800/40">
                    <td className="px-5 py-3 text-gray-900 dark:text-white">
                      <p className="font-medium">{t.stockName}</p>
                      <p className="text-xs text-gray-500 dark:text-neutral-500">{t.stockCode}</p>
                    </td>
                    <td className="px-5 py-3">
                      <Badge
                        variant="outline"
                        className={
                          t.tradeType === "BUY"
                            ? "border-emerald-700 text-emerald-500 dark:text-emerald-400"
                            : "border-rose-700 text-rose-500 dark:text-rose-400"
                        }
                      >
                        {t.tradeType === "BUY" ? "매수" : "매도"}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-right text-gray-900 dark:text-white">
                      {t.price.toLocaleString()}원
                    </td>
                    <td className="px-5 py-3 text-right text-gray-700 dark:text-neutral-300">{t.quantity}주</td>
                    <td className="px-5 py-3 text-right text-xs text-gray-500 dark:text-neutral-500">{t.tradeAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
