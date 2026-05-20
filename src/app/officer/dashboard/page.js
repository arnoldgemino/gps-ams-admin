"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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

const REFRESH_MS = 10000;

function normalizeList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

export default function OfficerDashboardPage() {
  const router = useRouter();
  const center = useMemo(() => ({ lat: 7.9064, lng: 125.0942 }), []);

  const [officerName, setOfficerName] = useState("Officer");
  const [officerId, setOfficerId] = useState("");
  const [assigned, setAssigned] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [workingAlertId, setWorkingAlertId] = useState("");
  const [error, setError] = useState("");

  async function fetchOfficerAlerts(id, take = 5) {
    const res = await fetch(`/api/officers/${id}/alerts?take=${take}`, {
      cache: "no-store",
    });
    const data = await res.json().catch(() => []);

    if (!res.ok) {
      throw new Error(data.error || "Unable to load officer alerts");
    }

    return normalizeList(data);
  }

  useEffect(() => {
    const id = typeof window !== "undefined" ? localStorage.getItem("officerId") : null;
    const name = typeof window !== "undefined" ? localStorage.getItem("officerName") : null;
    if (!id) {
      router.push("/officer/login");
      return;
    }

    setOfficerId(id);
    setOfficerName(name || "Officer");

    async function loadOfficer(showLoader = true) {
      try {
        if (showLoader) setLoading(true);
        const res = await fetch(`/api/officers/${id}`, { cache: "no-store" });
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Unable to load officer details");
          return;
        }

        setOfficerName(data.fullName || name || "Officer");
        localStorage.setItem("officerName", data.fullName || "Officer");
        localStorage.setItem("officerEmail", data.email || "");
        localStorage.setItem("officerBadgeId", data.badgeId || "");
        setAssigned(
          (data.assignedParolees || []).map((item) => ({
            id: item.id,
            name: item.fullName || "-",
            paroleeNo: item.paroleeNo || "-",
            deviceId: item.deviceId || "-",
            battery: item.batteryLevel ?? "-",
            signal: item.signal || "-",
            tamper: item.tamper || "OK",
            lastLat: Number.isFinite(Number(item.lat)) ? Number(item.lat) : null,
            lastLng: Number.isFinite(Number(item.lng)) ? Number(item.lng) : null,
            lastSeen: item.lastSeen
              ? new Date(item.lastSeen).toLocaleString()
              : item.startAt
              ? new Date(item.startAt).toLocaleString()
              : "-",
            status: item.status || "ASSIGNED",
          }))
        );

        const officerAlerts = await fetchOfficerAlerts(id, 5);
        setAlerts(officerAlerts);
      } catch (err) {
        console.error(err);
        setError(err.message || "Unable to load officer details");
        setAssigned([]);
        setAlerts([]);
      } finally {
        if (showLoader) setLoading(false);
      }
    }

    loadOfficer();
    const interval = setInterval(() => {
      if (!document.hidden) {
        loadOfficer(false);
      }
    }, REFRESH_MS);

    return () => clearInterval(interval);
  }, [router]);

  async function handleAlertAction(alertId, action) {
    if (!officerId || !alertId) return;

    try {
      setWorkingAlertId(`${action}:${alertId}`);

      const res = await fetch(
        `/api/officers/${officerId}/alerts/${alertId}/${action}`,
        { method: "POST" }
      );
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data.error || `Failed to ${action} alert`);
        return;
      }

      const officerAlerts = await fetchOfficerAlerts(officerId, 5);
      setAlerts(officerAlerts);
    } catch (err) {
      console.error(err);
      alert(`Failed to ${action} alert`);
    } finally {
      setWorkingAlertId("");
    }
  }

  function handleLogout() {
    localStorage.removeItem("role");
    localStorage.removeItem("officerId");
    localStorage.removeItem("officerName");
    localStorage.removeItem("officerEmail");
    localStorage.removeItem("officerBadgeId");
    router.push("/officer/login");
  }

  const assignedWithLocation = useMemo(
    () =>
      assigned.filter(
        (p) => Number.isFinite(Number(p.lastLat)) && Number.isFinite(Number(p.lastLng))
      ),
    [assigned]
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
        value: alerts.filter((a) => a.status === "OPEN").length,
        tone: "bg-rose-500/15 border-rose-400/25 text-rose-100",
      },
      {
        label: "Tamper Alerts",
        value: alerts.filter((a) => a.status === "OPEN" && a.type === "TAMPER")
          .length,
        tone: "bg-amber-400/15 border-amber-300/25 text-amber-100",
      },
      {
        label: "Geofence Alerts",
        value: alerts.filter((a) => a.status === "OPEN" && a.type === "GEOFENCE")
          .length,
        tone: "bg-white/[0.08] border-white/10 text-slate-200",
      },
    ],
    [assigned.length, alerts]
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[url('/bg.png')] bg-cover bg-center opacity-20" />
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
              <button className={btnGhost} onClick={() => router.push("/officer/map")}>
                Realtime View
              </button>
            </div>
          </div>
        </header>

        <div className="mx-auto grid max-w-7xl grid-cols-12 gap-6 px-4 py-6">
          <aside className="hidden md:block col-span-12 md:col-span-3 lg:col-span-2">
            <div className="sticky top-20 flex h-[calc(95vh-5rem)] flex-col overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.06] shadow-[0_10px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl">
              <nav className="flex-1 space-y-2 overflow-y-auto p-4">
                <SideLink active label="Dashboard" href="/officer/dashboard" />
                <SideLink label="My Parolees" href="/officer/parolees" />
                <SideLink label="Map" href="/officer/map" />
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

                <button onClick={handleLogout} className={`${btnDanger} mt-3 w-full`}>
                  Logout
                </button>
              </div>
            </div>
          </aside>

          <main className="col-span-12 h-[calc(95vh-5rem)] space-y-6 overflow-y-auto pb-0.5 md:col-span-9 lg:col-span-10">
            {error && (
              <div className="rounded-[28px] border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-100">
                {error}
              </div>
            )}

            {loading && (
              <div className="rounded-[28px] border border-white/10 bg-black/20 p-4 text-center text-sm text-slate-300">
                Loading dashboard...
              </div>
            )}

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
                    {assignedWithLocation.map((p) => (
                      <Marker key={p.id} position={[p.lastLat, p.lastLng]}>
                        <Popup>
                          <div className="text-sm">
                            <div className="font-semibold">{p.name}</div>
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
                        <Badge tone={severityTone(a.severity)}>
                          {a.severity}
                        </Badge>
                      </div>

                      <div className="mt-1 text-sm text-slate-300">
                        Parolee:{" "}
                        <span className="font-semibold text-white">
                          {a.paroleeLabel || a.paroleeId}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-slate-400">
                        Time: {a.time}
                      </div>

                      <div className="mt-3 flex gap-2">
                        {a.status === "OPEN" ? (
                          <>
                            <button
                              className={`${btnGhost} flex-1 justify-center`}
                              disabled={Boolean(workingAlertId)}
                              onClick={() => handleAlertAction(a.id, "acknowledge")}
                            >
                              {workingAlertId === `acknowledge:${a.id}`
                                ? "Working..."
                                : "Acknowledge"}
                            </button>
                            <button
                              className={`${btnPrimary} flex-1 justify-center`}
                              disabled={Boolean(workingAlertId)}
                              onClick={() => handleAlertAction(a.id, "resolve")}
                            >
                              {workingAlertId === `resolve:${a.id}`
                                ? "Working..."
                                : "Resolve"}
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-slate-400">
                            Status:{" "}
                            <span className="font-semibold text-white">
                              {a.status}
                            </span>
                          </span>
                        )}
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
                          {p.paroleeNo} - {p.name}
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
                            <button
                              className={btnSecondary}
                              onClick={() => router.push("/officer/parolees")}
                            >
                              View
                            </button>
                            <button
                              className={btnGhost}
                              onClick={() => router.push("/officer/alerts")}
                            >
                              History
                            </button>
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
        <nav className="fixed bottom-0 left-0 right-0 z-40 block border-t border-white/10 bg-slate-950/95 p-2 backdrop-blur-xl md:hidden">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4">
            <BottomNavLink href="/officer/dashboard" label="Dashboard" active />
            <BottomNavLink href="/officer/parolees" label="Parolees" />
            <BottomNavLink href="/officer/map" label="Map" />
            <BottomNavLink href="/officer/alerts" label="Alerts" />
            <BottomNavLink href="/officer/profile" label="Profile" />
          </div>
        </nav>
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

function BottomNavLink({ href, label, active = false }) {
  return (
    <Link
      href={href}
      className={[
        "flex-1 rounded-2xl px-3 py-2 text-center text-xs font-semibold transition",
        active
          ? "bg-white text-slate-950"
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

function severityTone(severity) {
  if (severity === "CRITICAL") return "red";
  if (severity === "HIGH") return "amber";
  if (severity === "WARNING") return "amber";
  return "gray";
}
