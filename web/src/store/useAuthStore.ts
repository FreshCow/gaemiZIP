import { create } from "zustand";
import type { AuthResponse } from "@/types/auth";
import { clearAuthStorage, readAuthFromStorage, setAuthStorage } from "@/lib/authStorage";

interface AuthState {
  token: string | null;
  nickname: string | null;
  balance: number | null;
  provider: string | null;
  role: string | null;
  isLoggedIn: boolean;
  isAdmin: boolean;
  init: () => void;
  setAuth: (auth: AuthResponse, rememberMe: boolean) => void;
  clearAuth: () => void;
  updateBalance: (newBalance: number) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  nickname: null,
  balance: null,
  provider: null,
  role: null,
  isLoggedIn: false,
  isAdmin: false,

  init: () => {
    const { token, nickname, balance, provider, role } = readAuthFromStorage();
    set({ token, nickname, balance, provider, role, isLoggedIn: !!token, isAdmin: role === "ROLE_ADMIN" });
  },

  setAuth: (auth: AuthResponse, rememberMe: boolean) => {
    setAuthStorage(auth, rememberMe);
    // rememberMe면 서버가 내려준 expiresIn(초)만큼 쿠키 유지, 아니면 세션 쿠키(브라우저 종료 시 삭제)
    const maxAge = rememberMe ? `; max-age=${auth.expiresIn}` : "";
    document.cookie = `gaemi_token=${auth.token}; path=/${maxAge}; SameSite=Lax`;
    set({
      token: auth.token,
      nickname: auth.nickname,
      balance: auth.balance,
      provider: auth.provider,
      role: auth.role,
      isLoggedIn: true,
      isAdmin: auth.role === "ROLE_ADMIN",
    });
  },

  clearAuth: () => {
    clearAuthStorage();
    document.cookie = "gaemi_token=; path=/; max-age=0";
    set({ token: null, nickname: null, balance: null, provider: null, role: null, isLoggedIn: false, isAdmin: false });
  },

  updateBalance: (newBalance: number) => {
    const storage = localStorage.getItem("gaemi_token") ? localStorage : sessionStorage;
    storage.setItem("gaemi_balance", String(newBalance));
    set({ balance: newBalance });
  },
}));
