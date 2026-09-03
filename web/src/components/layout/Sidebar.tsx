"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { LayoutDashboard, TrendingUp, MessageSquare, Sun, Moon, LogIn, ShieldCheck } from "lucide-react";
import { useTheme } from "next-themes";
import { useAuthStore } from "@/store/useAuthStore";
import { useAppStore } from "@/store/useAppStore";
import { cn } from "@/lib/utils";
import { StockSearchBar } from "@/components/stock/StockSearchBar";
import { RankingTicker } from "@/components/stock/RankingTicker";
import { AccountMenu } from "@/components/layout/AccountMenu";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { authApi } from "@/services/authApi";

export const navItems = [
  { href: "/stocks",   icon: TrendingUp,     label: "증권"    },
  { href: "/board",    icon: MessageSquare,   label: "게시판"   },
  { href: "/dashboard", icon: LayoutDashboard, label: "대시보드" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoggedIn, nickname, isAdmin, clearAuth } = useAuthStore();
  const setWatchlist = useAppStore((s) => s.setWatchlist);
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const toggleTheme = () => setTheme(resolvedTheme === "dark" ? "light" : "dark");

  const handleLogout = async () => {
    // clearAuth()로 토큰을 지우기 전에 로그아웃 요청이 먼저 서버에 도달해야 함
    // (먼저 지우면 axios 인터셉터가 Authorization 헤더를 못 붙여 서버 세션이 안 지워짐)
    try {
      await authApi.logout();
    } catch {
      // 서버 세션 정리 실패해도 클라이언트 로그아웃은 진행
    }
    clearAuth();
    setWatchlist([]); // 계정 소유 즐겨찾기를 다음 게스트/다른 계정 세션에 남기지 않음
    router.push("/login");
  };

  return (
  <>
    <header className="w-full border-b border-gray-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
      {/* 상단 네비게이션 행 */}
      <div className="flex items-center h-14 px-4 gap-2">
        {/* 로고 */}
        <div className="flex items-center gap-2 shrink-0 mr-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-sm font-bold text-black">
            GZ
          </div>
          <span className="flex items-center">
            {mounted ? (
              <Image
                src={resolvedTheme === "dark" ? "/wAnt.png" : "/bAnt.png"}
                alt="gaemiZIP"
                width={resolvedTheme === "dark" ? 1293 : 1536}
                height={resolvedTheme === "dark" ? 513 : 508}
                className="h-7 w-auto"
                priority
              />
            ) : (
              <div className="h-7 w-20" />
            )}
          </span>
        </div>

        {/* 탭 — 모바일에서는 하단 네비게이션(MobileBottomNav)으로 이동 */}
        <nav className="hidden items-center gap-1 lg:flex">
          {[...navItems, ...(isAdmin ? [{ href: "/admin/members", icon: ShieldCheck, label: "관리자" }] : [])].map(({ href, icon: Icon, label }) => {
            const active = href === "/admin/members" ? pathname.startsWith("/admin") : pathname === href;
            return (
              <Link key={href} href={href} className="relative">
                {active && (
                  <motion.div
                    layoutId="navbar-active"
                    className="absolute inset-0 rounded-xl bg-gray-100 dark:bg-neutral-800"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <span
                  className={cn(
                    "relative flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "text-gray-900 dark:text-white"
                      : "text-gray-500 hover:text-gray-900 dark:text-neutral-500 dark:hover:text-neutral-200",
                  )}
                >
                  <Icon size={17} />
                  <span>{label}</span>
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="flex-1" />

        {/* 우측 컨트롤 */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
            aria-label="테마 전환"
          >
            {mounted ? (
              resolvedTheme === "dark" ? <Sun size={15} /> : <Moon size={15} />
            ) : (
              <div className="h-[15px] w-[15px]" />
            )}
          </button>

          {mounted && isLoggedIn && <NotificationBell />}

          {mounted && (
            isLoggedIn ? (
              <AccountMenu nickname={nickname} onLogout={handleLogout} />
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900 dark:text-neutral-500 dark:hover:text-neutral-200"
              >
                <LogIn size={17} />
                <span className="hidden sm:block">로그인</span>
              </Link>
            )
          )}
        </div>
      </div>

      {/* 검색창 + 랭킹 티커 행 */}
      <div className="flex items-center gap-6 px-4 pb-3">
        <div className="w-full lg:ml-[30vw] lg:w-[40vw] lg:flex-none">
          <StockSearchBar large />
        </div>
        <div className="hidden lg:block shrink-0">
          <RankingTicker />
        </div>
      </div>
    </header>
  </>
  );
}
