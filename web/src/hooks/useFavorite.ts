"use client";

import { useAppStore } from "@/store/useAppStore";
import { useAuthStore } from "@/store/useAuthStore";
import { addFavorite, removeFavorite } from "@/services/favoriteApi";

// 즐겨찾기(★) 토글 — 로컬 상태는 항상 즉시 반영, 로그인 상태면 서버에도 반영
export function useFavorite() {
  const watchlist = useAppStore((s) => s.watchlist);
  const toggleWatchlist = useAppStore((s) => s.toggleWatchlist);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);

  const isFavorite = (code: string) => watchlist.includes(code);

  const toggleFavorite = (code: string, name: string) => {
    const wasFavorited = watchlist.includes(code);
    toggleWatchlist(code);
    if (!isLoggedIn) return;
    (wasFavorited ? removeFavorite(code) : addFavorite(code, name)).catch(() => {});
  };

  return { watchlist, isFavorite, toggleFavorite };
}
