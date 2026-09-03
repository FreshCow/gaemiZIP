// middleware.ts(쿠키 기반 서버 가드)와 AuthStoreInitializer(실제 로그인 상태 기반 클라이언트 가드)가
// 서로 다른 기준으로 라우트를 판단하다 어긋나는 걸 막기 위한 단일 소스

// 로그인된 사용자가 접근하면 안 되는(=이미 로그인됨 안내가 필요한) 페이지
const AUTH_ONLY_PATHS = ["/login", "/signup"];

// 비로그인 포함 누구나 접근 가능한 페이지
const OPEN_PATHS = ["/stocks", "/board", "/find-password"];

// ADMIN 권한이 있어야만 접근 가능한 페이지
const ADMIN_PATHS = ["/admin"];

export function isAuthOnlyPath(pathname: string): boolean {
  return AUTH_ONLY_PATHS.some((p) => pathname.startsWith(p));
}

export function isAdminPath(pathname: string): boolean {
  return ADMIN_PATHS.some((p) => pathname.startsWith(p));
}

// 로그인이 필요한 경로인지 (게시글 작성은 목록/상세와 달리 로그인 필요)
export function requiresAuth(pathname: string): boolean {
  // "/"는 /stocks로 리다이렉트만 하는 진입점이라 그 자체는 인증 불필요
  if (pathname === "/") return false;
  if (isAuthOnlyPath(pathname)) return false;
  if (isAdminPath(pathname)) return true;
  if (pathname.startsWith("/board/write")) return true;
  if (OPEN_PATHS.some((p) => pathname.startsWith(p))) return false;
  return true;
}
