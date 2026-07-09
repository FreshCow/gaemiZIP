import api from "./api";
import type { NewsItem, AiThemeResponse, AiStockAnalysisResponse } from "@/types/news";

export async function fetchLatestNews(): Promise<NewsItem[]> {
  const { data } = await api.get<NewsItem[]>("/news/latest");
  return data;
}

export async function fetchAiTheme(): Promise<AiThemeResponse> {
  const { data } = await api.get<AiThemeResponse>("/ai/theme", { timeout: 30000 });
  return data;
}

// 최초 조회 시 서버가 Gemini를 호출할 수 있어 지연이 길 수 있음(캐시되면 이후 조회는 빠름)
export async function fetchStockAiAnalysis(code: string): Promise<AiStockAnalysisResponse> {
  const { data } = await api.get<AiStockAnalysisResponse>(`/ai/stock/${code}`, { timeout: 30000 });
  return data;
}
