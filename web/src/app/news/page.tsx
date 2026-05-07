"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchLatestNews, fetchAiTheme } from "@/services/newsApi";
import type { NewsItem, AiThemeResponse, KeywordGroup } from "@/types/news";

function formatDate(dateStr: string): string {
  if (!dateStr || dateStr === "실시간") return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${mm}-${dd}`;
  } catch {
    return "";
  }
}

function truncate(text: string, max: number): string {
  if (!text) return "";
  return text.length > max ? text.slice(0, max) + "…" : text;
}

export default function NewsPage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [aiTheme, setAiTheme] = useState<AiThemeResponse | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<KeywordGroup | null>(null);
  const [newsLoading, setNewsLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(true);

  useEffect(() => {
    fetchLatestNews()
      .then(setNews)
      .catch(console.error)
      .finally(() => setNewsLoading(false));

    fetchAiTheme()
      .then((data) => {
        setAiTheme(data);
        if (data?.keywords?.length) setSelectedGroup(data.keywords[0]);
      })
      .catch(console.error)
      .finally(() => setAiLoading(false));
  }, []);

  return (
    <div className="flex h-full">
      {/* ── 좌측: 뉴스 목록 ── */}
      <div className="flex-1 overflow-y-auto border-r border-gray-200 p-6 dark:border-neutral-800">
        <h1 className="mb-6 text-xl font-bold text-gray-900 dark:text-white">주요 뉴스</h1>

        <div className="divide-y divide-gray-200 dark:divide-neutral-800/60">
          {newsLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="py-5 space-y-2">
                  <Skeleton className="h-4 w-3/4 bg-gray-200 dark:bg-neutral-800" />
                  <Skeleton className="h-3 w-1/4 bg-gray-200 dark:bg-neutral-800" />
                  <Skeleton className="h-3 w-full bg-gray-200 dark:bg-neutral-800" />
                  <Skeleton className="h-3 w-5/6 bg-gray-200 dark:bg-neutral-800" />
                </div>
              ))
            : news.length === 0
            ? <p className="py-10 text-center text-sm text-gray-400 dark:text-neutral-600">뉴스 데이터가 없습니다.</p>
            : news.map((item) => {
                const date = formatDate(item.publishDate);
                return (
                  <a
                    key={item.id}
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block py-5 px-2 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-neutral-900/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="text-sm font-semibold leading-snug text-gray-900 transition-colors group-hover:text-emerald-600 dark:text-neutral-100 dark:group-hover:text-emerald-400">
                        {item.title}
                      </h2>
                      <ExternalLink
                        size={13}
                        className="mt-0.5 shrink-0 text-gray-300 transition-colors group-hover:text-gray-500 dark:text-neutral-700 dark:group-hover:text-neutral-400"
                      />
                    </div>

                    <p className="mt-1 text-xs text-gray-500 dark:text-neutral-500">
                      {item.publisher}
                      {date && <span className="ml-1 text-gray-400 dark:text-neutral-600">· {date}</span>}
                    </p>

                    {item.content && (
                      <p className="mt-2 text-xs leading-relaxed text-gray-500 dark:text-neutral-500">
                        {truncate(item.content, 130)}
                      </p>
                    )}
                  </a>
                );
              })}
        </div>
      </div>

      {/* ── 우측: AI 분석 패널 ── */}
      <div className="w-72 shrink-0 overflow-y-auto p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Sparkles size={15} className="text-emerald-500 dark:text-emerald-400" />
          <h2 className="text-sm font-semibold text-gray-700 dark:text-neutral-300">AI 분석 키워드</h2>
        </div>

        {aiLoading ? (
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-24 rounded-full bg-gray-200 dark:bg-neutral-800" />
            ))}
          </div>
        ) : aiTheme?.keywords?.length ? (
          <>
            <div className="flex flex-wrap gap-2">
              {aiTheme.keywords.map((kg) => (
                <button
                  key={kg.keyword}
                  onClick={() => setSelectedGroup(kg)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    selectedGroup?.keyword === kg.keyword
                      ? "bg-emerald-500 text-black"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-white"
                  }`}
                >
                  {kg.keyword}
                </button>
              ))}
            </div>

            {selectedGroup && (
              <div className="space-y-3">
                <p className="text-xs font-medium text-gray-500 dark:text-neutral-500">관련 종목</p>
                {selectedGroup.stocks.map((stock) => {
                  const isPositive = !stock.changeRate.startsWith("-");
                  return (
                    <div
                      key={`${stock.stockCode}-${stock.stockName}`}
                      className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-500 dark:text-neutral-500">{stock.stockCode}</p>
                          <p className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">{stock.stockName}</p>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            isPositive
                              ? "border-emerald-700 text-emerald-500 dark:text-emerald-400"
                              : "border-rose-700 text-rose-500 dark:text-rose-400"
                          }
                        >
                          {stock.changeRate}
                        </Badge>
                      </div>
                      <p className="mt-2 text-xs text-gray-400 dark:text-neutral-600">뉴스 AI 분석 예상치</p>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <p className="text-xs text-gray-400 dark:text-neutral-600">
            {aiLoading ? "" : "AI 분석 결과가 없습니다."}
          </p>
        )}
      </div>
    </div>
  );
}
