"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatPhilippinesDateTime } from "@/lib/time";
import { getClientStorageItem, logoutAndRedirect } from "@/lib/session";

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

const inputClass =
  "mt-1 h-10 w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 text-sm text-white outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-sky-300/30";

const selectClass =
  "mt-1 h-10 w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 text-sm text-white outline-none focus:ring-2 focus:ring-sky-300/30";

export default function OfficerParoleesPage() {
  const router = useRouter();
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [officerName, setOfficerName] = useState("Officer");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const id = getClientStorageItem("officerId");
    const name = getClientStorageItem("officerName");

    if (!id) {
      router.push("/officer/login");
      return;
    }

    setOfficerName(name || "Officer");

    async function loadParolees() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(`/api/officers/${id}`, { cache: "no-store" });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Unable to load assigned parolees");
        }

        const items = (data.assignedParolees || []).map((p) => ({
          id: p.id,
          name: p.fullName || "—",
          deviceId: p.deviceId || "—",
          lastLat: p.lat != null ? String(p.lat) : "—",
          lastLng: p.lng != null ? String(p.lng) : "—",
          battery: p.batteryLevel != null ? String(p.batteryLevel) : "—",
          signal: p.signal || "—",
          tamper: p.tamper || "—",
          lastSeen: formatPhilippinesDateTime(p.lastSeen, "—"),
          compliance: p.status || "OFFLINE",
        }));

        setRows(items);
      } catch (err) {
        console.error(err);
        setError(err.message || "Unable to load parolees");
      } finally {
        setLoading(false);
      }
    }

    loadParolees();
  }, [router]);

  const filtered = rows.filter((r) => {
    const s = search.trim().toLowerCase();
    const matchSearch =
      !s || r.id.toLowerCase().includes(s) || r.deviceId.toLowerCase().includes(s);

    const matchFilter = filter === "ALL" ? true : r.compliance === filter;

    return matchSearch && matchFilter;
  });

  const totalAssigned = rows.length;
  const compliant = rows.filter((r) => r.compliance === "COMPLIANT").length;
  const warning = rows.filter((r) => r.compliance === "WARNING").length;
  const violation = rows.filter((r) => r.compliance === "VIOLATION").length;

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
                  Officer • My Parolees
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link href="/officer/dashboard" className={btnGhost}>
                ← Dashboard
              </Link>
              <button type="button" onClick={() => logoutAndRedirect("/officer/login")} className={btnDanger}>
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
                <SideLink active label="My Parolees" href="/officer/parolees" />
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
                <button
                  type="button"
                  onClick={() => logoutAndRedirect("/officer/login")}
                  className={`${btnDanger} mt-3 w-full`}
                >
                  Logout
                </button>
              </div>
            </div>
          </aside>

          <main className="col-span-12 h-[calc(95vh-5rem)] space-y-6 overflow-y-auto pb-0.5 md:col-span-9 lg:col-span-10">
            {loading && (
              <div className="rounded-[28px] border border-white/10 bg-black/20 p-6 text-center text-sm text-slate-300">
                Loading assigned parolees…
              </div>
            )}

            {error && (
              <div className="rounded-[28px] border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-100">
                {error}
              </div>
            )}

            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MiniCard
                title="Assigned Parolees"
                value={String(totalAssigned)}
                tone="bg-sky-500/15 border-sky-400/25 text-sky-100"
              />
              <MiniCard
                title="Compliant"
                value={String(compliant)}
                tone="bg-emerald-500/15 border-emerald-400/25 text-emerald-100"
              />
              <MiniCard
                title="Warning"
                value={String(warning)}
                tone="bg-amber-400/15 border-amber-300/25 text-amber-100"
              />
              <MiniCard
                title="Violation"
                value={String(violation)}
                tone="bg-rose-500/15 border-rose-400/25 text-rose-100"
              />
            </section>

            <section className={sectionCard}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-lg font-semibold text-white">
                    My Assigned Parolees
                  </h1>
                  <p className="text-sm text-slate-300/75">
                    View status, last location, and device health for your assigned
                    parolees.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button className={btnGhost}>Export</button>
                  <Link href="/officer/map" className={btnSecondary}>
                    Live Map
                  </Link>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-12">
                <div className="md:col-span-8">
                  <label className="text-xs text-slate-400">Search</label>
                  <input
                    className={inputClass}
                    placeholder="Search Parolee ID or Device ID..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="text-xs text-slate-400">Compliance</label>
                  <select
                    className={selectClass}
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  >
                    <option value="ALL" className="bg-slate-900 text-white">
                      All
                    </option>
                    <option value="COMPLIANT" className="bg-slate-900 text-white">
                      Compliant
                    </option>
                    <option value="WARNING" className="bg-slate-900 text-white">
                      Warning
                    </option>
                    <option value="VIOLATION" className="bg-slate-900 text-white">
                      Violation
                    </option>
                  </select>
                </div>

                <div className="md:col-span-1 flex items-end">
                  <button
                    onClick={() => {
                      setSearch("");
                      setFilter("ALL");
                    }}
                    className={`${btnGhost} h-10 w-full px-3`}
                  >
                    Reset
                  </button>
                </div>
              </div>
            </section>

            <section className={sectionCard}>
              <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/10">
                <table className="w-full text-sm">
                  <thead className="bg-slate-950/60 text-slate-300 backdrop-blur">
                    <tr className="border-b border-white/10">
                      <th className="py-3 px-3 text-left font-medium">Parolee ID</th>
                      <th className="py-3 px-3 text-left font-medium">Device</th>
                      <th className="py-3 px-3 text-left font-medium">Last Lat</th>
                      <th className="py-3 px-3 text-left font-medium">Last Lng</th>
                      <th className="py-3 px-3 text-left font-medium">Battery</th>
                      <th className="py-3 px-3 text-left font-medium">Signal</th>
                      <th className="py-3 px-3 text-left font-medium">Tamper</th>
                      <th className="py-3 px-3 text-left font-medium">Last Seen</th>
                      <th className="py-3 px-3 text-left font-medium">Compliance</th>
                      <th className="py-3 px-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-white/10">
                    {filtered.map((r) => (
                      <tr key={r.id} className="hover:bg-white/[0.03]">
                        <td className="py-3 px-3 font-semibold text-white">{r.id}</td>
                        <td className="py-3 px-3 text-slate-300">{r.deviceId}</td>
                        <td className="py-3 px-3 text-slate-300">{r.lastLat}</td>
                        <td className="py-3 px-3 text-slate-300">{r.lastLng}</td>
                        <td className="py-3 px-3 text-slate-300">{r.battery}</td>
                        <td className="py-3 px-3 text-slate-300">{r.signal}</td>
                        <td className="py-3 px-3 text-slate-300">{r.tamper}</td>
                        <td className="py-3 px-3 text-slate-400">{r.lastSeen}</td>
                        <td className="py-3 px-3">
                          <Badge
                            tone={
                              r.compliance === "COMPLIANT"
                                ? "green"
                                : r.compliance === "WARNING"
                                ? "amber"
                                : "red"
                            }
                          >
                            {r.compliance}
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

                    {filtered.length === 0 && (
                      <tr>
                        <td
                          colSpan={10}
                          className="py-10 text-center text-slate-400"
                        >
                          No results found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 text-sm text-slate-300">
                Showing <span className="font-semibold">{filtered.length}</span> of{" "}
                <span className="font-semibold">{rows.length}</span>
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
    tone === "green"
      ? "border-emerald-300/20 bg-emerald-400/15 text-emerald-100"
      : tone === "amber"
      ? "border-amber-300/20 bg-amber-400/15 text-amber-100"
      : "border-rose-300/20 bg-rose-400/15 text-rose-100";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${cls}`}
    >
      {children}
    </span>
  );
}
