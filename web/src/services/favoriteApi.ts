import api from "./api";

export interface FavoriteItem {
  stockCode: string;
  stockName: string;
  createdAt: string;
}

const authHeaders = (token: string) => ({ Authorization: `Bearer ${token}` });

export async function fetchFavorites(token: string): Promise<FavoriteItem[]> {
  const { data } = await api.get<FavoriteItem[]>("/favorites", { headers: authHeaders(token) });
  return data;
}

export async function addFavorite(code: string, stockName: string, token: string): Promise<void> {
  await api.post(`/favorites/${encodeURIComponent(code)}`, { stockName }, { headers: authHeaders(token) });
}

export async function removeFavorite(code: string, token: string): Promise<void> {
  await api.delete(`/favorites/${encodeURIComponent(code)}`, { headers: authHeaders(token) });
}

export async function fetchFavoriteCount(code: string): Promise<number> {
  const { data } = await api.get<{ count: number }>(`/favorites/${encodeURIComponent(code)}/count`);
  return data.count;
}
