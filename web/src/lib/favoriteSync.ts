import { useAppStore } from "@/store/useAppStore";
import { fetchFavorites, addFavorite } from "@/services/favoriteApi";
import { fetchStockPrice } from "@/services/stockApi";

// 로그인 시 서버 즐겨찾기로 동기화.
// 서버가 비어있는데 기존 localStorage 관심종목이 있으면(이전 세션의 로컬 전용 즐겨찾기) 서버로 1회 업로드해 보존
export async function syncFavoritesFromServer(): Promise<void> {
  const server = await fetchFavorites();
  if (server.length > 0) {
    useAppStore.getState().setWatchlist(server.map((f) => f.stockCode));
    return;
  }

  const localCodes = useAppStore.getState().watchlist;
  if (localCodes.length === 0) return;

  const results = await Promise.allSettled(
    localCodes.map(async (code) => {
      const price = await fetchStockPrice(code);
      await addFavorite(code, price.name);
      return code;
    })
  );
  const migrated = results
    .filter((r): r is PromiseFulfilledResult<string> => r.status === "fulfilled")
    .map((r) => r.value);
  useAppStore.getState().setWatchlist(migrated);
}
