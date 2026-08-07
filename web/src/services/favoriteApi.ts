import api from "./api";

export interface FavoriteItem {
  stockCode: string;
  stockName: string;
  createdAt: string;
}

export async function fetchFavorites(): Promise<FavoriteItem[]> {
  const { data } = await api.get<FavoriteItem[]>("/favorites");
  return data;
}

export async function addFavorite(code: string, stockName: string): Promise<void> {
  await api.post(`/favorites/${code}`, { stockName });
}

export async function removeFavorite(code: string): Promise<void> {
  await api.delete(`/favorites/${code}`);
}
