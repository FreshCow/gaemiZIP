"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number; // 0-based 현재 페이지
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

const MAX_VISIBLE = 5;

function getVisiblePages(page: number, totalPages: number): number[] {
  const half = Math.floor(MAX_VISIBLE / 2);
  let start = Math.max(0, page - half);
  const end = Math.min(totalPages, start + MAX_VISIBLE);
  start = Math.max(0, end - MAX_VISIBLE);
  return Array.from({ length: end - start }, (_, i) => start + i);
}

export function Pagination({ page, totalPages, onPageChange, className = "" }: PaginationProps) {
  if (totalPages <= 1) return null;

  const visiblePages = getVisiblePages(page, totalPages);

  return (
    <div className={`flex items-center justify-center gap-1.5 ${className}`}>
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 0}
        aria-label="이전 페이지"
        className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-50 disabled:pointer-events-none disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700"
      >
        <ChevronLeft size={14} />
      </button>

      {visiblePages.map((p) => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          aria-current={p === page ? "page" : undefined}
          className={`flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-xs font-medium transition-colors ${
            p === page
              ? "bg-emerald-500 text-white"
              : "text-gray-500 hover:bg-gray-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
          }`}
        >
          {p + 1}
        </button>
      ))}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages - 1}
        aria-label="다음 페이지"
        className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-50 disabled:pointer-events-none disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700"
      >
        <ChevronRight size={14} />
      </button>
    </div>
  );
}
