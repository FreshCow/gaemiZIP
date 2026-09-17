import { useAppStore } from "@/store/useAppStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useFavoriteStore } from "@/store/useFavoriteStore";
import { isAxiosError } from "axios";
import { fetchFavorites, fetchFavoriteCount } from "@/services/favoriteApi";

let nextRequestId = 0;
export const favoriteRequestId = () => ++nextRequestId;
export const isCurrentFavoriteSession = (generation: number) =>
  useAuthStore.getState().isLoggedIn && useAuthStore.getState().authGeneration === generation;
const syncRequests = new Map<number, Promise<void>>();
const writes = new Map<number, Set<Promise<void>>>();
const affectedCodes = new Map<number, Set<string>>();

export function trackFavoriteWrite(generation: number, code: string, request: Promise<void>) {
  const requests = writes.get(generation) ?? new Set<Promise<void>>();
  requests.add(request);
  writes.set(generation, requests);
  const codes = affectedCodes.get(generation) ?? new Set<string>();
  codes.add(code);
  affectedCodes.set(generation, codes);
  void request.then(() => {
    requests.delete(request);
    if (!requests.size) {
      writes.delete(generation);
      if (!isCurrentFavoriteSession(generation) || useFavoriteStore.getState().syncStatus === "ready") {
        affectedCodes.delete(generation);
      }
    }
  });
}

export async function refreshFavoriteCount(code: string): Promise<void> {
  if (!code) return;
  const requestId = favoriteRequestId();
  const value = useFavoriteStore.getState().counts[code]?.value;
  const update = (loading: boolean, error: string | null, nextValue = value) => {
    useFavoriteStore.setState((s) => ({ counts: {
      ...s.counts, [code]: { value: nextValue, loading, error, requestId },
    } }));
  };
  update(true, null);
  try {
    const count = await fetchFavoriteCount(code);
    if (useFavoriteStore.getState().counts[code]?.requestId === requestId) update(false, null, count);
  } catch {
    if (useFavoriteStore.getState().counts[code]?.requestId === requestId) {
      update(false, "즐겨찾기 수를 불러오지 못했습니다.");
    }
  }
}

export function syncFavoritesFromServer(): Promise<void> {
  const auth = useAuthStore.getState();
  if (!auth.isLoggedIn || !auth.token) return Promise.resolve();
  const generation = auth.authGeneration;
  const existing = syncRequests.get(generation);
  if (existing) return existing;
  const requestId = favoriteRequestId();
  const recovering = useFavoriteStore.getState().syncStatus === "reconciling";
  const token = auth.token;
  useFavoriteStore.setState({ syncStatus: recovering ? "reconciling" : "loading", syncError: null, syncRequestId: requestId });
  const current = () => isCurrentFavoriteSession(generation)
    && useFavoriteStore.getState().syncRequestId === requestId;
  const request = (async () => {
    try {
      // 새 변경을 막은 뒤 이미 진행 중인 변경의 완료를 기다린다.
      await Promise.allSettled([...(writes.get(generation) ?? [])]);
      if (!current()) return;
      const list = await fetchFavorites(token);
      if (!current()) return;
      useAppStore.getState().setWatchlist(list.map((item) => item.stockCode));
      useFavoriteStore.setState({ syncStatus: "ready", syncError: null, errors: {} });
      const codes = affectedCodes.get(generation);
      affectedCodes.delete(generation);
      if (codes) void Promise.all([...codes].map(refreshFavoriteCount));
    } catch (error) {
      if (!current()) return;
      if (isAxiosError(error) && error.response?.status === 401) useAuthStore.getState().clearAuth();
      else useFavoriteStore.setState({ syncStatus: "error", syncError: "즐겨찾기를 확인하지 못했습니다. 다시 시도해 주세요." });
    } finally {
      syncRequests.delete(generation);
    }
  })();
  syncRequests.set(generation, request);
  return request;
}
