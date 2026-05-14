import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function getOrCreateSettings() {
  let settings = await prisma.systemSettings.findFirst();

  if (!settings) {
    settings = await prisma.systemSettings.create({
      data: {
        systemName: "GPS-Based Ankle Monitoring System",
        defaultMapLat: 7.9064,
        defaultMapLng: 125.0942,
        defaultGeofenceRadiusM: 300,
        telemetryIntervalSec: 10,
        lowBatteryThreshold: 20,
        liveFeedRefreshSec: 5,
        geofenceBreachAlerts: true,
        deviceTamperAlerts: true,
        lowBatteryAlerts: true,
        offlineAlerts: true,
      },
    });
  }

  return settings;
}

export async function GET() {
  try {
    const settings = await getOrCreateSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error("GET /api/settings error:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings", detail: String(error?.message || error) },
      { status: 500 }
    );
  }
}

export async function PUT(req) {
  try {
    const body = await req.json();
    const current = await getOrCreateSettings();

    const settings = await prisma.systemSettings.update({
      where: { id: current.id },
      data: {
        systemName: body.systemName || "GPS-Based Ankle Monitoring System",
        organizationName: body.organizationName || null,
        supportEmail: body.supportEmail || null,
        defaultMapLat: Number(body.defaultMapLat ?? 7.9064),
        defaultMapLng: Number(body.defaultMapLng ?? 125.0942),
        defaultGeofenceRadiusM: Number(body.defaultGeofenceRadiusM ?? 300),
        telemetryIntervalSec: Number(body.telemetryIntervalSec ?? 10),
        lowBatteryThreshold: Number(body.lowBatteryThreshold ?? 20),
        liveFeedRefreshSec: Number(body.liveFeedRefreshSec ?? 5),
        geofenceBreachAlerts: Boolean(body.geofenceBreachAlerts),
        deviceTamperAlerts: Boolean(body.deviceTamperAlerts),
        lowBatteryAlerts: Boolean(body.lowBatteryAlerts),
        offlineAlerts: Boolean(body.offlineAlerts),
      },
    });

    return NextResponse.json({ ok: true, data: settings });
  } catch (error) {
    console.error("PUT /api/settings error:", error);
    return NextResponse.json(
      { error: "Failed to save settings", detail: String(error?.message || error) },
      { status: 500 }
    );
  }
}