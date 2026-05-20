"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { formatPhilippinesTime } from "@/lib/time";
import { DEFAULT_LIVE_REFRESH_MS, fetchLiveRefreshMs } from "@/lib/refresh";
import { logoutAndRedirect } from "@/lib/session";

const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false }
);
const CircleMarker = dynamic(
  () => import("react-leaflet").then((m) => m.CircleMarker),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((m) => m.Popup),
  { ssr: false }
);

const sectionCard =
  "rounded-[28px] border border-white/10 bg-white/[0.06] p-5 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.35)]";

const btnSecondary =
  "inline-flex items-center justify-center rounded-xl border border-sky-400/30 bg-sky-500/15 px-4 py-2 text-sm font-medium text-sky-100 transition hover:bg-sky-500/25 active:scale-[0.99]";

const btnDanger =
  "inline-flex items-center justify-center rounded-xl border border-rose-400/30 bg-rose-500/15 px-4 py-2 text-sm font-medium text-rose-100 transition hover:bg-rose-500/25 active:scale-[0.99]";

const REFRESH_MS = DEFAULT_LIVE_REFRESH_MS;

async function readJsonSafe(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export default function AdminDashboardPage() {
  const router = useRouter();

  const [summary, setSummary] = useState({
    totalParolees: "—",
    activeAMSDevices: "—",
    probationOfficers: "—",
    unresolvedAlerts: "—",
  });

  const [parolees, setParolees] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [markers, setMarkers] = useState([]);
  const [mapError, setMapError] = useState("");
  const [lastSync, setLastSync] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alertNotice, setAlertNotice] = useState(null);

  const defaultCenter = [7.9064, 125.0942];

  const aliveRef = useRef(true);
  const inFlightRef = useRef(false);
  const intervalRef = useRef(null);
  const knownAlertIdsRef = useRef(new Set());
  const notificationsReadyRef = useRef(false);

  function notifyNewAlerts(nextAlerts) {
    const openAlerts = nextAlerts.filter((alert) => alert.status !== "RESOLVED");
    const nextIds = new Set(openAlerts.map((alert) => alert.id).filter(Boolean));

    if (!notificationsReadyRef.current) {
      knownAlertIdsRef.current = nextIds;
      notificationsReadyRef.current = true;
      return;
    }

    const newAlerts = openAlerts.filter(
      (alert) => alert.id && !knownAlertIdsRef.current.has(alert.id)
    );

    knownAlertIdsRef.current = nextIds;
    if (!newAlerts.length) return;

    const alert = newAlerts[0];
    const parolee = alert.parolee || "Unknown parolee";
    const title = "New alert detected";
    const body = `${alert.type} alert for ${parolee}`;

    setAlertNotice({
      id: alert.id,
      title,
      body,
      time: alert.time || formatPhilippinesTime(new Date()),
    });

    if (typeof window === "undefined" || !("Notification" in window)) return;

    if (Notification.permission === "granted") {
      new Notification(title, { body });
    } else if (Notification.permission === "default") {
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          new Notification(title, { body });
        }
      });
    }
  }

  useEffect(() => {
    aliveRef.current = true;

    async function loadDashboard() {
      if (!aliveRef.current) return;
      if (document.hidden) return;
      if (inFlightRef.current) return;

      inFlightRef.current = true;

      try {
        const [
          summaryRes,
          paroleesRes,
          officersRes,
          alertsRes,
          liveRes,
        ] = await Promise.all([
          fetch("/api/admin/dashboard-summary", { cache: "no-store" }),
          fetch("/api/admin/parolees-overview", { cache: "no-store" }),
          fetch("/api/admin/officer-summary", { cache: "no-store" }),
          fetch("/api/admin/recent-alerts", { cache: "no-store" }),
          fetch("/api/admin/live-locations", { cache: "no-store" }),
        ]);

        const [
          summaryData,
          paroleesData,
          officersData,
          alertsData,
          liveData,
        ] = await Promise.all([
          readJsonSafe(summaryRes),
          readJsonSafe(paroleesRes),
          readJsonSafe(officersRes),
          readJsonSafe(alertsRes),
          readJsonSafe(liveRes),
        ]);

        if (!aliveRef.current) return;

        const failedEndpoints = [];
        if (!summaryRes.ok) failedEndpoints.push("dashboard-summary");
        if (!paroleesRes.ok) failedEndpoints.push("parolees-overview");
        if (!officersRes.ok) failedEndpoints.push("officer-summary");
        if (!alertsRes.ok) failedEndpoints.push("recent-alerts");
        if (!liveRes.ok) failedEndpoints.push("live-locations");

        if (failedEndpoints.length) {
          setMapError(
            `Dashboard data not available yet. Failed: ${failedEndpoints.join(", ")}`
          );
          return;
        }

        setSummary({
          totalParolees: String(summaryData?.totalParolees ?? "0"),
          activeAMSDevices: String(summaryData?.activeAMSDevices ?? "0"),
          probationOfficers: String(summaryData?.probationOfficers ?? "0"),
          unresolvedAlerts: String(summaryData?.unresolvedAlerts ?? "0"),
        });

        setParolees(Array.isArray(paroleesData?.items) ? paroleesData.items : []);
        setOfficers(Array.isArray(officersData?.items) ? officersData.items : []);
        const nextAlerts = Array.isArray(alertsData?.items) ? alertsData.items : [];
        setAlerts(nextAlerts);
        notifyNewAlerts(nextAlerts);
        setMarkers(Array.isArray(liveData?.items) ? liveData.items : []);
        setMapError("");
        setLastSync(new Date());
      } catch (error) {
        console.error("Dashboard fetch error:", error);
        if (!aliveRef.current) return;
        setMapError("Dashboard data not available yet.");
      } finally {
        if (aliveRef.current) {
          setLoading(false);
        }
        inFlightRef.current = false;
      }
    }

    function handleVisibilityChange() {
      if (!document.hidden) {
        loadDashboard();
      }
    }

    loadDashboard();
    fetchLiveRefreshMs(REFRESH_MS).then((refreshMs) => {
      if (!aliveRef.current) return;
      intervalRef.current = setInterval(loadDashboard, refreshMs);
    });
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      aliveRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const stats = [
    {
      label: "Total Parolees",
      value: summary.totalParolees,
      tone: "bg-sky-500/15 border-sky-400/25 text-sky-100",
    },
    {
      label: "Active AMS Devices",
      value: summary.activeAMSDevices,
      tone: "bg-emerald-500/15 border-emerald-400/25 text-emerald-100",
    },
    {
      label: "Probation Officers",
      value: summary.probationOfficers,
      tone: "bg-amber-400/15 border-amber-300/25 text-amber-100",
    },
    {
      label: "Unresolved Alerts",
      value: summary.unresolvedAlerts,
      tone: "bg-rose-500/15 border-rose-400/25 text-rose-100",
    },
  ];

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
                  Admin Dashboard
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <div className="text-sm font-medium text-white">Admin</div>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-300/70">
                  Administrator
                </div>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/10 font-semibold text-white">
                A
              </div>
            </div>
          </div>
        </header>

        <div className="mx-auto grid max-w-7xl grid-cols-12 gap-6 px-4 py-6">
          <aside className="col-span-12 md:col-span-3 lg:col-span-2">
            <div className="sticky top-20 flex h-[calc(95vh-5rem)] flex-col overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.06] shadow-[0_10px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl">
              <nav className="flex-1 space-y-2 overflow-y-auto p-4">
                <SideLink active label="Dashboard" href="/admin/dashboard" />
                <SideLink label="Parolees" href="/admin/parolees" />
                <SideLink label="Officers" href="/admin/officers" />
                <SideLink label="Devices" href="/admin/devices" />
                <SideLink label="Alerts" href="/admin/alerts" />
                <SideLink label="Geofences" href="/admin/geofences" />
                <SideLink label="Settings" href="/admin/settings" />
              </nav>

              <div className="border-t border-white/10 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 font-semibold">
                    A
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-white">Admin</div>
                    <div className="truncate text-xs text-slate-300/70">Logged in</div>
                  </div>
                </div>

                <button
                  onClick={() => logoutAndRedirect("/login")}
                  className={`${btnDanger} mt-3 w-full`}
                >
                  Logout
                </button>
              </div>
            </div>
          </aside>

          <main className="col-span-12 h-[calc(95vh-5rem)] space-y-6 overflow-y-auto pb-0.5 md:col-span-9 lg:col-span-10">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-300">
                {loading
                  ? "Loading dashboard..."
                  : lastSync
                  ? `Last sync: ${formatPhilippinesTime(lastSync)}`
                  : "Waiting for data..."}
              </div>

              <button
                className={btnSecondary}
                onClick={() => window.location.reload()}
              >
                Refresh
              </button>
            </div>

            {alertNotice && (
              <div className="rounded-[24px] border border-rose-300/25 bg-rose-500/15 p-4 text-rose-50 shadow-[0_10px_30px_rgba(0,0,0,0.22)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold">{alertNotice.title}</div>
                    <div className="mt-1 text-sm text-rose-100/90">{alertNotice.body}</div>
                    <div className="mt-1 text-xs text-rose-100/70">{alertNotice.time}</div>
                  </div>
                  <button
                    className="rounded-lg border border-white/10 px-2 py-1 text-xs text-white hover:bg-white/10"
                    onClick={() => setAlertNotice(null)}
                  >
                    Dismiss
                  </button>
                </div>
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

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <section className="lg:col-span-2">
                <div className={sectionCard}>
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-white">Parolees Master List</h2>
                    <button
                      className={btnSecondary}
                      onClick={() => router.push("/admin/parolees")}
                    >
                      View All
                    </button>
                  </div>

                  <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10 bg-black/10">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-slate-950/60 text-slate-300 backdrop-blur">
                        <tr className="border-b border-white/10">
                          <th className="py-3 pl-4 text-left font-medium">ID</th>
                          <th className="py-3 text-left font-medium">Name</th>
                          <th className="py-3 text-left font-medium">Assigned Officer</th>
                          <th className="py-3 text-left font-medium">Device</th>
                          <th className="py-3 text-left font-medium">AMS</th>
                          <th className="py-3 text-left font-medium">Compliance</th>
                          <th className="py-3 text-left font-medium">Last Seen</th>
                          <th className="py-3 pr-4 text-right font-medium"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {parolees.map((p) => (
                          <tr key={p.id} className="hover:bg-white/[0.03]">
                            <td className="py-3 pl-4 text-slate-300">{p.paroleeNo}</td>
                            <td className="py-3 font-medium text-white">{p.name}</td>
                            <td className="py-3 text-slate-300">{p.officer}</td>
                            <td className="py-3 text-slate-300">{p.device}</td>
                            <td className="py-3">
                              <Badge tone={p.ams === "ACTIVE" ? "green" : "gray"}>
                                {p.ams}
                              </Badge>
                            </td>
                            <td className="py-3">
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
                            <td className="py-3 text-slate-300">{p.lastSeen}</td>
                            <td className="py-3 pr-4 text-right">
                              <button
                                className={btnSecondary}
                                onClick={() => router.push("/admin/parolees")}
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        ))}

                        {parolees.length === 0 && (
                          <tr>
                            <td className="py-10 text-center text-slate-400" colSpan={8}>
                              No parolees found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>

              <section>
                <div className={sectionCard}>
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-white">Officer Summary</h2>
                    <Link
                      href="/admin/officers"
                      className="text-sm font-medium text-sky-200 transition hover:text-white"
                    >
                      View All
                    </Link>
                  </div>

                  <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10 bg-black/10">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-950/60 text-slate-300">
                        <tr className="border-b border-white/10">
                          <th className="py-3 pl-4 text-left font-medium">Officer</th>
                          <th className="py-3 text-right font-medium">Assigned</th>
                          <th className="py-3 text-right font-medium">Active</th>
                          <th className="py-3 pr-4 text-right font-medium">Alerts</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {officers.map((o) => (
                          <tr key={o.id} className="hover:bg-white/[0.03]">
                            <td className="py-3 pl-4 font-medium text-white">{o.officer}</td>
                            <td className="py-3 text-right text-slate-300">{o.assigned}</td>
                            <td className="py-3 text-right text-slate-300">{o.active}</td>
                            <td className="py-3 pr-4 text-right">
                              <span className="inline-flex items-center rounded-full border border-rose-300/20 bg-rose-400/15 px-2.5 py-1 text-xs font-semibold text-rose-100">
                                {o.alerts}
                              </span>
                            </td>
                          </tr>
                        ))}

                        {officers.length === 0 && (
                          <tr>
                            <td className="py-10 text-center text-slate-400" colSpan={4}>
                              No officers found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <section className="lg:col-span-2">
                <div className={sectionCard}>
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold text-white">Open Alerts</h2>
                    <span className="rounded-full border border-rose-400/20 bg-rose-500/15 px-3 py-1 text-xs text-rose-100">
                      Live Monitoring
                    </span>
                  </div>

                  <div className="mt-4 max-h-[320px] overflow-y-auto rounded-2xl border border-white/10 bg-black/10">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-slate-950/60 text-slate-300 backdrop-blur">
                        <tr>
                          <th className="px-3 py-3 text-left font-medium">Parolee</th>
                          <th className="px-3 py-3 text-left font-medium">Type</th>
                          <th className="px-3 py-3 text-left font-medium">Details</th>
                          <th className="px-3 py-3 text-left font-medium">Time</th>
                          <th className="px-3 py-3"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {alerts.map((a) => (
                          <tr key={a.id} className="hover:bg-white/[0.03]">
                            <td className="px-3 py-3 font-medium text-white">{a.parolee}</td>
                            <td className="px-3 py-3 text-slate-300">{a.type}</td>
                            <td className="px-3 py-3 text-slate-300">{a.details}</td>
                            <td className="px-3 py-3 text-slate-400">{a.time}</td>
                            <td className="px-3 py-3 text-right">
                              <button
                                className={btnSecondary}
                                onClick={() => router.push("/admin/alerts")}
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        ))}

                        {alerts.length === 0 && (
                          <tr>
                            <td className="py-10 text-center text-slate-400" colSpan={5}>
                              No open alerts.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>

              <section>
                <div className={sectionCard}>
                  <div className="flex items-center justify-between">
                    <Link
                      href="/admin/geofences"
                      className="text-lg font-semibold text-white transition hover:text-sky-200"
                    >
                      Live Map
                    </Link>
                    <div className="text-xs text-slate-400">
                      {lastSync
                        ? `Updated: ${formatPhilippinesTime(lastSync)}`
                        : "Waiting for data…"}
                    </div>
                  </div>

                  {mapError && (
                    <div className="mt-3 rounded-xl border border-amber-300/20 bg-amber-400/10 p-3 text-sm text-amber-100">
                      {mapError}
                    </div>
                  )}

                  <div className="mt-4 h-[320px] overflow-hidden rounded-2xl border border-white/10">
                    <MapContainer
                      center={defaultCenter}
                      zoom={12}
                      scrollWheelZoom={true}
                      style={{ height: "100%", width: "100%" }}
                    >
                      <TileLayer
                        attribution="&copy; OpenStreetMap contributors"
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />

                      {markers.map((m) => (
                        <CircleMarker
                          key={m.paroleeId}
                          center={[m.lat, m.lng]}
                          radius={8}
                          pathOptions={{
                            color: m.status === "ALERT" ? "#f43f5e" : "#10b981",
                            fillColor: m.status === "ALERT" ? "#f43f5e" : "#10b981",
                            fillOpacity: 0.9,
                          }}
                        >
                          <Popup>
                            <div className="text-sm">
                              <div className="font-semibold">{m.name || m.paroleeId}</div>
                              <div>Last seen: {m.lastSeen || "—"}</div>
                              <div>Status: {m.status || "—"}</div>
                            </div>
                          </Popup>
                        </CircleMarker>
                      ))}
                    </MapContainer>
                  </div>
                </div>
              </section>
            </div>
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
