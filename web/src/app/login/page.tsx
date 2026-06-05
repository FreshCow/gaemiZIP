"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authApi } from "@/services/authApi";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { GoogleLoginButton } from "@/components/auth/GoogleLoginButton";

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!username || !password) {
      setError("아이디와 비밀번호를 입력해주세요.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await authApi.login({ username, password });
      setAuth(response);
      router.push("/");
    } catch (e: unknown) {
      const err = e as { response?: { data?: string } };
      setError(err.response?.data ?? "로그인에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (idToken: string) => {
    setLoading(true);
    setError("");
    try {
      const response = await authApi.googleLogin(idToken);
      setAuth(response);
      router.push("/");
    } catch (e: unknown) {
      const err = e as { response?: { data?: string } };
      setError(err.response?.data ?? "구글 로그인에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">로그인</h1>
          <p className="text-sm text-gray-500 dark:text-neutral-400">gaemiZIP에 오신 것을 환영합니다</p>
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
              placeholder="아이디 입력"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-neutral-300">비밀번호</label>
            <input
              type="password"
              className="w-full rounded-lg bg-white px-3 py-2 text-sm text-gray-900 border border-gray-200 outline-none placeholder:text-gray-400 focus:ring-1 focus:ring-gray-300 dark:bg-neutral-800 dark:border-neutral-700 dark:text-white dark:placeholder:text-neutral-600 dark:focus:ring-neutral-600"
              placeholder="비밀번호 입력"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <Button className="w-full" onClick={handleSubmit} disabled={loading}>
            {loading ? "로그인 중..." : "로그인"}
          </Button>

          <div className="relative flex items-center gap-3 py-1">
            <div className="h-px flex-1 bg-gray-200 dark:bg-neutral-700" />
            <span className="text-xs text-gray-400 dark:text-neutral-500">또는</span>
            <div className="h-px flex-1 bg-gray-200 dark:bg-neutral-700" />
          </div>

          <GoogleLoginButton
            onSuccess={handleGoogleSuccess}
            onError={setError}
            disabled={loading}
          />
        </div>

        <p className="text-center text-sm text-gray-500 dark:text-neutral-400">
          계정이 없으신가요?{" "}
          <Link href="/signup" className="text-emerald-600 hover:underline dark:text-emerald-400">
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
}
