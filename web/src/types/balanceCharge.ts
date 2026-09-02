export type ChargeAmount =
  | "HUNDRED_MILLION"
  | "FIVE_HUNDRED_MILLION"
  | "ONE_BILLION"
  | "THREE_BILLION"
  | "FIVE_BILLION";

export const CHARGE_AMOUNT_OPTIONS: { value: ChargeAmount; label: string; amount: number }[] = [
  { value: "HUNDRED_MILLION", label: "1억", amount: 100_000_000 },
  { value: "FIVE_HUNDRED_MILLION", label: "5억", amount: 500_000_000 },
  { value: "ONE_BILLION", label: "10억", amount: 1_000_000_000 },
  { value: "THREE_BILLION", label: "30억", amount: 3_000_000_000 },
  { value: "FIVE_BILLION", label: "50억", amount: 5_000_000_000 },
];

export interface ChargeRequestStatusResponse {
  canRequest: boolean;
  nextAvailableAt: string | null;
}

// 관리자 화면용 — 대기중인 충전 요청 (요청자 정보 포함)
export interface AdminChargeRequestItem {
  id: number;
  memberId: number;
  memberNickname: string;
  amount: number;
  requestedAt: string;
}
