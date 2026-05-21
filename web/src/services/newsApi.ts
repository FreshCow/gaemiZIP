import api from "./api";
import type { NewsItem, AiThemeResponse } from "@/types/news";

export async function fetchLatestNews(): Promise<NewsItem[]> {
  const { data } = await api.get<NewsItem[]>("/news/latest");
  return data;
}

export async function fetchAiTheme(): Promise<AiThemeResponse> {
  const { data } = await api.get<AiThemeResponse>("/ai/theme", { timeout: 30000 });
  return data;
}
