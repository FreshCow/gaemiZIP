import api from "./api";
import type { StockSearchResult, StockPriceItem, StockInfoData, OrderBookData } from "@/types/stock";
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

// 상세 페이지 진입 시 키움 실시간 구독에 편입 요청 (top10 랭킹 밖 종목도 실시간 반영되도록)
export async function subscribeStock(code: string): Promise<void> {
  await api.post(`/stocks/${code}/subscribe`);
}

// 호가창 초기 스냅샷 (이후 갱신은 WS QUOTE_UPDATE로 수신)
export async function fetchStockQuote(code: string): Promise<OrderBookData> {
  const { data } = await api.get<OrderBookData>(`/stocks/${code}/quote`);
  return data;
}
