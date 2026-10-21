"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { authApi } from "@/services/authApi";
import { useAuthStore } from "@/store/useAuthStore";

interface WithdrawSectionProps {
  provider: string | null;
}

export function WithdrawSection({ provider }: WithdrawSectionProps) {
  const router = useRouter();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const isSocialAccount = provider !== null && provider !== "LOCAL";

  const [step, setStep] = useState<"password" | "confirm">("password");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const currentStep = isSocialAccount ? "confirm" : step;

  const handlePasswordNext = async () => {
    if (!password) {
      setError("비밀번호를 입력해주세요.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await authApi.verifyPassword(password);
      setStep("confirm");
    } catch (e: unknown) {
      const err = e as { response?: { data?: string } };
      setError(err.response?.data ?? "비밀번호가 일치하지 않습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    setLoading(true);
    try {
      await authApi.withdraw();
      clearAuth();
      router.push("/login");
    } catch (e: unknown) {
      const err = e as { response?: { data?: string } };
      setError(err.response?.data ?? "탈퇴 처리 중 오류가 발생했습니다.");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {currentStep === "password" ? (
        <>
          <p className="text-sm text-gray-500 dark:text-neutral-400">탈퇴 전 본인 확인이 필요합니다.</p>

          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-900/20 dark:text-rose-400">
              {error}
            </p>
          )}

          <PasswordInput
            className="w-full rounded-lg bg-gray-100 px-3 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:ring-1 focus:ring-gray-300 dark:bg-neutral-800 dark:text-white dark:placeholder:text-neutral-600 dark:focus:ring-neutral-600"
            placeholder="현재 비밀번호 입력"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handlePasswordNext()}
          />

          <Button className="mx-auto flex w-[30%]" onClick={handlePasswordNext} disabled={loading}>
            {loading ? "확인 중..." : "다음"}
          </Button>
        </>
      ) : (
        <>
          <div className="flex items-start gap-3 rounded-lg bg-rose-50 p-3 dark:bg-rose-900/20">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-rose-500 dark:text-rose-400" />
            <p className="text-sm text-rose-600 dark:text-rose-400">
              탈퇴 시 모든 거래 내역과 보유 종목이 영구 삭제되며 복구할 수 없습니다.
            </p>
          </div>

          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-900/20 dark:text-rose-400">
              {error}
            </p>
          )}

          <Button
            className="mx-auto flex w-[30%] bg-rose-500 hover:bg-rose-600 text-white dark:bg-rose-600 dark:hover:bg-rose-700"
            onClick={handleWithdraw}
            disabled={loading}
          >
            {loading ? "처리 중..." : "탈퇴하기"}
          </Button>
        </>
      )}
    </div>
  );
}
