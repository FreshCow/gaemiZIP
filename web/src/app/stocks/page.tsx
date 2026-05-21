"use client";

import { useEffect, useState } from "react";
import { Loader2, Sparkles, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppStore } from "@/store/useAppStore";
import { StockSearchBar } from "@/components/stock/StockSearchBar";
import { fetchAiTheme } from "@/services/newsApi";
import { fetchStockPrice } from "@/services/stockApi";
import type { StockPriceItem } from "@/types/stock";

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

// ── AI 뉴스 브리핑 더미 데이터 ─────────────────────────────────────────────────

const AI_NEWS = [
  {
    id: 1,
    title: "삼성전자, HBM4 양산 일정 앞당겨…엔비디아 공급 확정",
    publisher: "한국경제",
    sentiment: "호재" as const,
    summary: [
      "삼성전자가 HBM4 양산 시점을 당초 계획 대비 2분기 앞당기기로 결정했다.",
      "엔비디아 블랙웰 아키텍처 GPU에 삼성 HBM4 탑재가 공식 확정됐다.",
      "공급 계약 체결로 메모리 사업부 연간 영업이익 개선 폭이 크게 확대될 전망이다.",
    ],
  },
  {
    id: 2,
    title: "Fed, 금리 동결 시사…'연내 2회 인하' 전망 유지",
    publisher: "매일경제",
    sentiment: "호재" as const,
    summary: [
      "연준 의장이 인플레이션 완화 흐름을 확인했다고 언급하며 연내 인하 여지를 열었다.",
      "시장은 9월·12월 두 차례 인하 시나리오를 70% 확률로 반영 중이다.",
      "달러 약세 전환 시 국내 수출주 및 외국인 순매수 유입이 기대된다.",
    ],
  },
  {
    id: 3,
    title: "中 전기차 보조금 폐지 임박…현대차·기아 반사 수혜 기대",
    publisher: "이데일리",
    sentiment: "호재" as const,
    summary: [
      "중국 정부의 전기차 보조금 정책이 6월 말 종료 예정이라고 공식 발표됐다.",
      "중국산 저가 전기차의 가격 경쟁력 약화로 글로벌 완성차의 반사 이익이 기대된다.",
      "현대차·기아는 유럽·미국 시장에서 점유율 확대 전략을 추가 발표할 것으로 알려졌다.",
    ],
  },
  {
    id: 4,
    title: "카카오, 핵심 계열사 매각 추진…구조조정 리스크 부각",
    publisher: "조선비즈",
    sentiment: "악재" as const,
    summary: [
      "카카오가 SM엔터테인먼트 등 비핵심 자산 매각을 통한 재무 구조 개선에 나섰다.",
      "일부 핵심 서비스 인력도 감축 대상에 포함될 수 있어 성장성 우려가 제기된다.",
      "투자자들은 단기 현금 확보보다 장기 성장 동력 훼손 가능성을 더 우려하는 모습이다.",
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────

export default function StocksPage() {
  const stocks = useAppStore((s) => s.stocks);

  const [liveTheme, setLiveTheme] = useState<LiveKeywordGroup[]>([]);
  const [selectedKeyword, setSelectedKeyword] = useState("");
  const [themeLoading, setThemeLoading] = useState(true);

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
              // 실제 시세가 있으면 랭킹 rate, 없으면 Gemini 예측값(% 제거)
              rate: hasRealPrice
                ? priceData.rate
                : s.changeRate.replace("%", "").trim(),
              isAiRate: !hasRealPrice,
            };
          }),
        }));

        setLiveTheme(live);
        setSelectedKeyword(live[0]?.keyword ?? "");
      })
      .catch(() => { /* Gemini 실패 시 로딩 해제만 */ })
      .finally(() => { if (!cancelled) setThemeLoading(false); });

    return () => { cancelled = true; };
  }, []);

  const selectedGroup = liveTheme.find((g) => g.keyword === selectedKeyword);

  return (
    <div className="h-full overflow-y-auto bg-white dark:bg-neutral-950">
      <div className="mx-auto max-w-7xl space-y-6 p-6">

        {/* ── 상단: 종목 검색바 ── */}
        <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-6 shadow-sm dark:border-neutral-800 dark:from-neutral-900 dark:to-neutral-950">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-neutral-500">
            종목 탐색
          </p>
          <p className="mb-4 text-xl font-bold text-gray-900 dark:text-white">
            어떤 종목이 궁금하신가요?
          </p>
          <div className="mx-auto max-w-2xl">
            <StockSearchBar />
          </div>
        </div>

        {/* ── 메인 그리드 ── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* ── 좌측 (col-span-2) ── */}
          <div className="space-y-6 lg:col-span-2">

            {/* A. 오늘의 AI 테마 */}
            <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
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
                          <div className="mt-1 flex items-center gap-1">
                            <span
                              className={`inline-block rounded-md px-1.5 py-0.5 text-xs font-semibold ${
                                isUp
                                  ? "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"
                                  : "bg-blue-50 text-blue-500 dark:bg-blue-900/20 dark:text-blue-400"
                              }`}
                            >
                              {stock.rate}%
                            </span>
                            {stock.isAiRate && (
                              <span className="text-[9px] text-gray-400 dark:text-neutral-500">AI 예상</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </section>

            {/* B. AI 뉴스 브리핑 */}
            <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="mb-4 flex items-center gap-2">
                <TrendingUp size={15} className="text-blue-500" />
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">AI 뉴스 브리핑</h2>
              </div>

              <div className="divide-y divide-gray-100 dark:divide-neutral-800">
                {AI_NEWS.map((item) => (
                  <div key={item.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold leading-snug text-gray-900 dark:text-white">
                        {item.title}
                      </p>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          item.sentiment === "호재"
                            ? "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"
                            : "bg-gray-100 text-gray-500 dark:bg-neutral-800 dark:text-neutral-400"
                        }`}
                      >
                        {item.sentiment}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-400 dark:text-neutral-500">{item.publisher}</p>
                    <ul className="mt-2 space-y-1.5">
                      {item.summary.map((line, i) => (
                        <li key={`news-${item.id}-${i}`} className="flex items-start gap-2 text-xs text-gray-500 dark:text-neutral-400">
                          <span className="mt-[5px] h-1 w-1 shrink-0 rounded-full bg-gray-300 dark:bg-neutral-600" />
                          {line}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* ── 우측 사이드바: 실시간 급등 랭킹 ── */}
          <aside>
            <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="mb-4 flex items-center gap-2">
                <TrendingUp size={15} className="text-emerald-500" />
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">실시간 급등 랭킹</h2>
              </div>

              {stocks.length === 0 ? (
                <div className="space-y-3">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 rounded-lg bg-gray-100 dark:bg-neutral-800" />
                  ))}
                </div>
              ) : (
                <ol className="divide-y divide-gray-100 dark:divide-neutral-800">
                  {stocks.map((stock, idx) => {
                    const isUp = !stock.rate.startsWith("-");
                    return (
                      <li key={`rank-${stock.code}-${idx}`} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                        <span
                          className={`w-5 shrink-0 text-center text-xs font-bold ${
                            idx < 3 ? "text-emerald-500" : "text-gray-400 dark:text-neutral-600"
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                            {stock.name}
                          </p>
                          <p className="text-[10px] text-gray-400 dark:text-neutral-500">{stock.code}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            {Number(stock.price).toLocaleString()}
                          </p>
                          <span
                            className={`inline-block rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                              isUp
                                ? "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"
                                : "bg-blue-50 text-blue-500 dark:bg-blue-900/20 dark:text-blue-400"
                            }`}
                          >
                            {stock.rate}%
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
