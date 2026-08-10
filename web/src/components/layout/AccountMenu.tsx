"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LogOut, Settings, User } from "lucide-react";

interface AccountMenuProps {
  nickname: string | null;
  onLogout: () => void;
}

export function AccountMenu({ nickname, onLogout }: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1.5 rounded-lg p-1 transition-colors hover:bg-gray-100 dark:hover:bg-neutral-800"
        aria-label="계정 메뉴"
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
          <User size={13} className="text-emerald-600 dark:text-emerald-400" />
        </div>
        <span className="max-w-[60px] truncate text-xs font-medium text-gray-700 dark:text-neutral-300 sm:max-w-[80px]">
          {nickname}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-44 rounded-xl border border-gray-200 bg-white py-1 shadow-xl dark:border-neutral-700 dark:bg-neutral-900">
          <div className="border-b border-gray-100 px-3 py-2 dark:border-neutral-800">
            <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{nickname}</p>
          </div>
          <Link
            href="/account"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-600 transition-colors hover:bg-gray-50 dark:text-neutral-400 dark:hover:bg-neutral-800"
          >
            <Settings size={14} />
            계정설정
          </Link>
          <button
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-rose-500 transition-colors hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/20"
          >
            <LogOut size={14} />
            로그아웃
          </button>
        </div>
      )}
    </div>
  );
}
