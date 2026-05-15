"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";

const REFRESH_MS = 20000;

const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false }
);
const Circle = dynamic(
  () => import("react-leaflet").then((m) => m.Circle),
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

const btnPrimary =
  "inline-flex items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 active:scale-[0.99] disabled:opacity-60";

const btnSecondary =
  "inline-flex items-center justify-center rounded-xl border border-sky-400/30 bg-sky-500/15 px-4 py-2 text-sm font-medium text-sky-100 transition hover:bg-sky-500/25 active:scale-[0.99] disabled:opacity-60";

const btnGhost =
  "inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-medium text-white transition hover:bg-white/[0.10] active:scale-[0.99] disabled:opacity-60";

const btnDanger =
  "inline-flex items-center justify-center rounded-xl border border-rose-400/30 bg-rose-500/15 px-4 py-2 text-sm font-medium text-rose-100 transition hover:bg-rose-500/25 active:scale-[0.99] disabled:opacity-60";

const inputClass =
  "mt-1 h-10 w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 text-sm text-white outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-sky-300/30";

const selectClass =
  "mt-1 h-10 w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 text-sm text-white outline-none focus:ring-2 focus:ring-sky-300/30";

function normalizeList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

export default function AdminGeofencesPage() {
  const router = useRouter();

  const [rows, setRows] = useState([]);
  const [parolees, setParolees] = useState([]);
  const [liveLocations, setLiveLocations] = useState([]);
  const [lastLiveSync, setLastLiveSync] = useState(null);

  const [openCreate, setOpenCreate] = useState(false);
  const [openView, setOpenView] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);

  const [saving, setSaving] = useState(false);
  const [loadingParolees, setLoadingParolees] = useState(false);
  const [selected, setSelected] = useState(null);
  const [selectedDetail, setSelectedDetail] = useState(null);

  const [mapCenter, setMapCenter] = useState([7.9064, 125.0942]);
  const [mapZoom, setMapZoom] = useState(13);
  const [mapKey, setMapKey] = useState(1);

  const [searchingCreateLocation, setSearchingCreateLocation] = useState(false);
  const [searchingEditLocation, setSearchingEditLocation] = useState(false);
  const [createLocationQuery, setCreateLocationQuery] = useState("");
  const [editLocationQuery, setEditLocationQuery] = useState("");

  const [form, setForm] = useState({
    name: "",
    paroleeId: "",
    type: "INCLUSION",
    radiusMeters: "300",
    centerLat: "7.9064",
    centerLng: "125.0942",
  });

  const [editForm, setEditForm] = useState({
    name: "",
    paroleeId: "",
    type: "INCLUSION",
    radiusMeters: "300",
    centerLat: "7.9064",
    centerLng: "125.0942",
    status: "ACTIVE",
  });

  useEffect(() => {
    fetchGeofences();
    fetchLiveLocations();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!document.hidden) {
        fetchLiveLocations(false);
      }
    }, REFRESH_MS);

    return () => clearInterval(interval);
  }, []);

  async function fetchGeofences() {
    try {
      const res = await fetch("/api/geofences", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data.error || "Failed to fetch geofences");
        return;
      }

      setRows(normalizeList(data));
    } catch (error) {
      console.error(error);
      alert("Failed to fetch geofences");
    }
  }

  async function fetchParolees(showAlert = false) {
    try {
      setLoadingParolees(true);

      const res = await fetch("/api/parolees", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (showAlert) {
          alert(data.error || "Failed to fetch parolees");
        }
        return;
      }

      setParolees(normalizeList(data));
    } catch (error) {
      console.error(error);
      if (showAlert) {
        alert("Failed to fetch parolees");
      }
    } finally {
      setLoadingParolees(false);
    }
  }

  async function ensureParoleesLoaded(showAlert = true) {
    if (parolees.length > 0) return;
    await fetchParolees(showAlert);
  }

  async function fetchLiveLocations(showAlert = false) {
    try {
      const res = await fetch("/api/admin/live-locations", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (showAlert) {
          alert(data.error || "Failed to fetch live locations");
        }
        return;
      }

      setLiveLocations(Array.isArray(data.items) ? data.items : []);
      setLastLiveSync(new Date());
    } catch (error) {
      console.error(error);
      if (showAlert) {
        alert("Failed to fetch live locations");
      }
    }
  }

  async function fetchGeofenceDetail(id) {
    try {
      const res = await fetch(`/api/geofences/${id}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data.error || "Failed to fetch geofence detail");
        return null;
      }

      setSelectedDetail(data);
      return data;
    } catch (error) {
      console.error(error);
      alert("Failed to fetch geofence detail");
      return null;
    }
  }

  function updateMapPosition(lat, lng, zoom = 16) {
    setMapCenter([lat, lng]);
    setMapZoom(zoom);
    setMapKey((v) => v + 1);
  }

  function applyCoordinates(mode, lat, lng) {
    const safeLat = Number(lat).toFixed(6);
    const safeLng = Number(lng).toFixed(6);

    if (mode === "create") {
      setForm((prev) => ({
        ...prev,
        centerLat: safeLat,
        centerLng: safeLng,
      }));
    } else {
      setEditForm((prev) => ({
        ...prev,
        centerLat: safeLat,
        centerLng: safeLng,
      }));
    }

    updateMapPosition(Number(lat), Number(lng));
  }

  async function searchLocation(query, mode) {
    const trimmed = query.trim();

    if (!trimmed) {
      alert("Please enter a location to search");
      return;
    }

    try {
      if (mode === "create") {
        setSearchingCreateLocation(true);
      } else {
        setSearchingEditLocation(true);
      }

      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(
          trimmed
        )}`
      );

      const data = await res.json().catch(() => []);

      if (!res.ok || !Array.isArray(data) || data.length === 0) {
        alert("Location not found");
        return;
      }

      const first = data[0];
      applyCoordinates(mode, Number(first.lat), Number(first.lon));
    } catch (error) {
      console.error(error);
      alert("Failed to search location");
    } finally {
      if (mode === "create") {
        setSearchingCreateLocation(false);
      } else {
        setSearchingEditLocation(false);
      }
    }
  }

  function useLiveLocation(mode) {
    const paroleeId = mode === "create" ? form.paroleeId : editForm.paroleeId;

    if (!paroleeId) {
      alert("Please select a parolee first");
      return;
    }

    const live = liveLocations.find((item) => item.paroleeId === paroleeId);

    if (!live) {
      alert("No live location found for the selected parolee");
      return;
    }

    applyCoordinates(mode, Number(live.lat), Number(live.lng));
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleEditChange(e) {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleCreateGeofence() {
    try {
      setSaving(true);

      const res = await fetch("/api/geofences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          radiusMeters: Number(form.radiusMeters),
          centerLat: Number(form.centerLat),
          centerLng: Number(form.centerLng),
        }),
      });

      const result = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(result.error || "Failed to create geofence");
        return;
      }

      setForm({
        name: "",
        paroleeId: "",
        type: "INCLUSION",
        radiusMeters: "300",
        centerLat: "7.9064",
        centerLng: "125.0942",
      });
      setCreateLocationQuery("");

      setOpenCreate(false);
      await fetchGeofences();
      alert("Geofence created successfully");
    } catch (error) {
      console.error(error);
      alert("Failed to create geofence");
    } finally {
      setSaving(false);
    }
  }

  async function handleOpenView(geofence) {
    setSelected(geofence);
    setSelectedDetail(null);
    setOpenView(true);
    await fetchGeofenceDetail(geofence.id);
  }

  async function handleOpenEdit(geofence) {
    await ensureParoleesLoaded(true);

    setSelected(geofence);
    setEditForm({
      name: geofence.name || "",
      paroleeId: geofence.paroleeId || "",
      type: geofence.type || "INCLUSION",
      radiusMeters: String(geofence.radiusMeters || 300),
      centerLat: String(geofence.centerLat || 7.9064),
      centerLng: String(geofence.centerLng || 125.0942),
      status: geofence.status || "ACTIVE",
    });
    setEditLocationQuery(geofence.name || "");
    setOpenEdit(true);
  }

  async function handleUpdateGeofence() {
    if (!selected) return;

    try {
      setSaving(true);

      const res = await fetch(`/api/geofences/${selected.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...editForm,
          radiusMeters: Number(editForm.radiusMeters),
          centerLat: Number(editForm.centerLat),
          centerLng: Number(editForm.centerLng),
        }),
      });

      const result = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(result.error || "Failed to update geofence");
        return;
      }

      setOpenEdit(false);
      await fetchGeofences();
      alert("Geofence updated successfully");
    } catch (error) {
      console.error(error);
      alert("Failed to update geofence");
    } finally {
      setSaving(false);
    }
  }

  async function handleDisableGeofence(id) {
    try {
      setSaving(true);

      const res = await fetch(`/api/geofences/${id}/disable`, {
        method: "POST",
      });

      const result = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(result.error || "Failed to disable geofence");
        return;
      }

      await fetchGeofences();
      alert("Geofence disabled");
    } catch (error) {
      console.error(error);
      alert("Failed to disable geofence");
    } finally {
      setSaving(false);
    }
  }

  async function handleBulkDisable() {
    const activeIds = rows.filter((g) => g.status === "ACTIVE").map((g) => g.id);

    if (!activeIds.length) {
      alert("No active geofences to disable");
      return;
    }

    try {
      setSaving(true);

      const res = await fetch("/api/geofences/bulk-disable", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids: activeIds }),
      });

      const result = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(result.error || "Failed to bulk disable geofences");
        return;
      }

      await fetchGeofences();
      alert("Active geofences disabled");
    } catch (error) {
      console.error(error);
      alert("Failed to bulk disable geofences");
    } finally {
      setSaving(false);
    }
  }

  function handleExport() {
    const headers = [
      "ID",
      "Name",
      "Type",
      "Radius",
      "Parolee",
      "Status",
      "CenterLat",
      "CenterLng",
    ];

    const lines = rows.map((g) =>
      [
        g.id,
        g.name,
        g.type,
        g.radiusMeters,
        g.paroleeLabel,
        g.status,
        g.centerLat,
        g.centerLng,
      ]
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
        .join(",")
    );

    const csv = [headers.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "geofences_export.csv";
    a.click();

    URL.revokeObjectURL(url);
  }

  function handleMapTools() {
    if (selected) {
      setMapCenter([selected.centerLat, selected.centerLng]);
      setMapZoom(15);
      setMapKey((v) => v + 1);
      return;
    }

    if (liveLocations.length > 0) {
      setMapCenter([liveLocations[0].lat, liveLocations[0].lng]);
      setMapZoom(15);
      setMapKey((v) => v + 1);
      return;
    }

    setMapCenter([7.9064, 125.0942]);
    setMapZoom(13);
    setMapKey((v) => v + 1);
  }

  const totalGeofences = rows.length;
  const activeGeofences = rows.filter((g) => g.status === "ACTIVE").length;
  const inclusionZones = rows.filter((g) => g.type === "INCLUSION").length;
  const exclusionZones = rows.filter((g) => g.type === "EXCLUSION").length;

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
                  Admin • Geofences
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link href="/admin/dashboard" className={btnGhost}>
                ← Dashboard
              </Link>
             <button
  onClick={async () => {
    await ensureParoleesLoaded(true);
    setOpenCreate(true);
  }}
  className={btnPrimary}
>
  + Create Geofence
</button>
            </div>
          </div>
        </header>

        <div className="mx-auto grid max-w-7xl grid-cols-12 gap-6 px-4 py-6">
          <aside className="col-span-12 md:col-span-3 lg:col-span-2">
            <div className="sticky top-20 flex h-[calc(95vh-5rem)] flex-col overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.06] shadow-[0_10px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl">
              <nav className="flex-1 space-y-2 overflow-y-auto p-4">
                <SideLink label="Dashboard" href="/admin/dashboard" />
                <SideLink label="Parolees" href="/admin/parolees" />
                <SideLink label="Officers" href="/admin/officers" />
                <SideLink label="Devices" href="/admin/devices" />
                <SideLink label="Alerts" href="/admin/alerts" />
                <SideLink active label="Geofences" href="/admin/geofences" />
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
                  onClick={() => router.push("/login")}
                  className={`${btnDanger} mt-3 w-full`}
                >
                  Logout
                </button>
              </div>
            </div>
          </aside>

          <main className="col-span-12 h-[calc(95vh-5rem)] space-y-6 overflow-y-auto pb-0.5 md:col-span-9 lg:col-span-10">
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MiniCard
                title="Total Geofences"
                value={String(totalGeofences)}
                tone="bg-sky-500/15 border-sky-400/25 text-sky-100"
              />
              <MiniCard
                title="Active"
                value={String(activeGeofences)}
                tone="bg-emerald-500/15 border-emerald-400/25 text-emerald-100"
              />
              <MiniCard
                title="Inclusion Zones"
                value={String(inclusionZones)}
                tone="bg-cyan-500/15 border-cyan-400/25 text-cyan-100"
              />
              <MiniCard
                title="Exclusion Zones"
                value={String(exclusionZones)}
                tone="bg-rose-500/15 border-rose-400/25 text-rose-100"
              />
            </section>

            <section className={sectionCard}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">Geofence Map</h2>
                  <p className="text-sm text-slate-300/75">
                    View allowed and restricted zones together with live parolee locations.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="hidden text-xs text-slate-400 sm:block">
                    {lastLiveSync
                      ? `Live sync: ${lastLiveSync.toLocaleTimeString()}`
                      : "Waiting for live data..."}
                  </div>
                  <button className={btnSecondary} onClick={handleMapTools}>
                    {selected ? "Center Selected" : "Center Live"}
                  </button>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-300">
                <div className="inline-flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-emerald-400" />
                  Inclusion Zone
                </div>
                <div className="inline-flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-rose-400" />
                  Exclusion Zone
                </div>
                <div className="inline-flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-sky-400" />
                  Live Location
                </div>
                <div className="inline-flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-amber-400" />
                  Live Alert
                </div>
              </div>

              <div className="relative z-0 mt-4 h-[60vh] overflow-hidden rounded-2xl border border-white/10">
                <MapContainer
                  key={mapKey}
                  center={mapCenter}
                  zoom={mapZoom}
                  style={{ height: "100%", width: "100%" }}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                  {rows.map((g) => (
                    <Circle
                      key={g.id}
                      center={[g.centerLat, g.centerLng]}
                      radius={g.radiusMeters}
                      pathOptions={{
                        color: g.type === "EXCLUSION" ? "#fb7185" : "#34d399",
                        fillOpacity: 0.22,
                      }}
                      eventHandlers={{
                        click: () => setSelected(g),
                      }}
                    >
                      <Popup>
                        <div className="text-sm">
                          <div className="font-semibold">{g.name}</div>
                          <div>{g.paroleeLabel}</div>
                          <div>{g.type}</div>
                          <div>{g.radiusMeters} meters</div>
                        </div>
                      </Popup>
                    </Circle>
                  ))}

                  {liveLocations.map((item) => (
                    <CircleMarker
                      key={item.paroleeId}
                      center={[item.lat, item.lng]}
                      radius={8}
                      pathOptions={{
                        color: item.status === "ALERT" ? "#f59e0b" : "#38bdf8",
                        fillColor: item.status === "ALERT" ? "#f59e0b" : "#38bdf8",
                        fillOpacity: 0.95,
                      }}
                    >
                      <Popup>
                        <div className="text-sm">
                          <div className="font-semibold">{item.name || item.paroleeId}</div>
                          <div>Lat: {item.lat}</div>
                          <div>Lng: {item.lng}</div>
                          <div>Last seen: {item.lastSeen || "—"}</div>
                          <div>Status: {item.status || "—"}</div>
                        </div>
                      </Popup>
                    </CircleMarker>
                  ))}
                </MapContainer>
              </div>
            </section>

            <section className={sectionCard}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">Geofences</h2>
                  <p className="text-sm text-slate-300/75">
                    Manage allowed and restricted zones for parolees.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button className={btnGhost} onClick={handleExport}>
                    Export
                  </button>
                  <button
                    className={btnSecondary}
                    onClick={handleBulkDisable}
                    disabled={saving}
                  >
                    {saving ? "Working..." : "Bulk Disable"}
                  </button>
                </div>
              </div>

              <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10 bg-black/10">
                <table className="w-full text-sm">
                  <thead className="bg-slate-950/60 text-slate-300 backdrop-blur">
                    <tr className="border-b border-white/10">
                      <th className="py-3 px-3 text-left font-medium">ID</th>
                      <th className="py-3 px-3 text-left font-medium">Name</th>
                      <th className="py-3 px-3 text-left font-medium">Type</th>
                      <th className="py-3 px-3 text-left font-medium">Radius (m)</th>
                      <th className="py-3 px-3 text-left font-medium">Parolee</th>
                      <th className="py-3 px-3 text-left font-medium">Status</th>
                      <th className="py-3 px-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-white/10">
                    {rows.map((g) => (
                      <tr
                        key={g.id}
                        className={`hover:bg-white/[0.03] ${
                          selected?.id === g.id ? "bg-white/[0.05]" : ""
                        }`}
                      >
                        <td className="py-3 px-3 font-semibold text-white">{g.id}</td>
                        <td className="py-3 px-3 text-slate-200">{g.name}</td>
                        <td className="py-3 px-3">
                          <Badge tone={g.type === "EXCLUSION" ? "red" : "green"}>
                            {g.type}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-slate-300">{g.radiusMeters}</td>
                        <td className="py-3 px-3 text-slate-300">{g.paroleeLabel}</td>
                        <td className="py-3 px-3">
                          <Badge tone="gray">{g.status}</Badge>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleOpenView(g)}
                              className={btnSecondary}
                            >
                              View
                            </button>
                            <button
                              onClick={() => handleOpenEdit(g)}
                              className={btnGhost}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDisableGeofence(g.id)}
                              className={btnGhost}
                              disabled={g.status !== "ACTIVE" || saving}
                            >
                              {g.status === "ACTIVE" ? "Disable" : "Disabled"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {rows.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-slate-400">
                          No geofences created yet.
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

      {openCreate && (
        <Modal title="Create Geofence" onClose={() => setOpenCreate(false)}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field
              label="Geofence Name"
              name="name"
              placeholder="Home Area"
              value={form.name}
              onChange={handleChange}
            />

            <div>
              <div className="text-xs text-slate-400">Parolee</div>
              <select
                name="paroleeId"
                value={form.paroleeId}
                onChange={handleChange}
                className={selectClass}
              >
                <option value="" className="bg-slate-900 text-white">
                  {loadingParolees ? "Loading parolees..." : "Select parolee"}
                </option>
                {parolees.map((p) => (
                  <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                    {p.paroleeNo} - {p.fullName}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2 rounded-2xl border border-sky-400/20 bg-sky-500/10 p-4">
              <div className="text-sm font-semibold text-white">Search Center Location</div>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_auto]">
                <input
                  value={createLocationQuery}
                  onChange={(e) => setCreateLocationQuery(e.target.value)}
                  className={inputClass}
                  placeholder="Search place or address"
                />
                <button
                  type="button"
                  onClick={() => searchLocation(createLocationQuery, "create")}
                  className={btnSecondary}
                  disabled={searchingCreateLocation}
                >
                  {searchingCreateLocation ? "Searching..." : "Search Place"}
                </button>
                <button
                  type="button"
                  onClick={() => useLiveLocation("create")}
                  className={btnGhost}
                >
                  Use Live Location
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-300/80">
                Search a place to auto-fill Center Latitude and Center Longitude.
              </p>
            </div>

            <div>
              <div className="text-xs text-slate-400">Type</div>
              <select
                name="type"
                value={form.type}
                onChange={handleChange}
                className={selectClass}
              >
                <option value="INCLUSION" className="bg-slate-900 text-white">
                  INCLUSION
                </option>
                <option value="EXCLUSION" className="bg-slate-900 text-white">
                  EXCLUSION
                </option>
              </select>
            </div>

            <Field
              label="Radius (meters)"
              name="radiusMeters"
              placeholder="300"
              value={form.radiusMeters}
              onChange={handleChange}
            />

            <Field
              label="Center Latitude"
              name="centerLat"
              placeholder="7.9064"
              value={form.centerLat}
              onChange={handleChange}
            />

            <Field
              label="Center Longitude"
              name="centerLng"
              placeholder="125.0942"
              value={form.centerLng}
              onChange={handleChange}
            />
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setOpenCreate(false)} className={btnGhost}>
              Cancel
            </button>
            <button onClick={handleCreateGeofence} className={btnPrimary} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </Modal>
      )}

      {openView && (
        <Modal title="Geofence Details" onClose={() => setOpenView(false)}>
          {!selectedDetail ? (
            <p className="text-slate-300">Loading...</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Info label="ID" value={selectedDetail.id} />
              <Info label="Name" value={selectedDetail.name} />
              <Info label="Parolee" value={selectedDetail.paroleeLabel} />
              <Info label="Type" value={selectedDetail.type} />
              <Info label="Radius" value={`${selectedDetail.radiusMeters} meters`} />
              <Info label="Status" value={selectedDetail.status} />
              <Info label="Latitude" value={selectedDetail.centerLat} />
              <Info label="Longitude" value={selectedDetail.centerLng} />
            </div>
          )}
        </Modal>
      )}

      {openEdit && (
        <Modal title="Edit Geofence" onClose={() => setOpenEdit(false)}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field
              label="Geofence Name"
              name="name"
              placeholder="Home Area"
              value={editForm.name}
              onChange={handleEditChange}
            />

            <div>
              <div className="text-xs text-slate-400">Parolee</div>
              <select
                name="paroleeId"
                value={editForm.paroleeId}
                onChange={handleEditChange}
                className={selectClass}
              >
                <option value="" className="bg-slate-900 text-white">
                  {loadingParolees ? "Loading parolees..." : "Select parolee"}
                </option>
                {parolees.map((p) => (
                  <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                    {p.paroleeNo} - {p.fullName}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2 rounded-2xl border border-sky-400/20 bg-sky-500/10 p-4">
              <div className="text-sm font-semibold text-white">Search Center Location</div>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_auto]">
                <input
                  value={editLocationQuery}
                  onChange={(e) => setEditLocationQuery(e.target.value)}
                  className={inputClass}
                  placeholder="Search place or address"
                />
                <button
                  type="button"
                  onClick={() => searchLocation(editLocationQuery, "edit")}
                  className={btnSecondary}
                  disabled={searchingEditLocation}
                >
                  {searchingEditLocation ? "Searching..." : "Search Place"}
                </button>
                <button
                  type="button"
                  onClick={() => useLiveLocation("edit")}
                  className={btnGhost}
                >
                  Use Live Location
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-300/80">
                Search a place to auto-fill Center Latitude and Center Longitude.
              </p>
            </div>

            <div>
              <div className="text-xs text-slate-400">Type</div>
              <select
                name="type"
                value={editForm.type}
                onChange={handleEditChange}
                className={selectClass}
              >
                <option value="INCLUSION" className="bg-slate-900 text-white">
                  INCLUSION
                </option>
                <option value="EXCLUSION" className="bg-slate-900 text-white">
                  EXCLUSION
                </option>
              </select>
            </div>

            <Field
              label="Radius (meters)"
              name="radiusMeters"
              placeholder="300"
              value={editForm.radiusMeters}
              onChange={handleEditChange}
            />

            <Field
              label="Center Latitude"
              name="centerLat"
              placeholder="7.9064"
              value={editForm.centerLat}
              onChange={handleEditChange}
            />

            <Field
              label="Center Longitude"
              name="centerLng"
              placeholder="125.0942"
              value={editForm.centerLng}
              onChange={handleEditChange}
            />

            <div>
              <div className="text-xs text-slate-400">Status</div>
              <select
                name="status"
                value={editForm.status}
                onChange={handleEditChange}
                className={selectClass}
              >
                <option value="ACTIVE" className="bg-slate-900 text-white">
                  ACTIVE
                </option>
                <option value="DISABLED" className="bg-slate-900 text-white">
                  DISABLED
                </option>
              </select>
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setOpenEdit(false)} className={btnGhost}>
              Cancel
            </button>
            <button onClick={handleUpdateGeofence} className={btnPrimary} disabled={saving}>
              {saving ? "Saving..." : "Update"}
            </button>
          </div>
        </Modal>
      )}
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

function Badge({ tone, children }) {
  const cls =
    tone === "green"
      ? "border-emerald-300/20 bg-emerald-400/15 text-emerald-100"
      : tone === "red"
      ? "border-rose-300/20 bg-rose-400/15 text-rose-100"
      : "border-white/10 bg-white/[0.06] text-slate-200";

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${cls}`}
    >
      {children}
    </span>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-[28px] border border-white/10 bg-slate-950/90 shadow-[0_10px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="text-base font-semibold text-white">{title}</div>
          <button onClick={onClose} className={btnGhost}>
            Close
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, name, placeholder, value, onChange }) {
  return (
    <div>
      <div className="text-xs text-slate-400">{label}</div>
      <input
        name={name}
        value={value}
        onChange={onChange}
        className={inputClass}
        placeholder={placeholder}
      />
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <div className="text-xs text-slate-400">{label}</div>
      <div className="mt-1 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white">
        {value}
      </div>
    </div>
  );
}