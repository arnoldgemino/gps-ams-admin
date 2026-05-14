import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function toRad(value) {
  return (value * Math.PI) / 180;
}

function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function isInsideCircle(lat, lng, geofence) {
  return (
    distanceMeters(lat, lng, geofence.centerLat, geofence.centerLng) <=
    geofence.radiusMeters
  );
}

async function ensureOpenAlert(tx, { paroleeId, officerId, type, details }) {
  const existing = await tx.alert.findFirst({
    where: {
      paroleeId,
      type,
      status: "OPEN",
    },
    orderBy: { createdAt: "desc" },
  });

  if (existing) return existing;

  return tx.alert.create({
    data: {
      paroleeId,
      officerId: officerId || null,
      type,
      details,
      status: "OPEN",
    },
  });
}

async function resolveAlertsByType(tx, { paroleeId, type }) {
  await tx.alert.updateMany({
    where: {
      paroleeId,
      type,
      status: {
        in: ["OPEN", "ACKNOWLEDGED"],
      },
    },
    data: {
      status: "RESOLVED",
      resolvedAt: new Date(),
    },
  });
}

export async function POST(req) {
  try {
    const token = req.headers.get("x-device-token") || "";

    const raw = await req.text();
    console.log("RAW BODY:", raw);

    let body;
    try {
      body = JSON.parse(raw);
    } catch (e) {
      return NextResponse.json(
        {
          error: "Invalid JSON",
          raw,
        },
        { status: 400 }
      );
    }

    const deviceId = String(body.deviceId || "");
    const paroleeId = String(body.paroleeId || "");
    const lat = Number(body.lat);
    const lng = Number(body.lng);
    const batteryLevel = Number(body.batteryLevel);

    const signalRssiDbm =
      body.signalRssiDbm === undefined || body.signalRssiDbm === null
        ? null
        : Number(body.signalRssiDbm);

    const tamperStatus = String(body.tamperStatus || "OK");

    if (
      !deviceId ||
      !paroleeId ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      !Number.isFinite(batteryLevel)
    ) {
      return NextResponse.json(
        {
          error: "Invalid telemetry payload",
          received: body,
        },
        { status: 400 }
      );
    }

    const [device, parolee, settings, officerAssignment, geofences] =
      await Promise.all([
        prisma.device.findUnique({
          where: { id: deviceId },
        }),
        prisma.parolee.findUnique({
          where: { id: paroleeId },
        }),
        prisma.systemSettings.findFirst(),
        prisma.officerParoleeAssignment.findFirst({
          where: {
            paroleeId,
            status: "ACTIVE",
          },
          orderBy: { startAt: "desc" },
        }),
        prisma.geofence.findMany({
          where: {
            paroleeId,
            status: "ACTIVE",
          },
          orderBy: { createdAt: "desc" },
        }),
      ]);

    if (!device) {
      return NextResponse.json(
        {
          error: "Device not found",
          deviceId,
        },
        { status: 404 }
      );
    }

    if (!parolee) {
      return NextResponse.json(
        {
          error: "Parolee not found",
          paroleeId,
        },
        { status: 404 }
      );
    }

    const envToken = process.env.ESP32_DEVICE_TOKEN || "";
    const tokenValid = token === envToken || token === device.apiKey;

    if (!tokenValid) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const officerId = officerAssignment?.officerId || null;
    const lowBatteryThreshold = settings?.lowBatteryThreshold ?? 20;

    const telemetry = await prisma.$transaction(async (tx) => {
      const saved = await tx.telemetry.create({
        data: {
          deviceId,
          paroleeId,
          lat,
          lng,
          batteryLevel,
          signalRssiDbm,
          tamperStatus,
        },
      });

      if (tamperStatus === "TAMPER") {
        await ensureOpenAlert(tx, {
          paroleeId,
          officerId,
          type: "TAMPER",
          details: "Tamper detected from device telemetry.",
        });
      } else {
        await resolveAlertsByType(tx, {
          paroleeId,
          type: "TAMPER",
        });
      }

      if (batteryLevel <= lowBatteryThreshold) {
        await ensureOpenAlert(tx, {
          paroleeId,
          officerId,
          type: "LOW_BATTERY",
          details: `Battery level is ${batteryLevel}%. Threshold is ${lowBatteryThreshold}%.`,
        });
      } else {
        await resolveAlertsByType(tx, {
          paroleeId,
          type: "LOW_BATTERY",
        });
      }

      let geofenceProblem = "";

      const inclusionZones = geofences.filter((g) => g.type === "INCLUSION");
      const exclusionZones = geofences.filter((g) => g.type === "EXCLUSION");

      if (inclusionZones.length > 0) {
        const insideAnyInclusion = inclusionZones.some((g) =>
          isInsideCircle(lat, lng, g)
        );

        if (!insideAnyInclusion) {
          geofenceProblem = "Parolee is outside the allowed inclusion zone.";
        }
      }

      const hitExclusion = exclusionZones.find((g) =>
        isInsideCircle(lat, lng, g)
      );

      if (hitExclusion) {
        geofenceProblem = `Parolee entered exclusion zone: ${hitExclusion.name}.`;
      }

      if (geofenceProblem) {
        await ensureOpenAlert(tx, {
          paroleeId,
          officerId,
          type: "GEOFENCE",
          details: geofenceProblem,
        });
      } else {
        await resolveAlertsByType(tx, {
          paroleeId,
          type: "GEOFENCE",
        });
      }

      await resolveAlertsByType(tx, {
        paroleeId,
        type: "OFFLINE",
      });

      return saved;
    });

    return NextResponse.json(
      {
        ok: true,
        data: telemetry,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Telemetry POST error:", error);

    return NextResponse.json(
      {
        error: "Server error",
        message: error.message,
      },
      { status: 500 }
    );
  }
}