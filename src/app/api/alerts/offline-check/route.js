export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { runOfflineAlertCheck } from "@/lib/offline-alerts";

function jsonNoCache(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("Cache-Control", "no-store, max-age=0");
  return NextResponse.json(data, { ...init, headers });
}

async function handleOfflineCheck() {
  try {
    const result = await runOfflineAlertCheck();
    return jsonNoCache(result, { status: 200 });
  } catch (error) {
    console.error("/api/alerts/offline-check error:", error);

    return jsonNoCache(
      { error: "Failed to run offline check" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return handleOfflineCheck();
}

export async function POST() {
  return handleOfflineCheck();
}
