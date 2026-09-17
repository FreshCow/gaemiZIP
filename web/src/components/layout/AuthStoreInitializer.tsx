"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { syncFavoritesFromServer } from "@/lib/favoriteSync";
import { authApi } from "@/services/authApi";
import { isAdminPath, isAuthOnlyPath, requiresAuth } from "@/lib/authRoutes";

// 서버의 세션 락(auth:session:*) TTL(10분)보다 짧은 주기로 갱신 — 브라우저가 닫히면
// 하트비트가 끊겨서 TTL 만료 후 자동으로 락이 풀림 (다른 기기 로그인 차단 해제)
const HEARTBEAT_INTERVAL_MS = 4 * 60 * 1000;

export function AuthStoreInitializer() {
  const init = useAuthStore((s) => s.init);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const authGeneration = useAuthStore((s) => s.authGeneration);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const pathname = usePathname();
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    init();
    setHydrated(true);
  }, [init]);

  useEffect(() => {
    if (hydrated && isLoggedIn) void syncFavoritesFromServer();
  }, [hydrated, isLoggedIn, authGeneration]);

  // middleware.ts는 gaemi_token 쿠키 존재 여부만 보는데, 이 쿠키는 브라우저 프로세스 단위(모든 탭 공유)로
  // 살아있는 반면 실제 인증/권한 상태(로그인 유지 미체크 시 sessionStorage, role은 그 탭에서 로그인한 계정
  // 기준)는 탭 단위라 어긋날 수 있음(다른 탭에서 다른 계정으로 로그인하면 공유 쿠키가 그 계정으로 덮어써짐)
  // → 로그인 여부/관리자 권한 모두 여기(탭의 실제 상태 기준)에서 판단하고, 미들웨어는 /login,/signup 쪽
  // 리다이렉트에 관여하지 않음
  useEffect(() => {
    if (!hydrated) return;

    if (isLoggedIn) {
      if (isAuthOnlyPath(pathname)) router.replace("/dashboard");
      if (isAdminPath(pathname) && !isAdmin) router.replace("/dashboard");
      return;
    }

    if (isAuthOnlyPath(pathname)) return;
    if (!requiresAuth(pathname)) return;
    router.replace("/login");
  }, [hydrated, isLoggedIn, isAdmin, pathname, router]);

  useEffect(() => {
    if (!isLoggedIn) return;

    const sendHeartbeat = () => {
      authApi.heartbeat().catch((err) => {
        if (err?.response?.status === 401 && useAuthStore.getState().authGeneration === authGeneration) {
          clearAuth();
        }
      });
    };

    const timer = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [isLoggedIn, clearAuth, authGeneration]);

  return null;
}
