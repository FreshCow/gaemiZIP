import api from "./api";
import type {
  MemberResponse,
  MemberStatus,
  AdminTradeItem,
  SignupTrendItem,
  TradeVolumeItem,
  AuditLogItem,
} from "@/types/admin";
import type { BoardListItem, Comment } from "@/types/board";

// 백엔드 admin API는 /api가 아니라 /admin 하위에 매핑되어 있어
// services/api.ts의 baseURL(.../api)을 그대로 못 씀 — 절대경로로 호출해 baseURL을 무시시킴
// (axios는 url이 절대경로면 baseURL을 무시하지만 인터셉터는 그대로 적용됨)
const API_ROOT = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api").replace(/\/api\/?$/, "");
const ADMIN_BASE = `${API_ROOT}/admin`;

export const adminApi = {
  // 회원 목록 조회
  getMembers: () => api.get<MemberResponse[]>(`${ADMIN_BASE}/members`).then((r) => r.data),

  // 회원 정지/활성 토글
  updateMemberStatus: (id: number, status: MemberStatus) =>
    api.patch(`${ADMIN_BASE}/members/${id}/status`, { status }),

  // 잔고 수동 증감
  adjustBalance: (id: number, delta: number) =>
    api.patch(`${ADMIN_BASE}/members/${id}/balanceAdjust`, { delta }),

  // 콘텐츠 관리 — 블라인드 포함 전체 조회 (공개 API는 블라인드 글/댓글을 거름)
  getBoards: () => api.get<BoardListItem[]>(`${ADMIN_BASE}/boards`).then((r) => r.data),
  getComments: (boardId: number) =>
    api.get<Comment[]>(`${ADMIN_BASE}/boards/${boardId}/comments`).then((r) => r.data),

  // 게시글/댓글 블라인드 토글 (둘 다 토글 방식, 별도 바디 없음)
  blindBoard: (id: number) => api.patch(`${ADMIN_BASE}/board/${id}/blind`),
  blindComment: (id: number) => api.patch(`${ADMIN_BASE}/comment/${id}/blind`),

  // 전체 거래 조회 / 거래 기록 삭제(보정) — 잔고·보유종목 롤백 없음
  getTrades: () => api.get<AdminTradeItem[]>(`${ADMIN_BASE}/trades`).then((r) => r.data),
  deleteTrade: (id: number) => api.delete(`${ADMIN_BASE}/trades/${id}`),

  // 통계
  getSignupTrend: (days = 30) =>
    api
      .get<SignupTrendItem[]>(`${ADMIN_BASE}/stats/signup-trend`, { params: { days } })
      .then((r) => r.data),
  getTradeVolume: (days = 30) =>
    api
      .get<TradeVolumeItem[]>(`${ADMIN_BASE}/stats/trade-volume`, { params: { days } })
      .then((r) => r.data),

  // 감사 로그 — 잔고 조정/거래 삭제 이력 조회
  getAuditLogs: () => api.get<AuditLogItem[]>(`${ADMIN_BASE}/audit-logs`).then((r) => r.data),
};
