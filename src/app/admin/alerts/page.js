"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const REFRESH_MS = 20000;

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

export default function AdminAlertsPage() {
  const router = useRouter();

  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");

  const [liveFeed, setLiveFeed] = useState(true);
  const [loading, setLoading] = useState(false);
  const [acknowledging, setAcknowledging] = useState(false);

  const [openView, setOpenView] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [selectedAlertDetail, setSelectedAlertDetail] = useState(null);

  const aliveRef = useRef(true);
  const fetchInFlightRef = useRef(false);
  const offlineCheckCounterRef = useRef(0);

  useEffect(() => {
    aliveRef.current = true;
    fetchAlerts(true);

    return () => {
      aliveRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!liveFeed) return;

    const interval = setInterval(() => {
      if (!document.hidden) {
        fetchAlerts(false);
      }
    }, REFRESH_MS);

    return () => clearInterval(interval);
  }, [liveFeed]);

  async function runOfflineCheck() {
    try {
      await fetch("/api/alerts/offline-check", {
        method: "POST",
        cache: "no-store",
      });
    } catch (error) {
      console.error("offline-check failed:", error);
    }
  }

  async function fetchAlerts(showLoader = true) {
    if (fetchInFlightRef.current) return;

    try {
      fetchInFlightRef.current = true;
      if (showLoader) setLoading(true);

      offlineCheckCounterRef.current += 1;

      if (showLoader || offlineCheckCounterRef.current % 3 === 0) {
        await runOfflineCheck();
      }

      const res = await fetch("/api/alerts", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (showLoader) {
          alert(data.error || "Failed to fetch alerts");
        }
        return;
      }

      if (!aliveRef.current) return;

      setRows(normalizeList(data));

      if (selectedAlert?.id) {
        const updated = normalizeList(data).find((item) => item.id === selectedAlert.id);
        if (updated) {
          setSelectedAlert(updated);
        }
      }
    } catch (error) {
      console.error(error);
      if (showLoader) {
        alert("Failed to fetch alerts");
      }
    } finally {
      fetchInFlightRef.current = false;
      if (showLoader && aliveRef.current) {
        setLoading(false);
      }
    }
  }

  async function fetchAlertDetail(alertId, showAlertOnError = true) {
    try {
      const res = await fetch(`/api/alerts/${alertId}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (showAlertOnError) {
          alert(data.error || "Failed to fetch alert detail");
        }
        return;
      }

      if (!aliveRef.current) return;
      setSelectedAlertDetail(data);
    } catch (error) {
      console.error(error);
      if (showAlertOnError) {
        alert("Failed to fetch alert detail");
      }
    }
  }

  async function handleView(alertRow) {
    setSelectedAlert(alertRow);
    setSelectedAlertDetail(null);
    setOpenView(true);
    await fetchAlertDetail(alertRow.id);
  }

  async function handleAcknowledge(alertId) {
    try {
      setAcknowledging(true);

      const res = await fetch(`/api/alerts/${alertId}/acknowledge`, {
        method: "POST",
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data.error || "Failed to acknowledge alert");
        return;
      }

      if (selectedAlert?.id === alertId) {
        await fetchAlertDetail(alertId, false);
      }

      await fetchAlerts(false);
      alert("Alert acknowledged");
    } catch (error) {
      console.error(error);
      alert("Failed to acknowledge alert");
    } finally {
      setAcknowledging(false);
    }
  }

  async function handleBulkAcknowledge() {
    const openIds = filtered.filter((r) => r.status === "OPEN").map((r) => r.id);

    if (openIds.length === 0) {
      alert("No open alerts to acknowledge");
      return;
    }

    try {
      setAcknowledging(true);

      const res = await fetch("/api/alerts/bulk-acknowledge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids: openIds }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data.error || "Failed to acknowledge alerts");
        return;
      }

      await fetchAlerts(false);
      alert("Visible open alerts acknowledged");
    } catch (error) {
      console.error(error);
      alert("Failed to acknowledge alerts");
    } finally {
      setAcknowledging(false);
    }
  }

  function handleExport() {
    const headers = [
      "Alert ID",
      "Parolee",
      "Type",
      "Severity",
      "Location",
      "Time",
      "Status",
      "Details",
    ];

    const lines = filtered.map((r) =>
      [
        r.id,
        r.paroleeLabel,
        r.type,
        r.severity,
        r.location,
        r.time,
        r.status,
        r.details || "",
      ]
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
        .join(",")
    );

    const csv = [headers.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "alerts_export.csv";
    a.click();

    URL.revokeObjectURL(url);
  }

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const s = search.trim().toLowerCase();

      const matchSearch =
        !s ||
        String(r.id || "").toLowerCase().includes(s) ||
        String(r.paroleeNo || "").toLowerCase().includes(s) ||
        String(r.paroleeLabel || "").toLowerCase().includes(s);

      const matchType = filterType === "ALL" ? true : r.type === filterType;
      const matchStatus = filterStatus === "ALL" ? true : r.status === filterStatus;

      return matchSearch && matchType && matchStatus;
    });
  }, [rows, search, filterType, filterStatus]);

  const totalAlerts = rows.length;
  const openAlerts = rows.filter((r) => r.status === "OPEN").length;
  const criticalAlerts = rows.filter((r) => r.severity === "CRITICAL").length;
  const acknowledgedAlerts = rows.filter((r) => r.status === "ACKNOWLEDGED").length;
  const resolvedAlerts = rows.filter((r) => r.status === "RESOLVED").length;

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
                  Admin • Alerts
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link href="/admin/dashboard" className={btnGhost}>
                ← Dashboard
              </Link>
              <button
                className={liveFeed ? btnPrimary : btnGhost}
                onClick={() => setLiveFeed((prev) => !prev)}
              >
                {liveFeed ? "Live Feed: ON" : "Live Feed: OFF"}
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
                <SideLink active label="Alerts" href="/admin/alerts" />
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
                  className={`${btnDanger} mt-3 w-full`}
                  onClick={() => router.push("/login")}
                >
                  Logout
                </button>
              </div>
            </div>
          </aside>

          <main className="col-span-12 h-[calc(95vh-5rem)] space-y-6 overflow-y-auto pb-0.5 md:col-span-9 lg:col-span-10">
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <MiniCard
                title="Total Alerts"
                value={String(totalAlerts)}
                tone="bg-sky-500/15 border-sky-400/25 text-sky-100"
              />
              <MiniCard
                title="Open"
                value={String(openAlerts)}
                tone="bg-rose-500/15 border-rose-400/25 text-rose-100"
              />
              <MiniCard
                title="Critical"
                value={String(criticalAlerts)}
                tone="bg-amber-400/15 border-amber-300/25 text-amber-100"
              />
              <MiniCard
                title="Acknowledged"
                value={String(acknowledgedAlerts)}
                tone="bg-slate-500/15 border-white/10 text-slate-200"
              />
              <MiniCard
                title="Resolved"
                value={String(resolvedAlerts)}
                tone="bg-emerald-500/15 border-emerald-400/25 text-emerald-100"
              />
            </section>

            <section className={sectionCard}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">Alerts</h2>
                  <p className="text-sm text-slate-300/75">
                    Monitor and respond to system alerts in real-time.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button className={btnGhost} onClick={() => fetchAlerts(true)}>
                    Refresh
                  </button>
                  <button className={btnGhost} onClick={handleExport}>
                    Export
                  </button>
                  <button
                    className={btnSecondary}
                    onClick={handleBulkAcknowledge}
                    disabled={acknowledging}
                  >
                    {acknowledging ? "Working..." : "Bulk Acknowledge"}
                  </button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-12">
                <div className="md:col-span-4">
                  <label className="text-xs text-slate-400">Search</label>
                  <input
                    className={inputClass}
                    placeholder="Alert ID or Parolee..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                <div className="md:col-span-4">
                  <label className="text-xs text-slate-400">Type</label>
                  <select
                    className={selectClass}
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                  >
                    <option value="ALL" className="bg-slate-900 text-white">
                      All
                    </option>
                    <option value="GEOFENCE" className="bg-slate-900 text-white">
                      Geofence
                    </option>
                    <option value="TAMPER" className="bg-slate-900 text-white">
                      Tamper
                    </option>
                    <option value="LOW_BATTERY" className="bg-slate-900 text-white">
                      Low Battery
                    </option>
                    <option value="OFFLINE" className="bg-slate-900 text-white">
                      Offline
                    </option>
                  </select>
                </div>

                <div className="md:col-span-3">
                  <label className="text-xs text-slate-400">Status</label>
                  <select
                    className={selectClass}
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <option value="ALL" className="bg-slate-900 text-white">
                      All
                    </option>
                    <option value="OPEN" className="bg-slate-900 text-white">
                      Open
                    </option>
                    <option value="ACKNOWLEDGED" className="bg-slate-900 text-white">
                      Acknowledged
                    </option>
                    <option value="RESOLVED" className="bg-slate-900 text-white">
                      Resolved
                    </option>
                  </select>
                </div>

                <div className="md:col-span-1 flex items-end">
                  <button
                    onClick={() => {
                      setSearch("");
                      setFilterType("ALL");
                      setFilterStatus("ALL");
                    }}
                    className={`${btnGhost} h-10 w-full px-3`}
                  >
                    Reset
                  </button>
                </div>
              </div>

              <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10 bg-black/10">
                <table className="w-full text-sm">
                  <thead className="bg-slate-950/60 text-slate-300 backdrop-blur">
                    <tr className="border-b border-white/10">
                      <th className="py-3 px-3 text-left font-medium">Alert ID</th>
                      <th className="py-3 px-3 text-left font-medium">Parolee</th>
                      <th className="py-3 px-3 text-left font-medium">Type</th>
                      <th className="py-3 px-3 text-left font-medium">Severity</th>
                      <th className="py-3 px-3 text-left font-medium">Location</th>
                      <th className="py-3 px-3 text-left font-medium">Time</th>
                      <th className="py-3 px-3 text-left font-medium">Status</th>
                      <th className="py-3 px-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-white/10">
                    {filtered.map((r) => (
                      <tr key={r.id} className="hover:bg-white/[0.03]">
                        <td className="py-3 px-3 font-semibold text-white">{r.id}</td>
                        <td className="py-3 px-3 text-slate-200">{r.paroleeLabel}</td>
                        <td className="py-3 px-3 text-slate-300">{r.type}</td>
                        <td className="py-3 px-3">
                          <Badge
                            tone={
                              r.severity === "CRITICAL"
                                ? "red"
                                : r.severity === "HIGH"
                                ? "amber"
                                : "gray"
                            }
                          >
                            {r.severity}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-slate-300">{r.location}</td>
                        <td className="py-3 px-3 text-slate-400">{r.time}</td>
                        <td className="py-3 px-3">
                          <Badge
                            tone={
                              r.status === "OPEN"
                                ? "red"
                                : r.status === "RESOLVED"
                                ? "green"
                                : "gray"
                            }
                          >
                            {r.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex justify-end gap-2">
                            <button
                              className={btnSecondary}
                              onClick={() => handleView(r)}
                            >
                              View
                            </button>
                            <button
                              className={btnGhost}
                              disabled={r.status !== "OPEN" || acknowledging}
                              onClick={() => handleAcknowledge(r.id)}
                            >
                              {r.status === "OPEN"
                                ? "Acknowledge"
                                : r.status === "ACKNOWLEDGED"
                                ? "Acknowledged"
                                : "Resolved"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-10 text-center text-slate-400">
                          {loading ? "Loading..." : "No alerts found."}
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

      {openView && (
        <Modal title="Alert Details" onClose={() => setOpenView(false)}>
          {!selectedAlertDetail ? (
            <div className="text-slate-300">Loading...</div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Info label="Alert ID" value={selectedAlertDetail.id} />
                <Info label="Parolee" value={selectedAlertDetail.paroleeLabel} />
                <Info label="Type" value={selectedAlertDetail.type} />
                <Info label="Severity" value={selectedAlertDetail.severity} />
                <Info label="Status" value={selectedAlertDetail.status} />
                <Info label="Time" value={selectedAlertDetail.time} />
                <Info label="Location" value={selectedAlertDetail.location} />
                <Info label="Officer" value={selectedAlertDetail.officerLabel || "—"} />
              </div>

              <div>
                <div className="text-xs text-slate-400">Details</div>
                <div className="mt-1 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-3 text-sm text-white">
                  {selectedAlertDetail.details || "—"}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button onClick={() => setOpenView(false)} className={btnGhost}>
                  Close
                </button>
                <button
                  className={btnPrimary}
                  disabled={selectedAlertDetail.status !== "OPEN" || acknowledging}
                  onClick={() => handleAcknowledge(selectedAlertDetail.id)}
                >
                  {selectedAlertDetail.status === "OPEN"
                    ? "Acknowledge"
                    : selectedAlertDetail.status === "ACKNOWLEDGED"
                    ? "Already Acknowledged"
                    : "Resolved"}
                </button>
              </div>
            </div>
          )}
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
    tone === "red"
      ? "border-rose-300/20 bg-rose-400/15 text-rose-100"
      : tone === "amber"
      ? "border-amber-300/20 bg-amber-400/15 text-amber-100"
      : tone === "green"
      ? "border-emerald-300/20 bg-emerald-400/15 text-emerald-100"
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