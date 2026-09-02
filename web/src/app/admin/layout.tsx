"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ADMIN_NAV = [
  { href: "/admin/members", label: "회원 관리" },
  { href: "/admin/content", label: "콘텐츠 관리" },
  { href: "/admin/trades", label: "거래 관리" },
  { href: "/admin/balance-charges", label: "충전 요청" },
  { href: "/admin/audit-logs", label: "감사 로그" },
  { href: "/admin/stats", label: "통계" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">관리자</h1>

      <nav className="flex gap-1 overflow-x-auto border-b border-gray-200 dark:border-neutral-800">
        {ADMIN_NAV.map(({ href, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "-mb-px shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "border-emerald-500 text-gray-900 dark:text-white"
                  : "border-transparent text-gray-500 hover:text-gray-900 dark:text-neutral-500 dark:hover:text-neutral-200",
              )}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      {children}
    </div>
  );
}
