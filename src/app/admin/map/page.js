"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatPhilippinesTime } from "@/lib/time";
import { DEFAULT_LIVE_REFRESH_MS, fetchLiveRefreshMs } from "@/lib/refresh";

// Load react-leaflet client-side only
const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), {
  ssr: false,
});
const Marker = dynamic(() => import("react-leaflet").then((m) => m.Marker), {
  ssr: false,
});
const Popup = dynamic(() => import("react-leaflet").then((m) => m.Popup), {
  ssr: false,
});

export default function AdminMapPage() {
  const [markers, setMarkers] = useState([]);
  const [error, setError] = useState("");
  const [lastSync, setLastSync] = useState(null);

  // Change this to your preferred default city center
const defaultCenter = useMemo(
  () => ({ lat: 7.9064, lng: 125.0942 }),
  []
);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setError("");
        const res = await fetch("/api/admin/live-locations", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to fetch map data");
        const data = await res.json();

        if (!alive) return;
        setMarkers(Array.isArray(data.items) ? data.items : []);
        setLastSync(new Date());
      } catch (e) {
        if (!alive) return;
        setError("Map data not available yet. Check /api/admin/live-locations");
      }
    }

    load();
    let t = null;
    fetchLiveRefreshMs(DEFAULT_LIVE_REFRESH_MS).then((refreshMs) => {
      if (!alive) return;
      t = setInterval(load, refreshMs);
    });

    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/dashboard"
              className="rounded-lg border bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
            >
              ← Back
            </Link>

            <div>
              <div className="font-semibold">Realtime Map</div>
              <div className="text-xs text-slate-500">
                {lastSync ? `Updated: ${formatPhilippinesTime(lastSync)}` : "Waiting for data…"}
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-500">
            Source: <span className="font-mono">/api/admin/live-locations</span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-4">
        {error && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            {error}
          </div>
        )}

        {/* Full Map */}
        <div className="h-[85vh] overflow-hidden rounded-2xl border bg-white shadow-sm">
          <MapContainer
            center={[defaultCenter.lat, defaultCenter.lng]}
            zoom={12}
            scrollWheelZoom={true}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {markers.map((m) => (
              <Marker key={m.paroleeId} position={[m.lat, m.lng]}>
                <Popup>
                  <div className="text-sm">
                    <div className="font-semibold">{m.name || m.paroleeId}</div>
                    <div className="text-slate-600">Parolee ID: {m.paroleeId}</div>
                    <div className="text-slate-600">Status: {m.status || "—"}</div>
                    <div className="text-slate-600">Last seen: {m.lastSeen || "—"}</div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
