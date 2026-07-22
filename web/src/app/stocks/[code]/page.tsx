"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Star,
  TrendingUp,
  TrendingDown,
  Minus,
  Newspaper,
  Sparkles,
  ChevronLeft,
  Clock,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { CandlestickChart } from "@/components/chart/CandlestickChart";
import { fetchStockInfo, fetchStockPrice, fetchStockNews, subscribeStock } from "@/services/stockApi";
import { fetchStockAiAnalysis } from "@/services/newsApi";
import { useAppStore } from "@/store/useAppStore";
import { Pagination } from "@/components/ui/pagination";
import type { StockInfoData, StockPriceItem } from "@/types/stock";
import type { NewsItem, AiStockAnalysisResponse } from "@/types/news";

const NEWS_PAGE_SIZE = 5;

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  // AI 종목 분석 / 관련 뉴스 — 지연이 있을 수 있어 본문 로딩과 분리
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [newsPage, setNewsPage] = useState(0);
  const [aiAnalysis, setAiAnalysis] = useState<AiStockAnalysisResponse | null>(null);
  const [aiLoading, setAiLoading] = useState(true);

  // 실시간 랭킹에서 현재가 fallback
  const rankStock = useAppStore((s) => s.stocks.find((s) => s.code === code));
  // 키움 실시간 구독으로 들어오는 최신 시세 (top10 랭킹 밖 종목도 포함)
  const liveUpdate = useAppStore((s) => s.livePrices[code]);

  useEffect(() => {
    if (!code) return;
    setLoading(true);
    setError(false);
    Promise.all([fetchStockInfo(code), fetchStockPrice(code).catch(() => null)])
      .then(([infoRes, priceRes]) => {
        setInfo(infoRes);
        setPrice(priceRes);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));

    // 실시간 시세를 받을 수 있도록 키움 구독에 편입 요청
    subscribeStock(code).catch(() => {});
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
  const predPre   = absNum(info?.predPre);
  const fluRt     = apiRate;
  const priceUp   = isUp(fluRt);

  const newsTotalPages = Math.ceil(news.length / NEWS_PAGE_SIZE);
  const pagedNews = news.slice(newsPage * NEWS_PAGE_SIZE, newsPage * NEWS_PAGE_SIZE + NEWS_PAGE_SIZE);

  return (
    <div className="p-6 space-y-5">
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
                      ({priceUp ? "+" : ""}{fluRt}%)
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

            {/* 차트 */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <h2 className="mb-3 text-sm font-medium text-gray-700 dark:text-neutral-300">주가 차트</h2>
              <div className="h-72">
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
            <div className="flex h-full flex-col gap-5">

            {/* 시장 정보 */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <h2 className="mb-3 text-sm font-medium text-gray-700 dark:text-neutral-300">시장 정보</h2>
              <InfoRow label="거래량"       value={fmt(info.trdeQty, "주")} />
              <InfoRow label="거래대금"     value={fmt(info.trdePre, "원")} />
              <InfoRow label="외인소진율"   value={info.forExhRt ? `${info.forExhRt}%` : "—"} />
              <InfoRow label="연중최고"     value={fmt(info.oyrHgst)} colored />
              <InfoRow label="연중최저"     value={fmt(info.oyrLwst)} colored />
              <InfoRow label="250일최고"    value={`${fmt(info.hgst250)} (${info.hgst250PricDt || "—"}일 전)`} />
              <InfoRow label="250일최저"    value={`${fmt(info.lwst250)} (${info.lwst250PricDt || "—"}일 전)`} />
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
                  <ul className="flex-1 min-h-0 divide-y divide-gray-100 overflow-y-auto dark:divide-neutral-800">
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
                    page={newsPage}
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
