import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 로그인/로그아웃 경로는 항상 통과
  if (
    pathname === "/login" ||
    pathname.startsWith("/api/login") ||
    pathname.startsWith("/logout")
  ) {
    return NextResponse.next();
  }

  const pass = process.env.SITE_PASSWORD;
  // 비밀번호가 설정 안 된 경우엔 게이트 없이 통과 (로컬 초기 설정 편의)
  if (!pass) return NextResponse.next();

  if (req.cookies.get("wd_auth")?.value === pass) {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = {
  // 정적 자산 제외한 모든 경로에 적용
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
