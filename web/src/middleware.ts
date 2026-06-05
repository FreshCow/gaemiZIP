import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 로그인된 사용자가 접근하면 /로 돌려보내는 인증 전용 페이지
const AUTH_ONLY_PATHS = ["/login", "/signup"];

// 비로그인 포함 누구나 접근 가능한 페이지
const OPEN_PATHS = ["/stocks", "/board"];

export function middleware(request: NextRequest) {
  const token = request.cookies.get("gaemi_token")?.value;
  const { pathname } = request.nextUrl;

  if (AUTH_ONLY_PATHS.some((p) => pathname.startsWith(p))) {
    if (token) {
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
