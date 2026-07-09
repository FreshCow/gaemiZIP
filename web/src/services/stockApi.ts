import api from "./api";
import type { StockSearchResult, StockPriceItem, StockInfoData } from "@/types/stock";
import type { NewsItem } from "@/types/news";

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

export async function fetchStockInfo(code: string): Promise<StockInfoData> {
  const { data } = await api.get<StockInfoData>(`/stocks/${code}/info`);
  return data;
}

export async function fetchStockNews(code: string): Promise<NewsItem[]> {
  const { data } = await api.get<NewsItem[]>(`/stocks/${code}/news`);
  return data;
}
