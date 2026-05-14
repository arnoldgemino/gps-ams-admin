"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";

// Leaflet (client-side only)
const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((m) => m.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then((m) => m.Popup), { ssr: false });

export default function OfficerMapPage() {
  const [officerName, setOfficerName] = useState("Officer");

  useEffect(() => {
    const name = localStorage.getItem("officerName");
    if (name) setOfficerName(name);
  }, []);

  function handleLogout() {
    localStorage.removeItem("role");
    localStorage.removeItem("officerId");
    localStorage.removeItem("officerName");
    localStorage.removeItem("officerEmail");
    localStorage.removeItem("officerBadgeId");
    window.location.href = "/officer/login";
  }

  // Valencia City, Bukidnon center
  const center = useMemo(() => ({ lat: 7.9064, lng: 125.0942 }), []);

  // Placeholder assigned parolees live points
  const points = useMemo(
    () => [
      {
        id: "PAR-101",
        deviceId: "DEV-001",
        lat: 7.9064,
        lng: 125.0942,
        status: "COMPLIANT",
        battery: "—",
        signal: "—",
        tamper: "—",
        lastSeen: "—",
      },
      {
        id: "PAR-102",
        deviceId: "DEV-002",
        lat: 7.9001,
        lng: 125.102,
        status: "WARNING",
        battery: "—",
        signal: "—",
        tamper: "—",
        lastSeen: "—",
      },
    ],
    []
  );

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Top Bar */}
      <header className="sticky top-0 z-20 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold">
              GPS
            </div>
            <div className="leading-tight">
              <div className="font-semibold">GPS-Based Ankle Monitoring System</div>
              <div className="text-xs text-slate-500">Officer • Map View</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/officer/dashboard"
              className="rounded-lg border bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
            >
              ← Dashboard
            </Link>
            <button
              onClick={handleLogout}
              className="rounded-lg border bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 grid grid-cols-12 gap-6">
        {/* Sidebar */}
         <aside className="col-span-12 md:col-span-3 lg:col-span-2">
       <div className="sticky top-20 h-[calc(95vh-5rem)] pb-0.5 rounded-2xl bg-slate-900 text-white shadow flex flex-col">
            <nav className="flex-1 overflow-y-auto p-4 space-y-2">
              <SideLink label="Dashboard" href="/officer/dashboard" />
              <SideLink label="My Parolees" href="/officer/parolees" />
              <SideLink label="Alerts" href="/officer/alerts" />
              <SideLink label="Profile" href="/officer/profile" />
              <SideLink active label="Map View" href="/officer/map" />
            </nav>

            <div className="border-t border-white/10 p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-white/15 flex items-center justify-center font-semibold">
                  {officerName.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{officerName}</div>
                  <div className="text-xs text-white/70 truncate">Live monitoring</div>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="mt-3 w-full rounded-lg bg-white/15 py-2 text-sm hover:bg-white/20"
              >
                Logout
              </button>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="col-span-12 md:col-span-9 lg:col-span-10 space-y-6 overflow-y-auto h-[calc(95vh-5rem)] pb-0.5">
          {/* Header */}
          <section className="rounded-2xl bg-white p-5 shadow-sm border">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-lg font-semibold">Full Map View</h1>
                <p className="text-sm text-slate-500">
                  Shows last known locations of your assigned parolees. (Real-time hookup later.)
                </p>
              </div>

              <div className="flex gap-2">
                <button className="rounded-lg border px-3 py-1.5 text-sm hover:bg-slate-50">
                  Refresh
                </button>
                <button className="rounded-lg border px-3 py-1.5 text-sm hover:bg-slate-50">
                  Center Map
                </button>
              </div>
            </div>
          </section>

          {/* Map */}
          <section className="rounded-2xl bg-white p-4 shadow-sm border">
            <div className="h-[70vh] rounded-xl overflow-hidden border">
              <MapContainer
                center={[center.lat, center.lng]}
                zoom={13}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                {points.map((p) => (
                  <Marker key={p.id} position={[p.lat, p.lng]}>
                    <Popup>
                      <div className="text-sm">
                        <div className="font-semibold">{p.id}</div>
                        <div>Device: {p.deviceId}</div>
                        <div>Status: {p.status}</div>
                        <div>Battery: {p.battery}</div>
                        <div>Signal: {p.signal}</div>
                        <div>Tamper: {p.tamper}</div>
                        <div className="text-xs text-slate-500 mt-1">Last Seen: {p.lastSeen}</div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>

            <div className="mt-3 text-xs text-slate-500">
              Tip: Later, this map will be updated from <code>/api/officer/live-locations</code> every few seconds.
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

/* ---------- helpers ---------- */

function SideLink({ href, label, active }) {
  return (
    <Link
      href={href}
      className={[
        "block rounded-xl px-3 py-2 text-sm transition",
        active ? "bg-white/15" : "hover:bg-white/10",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}
