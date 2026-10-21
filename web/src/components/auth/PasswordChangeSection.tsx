"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { authApi } from "@/services/authApi";

interface PasswordChangeSectionProps {
  provider: string | null;
}

export function PasswordChangeSection({ provider }: PasswordChangeSectionProps) {
  const isSocialAccount = provider !== null && provider !== "LOCAL";
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  if (isSocialAccount) {
    return (
      <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-500 dark:bg-neutral-800 dark:text-neutral-400">
        소셜 로그인 계정은 비밀번호를 변경할 수 없습니다.
      </p>
    );
  }

  const handleSubmit = async () => {
    setError("");
    setSuccess("");
    if (!currentPassword || !newPassword || !newPasswordConfirm) {
      setError("모든 항목을 입력해주세요.");
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      setError("새 비밀번호가 일치하지 않습니다.");
      return;
    }
    setLoading(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      setSuccess("비밀번호가 변경되었습니다.");
      setCurrentPassword("");
      setNewPassword("");
      setNewPasswordConfirm("");
    } catch (e: unknown) {
      const err = e as { response?: { data?: string } };
      setError(err.response?.data ?? "비밀번호 변경 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-900/20 dark:text-rose-400">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
          {success}
        </p>
      )}

      <PasswordInput
        className="w-full rounded-lg bg-gray-100 px-3 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:ring-1 focus:ring-gray-300 dark:bg-neutral-800 dark:text-white dark:placeholder:text-neutral-600 dark:focus:ring-neutral-600"
        placeholder="현재 비밀번호"
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
      />
      <PasswordInput
        className="w-full rounded-lg bg-gray-100 px-3 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:ring-1 focus:ring-gray-300 dark:bg-neutral-800 dark:text-white dark:placeholder:text-neutral-600 dark:focus:ring-neutral-600"
        placeholder="새 비밀번호"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
      />
      <PasswordInput
        className="w-full rounded-lg bg-gray-100 px-3 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:ring-1 focus:ring-gray-300 dark:bg-neutral-800 dark:text-white dark:placeholder:text-neutral-600 dark:focus:ring-neutral-600"
        placeholder="새 비밀번호 확인"
        value={newPasswordConfirm}
        onChange={(e) => setNewPasswordConfirm(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
      />

      <Button className="mx-auto flex w-[30%]" onClick={handleSubmit} disabled={loading}>
        {loading ? "변경 중..." : "비밀번호 변경"}
      </Button>
    </div>
  );
}
