"use client";

import { useCallback, useEffect, useRef } from "react";
import { useGoogleOAuth } from "@react-oauth/google";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          prompt: (
            momentListener?: (notification: {
              isNotDisplayed: () => boolean;
              isSkippedMoment: () => boolean;
              getNotDisplayedReason: () => string;
            }) => void
          ) => void;
        };
      };
    };
  }
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

interface GoogleLoginButtonProps {
  onSuccess: (idToken: string) => void;
  onError: (message: string) => void;
  disabled?: boolean;
}

export function GoogleLoginButton({ onSuccess, onError, disabled }: GoogleLoginButtonProps) {
  const { clientId, scriptLoadedSuccessfully } = useGoogleOAuth();
  const initialized = useRef(false);

  // Refs so the stable callback always sees the latest handlers without re-initializing
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  useEffect(() => { onSuccessRef.current = onSuccess; }, [onSuccess]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  const stableCallback = useCallback((response: { credential?: string }) => {
    if (response.credential) {
      onSuccessRef.current(response.credential);
    } else {
      onErrorRef.current("구글 인증 정보를 가져오지 못했습니다.");
    }
  }, []); // empty deps — never recreated, reads latest via refs

  useEffect(() => {
    if (!scriptLoadedSuccessfully || initialized.current) return;
    window.google?.accounts.id.initialize({
      client_id: clientId,
      callback: stableCallback,
      auto_select: false,
      cancel_on_tap_outside: true,
    });
    initialized.current = true;
  }, [scriptLoadedSuccessfully, clientId, stableCallback]);

  const handleClick = () => {
    if (!window.google?.accounts?.id) {
      onErrorRef.current("구글 서비스가 아직 로드되지 않았습니다. 잠시 후 다시 시도해 주세요.");
      return;
    }
    // prompt()는 사용자 클릭 이벤트 안에서 직접 호출해야 팝업 차단 없이 동작함
    window.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        onErrorRef.current(
          "구글 로그인 창을 표시할 수 없습니다. 팝업 차단을 해제하거나 잠시 후 다시 시도해 주세요."
        );
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || !scriptLoadedSuccessfully}
      className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
    >
      <GoogleIcon />
      Google로 로그인
    </button>
  );
}
