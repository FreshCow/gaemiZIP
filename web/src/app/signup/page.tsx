"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authApi } from "@/services/authApi";
import { Button } from "@/components/ui/button";

const USERNAME_REGEX = /^[a-zA-Z0-9]{4,20}$/;

export default function SignUpPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: "", password: "", passwordConfirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!form.username || !form.password || !form.passwordConfirm) {
      setError("모든 항목을 입력해주세요.");
      return;
    }
    if (!USERNAME_REGEX.test(form.username)) {
      setError("아이디는 영문+숫자 4~20자로 입력해주세요.");
      return;
    }
    if (form.password !== form.passwordConfirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { securityCode } = await authApi.signUp(form);
      sessionStorage.setItem("gaemi_security_code", securityCode);
      router.push("/signup/complete");
    } catch (e: unknown) {
      const err = e as { response?: { data?: string } };
      setError(err.response?.data ?? "회원가입에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-start justify-center p-4 pt-20">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">회원가입</h1>
          <p className="text-sm text-gray-500 dark:text-neutral-400">gaemiZIP 계정을 만들어보세요</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 space-y-4 dark:border-neutral-800 dark:bg-neutral-900">
          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-900/20 dark:text-rose-400">
              {error}
            </p>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-neutral-300">아이디</label>
            <input
              type="text"
              className="w-full rounded-lg bg-white px-3 py-2 text-sm text-gray-900 border border-gray-200 outline-none placeholder:text-gray-400 focus:ring-1 focus:ring-gray-300 dark:bg-neutral-800 dark:border-neutral-700 dark:text-white dark:placeholder:text-neutral-600 dark:focus:ring-neutral-600"
              placeholder="영문+숫자 4~20자"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-neutral-300">비밀번호</label>
            <input
              type="password"
              className="w-full rounded-lg bg-white px-3 py-2 text-sm text-gray-900 border border-gray-200 outline-none placeholder:text-gray-400 focus:ring-1 focus:ring-gray-300 dark:bg-neutral-800 dark:border-neutral-700 dark:text-white dark:placeholder:text-neutral-600 dark:focus:ring-neutral-600"
              placeholder="비밀번호 입력"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-neutral-300">비밀번호 확인</label>
            <input
              type="password"
              className="w-full rounded-lg bg-white px-3 py-2 text-sm text-gray-900 border border-gray-200 outline-none placeholder:text-gray-400 focus:ring-1 focus:ring-gray-300 dark:bg-neutral-800 dark:border-neutral-700 dark:text-white dark:placeholder:text-neutral-600 dark:focus:ring-neutral-600"
              placeholder="비밀번호 재입력"
              value={form.passwordConfirm}
              onChange={(e) => setForm({ ...form, passwordConfirm: e.target.value })}
            />
          </div>

          <Button className="w-full" onClick={handleSubmit} disabled={loading}>
            {loading ? "처리 중..." : "회원가입"}
          </Button>
        </div>

        <p className="text-center text-sm text-gray-500 dark:text-neutral-400">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="text-emerald-600 hover:underline dark:text-emerald-400">
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
