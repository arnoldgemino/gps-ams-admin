"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { formatPhilippinesDateTime } from "@/lib/time";

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

const btnSecondary =
  "inline-flex items-center justify-center rounded-xl border border-sky-400/30 bg-sky-500/15 px-4 py-2 text-sm font-medium text-sky-100 transition hover:bg-sky-500/25 active:scale-[0.99] disabled:opacity-60";

const btnGhost =
  "inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-medium text-white transition hover:bg-white/[0.10] active:scale-[0.99] disabled:opacity-60";

const btnDanger =
  "inline-flex items-center justify-center rounded-xl border border-rose-400/30 bg-rose-500/15 px-4 py-2 text-sm font-medium text-rose-100 transition hover:bg-rose-500/25 active:scale-[0.99] disabled:opacity-60";

export default function OfficerMapPage() {
  const router = useRouter();
  const center = useMemo(() => ({ lat: 7.9064, lng: 125.0942 }), []);

  const [officerId, setOfficerId] = useState("");
  const [officerName, setOfficerName] = useState("Officer");
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mapKey, setMapKey] = useState(0);

  const loadLivePoints = useCallback(
    async (idOverride) => {
      if (!idOverride) return;

      try {
        setLoading(true);
        setError("");

        const res = await fetch(`/api/officers/${idOverride}`, {
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(data.error || "Unable to load assigned parolees");
        }

        const pointItems = (data.assignedParolees || [])
          .map((p) => {
            const lat = Number(p.lat);
            const lng = Number(p.lng);

            return {
              id: p.id,
              label: p.paroleeNo
                ? `${p.paroleeNo} - ${p.fullName || "Unknown"}`
                : p.fullName || p.id,
              deviceId: p.deviceId || "-",
              lat,
              lng,
              hasLocation: Number.isFinite(lat) && Number.isFinite(lng),
              status: p.status || "OFFLINE",
              battery: p.batteryLevel ?? "-",
              signal: p.signal ?? "-",
              tamper: p.tamper || "OK",
              lastSeen: formatPhilippinesDateTime(p.lastSeen),
            };
          })
          .filter((p) => p.hasLocation);

        setPoints(pointItems);
      } catch (err) {
        console.error(err);
        setPoints([]);
        setError(err.message || "Unable to load map data");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    const id = typeof window !== "undefined" ? localStorage.getItem("officerId") : null;
    const name = typeof window !== "undefined" ? localStorage.getItem("officerName") : null;

    if (!id) {
      router.push("/officer/login");
      return;
    }

    setOfficerId(id);
    setOfficerName(name || "Officer");
    loadLivePoints(id);
  }, [loadLivePoints, router]);

  function handleLogout() {
    localStorage.removeItem("role");
    localStorage.removeItem("officerId");
    localStorage.removeItem("officerName");
    localStorage.removeItem("officerEmail");
    localStorage.removeItem("officerBadgeId");
    router.push("/officer/login");
  }

  async function handleRefresh() {
    await loadLivePoints(officerId);
  }

  function handleCenterMap() {
    setMapKey((value) => value + 1);
  }

  const onlineCount = points.filter((p) => p.status === "COMPLIANT").length;
  const offlineCount = points.filter((p) => p.status === "OFFLINE").length;
  const alertCount = points.filter(
    (p) => p.status !== "COMPLIANT" && p.status !== "OFFLINE"
  ).length;

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
                  Officer - Map
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link href="/officer/dashboard" className={btnGhost}>
                Dashboard
              </Link>
              <button onClick={handleLogout} className={btnDanger}>
                Logout
              </button>
            </div>
          </div>
        </header>

        <div className="mx-auto grid max-w-7xl grid-cols-12 gap-6 px-4 py-6">
          <aside className="col-span-12 md:col-span-3 lg:col-span-2">
            <div className="sticky top-20 flex h-[calc(95vh-5rem)] flex-col overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.06] shadow-[0_10px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl">
              <nav className="flex-1 space-y-2 overflow-y-auto p-4">
                <SideLink label="Dashboard" href="/officer/dashboard" />
                <SideLink label="My Parolees" href="/officer/parolees" />
                <SideLink active label="Map" href="/officer/map" />
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
                      Live monitoring
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

            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MiniCard
                title="Mapped Parolees"
                value={String(points.length)}
                tone="bg-sky-500/15 border-sky-400/25 text-sky-100"
              />
              <MiniCard
                title="Compliant"
                value={String(onlineCount)}
                tone="bg-emerald-500/15 border-emerald-400/25 text-emerald-100"
              />
              <MiniCard
                title="Needs Review"
                value={String(alertCount)}
                tone="bg-amber-400/15 border-amber-300/25 text-amber-100"
              />
              <MiniCard
                title="Offline"
                value={String(offlineCount)}
                tone="bg-slate-500/15 border-white/10 text-slate-200"
              />
            </section>

            <section className={sectionCard}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-lg font-semibold text-white">Map View</h1>
                  <p className="text-sm text-slate-300/75">
                    Last known locations of your assigned parolees.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    className={btnGhost}
                    onClick={handleRefresh}
                    disabled={loading}
                  >
                    {loading ? "Refreshing..." : "Refresh"}
                  </button>
                  <button className={btnSecondary} onClick={handleCenterMap}>
                    Center Map
                  </button>
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black/10">
                <div className="h-[64vh] min-h-[420px]">
                  <MapContainer
                    key={mapKey}
                    center={[center.lat, center.lng]}
                    zoom={13}
                    style={{ height: "100%", width: "100%" }}
                  >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                    {points.map((p) => (
                      <Marker key={p.id} position={[p.lat, p.lng]}>
                        <Popup>
                          <div className="text-sm">
                            <div className="font-semibold">{p.label}</div>
                            <div>Device: {p.deviceId}</div>
                            <div>Status: {p.status}</div>
                            <div>Battery: {p.battery}</div>
                            <div>Signal: {p.signal}</div>
                            <div>Tamper: {p.tamper}</div>
                            <div className="mt-1 text-xs text-slate-500">
                              Last Seen: {p.lastSeen}
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                </div>
              </div>

              {!loading && points.length === 0 && (
                <div className="mt-3 rounded-2xl border border-white/10 bg-black/10 p-4 text-sm text-slate-400">
                  No assigned parolees with location data yet.
                </div>
              )}
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

function MiniCard({ title, value, tone }) {
  return (
    <div
      className={`rounded-[24px] border p-4 shadow-[0_10px_30px_rgba(0,0,0,0.22)] backdrop-blur-xl ${tone}`}
    >
      <div className="text-sm opacity-90">{title}</div>
      <div className="mt-2 text-3xl font-bold tracking-tight text-white">
        {value}
      </div>
    </div>
  );
}
