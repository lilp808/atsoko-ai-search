import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, isValidAuthCookie } from "./lib/auth";

export async function middleware(req: NextRequest) {
  const ok = await isValidAuthCookie(
    req.cookies.get(AUTH_COOKIE)?.value,
    process.env.DEMO_PASSWORD,
  );
  if (ok) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = {
  // Gate everything (pages, APIs, /docs static md) except the login flow itself.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|login|api/login).*)"],
};
