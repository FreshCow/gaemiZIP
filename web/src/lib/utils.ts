import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 서버에서 내려오는 LocalDateTime 문자열(예: 2026-07-25T10:00:15.587468)을
// "yyyy-MM-dd HH:mm" 형태로 통일해 표시한다.
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// 숫자 입력창에 타이핑하는 동안 천단위 콤마를 자동으로 붙여준다. 부호(-)와 숫자만 허용.
export function formatNumberInput(value: string): string {
  const isNegative = value.trim().startsWith("-");
  const digits = value.replace(/[^0-9]/g, "");
  if (!digits) return isNegative ? "-" : "";
  const formatted = Number(digits).toLocaleString();
  return isNegative ? `-${formatted}` : formatted;
}

// formatNumberInput으로 콤마가 붙은 문자열을 다시 숫자로 변환
export function parseNumberInput(value: string): number {
  return Number(value.replace(/,/g, ""));
}
