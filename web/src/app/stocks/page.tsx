"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { fetchAiTheme, fetchLatestNews } from "@/services/newsApi";
import { fetchStockPrice, fetchIndices } from "@/services/stockApi";
import { useAppStore } from "@/store/useAppStore";
import { Pagination } from "@/components/ui/pagination";
import { StockLogo } from "@/components/stock/StockLogo";
import type { StockPriceItem } from "@/types/stock";
import type { NewsItem } from "@/types/news";

// ── 타입 ──────────────────────────────────────────────────────────────────────

interface LiveStock {
  code: string;
  name: string;
  price: string;
  rate: string;
  isAiRate: boolean; // true = Gemini 예측값, false = 실제 시세
}

interface LiveKeywordGroup {
  keyword: string;
  stocks: LiveStock[];
}

const INDEX_TABS = [
  { code: "001", label: "KOSPI" },
  { code: "101", label: "KOSDAQ" },
  { code: "201", label: "KOSPI200" },
] as const;

// 상승 빨강 · 하락 파랑 (국내 증권앱 관례), 0은 회색
function rateTone(rate: string) {
  const n = Number(rate.replace(/[+%,]/g, ""));
  if (!Number.isFinite(n) || n === 0)
    return { text: "text-gray-600 dark:text-neutral-400", pill: "bg-gray-100 text-gray-700 dark:bg-neutral-800 dark:text-neutral-300", arrow: "–" };
  return n > 0
    ? { text: "text-rose-600 dark:text-rose-400", pill: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300", arrow: "▲" }
    : { text: "text-blue-600 dark:text-blue-400", pill: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300", arrow: "▼" };
}

// AI 테마 키워드별 색 — 상승/하락(빨강/파랑)과 겹치지 않는 계열
const KEYWORD_TONES = [
  { on: "bg-teal-700 text-white", off: "bg-teal-50 text-teal-800 hover:bg-teal-100 dark:bg-teal-950/40 dark:text-teal-300 dark:hover:bg-teal-900/50", top: "border-t-teal-600" },
  { on: "bg-amber-700 text-white", off: "bg-amber-50 text-amber-900 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/50", top: "border-t-amber-500" },
  { on: "bg-lime-700 text-white", off: "bg-lime-50 text-lime-900 hover:bg-lime-100 dark:bg-lime-950/40 dark:text-lime-300 dark:hover:bg-lime-900/50", top: "border-t-lime-600" },
  { on: "bg-orange-700 text-white", off: "bg-orange-50 text-orange-900 hover:bg-orange-100 dark:bg-orange-950/40 dark:text-orange-300 dark:hover:bg-orange-900/50", top: "border-t-orange-500" },
  { on: "bg-cyan-700 text-white", off: "bg-cyan-50 text-cyan-900 hover:bg-cyan-100 dark:bg-cyan-950/40 dark:text-cyan-300 dark:hover:bg-cyan-900/50", top: "border-t-cyan-600" },
] as const;

const CARD = "rounded-lg border border-gray-200 bg-white dark:border-neutral-800 dark:bg-neutral-900";

// 카드마다 색 점으로 구분
function CardTitle({ dot, children }: { dot: string; children: React.ReactNode }) {
  return (
    <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
      <span className={`h-2 w-2 rounded-sm ${dot}`} />
      {children}
    </h2>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function StocksPage() {
  const [liveTheme, setLiveTheme] = useState<LiveKeywordGroup[]>([]);
  const [selectedKeyword, setSelectedKeyword] = useState("");
  const [themeLoading, setThemeLoading] = useState(true);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsPage, setNewsPage] = useState(0);
  const [newsTotalPages, setNewsTotalPages] = useState(0);
  const indices = useAppStore((s) => s.indices);
  const setIndices = useAppStore((s) => s.setIndices);

  // WS INDEX_UPDATE 재생에만 의존하면 접속 타이밍에 따라 초기값이 안 올 수 있어 REST로 직접 조회
  useEffect(() => {
    fetchIndices().then(setIndices).catch(() => {});
  }, [setIndices]);

  useEffect(() => {
    let cancelled = false;

    fetchAiTheme()
      .then(async (data) => {
        if (cancelled || !data?.keywords?.length) return;

        // 전체 종목 코드 중복 제거 후 현재가 조회 — 캐시 없는 종목은 백엔드가 그 자리에서
        // 키움 API를 호출하므로, 한꺼번에 다 쏘면 몰려서 일부가 실패할 수 있어 소량씩 나눠 요청
        const allCodes = [...new Set(
          data.keywords.flatMap((kg) => kg.stocks.map((s) => s.stockCode))
        )];

        const PRICE_FETCH_CONCURRENCY = 3;
        const priceMap: Record<string, StockPriceItem> = {};
        for (let i = 0; i < allCodes.length; i += PRICE_FETCH_CONCURRENCY) {
          const batch = allCodes.slice(i, i + PRICE_FETCH_CONCURRENCY);
          const results = await Promise.allSettled(batch.map((code) => fetchStockPrice(code)));
          results.forEach((result, j) => {
            if (result.status === "fulfilled") {
              priceMap[batch[j]] = result.value;
            }
          });
        }

        if (cancelled) return;

        const live: LiveKeywordGroup[] = data.keywords.map((kg) => ({
          keyword: kg.keyword,
          stocks: kg.stocks.map((s) => {
            const priceData = priceMap[s.stockCode];
            const hasRealPrice = priceData && priceData.price !== "—";
            return {
              code: s.stockCode,
              name: s.stockName,
              price: priceData?.price ?? "—",
              rate: hasRealPrice ? priceData.rate : "",
              isAiRate: !hasRealPrice,
            };
          }).filter((s) => !s.isAiRate),
        }));

        setLiveTheme(live);
        setSelectedKeyword(live[0]?.keyword ?? "");
      })
      .catch(() => { /* Gemini 실패 시 로딩 해제만 */ })
      .finally(() => { if (!cancelled) setThemeLoading(false); });

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    fetchLatestNews(newsPage, 10)
      .then((res) => {
        setNews(res.content);
        setNewsTotalPages(res.totalPages);
      })
      .catch(() => {});
  }, [newsPage]);


  const selectedGroup = liveTheme.find((g) => g.keyword === selectedKeyword);
  const selectedTone = KEYWORD_TONES[Math.max(0, liveTheme.findIndex((g) => g.keyword === selectedKeyword)) % KEYWORD_TONES.length];

  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-neutral-950">
      <div className="mx-auto max-w-7xl space-y-4 p-4 sm:p-6">

        {/* AI 테마 + 지수: 좌우 분할 */}
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-5">

          {/* A. 오늘의 AI 테마 */}
          <section className={`${CARD} p-5 lg:col-span-3`}>
            <CardTitle dot="bg-teal-500">오늘의 AI 테마</CardTitle>

            {themeLoading ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <Loader2 size={24} className="animate-spin text-teal-500" />
                <p className="text-xs text-gray-600 dark:text-neutral-400">AI가 오늘의 시장을 분석 중입니다...</p>
              </div>
            ) : liveTheme.length === 0 ? (
              <p className="py-6 text-center text-xs text-gray-600 dark:text-neutral-400">
                AI 분석 결과를 불러오지 못했습니다.
              </p>
            ) : (
              <>
                {/* 키워드: 키워드마다 다른 색 */}
                <div className="mb-4 flex flex-wrap gap-2">
                  {liveTheme.map(({ keyword }, i) => {
                    const tone = KEYWORD_TONES[i % KEYWORD_TONES.length];
                    return (
                      <button
                        key={keyword}
                        onClick={() => setSelectedKeyword(keyword)}
                        aria-pressed={selectedKeyword === keyword}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                          selectedKeyword === keyword ? tone.on : tone.off
                        }`}
                      >
                        {keyword}
                      </button>
                    );
                  })}
                </div>

                {/* 관련 종목: 선택한 키워드 색이 카드 윗선으로 이어짐 */}
                <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
                  {selectedGroup?.stocks.map((stock) => {
                    const t = rateTone(stock.rate);
                    return (
                      <Link
                        key={stock.code}
                        href={`/stocks/${stock.code}`}
                        className={`block rounded-lg border border-t-2 border-gray-200 bg-gray-50 p-3.5 transition-colors hover:border-gray-300 dark:border-neutral-700 dark:bg-neutral-800/50 dark:hover:border-neutral-600 ${selectedTone.top}`}
                      >
                        <div className="flex items-center gap-2">
                          <StockLogo code={stock.code} name={stock.name} className="h-8 w-8 shrink-0" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-gray-900 dark:text-white" title={stock.name}>
                              {stock.name}
                            </p>
                            <p className="text-xs tabular-nums text-gray-600 dark:text-neutral-400">{stock.code}</p>
                          </div>
                        </div>
                        <div className="mt-3 flex items-baseline justify-between gap-2">
                          <p className="text-base font-semibold tabular-nums text-gray-900 dark:text-white">
                            {stock.price === "—"
                              ? <span className="text-gray-500 dark:text-neutral-500">—</span>
                              : <>{Number(stock.price).toLocaleString()}<span className="ml-0.5 text-xs font-normal text-gray-600 dark:text-neutral-400">원</span></>
                            }
                          </p>
                          <span className={`rounded px-1.5 py-0.5 text-xs font-semibold tabular-nums ${t.pill}`}>
                            {stock.rate}%
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </>
            )}
          </section>

          {/* 코스피 / 코스닥 / 코스피200 지수 */}
          <section className={`${CARD} p-5 lg:col-span-2`}>
            <CardTitle dot="bg-amber-500">국내 지수</CardTitle>

            <div className="divide-y divide-gray-100 dark:divide-neutral-800">
              {INDEX_TABS.map((tab) => {
                const idx = indices.find((i) => i.code === tab.code);

                if (!idx) {
                  return (
                    <div key={tab.code} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                      <p className="text-sm text-gray-700 dark:text-neutral-300">{tab.label}</p>
                      <Loader2 size={16} className="animate-spin text-amber-500" />
                    </div>
                  );
                }

                const t = rateTone(idx.rate);
                return (
                  <div key={tab.code} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <p className="text-sm font-medium text-gray-700 dark:text-neutral-300">{tab.label}</p>
                    <div className="text-right">
                      <p className={`text-xl font-semibold tabular-nums ${t.text}`}>
                        {Number(idx.price).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                      <p className={`text-xs font-medium tabular-nums ${t.text}`}>
                        {t.arrow} {idx.rate.replace(/^[+-]/, "")}%
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* B. 증권 뉴스 */}
        <section className={`${CARD} p-5`}>
          <CardTitle dot="bg-sky-500">증권 뉴스</CardTitle>

          {news.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 size={24} className="animate-spin text-sky-500" />
              <p className="text-xs text-gray-600 dark:text-neutral-400">뉴스를 불러오는 중...</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-neutral-800">
              {news.map((item) => (
                <div key={item.id} className="py-4 first:pt-0 last:pb-0">
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold leading-snug text-gray-900 transition-colors hover:text-sky-700 dark:text-white dark:hover:text-sky-400"
                  >
                    {item.title}
                  </a>
                  <p className="mt-1 text-xs tabular-nums text-gray-600 dark:text-neutral-400">{item.publishDate}</p>
                  {item.content && (
                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-gray-700 dark:text-neutral-400">
                      {item.content}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          <Pagination
            page={newsPage}
            totalPages={newsTotalPages}
            onPageChange={setNewsPage}
            className="mt-5"
          />
        </section>
      </div>
    </div>
  );
}
