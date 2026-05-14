"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";

const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((m) => m.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((m) => m.Popup),
  { ssr: false }
);

const sectionCard =
  "rounded-[28px] border border-white/10 bg-white/[0.06] p-5 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.35)]";

const btnPrimary =
  "inline-flex items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 active:scale-[0.99]";

const btnSecondary =
  "inline-flex items-center justify-center rounded-xl border border-sky-400/30 bg-sky-500/15 px-4 py-2 text-sm font-medium text-sky-100 transition hover:bg-sky-500/25 active:scale-[0.99]";

const btnGhost =
  "inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-medium text-white transition hover:bg-white/[0.10] active:scale-[0.99]";

const btnDanger =
  "inline-flex items-center justify-center rounded-xl border border-rose-400/30 bg-rose-500/15 px-4 py-2 text-sm font-medium text-rose-100 transition hover:bg-rose-500/25 active:scale-[0.99]";

export default function OfficerDashboardPage() {
  const center = useMemo(() => ({ lat: 7.9064, lng: 125.0942 }), []);

  const [officerName, setOfficerName] = useState(() =>
    typeof window !== "undefined"
      ? localStorage.getItem("officerName") ?? "Officer"
      : "Officer"
  );

  const assigned = useMemo(
    () => [
      {
        id: "PAR-101",
        name: "—",
        deviceId: "DEV-001",
        battery: "—",
        signal: "—",
        tamper: "—",
        lastLat: 7.9064,
        lastLng: 125.0942,
        lastSeen: "—",
        status: "COMPLIANT",
      },
      {
        id: "PAR-102",
        name: "—",
        deviceId: "DEV-002",
        battery: "—",
        signal: "—",
        tamper: "—",
        lastLat: 7.9001,
        lastLng: 125.102,
        lastSeen: "—",
        status: "WARNING",
      },
    ],
    []
  );

  const alerts = useMemo(
    () => [
      {
        id: "AL-001",
        type: "GEOFENCE",
        paroleeId: "PAR-102",
        severity: "HIGH",
        time: "—",
        status: "ACTIVE",
      },
      {
        id: "AL-002",
        type: "LOW_BATTERY",
        paroleeId: "PAR-101",
        severity: "MEDIUM",
        time: "—",
        status: "ACKNOWLEDGED",
      },
    ],
    []
  );

  const stats = useMemo(
    () => [
      {
        label: "Assigned Parolees",
        value: assigned.length,
        tone: "bg-sky-500/15 border-sky-400/25 text-sky-100",
      },
      {
        label: "Active Alerts",
        value: alerts.filter((a) => a.status === "ACTIVE").length,
        tone: "bg-rose-500/15 border-rose-400/25 text-rose-100",
      },
      {
        label: "Tamper Alerts",
        value: "—",
        tone: "bg-amber-400/15 border-amber-300/25 text-amber-100",
      },
      {
        label: "Geofence Breaches",
        value: "—",
        tone: "bg-white/[0.08] border-white/10 text-slate-200",
      },
    ],
    [assigned.length, alerts]
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[url('/images/login-bg.jpg')] bg-cover bg-center opacity-20" />
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(2,6,23,0.95),rgba(10,24,52,0.88),rgba(3,7,18,0.96))]" />
      <div className="absolute inset-0 backdrop-blur-[2px]" />

      <div className="relative z-10">
        <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/35 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/10 font-bold text-white">
                GPS
              </div>
              <div className="leading-tight">
                <div className="font-semibold text-white">
                  GPS-Based Ankle Monitoring System
                </div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-300/80">
                  Officer • Dashboard
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button className={btnGhost}>Realtime View</button>
            </div>
          </div>
        </header>

        <div className="mx-auto grid max-w-7xl grid-cols-12 gap-6 px-4 py-6">
          <aside className="col-span-12 md:col-span-3 lg:col-span-2">
            <div className="sticky top-20 flex h-[calc(95vh-5rem)] flex-col overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.06] shadow-[0_10px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl">
              <nav className="flex-1 space-y-2 overflow-y-auto p-4">
                <SideLink active label="Dashboard" href="/officer/dashboard" />
                <SideLink label="My Parolees" href="/officer/parolees" />
                <SideLink label="Alerts" href="/officer/alerts" />
                <SideLink label="Profile" href="/officer/profile" />
              </nav>

              <div className="border-t border-white/10 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 font-semibold">
                    {officerName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-white">
                      {officerName}
                    </div>
                    <div className="truncate text-xs text-slate-300/70">
                      Logged in
                    </div>
                  </div>
                </div>

                <Link href="/login" className={`${btnDanger} mt-3 w-full`}>
                  Logout
                </Link>
              </div>
            </div>
          </aside>

          <main className="col-span-12 h-[calc(95vh-5rem)] space-y-6 overflow-y-auto pb-0.5 md:col-span-9 lg:col-span-10">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {stats.map((s) => (
                <div
                  key={s.label}
                  className={`rounded-[24px] border p-4 shadow-[0_10px_30px_rgba(0,0,0,0.22)] backdrop-blur-xl ${s.tone}`}
                >
                  <div className="text-sm opacity-90">{s.label}</div>
                  <div className="mt-2 text-3xl font-bold tracking-tight text-white">
                    {s.value}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-12 gap-6">
              <section className={`col-span-12 lg:col-span-7 ${sectionCard}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-white">
                      Live Map (Assigned Parolees)
                    </h2>
                    <p className="text-sm text-slate-300/75">
                      Monitor assigned parolees on the live map.
                    </p>
                  </div>
                  <Link href="/officer/map" className={btnSecondary}>
                    Map View
                  </Link>
                </div>

                <div className="mt-4 h-[45vh] overflow-hidden rounded-2xl border border-white/10">
                  <MapContainer
                    center={[center.lat, center.lng]}
                    zoom={13}
                    style={{ height: "100%", width: "100%" }}
                  >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    {assigned.map((p) => (
                      <Marker key={p.id} position={[p.lastLat, p.lastLng]}>
                        <Popup>
                          <div className="text-sm">
                            <div className="font-semibold">{p.id}</div>
                            <div>Device: {p.deviceId}</div>
                            <div>Status: {p.status}</div>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                </div>

                <div className="mt-3 text-xs text-slate-400">
                  Note: Real-time updates will come from device API / live
                  locations endpoint.
                </div>
              </section>

              <section className={`col-span-12 lg:col-span-5 ${sectionCard}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-white">
                      Recent Alerts
                    </h2>
                    <p className="text-sm text-slate-300/75">
                      Latest alert activity for your assigned parolees.
                    </p>
                  </div>
                  <Link href="/officer/alerts" className={btnGhost}>
                    View All
                  </Link>
                </div>

                <div className="mt-4 space-y-3">
                  {alerts.map((a) => (
                    <div
                      key={a.id}
                      className="rounded-2xl border border-white/10 bg-black/10 p-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold text-white">
                          {a.type}
                        </div>
                        <Badge tone={a.severity === "HIGH" ? "amber" : "gray"}>
                          {a.severity}
                        </Badge>
                      </div>

                      <div className="mt-1 text-sm text-slate-300">
                        Parolee:{" "}
                        <span className="font-semibold text-white">
                          {a.paroleeId}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-slate-400">
                        Time: {a.time}
                      </div>

                      <div className="mt-3 flex gap-2">
                        <button className={`${btnGhost} flex-1 justify-center`}>
                          Acknowledge
                        </button>
                        <button className={`${btnPrimary} flex-1 justify-center`}>
                          Resolve
                        </button>
                      </div>
                    </div>
                  ))}

                  {alerts.length === 0 && (
                    <div className="rounded-2xl border border-white/10 bg-black/10 p-6 text-center text-sm text-slate-400">
                      No alerts yet.
                    </div>
                  )}
                </div>
              </section>
            </div>

            <section className={sectionCard}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    My Assigned Parolees
                  </h2>
                  <p className="text-sm text-slate-300/75">
                    Last known location and device status for each assigned
                    parolee.
                  </p>
                </div>
                <Link href="/officer/parolees" className={btnGhost}>
                  Open List
                </Link>
              </div>

              <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10 bg-black/10">
                <table className="w-full text-sm">
                  <thead className="bg-slate-950/60 text-slate-300 backdrop-blur">
                    <tr className="border-b border-white/10">
                      <th className="py-3 px-3 text-left font-medium">Parolee</th>
                      <th className="py-3 px-3 text-left font-medium">Device</th>
                      <th className="py-3 px-3 text-left font-medium">Battery</th>
                      <th className="py-3 px-3 text-left font-medium">Signal</th>
                      <th className="py-3 px-3 text-left font-medium">Tamper</th>
                      <th className="py-3 px-3 text-left font-medium">Last Seen</th>
                      <th className="py-3 px-3 text-left font-medium">Status</th>
                      <th className="py-3 px-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {assigned.map((p) => (
                      <tr key={p.id} className="hover:bg-white/[0.03]">
                        <td className="py-3 px-3 font-semibold text-white">
                          {p.id}
                        </td>
                        <td className="py-3 px-3 text-slate-300">{p.deviceId}</td>
                        <td className="py-3 px-3 text-slate-300">{p.battery}</td>
                        <td className="py-3 px-3 text-slate-300">{p.signal}</td>
                        <td className="py-3 px-3 text-slate-300">{p.tamper}</td>
                        <td className="py-3 px-3 text-slate-400">{p.lastSeen}</td>
                        <td className="py-3 px-3">
                          <Badge
                            tone={
                              p.status === "COMPLIANT"
                                ? "green"
                                : p.status === "WARNING"
                                ? "amber"
                                : "red"
                            }
                          >
                            {p.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex justify-end gap-2">
                            <button className={btnSecondary}>View</button>
                            <button className={btnGhost}>History</button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {assigned.length === 0 && (
                      <tr>
                        <td
                          colSpan={8}
                          className="py-10 text-center text-slate-400"
                        >
                          No assigned parolees.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}

function SideLink({ href, label, active = false }) {
  return (
    <Link
      href={href}
      className={[
        "block rounded-xl px-3 py-2.5 text-sm transition",
        active
          ? "bg-white font-semibold text-slate-950 shadow-lg shadow-white/10"
          : "text-slate-200 hover:bg-white/10 hover:text-white",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}

function Badge({ tone, children }) {
  const cls =
    tone === "green"
      ? "border-emerald-300/20 bg-emerald-400/15 text-emerald-100"
      : tone === "amber"
      ? "border-amber-300/20 bg-amber-400/15 text-amber-100"
      : tone === "red"
      ? "border-rose-300/20 bg-rose-400/15 text-rose-100"
      : "border-white/10 bg-white/[0.06] text-slate-200";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${cls}`}
    >
      {children}
    </span>
  );
}