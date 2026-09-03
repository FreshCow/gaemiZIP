import api from "./api";
import type { ChargeAmount, ChargeRequestStatusResponse, AdminChargeRequestItem } from "@/types/balanceCharge";

export const balanceChargeApi = {
  // 예수금 충전 신청
  createChargeRequest: (amount: ChargeAmount) => api.post("/balance/charge-requests", { amount }),

  // 내 신청 가능 여부 조회 (대기중 요청 유무 + 다음 신청 가능일)
  getMyChargeStatus: () =>
    api.get<ChargeRequestStatusResponse>("/balance/charge-requests/me").then((r) => r.data),

  // 관리자 — 대기중인 충전 요청 목록
  getPendingRequests: () =>
    api.get<AdminChargeRequestItem[]>("/admin/balance-charges").then((r) => r.data),

  // 관리자 — 승인 (즉시 잔고 지급)
  approve: (id: number) => api.patch(`/admin/balance-charges/${id}/approve`),

  // 관리자 — 거절 (사유 선택)
  reject: (id: number, reason?: string) =>
    api.patch(`/admin/balance-charges/${id}/reject`, { reason }),
};
