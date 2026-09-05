// 무료 플랜 약관상 필요한 logo.dev 출처 표기 — 다른 사이트의 카피라이트처럼 페이지 최하단에 흐르는 방식
export function LogoDevAttribution() {
  return (
    <footer className="w-full py-4 text-center text-[10px] text-gray-400 dark:text-neutral-600">
      <a
        href="https://logo.dev"
        target="_blank"
        rel="noopener noreferrer"
        className="transition-colors hover:text-gray-600 dark:hover:text-neutral-400"
      >
        Logos provided by Logo.dev
      </a>
    </footer>
  );
}
