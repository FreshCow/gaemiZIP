"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authApi } from "@/services/authApi";
import { Button } from "@/components/ui/button";

export default function FindPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState({ username: "", securityCode: "", newPassword: "", newPasswordConfirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (!form.username || !form.securityCode) {
      setError("아이디와 보안코드를 입력해주세요.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await authApi.verifySecurityCode({ username: form.username, securityCode: form.securityCode });
      setStep(2);
    } catch (e: unknown) {
      const err = e as { response?: { data?: string } };
      setError(err.response?.data ?? "아이디 또는 보안코드가 일치하지 않습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!form.newPassword || !form.newPasswordConfirm) {
      setError("새 비밀번호를 입력해주세요.");
      return;
    }
    if (form.newPassword !== form.newPasswordConfirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await authApi.findPassword({
        username: form.username,
        securityCode: form.securityCode,
        newPassword: form.newPassword,
      });
      router.push("/login");
    } catch (e: unknown) {
      const err = e as { response?: { data?: string } };
      setError(err.response?.data ?? "비밀번호 재설정에 실패했습니다.");
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-start justify-center p-4 pt-20">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">비밀번호 찾기</h1>
          <p className="text-sm text-gray-500 dark:text-neutral-400">
            {step === 1 ? "아이디와 보안코드를 입력해주세요" : "새 비밀번호를 입력해주세요"}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 space-y-4 dark:border-neutral-800 dark:bg-neutral-900">
          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-900/20 dark:text-rose-400">
              {error}
            </p>
          )}

          {step === 1 ? (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-neutral-300">아이디</label>
                <input
                  type="text"
                  className="w-full rounded-lg bg-white px-3 py-2 text-sm text-gray-900 border border-gray-200 outline-none placeholder:text-gray-400 focus:ring-1 focus:ring-gray-300 dark:bg-neutral-800 dark:border-neutral-700 dark:text-white dark:placeholder:text-neutral-600 dark:focus:ring-neutral-600"
                  placeholder="아이디 입력"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-neutral-300">보안코드</label>
                <input
                  type="text"
                  className="w-full rounded-lg bg-white px-3 py-2 text-sm text-gray-900 border border-gray-200 outline-none placeholder:text-gray-400 focus:ring-1 focus:ring-gray-300 dark:bg-neutral-800 dark:border-neutral-700 dark:text-white dark:placeholder:text-neutral-600 dark:focus:ring-neutral-600"
                  placeholder="회원가입 시 발급받은 20자리 보안코드"
                  value={form.securityCode}
                  onChange={(e) => setForm({ ...form, securityCode: e.target.value })}
                />
              </div>

              <Button className="w-full" onClick={handleVerify} disabled={loading}>
                {loading ? "확인 중..." : "다음"}
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-neutral-300">새 비밀번호</label>
                <input
                  type="password"
                  className="w-full rounded-lg bg-white px-3 py-2 text-sm text-gray-900 border border-gray-200 outline-none placeholder:text-gray-400 focus:ring-1 focus:ring-gray-300 dark:bg-neutral-800 dark:border-neutral-700 dark:text-white dark:placeholder:text-neutral-600 dark:focus:ring-neutral-600"
                  placeholder="새 비밀번호 입력"
                  value={form.newPassword}
                  onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-neutral-300">새 비밀번호 확인</label>
                <input
                  type="password"
                  className="w-full rounded-lg bg-white px-3 py-2 text-sm text-gray-900 border border-gray-200 outline-none placeholder:text-gray-400 focus:ring-1 focus:ring-gray-300 dark:bg-neutral-800 dark:border-neutral-700 dark:text-white dark:placeholder:text-neutral-600 dark:focus:ring-neutral-600"
                  placeholder="새 비밀번호 재입력"
                  value={form.newPasswordConfirm}
                  onChange={(e) => setForm({ ...form, newPasswordConfirm: e.target.value })}
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep(1)} disabled={loading}>
                  이전
                </Button>
                <Button className="flex-1" onClick={handleReset} disabled={loading}>
                  {loading ? "처리 중..." : "비밀번호 변경"}
                </Button>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-sm text-gray-500 dark:text-neutral-400">
          <Link href="/login" className="text-emerald-600 hover:underline dark:text-emerald-400">
            로그인으로 돌아가기
          </Link>
        </p>
      </div>
    </div>
  );
}
