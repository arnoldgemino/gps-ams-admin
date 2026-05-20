import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  OFFICER_SESSION_COOKIE,
} from "@/lib/auth-cookies";

export async function POST() {
  const res = NextResponse.json({ ok: true });

  res.cookies.delete(ADMIN_SESSION_COOKIE);
  res.cookies.delete(OFFICER_SESSION_COOKIE);
  res.cookies.delete("admin_session");

  return res;
}
