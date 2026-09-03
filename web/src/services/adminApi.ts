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

export const adminApi = {
  // 회원 목록 조회
  getMembers: () => api.get<MemberResponse[]>("/admin/members").then((r) => r.data),

  // 회원 정지/활성 토글
  updateMemberStatus: (id: number, status: MemberStatus) =>
    api.patch(`/admin/members/${id}/status`, { status }),

  // 잔고 수동 증감
  adjustBalance: (id: number, delta: number) =>
    api.patch(`/admin/members/${id}/balanceAdjust`, { delta }),

  // 콘텐츠 관리 — 블라인드 포함 전체 조회 (공개 API는 블라인드 글/댓글을 거름)
  getBoards: () => api.get<BoardListItem[]>("/admin/boards").then((r) => r.data),
  getComments: (boardId: number) =>
    api.get<Comment[]>(`/admin/boards/${boardId}/comments`).then((r) => r.data),

  // 게시글/댓글 블라인드 토글 (둘 다 토글 방식, 별도 바디 없음)
  blindBoard: (id: number) => api.patch(`/admin/board/${id}/blind`),
  blindComment: (id: number) => api.patch(`/admin/comment/${id}/blind`),

  // 전체 거래 조회 / 거래 기록 삭제(보정) — 잔고·보유종목 롤백 없음
  getTrades: () => api.get<AdminTradeItem[]>("/admin/trades").then((r) => r.data),
  deleteTrade: (id: number) => api.delete(`/admin/trades/${id}`),

  // 통계
  getSignupTrend: (days = 30) =>
    api
      .get<SignupTrendItem[]>("/admin/stats/signup-trend", { params: { days } })
      .then((r) => r.data),
  getTradeVolume: (days = 30) =>
    api
      .get<TradeVolumeItem[]>("/admin/stats/trade-volume", { params: { days } })
      .then((r) => r.data),

  // 감사 로그 — 잔고 조정/거래 삭제 이력 조회
  getAuditLogs: () => api.get<AuditLogItem[]>("/admin/audit-logs").then((r) => r.data),
};
