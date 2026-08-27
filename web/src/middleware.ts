import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAdminPath, requiresAuth } from "@/lib/authRoutes";

// JWT는 서명 검증 없이 payload만 디코드 — 화면 가드용이며, 실제 인가는 서버 SecurityConfig가 처리
function getRoleFromToken(token: string): string | null {
  try {
    const payload = token.split(".")[1];
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(base64);
    return (JSON.parse(json).role as string) ?? null;
  } catch {
    return null;
  }
}

// gaemi_token 쿠키는 브라우저 프로세스 단위로 살아있어 실제 로그인 상태(탭 단위 sessionStorage 등)와
// 어긋날 수 있음 — "로그인된 사용자를 /login,/signup에서 내보내는" 판단은 실제 상태를 아는
// AuthStoreInitializer(클라이언트)가 전담하고, 미들웨어는 여기서 관여하지 않음 (안 그러면 서로 반대
// 방향으로 리다이렉트를 주고받는 무한 루프가 생김)
export function middleware(request: NextRequest) {
  const token = request.cookies.get("gaemi_token")?.value;
  const { pathname } = request.nextUrl;

  if (isAdminPath(pathname)) {
    if (!token || getRoleFromToken(token) !== "ROLE_ADMIN") {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (requiresAuth(pathname) && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|jpg|ico)$).*)"],
};
