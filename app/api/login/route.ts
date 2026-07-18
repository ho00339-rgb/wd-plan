import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const expected = process.env.SITE_PASSWORD;
  if (!expected) return NextResponse.json({ ok: true }); // 게이트 미설정

  let password = "";
  try {
    const body = await req.json();
    password = typeof body?.password === "string" ? body.password : "";
  } catch {
    return NextResponse.json({ ok: false, error: "요청 오류" }, { status: 400 });
  }

  if (password === expected) {
    // 실제 접속 프로토콜(https)일 때만 Secure. http(로컬·LAN)에선 Secure 없이 저장되게 함.
    const proto =
      req.headers.get("x-forwarded-proto") ||
      new URL(req.url).protocol.replace(":", "");
    const isHttps = proto === "https";

    const res = NextResponse.json({ ok: true });
    res.cookies.set("wd_auth", expected, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1년 (한번 입력하면 계속 유지)
      secure: isHttps,
    });
    return res;
  }
  return NextResponse.json({ ok: false, error: "비밀번호가 틀렸어요." }, { status: 401 });
}
