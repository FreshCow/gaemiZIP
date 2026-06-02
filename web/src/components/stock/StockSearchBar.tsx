"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { searchStocks } from "@/services/stockApi";
import { cn } from "@/lib/utils";
import type { StockSearchResult } from "@/types/stock";

interface StockSearchBarProps {
  large?: boolean;
  onSelect?: (stock: StockSearchResult) => void; // 제공 시 페이지 이동 대신 콜백 호출
}

export function StockSearchBar({ large = false, onSelect }: StockSearchBarProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StockSearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    searchStocks(debouncedQuery)
      .then((data) => {
        if (cancelled) return;
        setResults(data);
        setIsOpen(true);
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [debouncedQuery]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(stock: StockSearchResult) {
    setQuery("");
    setResults([]);
    setIsOpen(false);
    if (onSelect) {
      onSelect(stock);
    } else {
      router.push(`/stocks/${stock.code}`);
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div className={cn(
        "flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 dark:border-neutral-800 dark:bg-neutral-900",
        large ? "px-4 py-3.5" : "px-3 py-2",
      )}>
        <Search size={large ? 18 : 14} className="shrink-0 text-gray-400 dark:text-neutral-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder="종목명 또는 코드 검색"
          className={cn(
            "w-full bg-transparent text-gray-900 placeholder-gray-400 outline-none dark:text-white dark:placeholder-neutral-500",
            large ? "text-base" : "text-sm",
          )}
        />
        {isLoading && (
          <span className={cn(
            "shrink-0 animate-spin rounded-full border-2 border-gray-300 border-t-emerald-500 dark:border-neutral-600 dark:border-t-emerald-400",
            large ? "h-4 w-4" : "h-3 w-3",
          )} />
        )}
      </div>

      {isOpen && (
        <ul className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
          {results.length === 0 ? (
            <li className="px-4 py-3 text-sm text-gray-400 dark:text-neutral-500">
              검색 결과가 없습니다
            </li>
          ) : (
            results.map((stock) => (
              <li key={stock.code}>
                <button
                  type="button"
                  onClick={() => handleSelect(stock)}
                  className="flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-neutral-800"
                >
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {stock.name}
                  </span>
                  <span className="ml-2 shrink-0 text-xs text-gray-400 dark:text-neutral-500">
                    {stock.code}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
