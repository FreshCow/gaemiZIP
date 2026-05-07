"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { LayoutDashboard, TrendingUp, History, MessageSquare, Wifi, WifiOff, Newspaper, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { useAppStore } from "@/store/useAppStore";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/news", icon: Newspaper, label: "뉴스 소식" },
  { href: "/", icon: LayoutDashboard, label: "대시보드" },
  { href: "/stocks", icon: TrendingUp, label: "주식 랭킹" },
  { href: "/trades", icon: History, label: "거래 이력" },
  { href: "/board", icon: MessageSquare, label: "게시판" },
];

export function Sidebar() {
  const pathname = usePathname();
  const wsConnected = useAppStore((s) => s.wsConnected);
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const toggleTheme = () => setTheme(resolvedTheme === "dark" ? "light" : "dark");

  return (
    <aside className="flex h-screen w-16 flex-col items-center border-r border-gray-200 bg-white py-6 dark:border-neutral-800 dark:bg-neutral-950 lg:w-56 lg:items-start lg:px-4">
      <div className="mb-8 flex w-full items-center gap-2 px-1">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-sm font-bold text-black">
          GZ
        </div>
        <span className="hidden flex-1 min-w-0 items-center lg:flex">
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
        <button
          onClick={toggleTheme}
          className="hidden items-center justify-center rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-200 lg:flex"
          aria-label="테마 전환"
        >
          {mounted ? (
            resolvedTheme === "dark" ? <Sun size={15} /> : <Moon size={15} />
          ) : (
            <div className="h-[15px] w-[15px]" />
          )}
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href} className="relative">
              {active && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-xl bg-gray-100 dark:bg-neutral-800"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
              <span
                className={cn(
                  "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "text-gray-900 dark:text-white"
                    : "text-gray-500 hover:text-gray-900 dark:text-neutral-500 dark:hover:text-neutral-200",
                )}
              >
                <Icon size={18} />
                <span className="hidden lg:block">{label}</span>
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex items-center gap-2 px-1 text-xs text-gray-400 dark:text-neutral-600">
        {wsConnected ? (
          <Wifi size={14} className="text-emerald-500" />
        ) : (
          <WifiOff size={14} className="text-rose-500" />
        )}
        <span className="hidden lg:block">{wsConnected ? "연결됨" : "연결 끊김"}</span>
      </div>
    </aside>
  );
}
