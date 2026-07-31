"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SignUpCompletePage() {
  const router = useRouter();
  const [securityCode, setSecurityCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const consumed = useRef(false);

  useEffect(() => {
    // sessionStorage를 읽자마자 지우는 파괴적 동작이라, 개발 모드 StrictMode가
    // effect를 두 번 실행하면 두 번째 실행이 빈 값을 읽고 /signup으로 되튕기는 문제가 있었음 — ref로 1회만 실행되도록 방지
    if (consumed.current) return;
    consumed.current = true;

    const code = sessionStorage.getItem("gaemi_security_code");
    if (!code) {
      router.replace("/signup");
      return;
    }
    setSecurityCode(code);
    sessionStorage.removeItem("gaemi_security_code");
  }, [router]);

  const handleCopy = async () => {
    if (!securityCode) return;
    await navigator.clipboard.writeText(securityCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!securityCode) return;
    const blob = new Blob(
      [`gaemiZIP 보안코드\n\n${securityCode}\n\n비밀번호를 잊어버렸을 때 아이디와 함께 사용됩니다. 안전한 곳에 보관하세요.`],
      { type: "text/plain;charset=utf-8" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "gaemiZIP_security_code.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!securityCode) return null;

  return (
    <div className="flex min-h-screen items-start justify-center p-4 pt-20">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">회원가입 완료</h1>
          <p className="text-sm text-gray-500 dark:text-neutral-400">
            비밀번호를 잊었을 때 필요한 보안코드입니다
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 space-y-4 dark:border-neutral-800 dark:bg-neutral-900">
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
            이 코드는 지금만 표시되며 다시 볼 수 없습니다. 복사하거나 다운로드해 안전하게 보관하세요.
          </p>

          <div className="rounded-lg border border-gray-200 bg-white px-3 py-3 text-center font-mono text-sm tracking-wider break-all text-gray-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white">
            {securityCode}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={handleCopy}>
              {copied ? <Check /> : <Copy />}
              {copied ? "복사됨" : "복사"}
            </Button>
            <Button variant="outline" className="flex-1" onClick={handleDownload}>
              <Download />
              파일로 저장
            </Button>
          </div>

          <Button className="w-full" onClick={() => router.push("/login")}>
            저장했습니다, 로그인하러 가기
          </Button>
        </div>
      </div>
    </div>
  );
}
