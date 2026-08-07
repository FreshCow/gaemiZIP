"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

export function RankingTicker() {
  const stocks = useAppStore((s) => s.stocks);
  const [activeIdx, setActiveIdx] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open || stocks.length === 0) return;
    const id = setInterval(() => setActiveIdx((i) => (i + 1) % Math.min(stocks.length, 10)), 2000);
    return () => clearInterval(id);
  }, [open, stocks.length]);

  // 바깥 클릭 시 드롭다운 닫기
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const top10 = stocks.slice(0, 10);

  if (top10.length === 0) return null;

  const stock = top10[activeIdx];
  const isUp = !stock.rate.startsWith("-");

  return (
    <div ref={ref} className="relative shrink-0">
      {/* 티커 바 */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-left cursor-pointer select-none dark:border-neutral-700 dark:bg-neutral-800 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors"
      >
        <TrendingUp size={15} className="text-emerald-500 shrink-0" />
        <span className="w-6 shrink-0 text-right font-bold text-emerald-500">{activeIdx + 1}</span>
        <span className="w-[120px] truncate font-medium text-gray-700 dark:text-neutral-300">{stock.name}</span>
        <span className="font-semibold text-gray-900 dark:text-white">{Number(stock.price).toLocaleString()}원</span>
        <span className={`font-bold ${isUp ? "text-green-500 dark:text-green-400" : "text-blue-500 dark:text-blue-400"}`}>
          {stock.rate}%
        </span>
      </button>

      {/* 드롭다운 */}
      {open && (
        <div className="absolute top-full right-0 mt-2 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-gray-200 bg-white shadow-xl dark:border-neutral-700 dark:bg-neutral-900">
          <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-3 dark:border-neutral-800">
            <TrendingUp size={14} className="text-emerald-500" />
            <p className="text-sm font-semibold text-gray-700 dark:text-neutral-300">실시간 급등 랭킹</p>
          </div>
          <ol className="divide-y divide-gray-50 dark:divide-neutral-800">
            {top10.map((s, i) => {
              const up = !s.rate.startsWith("-");
              return (
                <li key={s.code}>
                  <Link
                    href={`/stocks/${s.code}`}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors"
                  >
                    <span className={`w-5 shrink-0 text-center text-sm font-bold ${i < 3 ? "text-emerald-500" : "text-gray-400 dark:text-neutral-600"}`}>
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{s.name}</p>
                      <p className="text-xs text-gray-400 dark:text-neutral-500">{s.code}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{Number(s.price).toLocaleString()}원</p>
                      <p className={`text-xs font-semibold ${up ? "text-green-500 dark:text-green-400" : "text-blue-500 dark:text-blue-400"}`}>
                        {s.rate}%
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}
