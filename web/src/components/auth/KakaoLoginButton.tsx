"use client";

import { createKakaoAuthorizeUrl, KAKAO_OAUTH_STATE_KEY } from "@/lib/kakaoOAuth";

interface KakaoLoginButtonProps {
  onError: (message: string) => void;
  disabled?: boolean;
}

function KakaoIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 3C6.48 3 2 6.49 2 10.8c0 2.78 1.87 5.22 4.68 6.6l-.95 3.47a.5.5 0 0 0 .76.55l4.16-2.75c.44.04.89.07 1.35.07 5.52 0 10-3.49 10-7.94S17.52 3 12 3Z"
      />
    </svg>
  );
}

export function KakaoLoginButton({ onError, disabled }: KakaoLoginButtonProps) {
  const handleClick = () => {
    const clientId = process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY;
    const redirectUri = process.env.NEXT_PUBLIC_KAKAO_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      onError("카카오 로그인 환경설정이 누락되었습니다.");
      return;
    }

    const state = crypto.randomUUID();
    sessionStorage.setItem(KAKAO_OAUTH_STATE_KEY, state);
    window.location.assign(createKakaoAuthorizeUrl(clientId, redirectUri, state));
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#FEE500] px-4 py-2 text-sm font-medium text-black/85 transition-colors hover:bg-[#F4DC00] disabled:cursor-not-allowed disabled:opacity-50"
    >
      <KakaoIcon />
      카카오로 로그인
    </button>
  );
}
