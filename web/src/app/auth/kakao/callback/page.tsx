"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authApi } from "@/services/authApi";
import { useAuthStore } from "@/store/useAuthStore";
import { KAKAO_OAUTH_STATE_KEY } from "@/lib/kakaoOAuth";

function KakaoCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);
  const handled = useRef(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const completeLogin = async () => {
      const oauthError = searchParams.get("error");
      const code = searchParams.get("code");
      const returnedState = searchParams.get("state");
      const savedState = sessionStorage.getItem(KAKAO_OAUTH_STATE_KEY);
      sessionStorage.removeItem(KAKAO_OAUTH_STATE_KEY);

      if (oauthError) {
        throw new Error("카카오 로그인이 취소되었거나 인증에 실패했습니다.");
      }

      if (!code || !returnedState || !savedState || returnedState !== savedState) {
        throw new Error("카카오 로그인 요청을 확인할 수 없습니다. 다시 시도해주세요.");
      }

      const response = await authApi.kakaoLogin({ code });
      setAuth(response, false);
      router.replace("/stocks");
    };

    void completeLogin().catch((e: unknown) => {
      const err = e as { message?: string; response?: { data?: string } };
      setError(err.response?.data ?? err.message ?? "카카오 로그인 처리 중 오류가 발생했습니다.");
    });
  }, [router, searchParams, setAuth]);

  return (
    <div className="flex min-h-screen items-start justify-center p-4 pt-24">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-gray-50 p-6 text-center dark:border-neutral-800 dark:bg-neutral-900">
        {error ? (
          <>
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-900/20 dark:text-rose-400">
              {error}
            </p>
            <Link
              href="/login"
              className="mt-4 inline-block text-sm text-emerald-600 hover:underline dark:text-emerald-400"
            >
              로그인 화면으로 돌아가기
            </Link>
          </>
        ) : (
          <p className="text-sm text-gray-500 dark:text-neutral-400">카카오 로그인 처리 중...</p>
        )}
      </div>
    </div>
  );
}

export default function KakaoCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-start justify-center p-4 pt-24 text-sm text-gray-500 dark:text-neutral-400">
          카카오 로그인 준비 중...
        </div>
      }
    >
      <KakaoCallbackContent />
    </Suspense>
  );
}
