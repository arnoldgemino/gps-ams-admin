import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  OFFICER_SESSION_COOKIE,
} from "./src/lib/auth-cookies";

function redirectToLogin(req, pathname) {
  const loginPath = pathname.startsWith("/officer") ? "/officer/login" : "/login";
  const url = req.nextUrl.clone();
  url.pathname = loginPath;
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export function middleware(req) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/admin")) {
    const hasAdminSession = Boolean(req.cookies.get(ADMIN_SESSION_COOKIE)?.value);
    if (!hasAdminSession) return redirectToLogin(req, pathname);
  }

  if (
    pathname.startsWith("/officer") &&
    pathname !== "/officer/login" &&
    pathname !== "/officer/forgot-password"
  ) {
    const hasOfficerSession = Boolean(req.cookies.get(OFFICER_SESSION_COOKIE)?.value);
    if (!hasOfficerSession) return redirectToLogin(req, pathname);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/officer/:path*"],
};
