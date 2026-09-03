"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { notificationApi } from "@/services/notificationApi";
import { formatDateTime } from "@/lib/utils";

export function NotificationBell() {
  const notifications = useAppStore((s) => s.notifications);
  const unreadCount = useAppStore((s) => s.unreadCount);
  const markNotificationRead = useAppStore((s) => s.markNotificationRead);
  const markAllNotificationsRead = useAppStore((s) => s.markAllNotificationsRead);
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

  const handleClickItem = (id: number, read: boolean) => {
    if (read) return;
    notificationApi.markAsRead(id).catch(() => {});
    markNotificationRead(id);
  };

  const handleReadAll = () => {
    notificationApi.markAllAsRead().catch(() => {});
    markAllNotificationsRead();
  };

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="relative flex items-center justify-center rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
        aria-label="알림"
      >
        <Bell size={15} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-x-4 top-16 z-50 rounded-xl border border-gray-200 bg-white shadow-xl dark:border-neutral-700 dark:bg-neutral-900 sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:mt-2 sm:w-80">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-neutral-800">
            <p className="text-sm font-semibold text-gray-700 dark:text-neutral-300">알림</p>
            {unreadCount > 0 && (
              <button
                onClick={handleReadAll}
                className="text-xs font-medium text-gray-400 transition-colors hover:text-emerald-500 dark:text-neutral-500 dark:hover:text-emerald-400"
              >
                전체읽기
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-gray-400 dark:text-neutral-600">
              알림이 없습니다
            </p>
          ) : (
            <ul className="max-h-96 divide-y divide-gray-50 overflow-y-auto dark:divide-neutral-800">
              {notifications.map((n) => {
                const itemClassName = `flex items-start gap-2 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-neutral-800 ${
                  !n.read ? "bg-emerald-50/50 dark:bg-emerald-900/10" : ""
                }`;
                const content = (
                  <>
                    {!n.read && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />}
                    <div className={`min-w-0 flex-1 ${n.read ? "pl-3.5" : ""}`}>
                      <p className="text-xs text-gray-700 dark:text-neutral-300 line-clamp-2">{n.message}</p>
                      <p className="mt-0.5 text-[11px] text-gray-400 dark:text-neutral-600">{formatDateTime(n.createdAt)}</p>
                    </div>
                  </>
                );
                return (
                  <li key={n.id}>
                    <Link
                      href="/notifications"
                      onClick={() => {
                        handleClickItem(n.id, n.read);
                        setOpen(false);
                      }}
                      className={itemClassName}
                    >
                      {content}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="block border-t border-gray-100 px-4 py-2.5 text-center text-xs font-medium text-gray-500 transition-colors hover:text-gray-800 dark:border-neutral-800 dark:text-neutral-500 dark:hover:text-neutral-200"
          >
            전체보기
          </Link>
        </div>
      )}
    </div>
  );
}
