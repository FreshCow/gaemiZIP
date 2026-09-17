import { create } from "zustand";
import type { StockItem, HoldingItem, TickData, StockUpdate, IndexItem, OrderBookData } from "@/types/stock";
import type { BoardListItem } from "@/types/board";
import type { NotificationItem } from "@/types/notification";

interface AppState {
  stocks: StockItem[];
  holdings: HoldingItem[];
  boards: BoardListItem[];
  watchlist: string[];
  isAutoTrading: boolean;
  wsConnected: boolean;
  latestTick: TickData | null;
  indices: IndexItem[];
  livePrices: Record<string, StockUpdate>;
  orderBooks: Record<string, OrderBookData>;
  notifications: NotificationItem[];
  unreadCount: number;

  setStocks: (stocks: StockItem[]) => void;
  setIndices: (indices: IndexItem[]) => void;
  updateStock: (update: StockUpdate) => void;
  updateLivePrice: (update: StockUpdate) => void;
  updateOrderBook: (orderBook: OrderBookData) => void;
  setHoldings: (holdings: HoldingItem[]) => void;
  updateHoldingPrice: (code: string, currentPrice: number) => void;
  setBoards: (boards: BoardListItem[]) => void;
  setFavorite: (code: string, favorite: boolean) => void;
  setWatchlist: (codes: string[]) => void;
  toggleAutoTrading: () => void;
  setWsConnected: (connected: boolean) => void;
  setLatestTick: (tick: TickData) => void;
  setNotifications: (list: NotificationItem[]) => void;
  setUnreadCount: (count: number) => void;
  markNotificationRead: (id: number) => void;
  markAllNotificationsRead: () => void;
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
  boards: [],
  watchlist: [],
  isAutoTrading: false,
  wsConnected: false,
  latestTick: null,
  indices: [],
  livePrices: {},
  orderBooks: {},
  notifications: [],
  unreadCount: 0,

  setStocks: (stocks) => set({ stocks }),
  setIndices: (indices) => set({ indices }),
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
  // top10 랭킹 여부와 무관하게 실시간 시세를 코드별로 저장 (종목 상세 페이지 등에서 사용)
  updateLivePrice: (update) =>
    set((s) => ({
      livePrices: {
        ...s.livePrices,
        [update.code]: { ...s.livePrices[update.code], ...update },
      },
    })),
  // 종목 상세 페이지 호가창 — 코드별로 최신 스냅샷만 유지
  updateOrderBook: (orderBook) =>
    set((s) => ({
      orderBooks: { ...s.orderBooks, [orderBook.code]: orderBook },
    })),
  setHoldings: (holdings) => set({ holdings }),
  updateHoldingPrice: (code, currentPrice) =>
    set((s) => ({
      holdings: s.holdings.map((h) =>
        h.code === code
          ? {
              ...h,
              currentPrice,
              profitRate: h.buyPrice > 0
                ? ((currentPrice - h.buyPrice) / h.buyPrice) * 100
                : 0,
            }
          : h
      ),
    })),
  setBoards: (boards) => set({ boards }),
  setFavorite: (code, favorite) =>
    set((s) => {
      const next = favorite
        ? [...new Set([...s.watchlist, code])]
        : s.watchlist.filter((c) => c !== code);
      return { watchlist: next };
    }),
  setWatchlist: (codes) => set({ watchlist: codes }),
  toggleAutoTrading: () =>
    set((s) => ({ isAutoTrading: !s.isAutoTrading })),
  setWsConnected: (wsConnected) => set({ wsConnected }),
  setLatestTick: (latestTick) => set({ latestTick }),
  setNotifications: (notifications) => set({ notifications }),
  setUnreadCount: (unreadCount) => set({ unreadCount }),
  markNotificationRead: (id) =>
    set((s) => {
      const target = s.notifications.find((n) => n.id === id);
      return {
        notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
        unreadCount: target && !target.read ? Math.max(0, s.unreadCount - 1) : s.unreadCount,
      };
    }),
  markAllNotificationsRead: () =>
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),
}));
