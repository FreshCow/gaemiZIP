import api from "./api";
import type { StockSearchResult, StockPriceItem } from "@/types/stock";

export async function searchStocks(keyword: string): Promise<StockSearchResult[]> {
  const { data } = await api.get<StockSearchResult[]>("/stocks/search", {
    params: { keyword },
  });
  return data;
}

export async function fetchStockPrice(code: string): Promise<StockPriceItem> {
  const { data } = await api.get<StockPriceItem>(`/stocks/${code}/price`);
  return data;
}
