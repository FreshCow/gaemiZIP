"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { LayoutDashboard, TrendingUp, MessageSquare, Activity, Wifi, WifiOff, Sun, Moon, LogIn, LogOut, User } from "lucide-react";
import { useTheme } from "next-themes";
import { useAppStore } from "@/store/useAppStore";
import { useAuthStore } from "@/store/useAuthStore";
import { cn } from "@/lib/utils";
import { StockSearchBar } from "@/components/stock/StockSearchBar";

const navItems = [
  { href: "/stocks",   icon: TrendingUp,     label: "AI 탐색"  },
  { href: "/trading",  icon: Activity,        label: "트레이딩" },
  { href: "/board",    icon: MessageSquare,   label: "게시판"   },
  { href: "/",         icon: LayoutDashboard, label: "대시보드" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const wsConnected = useAppStore((s) => s.wsConnected);
  const { isLoggedIn, nickname, clearAuth } = useAuthStore();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const toggleTheme = () => setTheme(resolvedTheme === "dark" ? "light" : "dark");

  const handleLogout = () => {
    clearAuth();
    router.push("/login");
  };

  return (
    <header className="w-full border-b border-gray-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
      {/* 상단 네비게이션 행 */}
      <div className="flex items-center h-14 px-4 gap-2">
        {/* 로고 */}
        <div className="flex items-center gap-2 shrink-0 mr-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-sm font-bold text-black">
            GZ
          </div>
          <span className="hidden lg:flex items-center">
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

        {/* 탭 */}
        <nav className="flex items-center gap-1">
          {navItems.map(({ href, icon: Icon, label }) => {
            const active = pathname === href;
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
                  <span className="hidden sm:block">{label}</span>
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="flex-1" />

        {/* 우측 컨트롤 */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-neutral-600">
            {wsConnected ? (
              <Wifi size={14} className="text-emerald-500" />
            ) : (
              <WifiOff size={14} className="text-rose-500" />
            )}
            <span className="hidden lg:block">{wsConnected ? "연결됨" : "연결 끊김"}</span>
          </div>

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

          {mounted && (
            isLoggedIn ? (
              <div className="flex items-center gap-1.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                  <User size={13} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="hidden lg:block text-xs font-medium text-gray-700 dark:text-neutral-300 max-w-[80px] truncate">
                  {nickname}
                </span>
                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-rose-500 dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-rose-400"
                  aria-label="로그아웃"
                >
                  <LogOut size={14} />
                </button>
              </div>
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

      {/* 검색창 행 */}
      <div className="px-4 pb-3 lg:px-[30vw]">
        <StockSearchBar large />
      </div>
    </header>
  );
}
