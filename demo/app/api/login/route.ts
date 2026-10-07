import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, mintAuthCookie, safeEqual } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const secret = process.env.DEMO_PASSWORD;
  if (!secret) {
    return NextResponse.json(
      { error: "login_not_configured", detail: "Set DEMO_PASSWORD in env (local .env.local / Vercel dashboard)." },
      { status: 500 },
    );
  }
  const body = await req.json().catch(() => ({}));
  const password = String(body.password ?? "");
  if (!password || !safeEqual(password, secret)) {
    return NextResponse.json({ error: "wrong_password" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, await mintAuthCookie(secret), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
  return res;
}
