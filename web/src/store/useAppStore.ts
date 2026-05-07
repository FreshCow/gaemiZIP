import { create } from "zustand";
import type { StockItem, HoldingItem, TickData, StockUpdate } from "@/types/stock";
import type { TradeHistory } from "@/types/trade";
import type { BoardPost } from "@/types/board";

interface AppState {
  stocks: StockItem[];
  holdings: HoldingItem[];
  tradeHistories: TradeHistory[];
  boards: BoardPost[];
  isAutoTrading: boolean;
  wsConnected: boolean;
  latestTick: TickData | null;

  setStocks: (stocks: StockItem[]) => void;
  updateStock: (update: StockUpdate) => void;
  setHoldings: (holdings: HoldingItem[]) => void;
  setTradeHistories: (histories: TradeHistory[]) => void;
  setBoards: (boards: BoardPost[]) => void;
  toggleAutoTrading: () => void;
  setWsConnected: (connected: boolean) => void;
  setLatestTick: (tick: TickData) => void;
}

// 장 마감 시간 등 서버 데이터가 없을 때 UI 확인용 목 데이터
const MOCK_STOCKS: StockItem[] = [
  { code: "005930", name: "삼성전자",   price: "75100", rate: "+1.49",  volume: 25_432_100 },
  { code: "000660", name: "SK하이닉스", price: "189500", rate: "+3.27", volume: 8_921_400 },
  { code: "035720", name: "카카오",     price: "42350",  rate: "-0.82", volume: 7_654_300 },
  { code: "005380", name: "현대차",     price: "238000", rate: "+2.14", volume: 6_234_800 },
  { code: "051910", name: "LG화학",     price: "312000", rate: "-1.53", volume: 5_102_600 },
  { code: "068270", name: "셀트리온",   price: "178500", rate: "+0.96", volume: 4_873_200 },
  { code: "035420", name: "NAVER",      price: "184000", rate: "+1.21", volume: 4_231_700 },
  { code: "006400", name: "삼성SDI",    price: "298000", rate: "-2.30", volume: 3_987_500 },
  { code: "207940", name: "삼성바이오로직스", price: "824000", rate: "+0.49", volume: 3_421_000 },
  { code: "003550", name: "LG",         price: "89200",  rate: "+0.79", volume: 2_934_600 },
];

export const useAppStore = create<AppState>((set) => ({
  stocks: MOCK_STOCKS,
  holdings: [],
  tradeHistories: [],
  boards: [],
  isAutoTrading: false,
  wsConnected: false,
  latestTick: null,

  setStocks: (stocks) => set({ stocks }),
  updateStock: (update) =>
    set((s) => ({
      stocks: s.stocks.map((item) =>
        item.code === update.code
          ? {
              ...item,
              ...(update.price  !== undefined && { price:  update.price  }),
              ...(update.rate   !== undefined && { rate:   update.rate   }),
              ...(update.volume !== undefined && { volume: update.volume }),
            }
          : item
      ),
    })),
  setHoldings: (holdings) => set({ holdings }),
  setTradeHistories: (tradeHistories) => set({ tradeHistories }),
  setBoards: (boards) => set({ boards }),
  toggleAutoTrading: () =>
    set((s) => ({ isAutoTrading: !s.isAutoTrading })),
  setWsConnected: (wsConnected) => set({ wsConnected }),
  setLatestTick: (latestTick) => set({ latestTick }),
}));
