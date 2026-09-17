"use client";

import { useAppStore } from "@/store/useAppStore";
import { useAuthStore } from "@/store/useAuthStore";
import { addFavorite, removeFavorite } from "@/services/favoriteApi";
import { isAxiosError } from "axios";
import { useFavoriteStore } from "@/store/useFavoriteStore";
import { favoriteRequestId, isCurrentFavoriteSession, refreshFavoriteCount, syncFavoritesFromServer, trackFavoriteWrite } from "@/lib/favoriteSync";

export function useFavorite() {
  const watchlist = useAppStore((s) => s.watchlist);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const generation = useAuthStore((s) => s.authGeneration);
  const state = useFavoriteStore();

  const isFavorite = (code: string) => isLoggedIn && state.ownerGeneration === generation && watchlist.includes(code);
  const canToggle = (code: string) => isLoggedIn && state.ownerGeneration === generation
    && state.syncStatus === "ready" && !state.pending[code];

  const toggleFavorite = (code: string, name: string) => {
    const auth = useAuthStore.getState();
    const currentState = useFavoriteStore.getState();
    if (!auth.isLoggedIn || !auth.token || currentState.ownerGeneration !== auth.authGeneration
      || currentState.syncStatus !== "ready" || currentState.pending[code]) return;
    const session = auth.authGeneration;
    const token = auth.token;
    const target = !useAppStore.getState().watchlist.includes(code);
    const requestId = favoriteRequestId();
    useFavoriteStore.setState((s) => ({
      pending: { ...s.pending, [code]: requestId }, errors: { ...s.errors, [code]: undefined },
    }));
    const current = () => isCurrentFavoriteSession(session)
      && useFavoriteStore.getState().pending[code] === requestId;
    const request = (async () => {
      let reconcile = false;
      try {
        if (target) await addFavorite(code, name, token);
        else await removeFavorite(code, token);
        if (!current()) return;
        useAppStore.getState().setFavorite(code, target);
        void refreshFavoriteCount(code);
      } catch (error) {
        if (!current()) return;
        const status = isAxiosError(error) ? error.response?.status : undefined;
        if (status === 401) {
          useAuthStore.getState().clearAuth();
          return;
        }
        reconcile = !status || status >= 500 || status === 408;
        useFavoriteStore.setState((s) => ({
          errors: { ...s.errors, [code]: reconcile
            ? "저장 결과를 확인하고 있습니다."
            : "즐겨찾기를 변경하지 못했습니다. 다시 시도해 주세요." },
          ...(reconcile ? { syncStatus: "reconciling" as const } : {}),
        }));
      } finally {
        if (current()) {
          useFavoriteStore.setState((s) => {
            const pending = { ...s.pending };
            delete pending[code];
            return { pending };
          });
        }
        // 현재 Promise가 완료된 뒤 동기화가 진행되도록 예약한다.
        if (reconcile && isCurrentFavoriteSession(session)) {
          queueMicrotask(() => { if (isCurrentFavoriteSession(session)) void syncFavoritesFromServer(); });
        }
      }
    })();
    trackFavoriteWrite(session, code, request);
  };

  return {
    watchlist, isFavorite, toggleFavorite, canToggle,
    isLoggedIn, errors: state.errors, syncError: state.syncError,
    needsSync: isLoggedIn && state.syncStatus === "error",
    retrySync: syncFavoritesFromServer,
  };
}
