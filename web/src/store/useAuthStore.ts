import { create } from "zustand";
import type { AuthResponse } from "@/types/auth";

interface AuthState {
  token: string | null;
  nickname: string | null;
  balance: number | null;
  isLoggedIn: boolean;
  init: () => void;
  setAuth: (auth: AuthResponse) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  nickname: null,
  balance: null,
  isLoggedIn: false,

  init: () => {
    const token = localStorage.getItem("gaemi_token");
    const nickname = localStorage.getItem("gaemi_nickname");
    const balanceStr = localStorage.getItem("gaemi_balance");
    const balance = balanceStr !== null ? Number(balanceStr) : null;
    set({ token, nickname, balance, isLoggedIn: !!token });
  },

  setAuth: (auth: AuthResponse) => {
    localStorage.setItem("gaemi_token", auth.token);
    localStorage.setItem("gaemi_nickname", auth.nickname);
    localStorage.setItem("gaemi_balance", String(auth.balance));
    document.cookie = `gaemi_token=${auth.token}; path=/; max-age=86400; SameSite=Lax`;
    set({ token: auth.token, nickname: auth.nickname, balance: auth.balance, isLoggedIn: true });
  },

  clearAuth: () => {
    localStorage.removeItem("gaemi_token");
    localStorage.removeItem("gaemi_nickname");
    localStorage.removeItem("gaemi_balance");
    document.cookie = "gaemi_token=; path=/; max-age=0";
    set({ token: null, nickname: null, balance: null, isLoggedIn: false });
  },
}));
