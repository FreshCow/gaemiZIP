"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Star } from "lucide-react";
import { useFavorite } from "@/hooks/useFavorite";
import { useFavoriteStore } from "@/store/useFavoriteStore";
import { refreshFavoriteCount } from "@/lib/favoriteSync";

interface Props {
  code: string;
  name: string;
  showCount?: boolean;
  size?: number;
}

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

export function FavoriteButton({ code, name, showCount = false, size = 14 }: Props) {
  const favorite = useFavorite();
  const hydrated = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const count = useFavoriteStore((s) => s.counts[code]);
  const pending = useFavoriteStore((s) => !!s.pending[code]);
  const checked = hydrated && favorite.isFavorite(code);
  const error = hydrated ? favorite.errors[code] ?? favorite.syncError : null;
  const label = !hydrated || !favorite.isLoggedIn ? "로그인 후 즐겨찾기를 사용할 수 있습니다."
    : pending ? "즐겨찾기 저장 중"
      : favorite.canToggle(code) ? (checked ? "즐겨찾기 해제" : "즐겨찾기 추가")
        : "즐겨찾기 목록 확인이 필요합니다.";

  useEffect(() => {
    if (showCount) void refreshFavoriteCount(code);
  }, [code, showCount]);

  return (
    <div className="relative shrink-0" onClick={(event) => event.stopPropagation()}>
      <div className={`flex items-center gap-1 ${
        showCount ? "rounded-lg border border-gray-200 bg-gray-50 px-1.5 py-0.5 dark:border-neutral-700 dark:bg-neutral-800" : ""
      }`}>
        <button type="button" onClick={() => favorite.toggleFavorite(code, name)}
          disabled={!hydrated || !favorite.canToggle(code)} aria-pressed={checked} aria-label={label} title={label}
          className="rounded-full p-1 transition-transform enabled:active:scale-90 disabled:cursor-not-allowed disabled:opacity-50">
          <Star size={size} fill={checked ? "currentColor" : "none"}
            className={checked ? "text-yellow-400" : "text-gray-300 dark:text-neutral-600"} />
        </button>
        {showCount && (
          <span className="text-sm tabular-nums text-gray-500 dark:text-neutral-400"
            aria-label={hydrated && count?.value !== undefined ? `즐겨찾기 ${count.value.toLocaleString("ko-KR")}명` : "즐겨찾기 수 확인 중"}>
            {hydrated && count?.value !== undefined ? count.value.toLocaleString("ko-KR")
              : hydrated && count?.error ? "—"
                : <span className="inline-block h-4 w-6 animate-pulse rounded bg-gray-200 dark:bg-neutral-700" />}
          </span>
        )}
      </div>
      {hydrated && showCount && count?.error && (
        <button type="button" onClick={() => void refreshFavoriteCount(code)} disabled={count.loading}
          title={count.error} className="block text-xs text-rose-500 disabled:opacity-50">숫자 다시 조회</button>
      )}
      {error && <p role="status" className="mt-1 max-w-40 text-xs text-rose-500">{error}</p>}
      {hydrated && favorite.needsSync && (
        <button type="button" onClick={() => void favorite.retrySync()} className="text-xs text-rose-500 underline">즐겨찾기 다시 조회</button>
      )}
    </div>
  );
}
