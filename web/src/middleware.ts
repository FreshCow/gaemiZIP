import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requiresAuth } from "@/lib/authRoutes";

// gaemi_token 쿠키는 브라우저 프로세스 단위(모든 탭 공유)로 살아있어 실제 로그인/권한 상태(탭 단위
// sessionStorage, 그 탭에서 로그인한 계정의 role 등)와 어긋날 수 있음 — 다른 탭에서 다른 계정으로
// 로그인하면 공유 쿠키가 그 계정으로 덮어써지기 때문에, 여기서 role(ADMIN 여부)까지 판단하면 다른 탭의
// 로그인에 의해 잘못 튕겨나갈 수 있음. 그래서 여기서는 "토큰이 아예 없다"는 최소한의 판단만 하고,
// 관리자 권한 체크는 실제 상태를 아는 AuthStoreInitializer(클라이언트)가 전담. 실제 인가는 서버
// SecurityConfig가 처리하므로 이건 화면 가드일 뿐
export function middleware(request: NextRequest) {
  const token = request.cookies.get("gaemi_token")?.value;
  const { pathname } = request.nextUrl;

  if (requiresAuth(pathname) && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|jpg|ico)$).*)"],
};
