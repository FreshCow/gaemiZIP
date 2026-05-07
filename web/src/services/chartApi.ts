import api from "./api";
import type { CandlePoint } from "@/types/stock";

export async function fetchChart(code: string, interval: string): Promise<CandlePoint[]> {
  const { data } = await api.get<CandlePoint[]>(`/stocks/${code}/chart`, {
    params: { interval },
  });
  return data;
}
