import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getSeverity(type) {
  if (type === "TAMPER") return "CRITICAL";
  if (type === "GEOFENCE") return "HIGH";
  if (type === "OFFLINE") return "HIGH";
  if (type === "LOW_BATTERY") return "MEDIUM";
  return "MEDIUM";
}

export async function GET(req, { params }) {
  try {
    const { id } = await params;

    const alert = await prisma.alert.findUnique({
      where: { id },
    });

    if (!alert) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    const [parolee, officer, latestTelemetry] = await Promise.all([
      alert.paroleeId
        ? prisma.parolee.findUnique({ where: { id: alert.paroleeId } })
        : null,
      alert.officerId
        ? prisma.officer.findUnique({ where: { id: alert.officerId } })
        : null,
      alert.paroleeId
        ? prisma.telemetry.findFirst({
            where: { paroleeId: alert.paroleeId },
            orderBy: { createdAt: "desc" },
          })
        : null,
    ]);

    return NextResponse.json({
      id: alert.id,
      paroleeId: alert.paroleeId || "",
      paroleeLabel: parolee
        ? `${parolee.paroleeNo} - ${parolee.fullName}`
        : alert.paroleeId || "—",
      type: alert.type,
      severity: getSeverity(alert.type),
      status: alert.status,
      details: alert.details || "",
      time: alert.createdAt ? new Date(alert.createdAt).toLocaleString() : "—",
      location: latestTelemetry ? `${latestTelemetry.lat}, ${latestTelemetry.lng}` : "Unknown",
      officerLabel: officer ? `${officer.badgeId} - ${officer.fullName}` : "—",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch alert detail" }, { status: 500 });
  }
}