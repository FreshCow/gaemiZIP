"use client";

import { useEffect, useState } from "react";
import { adminApi } from "@/services/adminApi";
import type { MemberResponse } from "@/types/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { formatDateTime, formatNumberInput, parseNumberInput } from "@/lib/utils";

const PAGE_SIZE = 10;

function getErrorMessage(e: unknown, fallback: string): string {
  const err = e as { response?: { data?: { error?: string } } };
  return err.response?.data?.error ?? fallback;
}

export default function AdminMembersPage() {
  const [members, setMembers] = useState<MemberResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [adjustingId, setAdjustingId] = useState<number | null>(null);
  const [deltaInput, setDeltaInput] = useState("");
  const [page, setPage] = useState(0);

  const totalPages = Math.ceil(members.length / PAGE_SIZE);
  const pagedMembers = members.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  useEffect(() => {
    adminApi
      .getMembers()
      .then(setMembers)
      .catch((e) => setError(getErrorMessage(e, "회원 목록을 불러오지 못했습니다.")))
      .finally(() => setLoading(false));
  }, []);

  const handleToggleStatus = async (member: MemberResponse) => {
    const nextStatus = member.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    try {
      await adminApi.updateMemberStatus(member.id, nextStatus);
      setMembers((prev) => prev.map((m) => (m.id === member.id ? { ...m, status: nextStatus } : m)));
    } catch (e) {
      setError(getErrorMessage(e, "상태 변경에 실패했습니다."));
    }
  };

  const openAdjust = (member: MemberResponse) => {
    setAdjustingId(member.id);
    setDeltaInput("");
    setError("");
  };

  const handleAdjustBalance = async () => {
    if (adjustingId === null) return;
    const delta = parseNumberInput(deltaInput);
    if (!Number.isFinite(delta) || delta === 0) {
      setError("0이 아닌 숫자를 입력해주세요.");
      return;
    }
    try {
      await adminApi.adjustBalance(adjustingId, delta);
      setMembers((prev) =>
        prev.map((m) => (m.id === adjustingId ? { ...m, balance: m.balance + delta } : m)),
      );
      setAdjustingId(null);
    } catch (e) {
      setError(getErrorMessage(e, "잔고 증감에 실패했습니다."));
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
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-gray-500 dark:border-neutral-800 dark:text-neutral-500">
              <th className="px-4 py-3 text-left font-medium">닉네임</th>
              <th className="px-4 py-3 text-left font-medium">아이디 / 이메일</th>
              <th className="px-4 py-3 text-left font-medium">권한</th>
              <th className="px-4 py-3 text-left font-medium">상태</th>
              <th className="px-4 py-3 text-right font-medium">잔고</th>
              <th className="px-4 py-3 text-left font-medium">가입일</th>
              <th className="px-4 py-3 text-right font-medium">관리</th>
            </tr>
          </thead>
          <tbody>
            {pagedMembers.map((m) => (
              <tr key={m.id} className="border-b border-gray-100 transition-colors hover:bg-gray-100/60 dark:border-neutral-800/60 dark:hover:bg-neutral-800/40">
                <td className="px-4 py-3 text-gray-900 dark:text-white">{m.nickname}</td>
                <td className="px-4 py-3 text-gray-700 dark:text-neutral-300">
                  {m.username ?? m.email ?? "-"}
                  <span className="ml-1.5 text-xs text-gray-400 dark:text-neutral-600">({m.provider})</span>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={m.role === "ADMIN" ? "default" : "outline"}>{m.role}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge
                    variant="outline"
                    className={
                      m.status === "ACTIVE"
                        ? "border-emerald-700 text-emerald-500 dark:text-emerald-400"
                        : "border-rose-700 text-rose-500 dark:text-rose-400"
                    }
                  >
                    {m.status === "ACTIVE" ? "정상" : "정지"}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right text-gray-900 dark:text-white">
                  {m.balance.toLocaleString()}원
                </td>
                <td className="px-4 py-3 text-xs text-gray-500 dark:text-neutral-500">
                  {formatDateTime(m.createdDate)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => openAdjust(m)}>
                      잔고조정
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className={m.status === "ACTIVE" ? "text-rose-500 hover:text-rose-600" : "text-emerald-500 hover:text-emerald-600"}
                      onClick={() => handleToggleStatus(m)}
                    >
                      {m.status === "ACTIVE" ? "정지" : "활성화"}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && members.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-400 dark:text-neutral-600">
                  회원이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {adjustingId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 space-y-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">잔고 수동 조정</h2>
              <p className="text-sm text-gray-500 dark:text-neutral-400">
                양수면 증액, 음수면 차감됩니다. (예: -10,000)
              </p>
            </div>

            {error && (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-900/20 dark:text-rose-400">
                {error}
              </p>
            )}

            <input
              type="text"
              inputMode="numeric"
              className="w-full rounded-lg bg-gray-100 px-3 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:ring-1 focus:ring-gray-300 dark:bg-neutral-800 dark:text-white dark:placeholder:text-neutral-600 dark:focus:ring-neutral-600"
              placeholder="증감액"
              value={deltaInput}
              onChange={(e) => setDeltaInput(formatNumberInput(e.target.value))}
              onKeyDown={(e) => e.key === "Enter" && handleAdjustBalance()}
              autoFocus
            />

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setAdjustingId(null)}>
                취소
              </Button>
              <Button className="flex-1" onClick={handleAdjustBalance}>
                적용
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
