"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authApi } from "@/services/authApi";
import { useAuthStore } from "@/store/useAuthStore";

interface WithdrawModalProps {
  provider: string | null;
  onClose: () => void;
}

export function WithdrawModal({ provider, onClose }: WithdrawModalProps) {
  const router = useRouter();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const isGoogle = provider === "GOOGLE";

  const [step, setStep] = useState<"password" | "confirm">(isGoogle ? "confirm" : "password");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 space-y-4 dark:border-neutral-800 dark:bg-neutral-900">

        {step === "password" ? (
          <>
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">비밀번호 확인</h2>
              <p className="text-sm text-gray-500 dark:text-neutral-400">탈퇴 전 본인 확인이 필요합니다.</p>
            </div>

            {error && (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-900/20 dark:text-rose-400">
                {error}
              </p>
            )}

            <input
              type="password"
              className="w-full rounded-lg bg-gray-100 px-3 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:ring-1 focus:ring-gray-300 dark:bg-neutral-800 dark:text-white dark:placeholder:text-neutral-600 dark:focus:ring-neutral-600"
              placeholder="현재 비밀번호 입력"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handlePasswordNext()}
              autoFocus
            />

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={onClose} disabled={loading}>
                취소
              </Button>
              <Button className="flex-1" onClick={handlePasswordNext} disabled={loading}>
                {loading ? "확인 중..." : "확인"}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col items-center gap-3 py-2 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/30">
                <AlertTriangle size={22} className="text-rose-500 dark:text-rose-400" />
              </div>
              <div className="space-y-1">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">정말 탈퇴하시겠습니까?</h2>
                <p className="text-sm text-gray-500 dark:text-neutral-400">
                  탈퇴 시 모든 거래 내역과 보유 종목이<br />영구 삭제되며 복구할 수 없습니다.
                </p>
              </div>
            </div>

            {error && (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-900/20 dark:text-rose-400">
                {error}
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={onClose} disabled={loading}>
                취소
              </Button>
              <Button
                className="flex-1 bg-rose-500 hover:bg-rose-600 text-white dark:bg-rose-600 dark:hover:bg-rose-700"
                onClick={handleWithdraw}
                disabled={loading}
              >
                {loading ? "처리 중..." : "탈퇴하기"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
