"use client";

import { useEffect, useState } from "react";
import { Loader2, Sparkles, TrendingUp, BarChart3 } from "lucide-react";
import { fetchAiTheme, fetchLatestNews } from "@/services/newsApi";
import { fetchStockPrice } from "@/services/stockApi";
import { useAppStore } from "@/store/useAppStore";
import { Pagination } from "@/components/ui/pagination";
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

// ─────────────────────────────────────────────────────────────────────────────

export default function StocksPage() {
  const [liveTheme, setLiveTheme] = useState<LiveKeywordGroup[]>([]);
  const [selectedKeyword, setSelectedKeyword] = useState("");
  const [themeLoading, setThemeLoading] = useState(true);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsPage, setNewsPage] = useState(0);
  const [newsTotalPages, setNewsTotalPages] = useState(0);
  const indices = useAppStore((s) => s.indices);

  useEffect(() => {
    let cancelled = false;

    fetchAiTheme()
      .then(async (data) => {
        if (cancelled || !data?.keywords?.length) return;

        // 전체 종목 코드 중복 제거 후 현재가 병렬 조회
        const allCodes = [...new Set(
          data.keywords.flatMap((kg) => kg.stocks.map((s) => s.stockCode))
        )];

        const priceResults = await Promise.allSettled(
          allCodes.map((code) => fetchStockPrice(code))
        );

        const priceMap: Record<string, StockPriceItem> = {};
        priceResults.forEach((result, i) => {
          if (result.status === "fulfilled") {
            priceMap[allCodes[i]] = result.value;
          }
        });

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

  return (
    <div className="h-full overflow-y-auto bg-white dark:bg-neutral-950">
      <div className="mx-auto max-w-7xl space-y-6 p-6">

        {/* ── 메인 콘텐츠 ── */}
        <div className="space-y-6">

          {/* A + 지수: 좌우 분할 */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">

            {/* A. 오늘의 AI 테마 */}
            <section className="rounded-2xl border border-gray-200 bg-white p-6 lg:col-span-3 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="mb-4 flex items-center gap-2">
                <Sparkles size={15} className="text-emerald-500" />
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">오늘의 AI 테마</h2>
              </div>

              {themeLoading ? (
                /* 로딩 중 */
                <div className="flex flex-col items-center gap-3 py-8">
                  <Loader2 size={24} className="animate-spin text-emerald-500" />
                  <p className="text-xs text-gray-400 dark:text-neutral-500">AI가 오늘의 시장을 분석 중입니다...</p>
                </div>
              ) : liveTheme.length === 0 ? (
                <p className="py-6 text-center text-xs text-gray-400 dark:text-neutral-600">
                  AI 분석 결과를 불러오지 못했습니다.
                </p>
              ) : (
                <>
                  {/* 키워드 Pills */}
                  <div className="mb-5 flex flex-wrap gap-2">
                    {liveTheme.map(({ keyword }) => (
                      <button
                        key={keyword}
                        onClick={() => setSelectedKeyword(keyword)}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                          selectedKeyword === keyword
                            ? "bg-emerald-500 text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-white"
                        }`}
                      >
                        {keyword}
                      </button>
                    ))}
                  </div>

                  {/* 관련 종목 카드 Grid */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {selectedGroup?.stocks.map((stock) => {
                      const isUp = !stock.rate.startsWith("-");
                      return (
                        <div
                          key={stock.code}
                          className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-neutral-700 dark:bg-neutral-800"
                        >
                          <p className="text-[10px] text-gray-400 dark:text-neutral-500">{stock.code}</p>
                          <p className="mt-0.5 text-sm font-semibold leading-tight text-gray-900 dark:text-white">
                            {stock.name}
                          </p>
                          <p className="mt-3 text-base font-bold text-gray-900 dark:text-white">
                            {stock.price === "—"
                              ? <span className="text-gray-400 dark:text-neutral-500">—</span>
                              : <>{Number(stock.price).toLocaleString()}<span className="ml-0.5 text-xs font-normal text-gray-400 dark:text-neutral-500">원</span></>
                            }
                          </p>
                          <div className="mt-1">
                            <span
                              className={`inline-block rounded-md px-1.5 py-0.5 text-xs font-semibold ${
                                isUp
                                  ? "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"
                                  : "bg-blue-50 text-blue-500 dark:bg-blue-900/20 dark:text-blue-400"
                              }`}
                            >
                              {stock.rate}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </section>

            {/* 코스피 / 코스닥 / 코스피200 지수 */}
            <section className="rounded-2xl border border-gray-200 bg-white p-6 lg:col-span-2 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="mb-4 flex items-center gap-2">
                <BarChart3 size={15} className="text-indigo-500" />
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">국내 지수</h2>
              </div>

              {/* "오늘의 AI 테마" 키워드 필터 행과 높이를 맞추기 위한 투명 스페이서 */}
              <div className="mb-5 invisible flex flex-wrap gap-2" aria-hidden="true">
                <span className="rounded-full px-3 py-1 text-xs font-medium">spacer</span>
              </div>

              <div className="flex divide-x divide-gray-200 dark:divide-neutral-700">
                {INDEX_TABS.map((tab) => {
                  const idx = indices.find((i) => i.code === tab.code);

                  if (!idx) {
                    return (
                      <div
                        key={tab.code}
                        className="flex flex-1 flex-col items-center justify-center gap-2 px-2 py-8 first:pl-0 last:pr-0"
                      >
                        <Loader2 size={18} className="animate-spin text-indigo-400" />
                      </div>
                    );
                  }

                  const isUp = !idx.rate.startsWith("-");
                  return (
                    <div key={tab.code} className="flex-1 px-3 first:pl-0 last:pr-0">
                      <p className="text-xs font-medium text-gray-400 dark:text-neutral-500">{tab.label}</p>
                      <p className="mt-1 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                        {Number(idx.price).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                      <span
                        className={`mt-2 inline-block rounded-md px-1.5 py-0.5 text-xs font-semibold ${
                          isUp
                            ? "bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400"
                            : "bg-blue-50 text-blue-500 dark:bg-blue-900/20 dark:text-blue-400"
                        }`}
                      >
                        {idx.rate}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          {/* B. 증권 뉴스 */}
          <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="mb-4 flex items-center gap-2">
              <TrendingUp size={15} className="text-blue-500" />
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">증권 뉴스</h2>
            </div>

            {news.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <Loader2 size={24} className="animate-spin text-blue-500" />
                <p className="text-xs text-gray-400 dark:text-neutral-500">뉴스를 불러오는 중...</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-neutral-800">
                {news.map((item) => (
                  <div key={item.id} className="py-4 first:pt-0 last:pb-0">
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold leading-snug text-gray-900 hover:text-emerald-600 dark:text-white dark:hover:text-emerald-400 transition-colors"
                    >
                      {item.title}
                    </a>
                    <p className="mt-1 text-xs text-gray-400 dark:text-neutral-500">{item.publishDate}</p>
                    {item.content && (
                      <p className="mt-2 text-xs leading-relaxed text-gray-500 dark:text-neutral-400 line-clamp-2">
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
    </div>
  );
}
