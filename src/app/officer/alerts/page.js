"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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

const selectClass =
  "mt-1 h-10 w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 text-sm text-white outline-none focus:ring-2 focus:ring-sky-300/30";

export default function OfficerAlertsPage() {
  const router = useRouter();
  const [officerId, setOfficerId] = useState("");
  const [officerName, setOfficerName] = useState("Officer");
  const [alerts, setAlerts] = useState([]);
  const [assignedParoleeIds, setAssignedParoleeIds] = useState([]);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterSeverity, setFilterSeverity] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const id = typeof window !== "undefined" ? localStorage.getItem("officerId") : null;
    const name = typeof window !== "undefined" ? localStorage.getItem("officerName") : null;

    if (!id) {
      router.push("/officer/login");
      return;
    }

    setOfficerId(id);
    setOfficerName(name || "Officer");

    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const officerRes = await fetch(`/api/officers/${id}`, { cache: "no-store" });
        const officerData = await officerRes.json();

        if (!officerRes.ok) {
          throw new Error(officerData.error || "Unable to load officer assignments");
        }

        const assignedIds = (officerData.assignedParolees || []).map((item) => item.id);
        setAssignedParoleeIds(assignedIds);

        const alertRes = await fetch("/api/alerts", { cache: "no-store" });
        const alertData = await alertRes.json();

        if (!alertRes.ok) {
          throw new Error(alertData.error || "Unable to load alerts");
        }

        const filteredAlerts = Array.isArray(alertData)
          ? alertData.filter((a) => assignedIds.includes(a.paroleeId))
          : [];

        setAlerts(filteredAlerts);
      } catch (err) {
        console.error(err);
        setError(err.message || "Unable to load alerts");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router]);

  const filtered = alerts.filter((a) => {
    const okStatus = filterStatus === "ALL" ? true : a.status === filterStatus;
    const okSeverity =
      filterSeverity === "ALL" ? true : a.severity === filterSeverity;
    return okStatus && okSeverity;
  });

  const totalAlerts = alerts.length;
  const activeAlerts = alerts.filter((a) => a.status === "ACTIVE").length;
  const criticalAlerts = alerts.filter((a) => a.severity === "CRITICAL").length;
  const acknowledgedAlerts = alerts.filter(
    (a) => a.status === "ACKNOWLEDGED"
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
                  Officer • Alerts
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link href="/officer/dashboard" className={btnGhost}>
                ← Dashboard
              </Link>
              <Link href="/officer/login" className={btnDanger}>
                Logout
              </Link>
            </div>
          </div>
        </header>

        <div className="mx-auto grid max-w-7xl grid-cols-12 gap-6 px-4 py-6">
          <aside className="col-span-12 md:col-span-3 lg:col-span-2">
            <div className="sticky top-20 flex h-[calc(95vh-5rem)] flex-col overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.06] shadow-[0_10px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl">
              <nav className="flex-1 space-y-2 overflow-y-auto p-4">
                <SideLink label="Dashboard" href="/officer/dashboard" />
                <SideLink label="My Parolees" href="/officer/parolees" />
                <SideLink active label="Alerts" href="/officer/alerts" />
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

                <Link href="/officer/login" className={`${btnDanger} mt-3 w-full`}>
                  Logout
                </Link>
              </div>
            </div>
          </aside>

          <main className="col-span-12 h-[calc(95vh-5rem)] space-y-6 overflow-y-auto pb-0.5 md:col-span-9 lg:col-span-10">
            {loading && (
              <div className="rounded-[28px] border border-white/10 bg-black/20 p-6 text-center text-sm text-slate-300">
                Loading alerts…
              </div>
            )}

            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MiniCard
                title="Total Alerts"
                value={String(totalAlerts)}
                tone="bg-sky-500/15 border-sky-400/25 text-sky-100"
              />
              <MiniCard
                title="Active"
                value={String(activeAlerts)}
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
                tone="bg-white/[0.08] border-white/10 text-slate-200"
              />
            </section>

            <section className={sectionCard}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-lg font-semibold text-white">Alerts</h1>
                  <p className="text-sm text-slate-300/75">
                    Alerts generated from assigned parolees only.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button className={btnGhost}>Export</button>
                  <button className={btnSecondary}>Refresh</button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-12">
                <div className="md:col-span-5">
                  <label className="text-xs text-slate-400">Status</label>
                  <select
                    className={selectClass}
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <option value="ALL" className="bg-slate-900 text-white">
                      All
                    </option>
                    <option value="ACTIVE" className="bg-slate-900 text-white">
                      Active
                    </option>
                    <option value="ACKNOWLEDGED" className="bg-slate-900 text-white">
                      Acknowledged
                    </option>
                    <option value="RESOLVED" className="bg-slate-900 text-white">
                      Resolved
                    </option>
                  </select>
                </div>

                <div className="md:col-span-5">
                  <label className="text-xs text-slate-400">Severity</label>
                  <select
                    className={selectClass}
                    value={filterSeverity}
                    onChange={(e) => setFilterSeverity(e.target.value)}
                  >
                    <option value="ALL" className="bg-slate-900 text-white">
                      All
                    </option>
                    <option value="CRITICAL" className="bg-slate-900 text-white">
                      Critical
                    </option>
                    <option value="HIGH" className="bg-slate-900 text-white">
                      High
                    </option>
                    <option value="MEDIUM" className="bg-slate-900 text-white">
                      Medium
                    </option>
                    <option value="LOW" className="bg-slate-900 text-white">
                      Low
                    </option>
                  </select>
                </div>

                <div className="md:col-span-2 flex items-end">
                  <button
                    onClick={() => {
                      setFilterStatus("ALL");
                      setFilterSeverity("ALL");
                    }}
                    className={`${btnGhost} h-10 w-full px-3`}
                  >
                    Reset
                  </button>
                </div>
              </div>
            </section>

            <section className={sectionCard}>
              <div className="space-y-3">
                {filtered.map((a) => (
                  <div
                    key={a.id}
                    className="rounded-2xl border border-white/10 bg-black/10 p-4"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge tone={severityTone(a.severity)}>
                            {a.severity}
                          </Badge>
                          <span className="text-sm font-semibold text-white">
                            {a.type}
                          </span>
                        </div>

                        <div className="mt-1 text-sm text-slate-300">
                          Parolee:{" "}
                          <span className="font-semibold text-white">
                            {a.paroleeId}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-slate-400">
                          {a.message}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs text-slate-400">Time</div>
                        <div className="text-sm text-white">{a.time}</div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {a.status === "ACTIVE" && (
                        <>
                          <button className={btnGhost}>Acknowledge</button>
                          <button className={btnPrimary}>Resolve</button>
                        </>
                      )}

                      {a.status !== "ACTIVE" && (
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

                {filtered.length === 0 && (
                  <div className="rounded-2xl border border-white/10 bg-black/10 p-8 text-center text-sm text-slate-400">
                    No alerts found.
                  </div>
                )}
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
      : tone === "orange"
      ? "border-orange-300/20 bg-orange-400/15 text-orange-100"
      : "border-white/10 bg-white/[0.06] text-slate-200";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${cls}`}
    >
      {children}
    </span>
  );
}

function severityTone(sev) {
  if (sev === "CRITICAL") return "red";
  if (sev === "HIGH") return "amber";
  if (sev === "MEDIUM") return "orange";
  return "gray";
}