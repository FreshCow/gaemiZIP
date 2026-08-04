"use client";

import { useEffect, useState } from "react";
import { adminApi } from "@/services/adminApi";
import type { AuditLogItem, AuditLogAction } from "@/types/admin";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { formatDateTime } from "@/lib/utils";

const PAGE_SIZE = 10;

const ACTION_LABEL: Record<AuditLogAction, string> = {
  DELETE_TRADE: "거래 삭제",
  ADJUST_BALANCE: "잔고 조정",
};

function getErrorMessage(e: unknown, fallback: string): string {
  const err = e as { response?: { data?: { error?: string } } };
  return err.response?.data?.error ?? fallback;
}

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);

  const totalPages = Math.ceil(logs.length / PAGE_SIZE);
  const pagedLogs = logs.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  useEffect(() => {
    adminApi.getAuditLogs().then(setLogs).catch((e) => setError(getErrorMessage(e, "감사 로그를 불러오지 못했습니다.")));
  }, []);

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-400 dark:text-neutral-600">
        잔고 조정·거래 삭제 등 되돌리기 어려운 관리자 조작 이력입니다.
      </p>

      {error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-900/20 dark:text-rose-400">
          {error}
        </p>
      )}

      <div className="rounded-2xl border border-gray-200 bg-gray-50 overflow-hidden dark:border-neutral-800 dark:bg-neutral-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-gray-500 dark:border-neutral-800 dark:text-neutral-500">
              <th className="px-4 py-3 text-left font-medium">관리자</th>
              <th className="px-4 py-3 text-left font-medium">작업</th>
              <th className="px-4 py-3 text-left font-medium">대상 ID</th>
              <th className="px-4 py-3 text-left font-medium">상세</th>
              <th className="px-4 py-3 text-right font-medium">시각</th>
            </tr>
          </thead>
          <tbody>
            {pagedLogs.map((log) => (
              <tr key={log.id} className="border-b border-gray-100 transition-colors hover:bg-gray-100/60 dark:border-neutral-800/60 dark:hover:bg-neutral-800/40">
                <td className="px-4 py-3 text-gray-900 dark:text-white">{log.adminNickname}</td>
                <td className="px-4 py-3">
                  <Badge
                    variant="outline"
                    className={
                      log.action === "DELETE_TRADE"
                        ? "border-rose-700 text-rose-500 dark:text-rose-400"
                        : "border-sky-700 text-sky-500 dark:text-sky-400"
                    }
                  >
                    {ACTION_LABEL[log.action]}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-neutral-400">{log.targetId}</td>
                <td className="px-4 py-3 text-gray-700 dark:text-neutral-300">{log.detail}</td>
                <td className="px-4 py-3 text-right text-xs text-gray-500 dark:text-neutral-500">{formatDateTime(log.createdAt)}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-gray-400 dark:text-neutral-600">
                  기록된 감사 로그가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
