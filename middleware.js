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

function unauthorized() {
  return NextResponse.json(
    { error: "Unauthorized. Please log in first." },
    { status: 401 }
  );
}

function hasAdminSession(req) {
  return Boolean(req.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

function hasOfficerSession(req) {
  return Boolean(req.cookies.get(OFFICER_SESSION_COOKIE)?.value);
}

function hasAnyUserSession(req) {
  return hasAdminSession(req) || hasOfficerSession(req);
}

export function middleware(req) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/admin")) {
    if (!hasAdminSession(req)) return redirectToLogin(req, pathname);
  }

  if (
    pathname.startsWith("/officer") &&
    pathname !== "/officer/login" &&
    pathname !== "/officer/forgot-password"
  ) {
    if (!hasOfficerSession(req)) return redirectToLogin(req, pathname);
  }

  if (pathname.startsWith("/api")) {
    if (pathname.startsWith("/api/auth")) return NextResponse.next();

    if (pathname === "/api/telemetry" && req.method === "POST") {
      return NextResponse.next();
    }

    if (pathname === "/api/settings" && req.method === "GET") {
      if (!hasAnyUserSession(req)) return unauthorized();
      return NextResponse.next();
    }

    if (pathname.startsWith("/api/officers/")) {
      if (!hasAnyUserSession(req)) return unauthorized();
      return NextResponse.next();
    }

    if (pathname === "/api/officers") {
      if (!hasAdminSession(req)) return unauthorized();
      return NextResponse.next();
    }

    const adminOnlyApiPrefixes = [
      "/api/admin",
      "/api/alerts",
      "/api/devices",
      "/api/geofences",
      "/api/parolees",
      "/api/settings",
    ];

    if (adminOnlyApiPrefixes.some((prefix) => pathname.startsWith(prefix))) {
      if (!hasAdminSession(req)) return unauthorized();
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/officer/:path*", "/api/:path*"],
};
