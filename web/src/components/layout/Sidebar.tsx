"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { LayoutDashboard, TrendingUp, MessageSquare, Activity, Sun, Moon, LogIn, LogOut, User, ShieldCheck } from "lucide-react";
import { useTheme } from "next-themes";
import { useAppStore } from "@/store/useAppStore";
import { useAuthStore } from "@/store/useAuthStore";
import { cn } from "@/lib/utils";
import { StockSearchBar } from "@/components/stock/StockSearchBar";
import { WithdrawModal } from "@/components/auth/WithdrawModal";
import { NotificationBell } from "@/components/layout/NotificationBell";

const navItems = [
  { href: "/stocks",   icon: TrendingUp,     label: "AI 탐색"  },
  { href: "/trading",  icon: Activity,        label: "트레이딩" },
  { href: "/board",    icon: MessageSquare,   label: "게시판"   },
  { href: "/",         icon: LayoutDashboard, label: "대시보드" },
];

function RankingTicker() {
  const stocks = useAppStore((s) => s.stocks);
  const [activeIdx, setActiveIdx] = useState(0);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (hovered || stocks.length === 0) return;
    const id = setInterval(() => setActiveIdx((i) => (i + 1) % Math.min(stocks.length, 10)), 2000);
    return () => clearInterval(id);
  }, [hovered, stocks.length]);

  const top10 = stocks.slice(0, 10);

  if (top10.length === 0) return null;

  const stock = top10[activeIdx];
  const isUp = !stock.rate.startsWith("-");

  return (
    <div
      className="relative shrink-0"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* 티커 바 — 기존 대비 2배 크기 */}
      <div className="flex items-center gap-3 cursor-default select-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors">
        <TrendingUp size={15} className="text-emerald-500 shrink-0" />
        <span className="w-6 shrink-0 text-right font-bold text-emerald-500">{activeIdx + 1}</span>
        <span className="w-[120px] truncate font-medium text-gray-700 dark:text-neutral-300">{stock.name}</span>
        <span className="font-semibold text-gray-900 dark:text-white">{Number(stock.price).toLocaleString()}원</span>
        <span className={`font-bold ${isUp ? "text-green-500 dark:text-green-400" : "text-blue-500 dark:text-blue-400"}`}>
          {stock.rate}%
        </span>
      </div>

      {/* 드롭다운 */}
      {hovered && (
        <div className="absolute top-full right-0 mt-2 z-50 w-80 rounded-xl border border-gray-200 bg-white shadow-xl dark:border-neutral-700 dark:bg-neutral-900">
          <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-3 dark:border-neutral-800">
            <TrendingUp size={14} className="text-emerald-500" />
            <p className="text-sm font-semibold text-gray-700 dark:text-neutral-300">실시간 급등 랭킹</p>
          </div>
          <ol className="divide-y divide-gray-50 dark:divide-neutral-800">
            {top10.map((s, i) => {
              const up = !s.rate.startsWith("-");
              return (
                <li key={s.code}>
                  <Link
                    href={`/stocks/${s.code}`}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors"
                  >
                    <span className={`w-5 shrink-0 text-center text-sm font-bold ${i < 3 ? "text-emerald-500" : "text-gray-400 dark:text-neutral-600"}`}>
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{s.name}</p>
                      <p className="text-xs text-gray-400 dark:text-neutral-500">{s.code}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{Number(s.price).toLocaleString()}원</p>
                      <p className={`text-xs font-semibold ${up ? "text-green-500 dark:text-green-400" : "text-blue-500 dark:text-blue-400"}`}>
                        {s.rate}%
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoggedIn, nickname, provider, isAdmin, clearAuth } = useAuthStore();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);

  useEffect(() => setMounted(true), []);

  const toggleTheme = () => setTheme(resolvedTheme === "dark" ? "light" : "dark");

  const handleLogout = () => {
    clearAuth();
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
                  <span className="hidden sm:block">{label}</span>
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
                <button
                  onClick={() => setShowWithdraw(true)}
                  className="hidden lg:block text-[11px] text-gray-300 hover:text-rose-400 transition-colors dark:text-neutral-700 dark:hover:text-rose-500"
                >
                  탈퇴
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

    {showWithdraw && (
      <WithdrawModal provider={provider} onClose={() => setShowWithdraw(false)} />
    )}
  </>
  );
}
