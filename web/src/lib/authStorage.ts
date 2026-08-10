import type { AuthResponse } from "@/types/auth";

const KEYS = ["gaemi_token", "gaemi_nickname", "gaemi_balance", "gaemi_provider", "gaemi_role"] as const;

// "로그인 상태 유지" 체크 시 localStorage(브라우저 재시작 후에도 유지), 미체크 시 sessionStorage(탭/브라우저 종료 시 삭제)
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem("gaemi_token") ?? sessionStorage.getItem("gaemi_token");
  return token && token !== "null" && token !== "undefined" ? token : null;
}

export function setAuthStorage(auth: AuthResponse, rememberMe: boolean) {
  const storage = rememberMe ? localStorage : sessionStorage;
  const other = rememberMe ? sessionStorage : localStorage;

  storage.setItem("gaemi_token", auth.token);
  storage.setItem("gaemi_nickname", auth.nickname);
  storage.setItem("gaemi_balance", String(auth.balance));
  storage.setItem("gaemi_provider", auth.provider);
  storage.setItem("gaemi_role", auth.role);
  KEYS.forEach((key) => other.removeItem(key));
}

export function clearAuthStorage() {
  KEYS.forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
}

export function readAuthFromStorage() {
  if (typeof window === "undefined") {
    return { token: null, nickname: null, balance: null, provider: null, role: null };
  }
  const source = localStorage.getItem("gaemi_token") ? localStorage : sessionStorage;
  const balanceStr = source.getItem("gaemi_balance");
  return {
    token: source.getItem("gaemi_token"),
    nickname: source.getItem("gaemi_nickname"),
    balance: balanceStr !== null ? Number(balanceStr) : null,
    provider: source.getItem("gaemi_provider"),
    role: source.getItem("gaemi_role"),
  };
}
