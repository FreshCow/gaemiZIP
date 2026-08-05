export type MemberStatus = "ACTIVE" | "SUSPENDED";

export interface MemberResponse {
  id: number;
  email: string | null;
  username: string | null;
  nickname: string;
  role: "USER" | "ADMIN";
  status: MemberStatus;
  provider: string;
  balance: number;
  createdDate: string;
}

// 관리자 화면용 거래 기록 — entity/TradeHistory를 그대로 반환
export interface AdminTradeItem {
  id: number;
  memberId: number | null;
  stockCode: string;
  stockName: string;
  tradeType: "BUY" | "SELL";
  price: number;
  quantity: number;
  profitRate: number;
  tradeTime: string;
}

export interface SignupTrendItem {
  date: string;
  count: number;
}

export interface TradeVolumeItem {
  date: string;
  count: number;
  totalAmount: number;
}

export type AuditLogAction = "DELETE_TRADE" | "ADJUST_BALANCE";

// 관리자 감사 로그 — 잔고 조정/거래 삭제 등 되돌리기 어려운 조작 이력
export interface AuditLogItem {
  id: number;
  adminId: number;
  adminNickname: string;
  action: AuditLogAction;
  targetId: number;
  detail: string;
  createdAt: string;
}
