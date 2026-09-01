"use client";

import { useEffect, useState } from "react";
import { balanceChargeApi } from "@/services/balanceChargeApi";
import type { AdminChargeRequestItem } from "@/types/balanceCharge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";

function getErrorMessage(e: unknown, fallback: string): string {
  const err = e as { response?: { data?: { error?: string } } };
  return err.response?.data?.error ?? fallback;
}

export default function AdminBalanceChargesPage() {
  const [requests, setRequests] = useState<AdminChargeRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [reasonInput, setReasonInput] = useState("");

  const load = () => {
    balanceChargeApi
      .getPendingRequests()
      .then(setRequests)
      .catch((e) => setError(getErrorMessage(e, "충전 요청 목록을 불러오지 못했습니다.")))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleApprove = async (id: number) => {
    try {
      await balanceChargeApi.approve(id);
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      setError(getErrorMessage(e, "승인에 실패했습니다."));
    }
  };

  const openReject = (id: number) => {
    setRejectingId(id);
    setReasonInput("");
    setError("");
  };

  const handleReject = async () => {
    if (rejectingId === null) return;
    try {
      await balanceChargeApi.reject(rejectingId, reasonInput || undefined);
      setRequests((prev) => prev.filter((r) => r.id !== rejectingId));
      setRejectingId(null);
    } catch (e) {
      setError(getErrorMessage(e, "거절에 실패했습니다."));
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-900/20 dark:text-rose-400">
          {error}
        </p>
      )}

      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-gray-50 dark:border-neutral-800 dark:bg-neutral-900">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-gray-500 dark:border-neutral-800 dark:text-neutral-500">
              <th className="px-4 py-3 text-left font-medium">회원</th>
              <th className="px-4 py-3 text-right font-medium">신청 금액</th>
              <th className="px-4 py-3 text-left font-medium">신청일시</th>
              <th className="px-4 py-3 text-right font-medium">처리</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr
                key={r.id}
                className="border-b border-gray-100 transition-colors hover:bg-gray-100/60 dark:border-neutral-800/60 dark:hover:bg-neutral-800/40"
              >
                <td className="px-4 py-3 text-gray-900 dark:text-white">{r.memberNickname}</td>
                <td className="px-4 py-3 text-right text-gray-900 dark:text-white">
                  {r.amount.toLocaleString()}원
                </td>
                <td className="px-4 py-3 text-xs text-gray-500 dark:text-neutral-500">
                  {formatDateTime(r.requestedAt)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1.5">
                    <Button size="sm" onClick={() => handleApprove(r.id)}>
                      승인
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-rose-500 hover:text-rose-600"
                      onClick={() => openReject(r.id)}
                    >
                      거절
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && requests.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-gray-400 dark:text-neutral-600">
                  대기중인 충전 요청이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {rejectingId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 space-y-4 dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">충전 요청 거절</h2>

            {error && (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-900/20 dark:text-rose-400">
                {error}
              </p>
            )}

            <input
              type="text"
              className="w-full rounded-lg bg-gray-100 px-3 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:ring-1 focus:ring-gray-300 dark:bg-neutral-800 dark:text-white dark:placeholder:text-neutral-600 dark:focus:ring-neutral-600"
              placeholder="거절 사유 (선택)"
              value={reasonInput}
              onChange={(e) => setReasonInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleReject()}
              autoFocus
            />

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setRejectingId(null)}>
                취소
              </Button>
              <Button className="flex-1" onClick={handleReject}>
                거절 확정
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
