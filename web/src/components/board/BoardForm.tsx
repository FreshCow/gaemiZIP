"use client";

import { useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import {
  BOARD_TAG_ACTIVE_CLASSES,
  BOARD_TAG_BADGE_CLASSES,
  BOARD_TAG_LABELS,
  FILTERABLE_TAGS,
  type BoardStockShare,
  type BoardTag,
} from "@/types/board";

const MAX_SHARED_STOCKS = 5;

export interface BoardFormValues {
  title: string;
  content: string;
  tag: BoardTag;
  sharedStocks: BoardStockShare[];
}

interface BoardFormProps {
  initialTitle?: string;
  initialContent?: string;
  initialTag?: BoardTag;
  initialStockCodes?: string[];
  submitLabel: string;
  submittingLabel: string;
  onSubmit: (values: BoardFormValues) => Promise<void>;
  onCancel: () => void;
}

export default function BoardForm({
  initialTitle = "",
  initialContent = "",
  initialTag = "DAILY",
  initialStockCodes = [],
  submitLabel,
  submittingLabel,
  onSubmit,
  onCancel,
}: BoardFormProps) {
  const { holdings } = useAppStore();
  const { nickname, isAdmin } = useAuthStore();
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [tag, setTag] = useState<BoardTag>(initialTag);
  const [selectedCodes, setSelectedCodes] = useState<string[]>(initialStockCodes);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const availableTags = isAdmin ? [...FILTERABLE_TAGS, "NOTICE" as const] : FILTERABLE_TAGS;

  const toggleStock = (code: string) => {
    setSelectedCodes((prev) => {
      if (prev.includes(code)) return prev.filter((c) => c !== code);
      if (prev.length >= MAX_SHARED_STOCKS) return prev;
      return [...prev, code];
    });
  };

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const sharedStocks: BoardStockShare[] = holdings
        .filter((h) => selectedCodes.includes(h.code))
        .map((h) => ({
          stockCode: h.code,
          stockName: h.name,
          quantity: h.quantity,
          avgPrice: h.buyPrice,
          priceAtShare: h.currentPrice,
          profitLossAmount: (h.currentPrice - h.buyPrice) * h.quantity,
          profitLossRate: h.profitRate,
        }));

      await onSubmit({ title, content, tag, sharedStocks });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: string } })?.response?.data ??
        "처리 중 오류가 발생했습니다.";
      setError(typeof msg === "string" ? msg : "처리 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 space-y-4 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-neutral-800">
        <span className="text-xs text-gray-400 dark:text-neutral-500">작성자</span>
        <span className="text-sm font-medium text-gray-700 dark:text-neutral-300">{nickname ?? "익명의 개미"}</span>
      </div>

      {/* 태그 선택 */}
      <div className="flex flex-wrap items-center gap-1.5">
        {availableTags.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTag(t)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              tag === t ? BOARD_TAG_ACTIVE_CLASSES[t] : BOARD_TAG_BADGE_CLASSES[t]
            }`}
          >
            {BOARD_TAG_LABELS[t]}
          </button>
        ))}
      </div>

      <input
        className="w-full rounded-lg bg-gray-100 px-3 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:ring-1 focus:ring-gray-300 dark:bg-neutral-800 dark:text-white dark:placeholder:text-neutral-600 dark:focus:ring-neutral-600"
        placeholder="제목을 입력하세요"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <textarea
        className="w-full rounded-lg bg-gray-100 px-3 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:ring-1 focus:ring-gray-300 min-h-[26rem] resize-none dark:bg-neutral-800 dark:text-white dark:placeholder:text-neutral-600 dark:focus:ring-neutral-600"
        placeholder="내용을 입력하세요"
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />

      {/* 보유종목 공유 (최대 5개) */}
      {holdings.length > 0 && (
        <div className="space-y-2 pt-1">
          <p className="text-xs text-gray-400 dark:text-neutral-500">
            보유종목 공유 (최대 {MAX_SHARED_STOCKS}개, {selectedCodes.length}/{MAX_SHARED_STOCKS})
          </p>
          <div className="flex flex-wrap gap-2">
            {holdings.map((h) => {
              const isPos = h.profitRate >= 0;
              const selected = selectedCodes.includes(h.code);
              const disabled = !selected && selectedCodes.length >= MAX_SHARED_STOCKS;
              return (
                <button
                  key={h.code}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggleStock(h.code)}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                    selected
                      ? "border-emerald-500 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-900/20"
                      : "border-gray-200 bg-white hover:border-gray-300 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-neutral-600"
                  }`}
                >
                  <span className="font-medium text-gray-800 dark:text-neutral-200">{h.name}</span>
                  <span className={isPos ? "text-emerald-500" : "text-rose-500"}>
                    {isPos ? "+" : ""}
                    {h.profitRate.toFixed(2)}%
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-900/20 dark:text-rose-400">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" size="sm" onClick={onCancel}>
          취소
        </Button>
        <Button size="sm" onClick={handleSubmit} disabled={submitting || !title.trim() || !content.trim()}>
          {submitting ? submittingLabel : submitLabel}
        </Button>
      </div>
    </div>
  );
}
