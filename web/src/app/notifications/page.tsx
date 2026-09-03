"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { notificationApi } from "@/services/notificationApi";
import { useAppStore } from "@/store/useAppStore";
import { Pagination } from "@/components/ui/pagination";
import { formatDateTime } from "@/lib/utils";
import type { NotificationItem } from "@/types/notification";

const PAGE_SIZE = 15;

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const markNotificationRead = useAppStore((s) => s.markNotificationRead);
  const markAllNotificationsRead = useAppStore((s) => s.markAllNotificationsRead);

  useEffect(() => {
    setLoading(true);
    notificationApi.getList(page, PAGE_SIZE)
      .then((res) => {
        setItems(res.content);
        setTotalPages(res.totalPages);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page]);

  const handleClick = (n: NotificationItem) => {
    if (n.read) return;
    notificationApi.markAsRead(n.id).catch(() => {});
    markNotificationRead(n.id);
    setItems((prev) => prev.map((i) => (i.id === n.id ? { ...i, read: true } : i)));
  };

  const handleReadAll = () => {
    notificationApi.markAllAsRead().catch(() => {});
    markAllNotificationsRead();
    setItems((prev) => prev.map((i) => ({ ...i, read: true })));
  };

  const hasUnread = items.some((i) => !i.read);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell size={20} className="text-gray-400 dark:text-neutral-500" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">알림</h1>
        </div>
        {hasUnread && (
          <button
            onClick={handleReadAll}
            className="text-sm font-medium text-gray-500 transition-colors hover:text-emerald-500 dark:text-neutral-400 dark:hover:text-emerald-400"
          >
            전체읽기
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-sm text-gray-400 dark:text-neutral-600">불러오는 중...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-sm text-gray-400 dark:text-neutral-600">알림이 없습니다</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-neutral-800">
            {items.map((n) => {
              const itemClassName = `flex items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-neutral-800 ${
                !n.read ? "bg-emerald-50/40 dark:bg-emerald-900/10" : ""
              }`;
              const content = (
                <>
                  {!n.read && <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />}
                  <div className={`min-w-0 flex-1 ${n.read ? "pl-3.5" : ""}`}>
                    <p className="text-sm text-gray-800 dark:text-neutral-200">{n.message}</p>
                    <p className="mt-1 text-xs text-gray-400 dark:text-neutral-500">{formatDateTime(n.createdAt)}</p>
                  </div>
                </>
              );
              return (
                <li key={n.id}>
                  <button type="button" onClick={() => handleClick(n)} className={`w-full ${itemClassName}`}>
                    {content}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      )}
    </div>
  );
}
