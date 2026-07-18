import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const res = NextResponse.redirect(new URL("/login", req.url));
  res.cookies.delete("wd_auth");
  return res;
}
