export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getAlertSeverity,
  withAlertSeverityPrefix,
} from "@/lib/alert-severity";

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

const VIBRATION_WARNING_PULSE_COUNT = 3;

function getInclusionWarningMarginMeters(geofence) {
  const radius = Number(geofence?.radiusMeters || 0);
  if (!Number.isFinite(radius) || radius <= 0) return 25;
  return Math.min(50, Math.max(10, Math.round(radius * 0.15)));
}

function evaluateInclusionZones(lat, lng, inclusionZones) {
  if (!inclusionZones.length) {
    return {
      status: "NONE",
      zone: null,
      distanceToBoundaryMeters: null,
      distanceOutsideMeters: null,
      warningMarginMeters: 0,
    };
  }

  const measurements = inclusionZones.map((zone) => {
    const distanceToCenterMeters = distanceMeters(
      lat,
      lng,
      zone.centerLat,
      zone.centerLng
    );

    return {
      zone,
      distanceToCenterMeters,
      distanceToBoundaryMeters: zone.radiusMeters - distanceToCenterMeters,
      distanceOutsideMeters: Math.max(0, distanceToCenterMeters - zone.radiusMeters),
      warningMarginMeters: getInclusionWarningMarginMeters(zone),
    };
  });

  const insideZones = measurements.filter(
    (item) => item.distanceToBoundaryMeters >= 0
  );

  if (!insideZones.length) {
    const nearest = measurements.reduce(
      (best, item) =>
        !best || item.distanceOutsideMeters < best.distanceOutsideMeters
          ? item
          : best,
      null
    );

    return {
      status: "BREACH",
      zone: nearest?.zone || null,
      distanceToBoundaryMeters: nearest?.distanceToBoundaryMeters ?? null,
      distanceOutsideMeters: nearest?.distanceOutsideMeters ?? null,
      warningMarginMeters: nearest?.warningMarginMeters ?? 0,
    };
  }

  const nearestBoundary = insideZones.reduce(
    (best, item) =>
      !best || item.distanceToBoundaryMeters < best.distanceToBoundaryMeters
        ? item
        : best,
    null
  );

  if (
    nearestBoundary &&
    nearestBoundary.distanceToBoundaryMeters <= nearestBoundary.warningMarginMeters
  ) {
    return {
      status: "WARNING",
      zone: nearestBoundary.zone,
      distanceToBoundaryMeters: nearestBoundary.distanceToBoundaryMeters,
      distanceOutsideMeters: 0,
      warningMarginMeters: nearestBoundary.warningMarginMeters,
    };
  }

  return {
    status: "SAFE",
    zone: nearestBoundary?.zone || null,
    distanceToBoundaryMeters: nearestBoundary?.distanceToBoundaryMeters ?? null,
    distanceOutsideMeters: 0,
    warningMarginMeters: nearestBoundary?.warningMarginMeters ?? 0,
  };
}

async function ensureOpenAlert(tx, { paroleeId, officerId, type, details }) {
  const existing = await tx.alert.findFirst({
    where: {
      paroleeId,
      type,
      status: "OPEN",
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (existing) return { alert: existing, created: false };

  const alert = await tx.alert.create({
    data: {
      paroleeId,
      officerId: officerId || null,
      type,
      details,
      status: "OPEN",
    },
  });

  return { alert, created: true };
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

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const paroleeId = searchParams.get("paroleeId");

    if (!paroleeId) {
      return NextResponse.json(
        { error: "paroleeId is required" },
        { status: 400 }
      );
    }

    const latest = await prisma.telemetry.findFirst({
      where: {
        paroleeId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(latest || null);
  } catch (error) {
    console.error("Telemetry GET error:", error);

    return NextResponse.json(
      {
        error: "Server error",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const token = req.headers.get("x-device-token") || "";

    const raw = await req.text();
    console.log("RAW BODY:", raw);

    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        {
          error: "Invalid JSON",
          raw,
        },
        { status: 400 }
      );
    }

    const deviceId = String(body.deviceId || "").trim();
    const paroleeId = String(body.paroleeId || "").trim();

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
          where: {
            id: deviceId,
          },
        }),
        prisma.parolee.findUnique({
          where: {
            id: paroleeId,
          },
        }),
        prisma.systemSettings.findFirst(),
        prisma.officerParoleeAssignment.findFirst({
          where: {
            paroleeId,
            status: "ACTIVE",
          },
          orderBy: {
            startAt: "desc",
          },
          select: {
            officerId: true,
            officer: {
              select: {
                badgeId: true,
                fullName: true,
                phone: true,
              },
            },
          },
        }),
        prisma.geofence.findMany({
          where: {
            paroleeId,
            status: "ACTIVE",
          },
          orderBy: {
            createdAt: "desc",
          },
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
    const officer = officerAssignment?.officer || null;
    const lowBatteryThreshold = settings?.lowBatteryThreshold ?? 20;
    let deviceAction = {
      geofenceBreach: false,
      geofenceWarning: false,
      geofenceDetails: "",
      geofenceAlertId: "",
      officerId,
      officerName: officer?.fullName || "",
      officerPhone: officer?.phone || "",
      paroleeLabel: parolee.fullName || paroleeId,
      alertSeverity: "",
      warningLimit: VIBRATION_WARNING_PULSE_COUNT,
      callOfficer: false,
      smsMessage: "",
      vibrationMode: "OFF",
      vibrationPulseCount: 0,
      vibrationContinuous: false,
    };

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
      let geofenceWarning = "";
      let geofenceHighImmediate = false;

      const inclusionZones = geofences.filter((g) => g.type === "INCLUSION");
      const exclusionZones = geofences.filter((g) => g.type === "EXCLUSION");
      const inclusionState = evaluateInclusionZones(lat, lng, inclusionZones);

      if (inclusionState.status === "BREACH") {
        const zoneName = inclusionState.zone?.name
          ? `: ${inclusionState.zone.name}`
          : "";
        const distanceOutside = Number.isFinite(inclusionState.distanceOutsideMeters)
          ? ` Distance outside boundary: ${Math.round(inclusionState.distanceOutsideMeters)} meters.`
          : "";

        geofenceProblem = `Parolee is outside the allowed inclusion zone${zoneName}.${distanceOutside}`;
        geofenceHighImmediate = true;
      } else if (inclusionState.status === "WARNING") {
        const zoneName = inclusionState.zone?.name
          ? `: ${inclusionState.zone.name}`
          : "";
        const remainingMeters = Number.isFinite(inclusionState.distanceToBoundaryMeters)
          ? Math.max(0, Math.round(inclusionState.distanceToBoundaryMeters))
          : 0;

        geofenceWarning = `Parolee is near the edge of the allowed inclusion zone${zoneName}. About ${remainingMeters} meters remaining before boundary.`;
      }

      const hitExclusion = exclusionZones.find((g) =>
        isInsideCircle(lat, lng, g)
      );

      if (hitExclusion) {
        geofenceProblem = `Parolee entered exclusion zone: ${hitExclusion.name}.`;
        geofenceHighImmediate = true;
      }

      if (geofenceProblem || geofenceWarning) {
        const geofenceBreach = Boolean(geofenceProblem);
        const alertMessage = geofenceBreach ? geofenceProblem : geofenceWarning;
        const geofenceDetails = `${alertMessage} Location: ${lat.toFixed(6)}, ${lng.toFixed(6)}.`;
        const alertSeverity = geofenceBreach || geofenceHighImmediate ? "HIGH" : "WARNING";
        const geofenceAlertResult = await ensureOpenAlert(tx, {
          paroleeId,
          officerId,
          type: "GEOFENCE",
          details: withAlertSeverityPrefix(alertSeverity, geofenceDetails),
        });

        const paroleeLabel = parolee.fullName || paroleeId;
        const officerPhone = officer?.phone || "";
        const alertDetails = withAlertSeverityPrefix(alertSeverity, geofenceDetails);
        let geofenceAlert = geofenceAlertResult.alert;

        if (
          getAlertSeverity(geofenceAlert.type, geofenceAlert.details) !== alertSeverity ||
          geofenceAlert.details !== alertDetails ||
          geofenceAlert.officerId !== officerId
        ) {
          geofenceAlert = await tx.alert.update({
            where: {
              id: geofenceAlert.id,
            },
            data: {
              officerId: officerId || null,
              details: alertDetails,
              status: "OPEN",
              resolvedAt: null,
            },
          });
        }

        deviceAction = {
          geofenceBreach,
          geofenceWarning: !geofenceBreach,
          geofenceDetails,
          geofenceAlertId: geofenceAlert.id,
          officerId,
          officerName: officer?.fullName || "",
          officerPhone,
          paroleeLabel,
          alertSeverity,
          warningLimit: VIBRATION_WARNING_PULSE_COUNT,
          callOfficer: geofenceBreach && alertSeverity === "HIGH" && Boolean(officerPhone),
          smsMessage: geofenceBreach
            ? `${paroleeLabel} breached geofence. ${geofenceDetails}`
            : `${paroleeLabel} is near the inclusion boundary. ${geofenceDetails}`,
          vibrationMode: geofenceBreach ? "BREACH" : "WARNING",
          vibrationPulseCount: geofenceBreach ? 0 : VIBRATION_WARNING_PULSE_COUNT,
          vibrationContinuous: geofenceBreach,
        };
      } else {
        await resolveAlertsByType(tx, {
          paroleeId,
          type: "GEOFENCE",
        });

        deviceAction = {
          ...deviceAction,
          geofenceBreach: false,
          geofenceWarning: false,
          geofenceDetails: "",
          geofenceAlertId: "",
          callOfficer: false,
          smsMessage: "",
          vibrationMode: "OFF",
          vibrationPulseCount: 0,
          vibrationContinuous: false,
        };
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
        deviceAction,
        serverTime: new Date().toISOString(),
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
