import api from "./api";
import type { ChargeAmount, ChargeRequestStatusResponse, AdminChargeRequestItem } from "@/types/balanceCharge";

// 백엔드 admin API는 /api가 아니라 /admin 하위에 매핑되어 있음 (adminApi.ts와 동일한 이유)
const API_ROOT = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api").replace(/\/api\/?$/, "");
const ADMIN_BASE = `${API_ROOT}/admin`;

export const balanceChargeApi = {
  // 예수금 충전 신청
  createChargeRequest: (amount: ChargeAmount) => api.post("/balance/charge-requests", { amount }),

  // 내 신청 가능 여부 조회 (대기중 요청 유무 + 다음 신청 가능일)
  getMyChargeStatus: () =>
    api.get<ChargeRequestStatusResponse>("/balance/charge-requests/me").then((r) => r.data),

  // 관리자 — 대기중인 충전 요청 목록
  getPendingRequests: () =>
    api.get<AdminChargeRequestItem[]>(`${ADMIN_BASE}/balance-charges`).then((r) => r.data),

  // 관리자 — 승인 (즉시 잔고 지급)
  approve: (id: number) => api.patch(`${ADMIN_BASE}/balance-charges/${id}/approve`),

  // 관리자 — 거절 (사유 선택)
  reject: (id: number, reason?: string) =>
    api.patch(`${ADMIN_BASE}/balance-charges/${id}/reject`, { reason }),
};
