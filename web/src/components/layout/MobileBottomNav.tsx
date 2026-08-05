"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { cn } from "@/lib/utils";
import { navItems } from "@/components/layout/Sidebar";

export function MobileBottomNav() {
  const pathname = usePathname();
  const isAdmin = useAuthStore((s) => s.isAdmin);

  const items = [
    ...navItems,
    ...(isAdmin ? [{ href: "/admin/members", icon: ShieldCheck, label: "관리자" }] : []),
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-gray-200 bg-white lg:hidden dark:border-neutral-800 dark:bg-neutral-950">
      {items.map(({ href, icon: Icon, label }) => {
        const active = href === "/admin/members" ? pathname.startsWith("/admin") : pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors",
              active
                ? "text-emerald-500 dark:text-emerald-400"
                : "text-gray-400 dark:text-neutral-500",
            )}
          >
            <Icon size={19} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
