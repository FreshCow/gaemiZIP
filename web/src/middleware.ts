import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 로그인된 사용자가 접근하면 /로 돌려보내는 인증 전용 페이지
const AUTH_ONLY_PATHS = ["/login", "/signup"];

// 비로그인 포함 누구나 접근 가능한 페이지
const OPEN_PATHS = ["/stocks", "/board"];

// ADMIN 권한이 있어야만 접근 가능한 페이지
const ADMIN_PATHS = ["/admin"];

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

export function middleware(request: NextRequest) {
  const token = request.cookies.get("gaemi_token")?.value;
  const { pathname } = request.nextUrl;

  if (AUTH_ONLY_PATHS.some((p) => pathname.startsWith(p))) {
    if (token) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (ADMIN_PATHS.some((p) => pathname.startsWith(p))) {
    if (!token || getRoleFromToken(token) !== "ROLE_ADMIN") {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (OPEN_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|jpg|ico)$).*)"],
};
