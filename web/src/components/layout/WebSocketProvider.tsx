"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useAuthStore } from "@/store/useAuthStore";
import { useAppStore } from "@/store/useAppStore";
import { tradeApi } from "@/services/tradeApi";
import { boardApi } from "@/services/boardApi";
import { notificationApi } from "@/services/notificationApi";
import type { NotificationItem } from "@/types/notification";

const NOTIFICATION_POLL_MS = 15000;
const TOAST_DURATION_MS = 4000;

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  useWebSocket();

  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const setHoldings = useAppStore((s) => s.setHoldings);
  const setBoards = useAppStore((s) => s.setBoards);
  const setNotifications = useAppStore((s) => s.setNotifications);
  const setUnreadCount = useAppStore((s) => s.setUnreadCount);
  const markNotificationRead = useAppStore((s) => s.markNotificationRead);

  const [toasts, setToasts] = useState<NotificationItem[]>([]);
  const lastSeenIdRef = useRef(0);
  const isFirstPollRef = useRef(true);

  // 로그인 상태가 확정되면 사용자 데이터 일괄 로드
  useEffect(() => {
    if (!isLoggedIn) return;

    tradeApi.getHoldingsWithLivePrice()
      .then(setHoldings)
      .catch(() => {});

    boardApi.getList()
      .then(setBoards)
      .catch(() => {});
  }, [isLoggedIn, setHoldings, setBoards]);

  // 예약 체결 알림 폴링 — 마지막으로 본 알림보다 최신이고 안읽은 알림만 토스트로 표시
  useEffect(() => {
    if (!isLoggedIn) {
      lastSeenIdRef.current = 0;
      isFirstPollRef.current = true;
      return;
    }

    const poll = () => {
      Promise.all([notificationApi.getList(0, 8), notificationApi.getUnreadCount()])
        .then(([page, count]) => {
          setNotifications(page.content);
          setUnreadCount(count);

          if (!isFirstPollRef.current) {
            const lastSeenId = lastSeenIdRef.current;
            const fresh = page.content.filter((n) => n.id > lastSeenId && !n.read);
            if (fresh.length > 0) {
              setToasts((prev) => [...prev, ...fresh]);
              fresh.forEach((n) => {
                setTimeout(() => {
                  setToasts((prev) => prev.filter((t) => t.id !== n.id));
                }, TOAST_DURATION_MS);
              });
            }
          }

          const newestId = page.content[0]?.id;
          if (newestId != null) lastSeenIdRef.current = newestId;
          isFirstPollRef.current = false;
        })
        .catch(() => {});
    };

    poll();
    const timer = setInterval(poll, NOTIFICATION_POLL_MS);
    return () => clearInterval(timer);
  }, [isLoggedIn, setNotifications, setUnreadCount]);

  const dismissToast = (n: NotificationItem) => {
    setToasts((prev) => prev.filter((t) => t.id !== n.id));
    notificationApi.markAsRead(n.id).catch(() => {});
    markNotificationRead(n.id);
  };

  return (
    <>
      {children}

      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
          {toasts.map((t) => (
            <Link
              key={t.id}
              href={`/stocks/${t.stockCode}`}
              onClick={() => dismissToast(t)}
              className="flex w-80 items-start gap-2.5 rounded-xl border border-gray-200 bg-white p-4 shadow-lg transition-transform hover:-translate-y-0.5 dark:border-neutral-700 dark:bg-neutral-800"
            >
              <Bell size={16} className="mt-0.5 shrink-0 text-emerald-500" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white">체결 알림</p>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-neutral-400 line-clamp-2">{t.message}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
