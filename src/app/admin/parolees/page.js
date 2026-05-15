"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const sectionCard =
  "rounded-[28px] border border-white/10 bg-white/[0.06] p-5 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.35)]";

const btnPrimary =
  "inline-flex items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 active:scale-[0.99] disabled:opacity-60";

const btnSecondary =
  "inline-flex items-center justify-center rounded-xl border border-sky-400/30 bg-sky-500/15 px-4 py-2 text-sm font-medium text-sky-100 transition hover:bg-sky-500/25 active:scale-[0.99]";

const btnGhost =
  "inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-medium text-white transition hover:bg-white/[0.10] active:scale-[0.99] disabled:opacity-60";

const btnDanger =
  "inline-flex items-center justify-center rounded-xl border border-rose-400/30 bg-rose-500/15 px-4 py-2 text-sm font-medium text-rose-100 transition hover:bg-rose-500/25 active:scale-[0.99]";

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

export default function AdminParoleesPage() {
  const router = useRouter();

  const [rows, setRows] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [devices, setDevices] = useState([]);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");

  const [openCreate, setOpenCreate] = useState(false);
  const [openView, setOpenView] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openAssign, setOpenAssign] = useState(false);

  const [saving, setSaving] = useState(false);
  const [loadingView, setLoadingView] = useState(false);
  const [loadingPage, setLoadingPage] = useState(true);
  const [loadingAssignOptions, setLoadingAssignOptions] = useState(false);
  const [pageError, setPageError] = useState("");

  const [selectedParolee, setSelectedParolee] = useState(null);
  const [selectedParoleeDetail, setSelectedParoleeDetail] = useState(null);

  const [form, setForm] = useState({
    paroleeNo: "",
    fullName: "",
    status: "ACTIVE",
  });

  const [editForm, setEditForm] = useState({
    paroleeNo: "",
    fullName: "",
    status: "ACTIVE",
  });

  const [assignForm, setAssignForm] = useState({
    officerId: "",
    deviceId: "",
  });

  useEffect(() => {
    loadPage();
  }, []);

  async function loadPage() {
    try {
      setLoadingPage(true);
      setPageError("");
      await fetchParolees(true);
    } finally {
      setLoadingPage(false);
    }
  }

  async function fetchParolees(showPageError = false) {
    try {
      const res = await fetch("/api/parolees", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        console.error("Failed to fetch parolees", data);
        setRows([]);
        if (showPageError) {
          setPageError(data.error || "Failed to fetch parolees");
        }
        return;
      }

      const list = normalizeList(data).map((item) => ({
        id: item.id,
        paroleeNo: item.paroleeNo || "—",
        fullName: item.fullName || item.name || "—",
        officer: item.officer || item.currentOfficerLabel || "—",
        officerId: item.officerId || "",
        device: item.device || item.currentDeviceLabel || "—",
        deviceId: item.deviceId || "",
        ams: item.ams || "INACTIVE",
        status: item.status || "WARNING",
        lastSeen: item.lastSeen || "—",
        dbStatus: item.dbStatus || item.status || "ACTIVE",
      }));

      setRows(list);
      setPageError("");
    } catch (error) {
      console.error("Failed to fetch parolees", error);
      setRows([]);
      if (showPageError) {
        setPageError("Failed to fetch parolees");
      }
    }
  }

  async function fetchOfficers() {
    try {
      const res = await fetch("/api/officers", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        console.error("Failed to fetch officers", data);
        setOfficers([]);
        return;
      }

      const list = normalizeList(data).map((o) => ({
        id: o.id,
        badgeId: o.badgeId || "—",
        fullName: o.fullName || o.officer || "—",
      }));

      setOfficers(list);
    } catch (error) {
      console.error("Failed to fetch officers", error);
      setOfficers([]);
    }
  }

  async function fetchDevices() {
    try {
      const res = await fetch("/api/devices", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        console.error("Failed to fetch devices", data);
        setDevices([]);
        return;
      }

      const list = normalizeList(data).map((d) => ({
        id: d.id,
        deviceCode: d.deviceCode || "—",
        serialNumber: d.serialNumber || "—",
      }));

      setDevices(list);
    } catch (error) {
      console.error("Failed to fetch devices", error);
      setDevices([]);
    }
  }

  async function ensureAssignOptionsLoaded() {
    try {
      setLoadingAssignOptions(true);

      if (officers.length === 0) {
        await fetchOfficers();
      }

      if (devices.length === 0) {
        await fetchDevices();
      }
    } finally {
      setLoadingAssignOptions(false);
    }
  }

  async function fetchParoleeDetail(paroleeId) {
    try {
      setLoadingView(true);
      const res = await fetch(`/api/parolees/${paroleeId}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data.error || "Failed to load parolee details");
        return null;
      }

      setSelectedParoleeDetail(data);
      return data;
    } catch (error) {
      console.error(error);
      alert("Failed to load parolee details");
      return null;
    } finally {
      setLoadingView(false);
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleEditChange(e) {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleAssignChange(e) {
    const { name, value } = e.target;
    setAssignForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleCreateParolee() {
    try {
      setSaving(true);

      const payload = {
        paroleeNo: form.paroleeNo.trim(),
        fullName: form.fullName.trim(),
        status: form.status,
      };

      const res = await fetch("/api/parolees", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(result.error || result.message || "Failed to create parolee");
        return;
      }

      setForm({
        paroleeNo: "",
        fullName: "",
        status: "ACTIVE",
      });

      setOpenCreate(false);
      await fetchParolees();
      alert("Parolee added successfully");
    } catch (error) {
      console.error(error);
      alert("Failed to create parolee");
    } finally {
      setSaving(false);
    }
  }

  async function handleOpenView(parolee) {
    setSelectedParolee(parolee);
    setSelectedParoleeDetail(null);
    setOpenView(true);
    await fetchParoleeDetail(parolee.id);
  }

  function handleOpenEdit(parolee) {
    setSelectedParolee(parolee);
    setEditForm({
      paroleeNo: parolee.paroleeNo || "",
      fullName: parolee.fullName || "",
      status: parolee.dbStatus || "ACTIVE",
    });
    setOpenEdit(true);
  }

  async function handleOpenAssign(parolee) {
    setSelectedParolee(parolee);
    setAssignForm({
      officerId: parolee.officerId || "",
      deviceId: parolee.deviceId || "",
    });
    setOpenAssign(true);
    await ensureAssignOptionsLoaded();
  }

  async function handleUpdateParolee() {
    if (!selectedParolee) return;

    try {
      setSaving(true);

      const payload = {
        paroleeNo: editForm.paroleeNo.trim(),
        fullName: editForm.fullName.trim(),
        status: editForm.status,
      };

      const res = await fetch(`/api/parolees/${selectedParolee.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(result.error || result.message || "Failed to update parolee");
        return;
      }

      setOpenEdit(false);
      await fetchParolees();
      alert("Parolee updated successfully");
    } catch (error) {
      console.error(error);
      alert("Failed to update parolee");
    } finally {
      setSaving(false);
    }
  }

  async function handleAssignParolee() {
    if (!selectedParolee) return;

    try {
      setSaving(true);

      const payload = {
        officerId: assignForm.officerId || null,
        deviceId: assignForm.deviceId || null,
      };

      const res = await fetch(`/api/parolees/${selectedParolee.id}/assign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(result.error || result.message || "Failed to save assignments");
        return;
      }

      setOpenAssign(false);
      await fetchParolees();
      alert("Assignments updated successfully");
    } catch (error) {
      console.error(error);
      alert("Failed to save assignments");
    } finally {
      setSaving(false);
    }
  }

  function handleLogout() {
    router.push("/login");
  }

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const s = search.trim().toLowerCase();
      const paroleeNo = String(r.paroleeNo || "").toLowerCase();
      const fullName = String(r.fullName || "").toLowerCase();

      const matchSearch = !s || paroleeNo.includes(s) || fullName.includes(s);
      const matchStatus = filterStatus === "ALL" ? true : r.status === filterStatus;

      return matchSearch && matchStatus;
    });
  }, [rows, search, filterStatus]);

  const totalParolees = rows.length;
  const activeAMS = rows.filter((r) => r.ams === "ACTIVE").length;
  const withAlerts = rows.filter((r) => r.status === "ALERT").length;
  const unassigned = rows.filter((r) => !r.officer || r.officer === "—").length;

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
                  Admin • Parolees
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link href="/admin/dashboard" className={btnGhost}>
                ← Dashboard
              </Link>
              <button onClick={() => setOpenCreate(true)} className={btnPrimary}>
                + Add Parolee
              </button>
            </div>
          </div>
        </header>

        <div className="mx-auto grid max-w-7xl grid-cols-12 gap-6 px-4 py-6">
          <aside className="col-span-12 md:col-span-3 lg:col-span-2">
            <div className="sticky top-20 flex h-[calc(95vh-5rem)] flex-col overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.06] shadow-[0_10px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl">
              <nav className="flex-1 space-y-2 overflow-y-auto p-4">
                <SideLink label="Dashboard" href="/admin/dashboard" />
                <SideLink active label="Parolees" href="/admin/parolees" />
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

                <button onClick={handleLogout} className={`${btnDanger} mt-3 w-full`}>
                  Logout
                </button>
              </div>
            </div>
          </aside>

          <main className="col-span-12 h-[calc(95vh-5rem)] space-y-6 overflow-y-auto pb-0.5 md:col-span-9 lg:col-span-10">
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MiniCard
                title="Total Parolees"
                value={String(totalParolees)}
                tone="bg-sky-500/15 border-sky-400/25 text-sky-100"
              />
              <MiniCard
                title="Active AMS"
                value={String(activeAMS)}
                tone="bg-emerald-500/15 border-emerald-400/25 text-emerald-100"
              />
              <MiniCard
                title="With Alerts"
                value={String(withAlerts)}
                tone="bg-rose-500/15 border-rose-400/25 text-rose-100"
              />
              <MiniCard
                title="Unassigned"
                value={String(unassigned)}
                tone="bg-amber-400/15 border-amber-300/25 text-amber-100"
              />
            </section>

            <section className={sectionCard}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">Parolees</h2>
                  <p className="text-sm text-slate-300/75">
                    Manage parolee profiles, assignments, and device status.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button className={btnGhost} onClick={() => loadPage()}>
                    Refresh
                  </button>
                </div>
              </div>

              {pageError && (
                <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                  {pageError}
                </div>
              )}

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-12">
                <div className="md:col-span-5">
                  <label className="text-xs text-slate-400">Search</label>
                  <input
                    className={inputClass}
                    placeholder="Search by Parolee ID or Name..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="text-xs text-slate-400">Compliance Status</label>
                  <select
                    className={selectClass}
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
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
                    <option value="ALERT" className="bg-slate-900 text-white">
                      Alert
                    </option>
                  </select>
                </div>

                <div className="md:col-span-4 flex items-end">
                  <button
                    onClick={() => {
                      setSearch("");
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
                      <th className="py-3 px-3 text-left font-medium">Parolee ID</th>
                      <th className="py-3 px-3 text-left font-medium">Name</th>
                      <th className="py-3 px-3 text-left font-medium">Assigned Officer</th>
                      <th className="py-3 px-3 text-left font-medium">Device</th>
                      <th className="py-3 px-3 text-left font-medium">AMS</th>
                      <th className="py-3 px-3 text-left font-medium">Status</th>
                      <th className="py-3 px-3 text-left font-medium">Last Seen</th>
                      <th className="py-3 px-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-white/10">
                    {loadingPage ? (
                      <tr>
                        <td className="py-10 text-center text-slate-400" colSpan={8}>
                          Loading parolees...
                        </td>
                      </tr>
                    ) : filtered.length > 0 ? (
                      filtered.map((r) => (
                        <tr key={r.id} className="hover:bg-white/[0.03]">
                          <td className="py-3 px-3 font-semibold text-white">{r.paroleeNo}</td>
                          <td className="py-3 px-3 text-slate-200">{r.fullName}</td>
                          <td className="py-3 px-3 text-slate-300">{r.officer}</td>
                          <td className="py-3 px-3 text-slate-300">{r.device}</td>

                          <td className="py-3 px-3">
                            <Badge tone={r.ams === "ACTIVE" ? "green" : "gray"}>
                              {r.ams}
                            </Badge>
                          </td>

                          <td className="py-3 px-3">
                            <Badge
                              tone={
                                r.status === "COMPLIANT"
                                  ? "green"
                                  : r.status === "WARNING"
                                  ? "amber"
                                  : "red"
                              }
                            >
                              {r.status}
                            </Badge>
                          </td>

                          <td className="py-3 px-3 text-slate-400">{r.lastSeen}</td>

                          <td className="py-3 px-3">
                            <div className="flex justify-end gap-2">
                              <button
                                className={btnSecondary}
                                onClick={() => handleOpenView(r)}
                              >
                                View
                              </button>
                              <button
                                className={btnGhost}
                                onClick={() => handleOpenEdit(r)}
                              >
                                Edit
                              </button>
                              <button
                                className={btnGhost}
                                onClick={() => handleOpenAssign(r)}
                              >
                                Assign
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="py-10 text-center text-slate-400" colSpan={8}>
                          No results found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex items-center justify-between text-sm text-slate-300">
                <div>
                  Showing <span className="font-semibold">{filtered.length}</span> of{" "}
                  <span className="font-semibold">{rows.length}</span>
                </div>
                <div className="flex gap-2">
                  <button className={btnGhost} disabled>
                    Prev
                  </button>
                  <button className={btnGhost} disabled>
                    Next
                  </button>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>

      {openCreate && (
        <Modal title="Add Parolee" onClose={() => setOpenCreate(false)}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field
              label="Full Name"
              name="fullName"
              placeholder="Juan Dela Cruz"
              value={form.fullName}
              onChange={handleChange}
            />
            <Field
              label="Parolee ID"
              name="paroleeNo"
              placeholder="PAR-001"
              value={form.paroleeNo}
              onChange={handleChange}
            />

            <div>
              <div className="text-xs text-slate-400">Status</div>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className={selectClass}
              >
                <option value="ACTIVE" className="bg-slate-900 text-white">
                  Active
                </option>
                <option value="INACTIVE" className="bg-slate-900 text-white">
                  Inactive
                </option>
              </select>
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setOpenCreate(false)} className={btnGhost}>
              Cancel
            </button>
            <button onClick={handleCreateParolee} className={btnPrimary} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </Modal>
      )}

      {openView && (
        <Modal title="Parolee Details" onClose={() => setOpenView(false)}>
          {loadingView ? (
            <p className="text-slate-300">Loading...</p>
          ) : !selectedParoleeDetail ? (
            <p className="text-slate-300">No details found.</p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Info label="Parolee ID" value={selectedParoleeDetail.paroleeNo || "—"} />
                <Info label="Full Name" value={selectedParoleeDetail.fullName || "—"} />
                <Info label="Record Status" value={selectedParoleeDetail.status || "—"} />
                <Info
                  label="Created"
                  value={
                    selectedParoleeDetail.createdAt
                      ? new Date(selectedParoleeDetail.createdAt).toLocaleString()
                      : "—"
                  }
                />
                <Info
                  label="Assigned Officer"
                  value={selectedParoleeDetail.currentOfficerLabel || "—"}
                />
                <Info
                  label="Assigned Device"
                  value={selectedParoleeDetail.currentDeviceLabel || "—"}
                />
                <Info
                  label="Last Seen"
                  value={
                    selectedParoleeDetail.latestTelemetry?.createdAt
                      ? new Date(selectedParoleeDetail.latestTelemetry.createdAt).toLocaleString()
                      : "—"
                  }
                />
                <Info
                  label="Last Location"
                  value={
                    selectedParoleeDetail.latestTelemetry
                      ? `${selectedParoleeDetail.latestTelemetry.lat}, ${selectedParoleeDetail.latestTelemetry.lng}`
                      : "—"
                  }
                />
              </div>

              <div>
                <div className="mb-2 text-sm font-semibold text-white">Open Alerts</div>
                <div className="rounded-2xl border border-white/10 bg-black/10">
                  {selectedParoleeDetail.openAlerts?.length ? (
                    <div className="divide-y divide-white/10">
                      {selectedParoleeDetail.openAlerts.map((a) => (
                        <div
                          key={a.id}
                          className="flex items-center justify-between px-4 py-3"
                        >
                          <div>
                            <div className="font-medium text-white">{a.type}</div>
                            <div className="text-xs text-slate-400">{a.details || "—"}</div>
                          </div>
                          <div className="text-xs text-slate-400">
                            {a.createdAt ? new Date(a.createdAt).toLocaleString() : "—"}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="px-4 py-6 text-sm text-slate-400">No open alerts.</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </Modal>
      )}

      {openEdit && (
        <Modal title="Edit Parolee" onClose={() => setOpenEdit(false)}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field
              label="Full Name"
              name="fullName"
              placeholder="Juan Dela Cruz"
              value={editForm.fullName}
              onChange={handleEditChange}
            />
            <Field
              label="Parolee ID"
              name="paroleeNo"
              placeholder="PAR-001"
              value={editForm.paroleeNo}
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
                  Active
                </option>
                <option value="INACTIVE" className="bg-slate-900 text-white">
                  Inactive
                </option>
              </select>
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setOpenEdit(false)} className={btnGhost}>
              Cancel
            </button>
            <button onClick={handleUpdateParolee} className={btnPrimary} disabled={saving}>
              {saving ? "Saving..." : "Update"}
            </button>
          </div>
        </Modal>
      )}

      {openAssign && (
        <Modal title="Assign Officer / Device" onClose={() => setOpenAssign(false)}>
          <div className="space-y-4">
            <Info
              label="Parolee"
              value={
                selectedParolee
                  ? `${selectedParolee.paroleeNo} - ${selectedParolee.fullName}`
                  : "—"
              }
            />

            {loadingAssignOptions ? (
              <div className="text-sm text-slate-300">Loading officers and devices...</div>
            ) : (
              <>
                <div>
                  <div className="text-xs text-slate-400">Officer</div>
                  <select
                    name="officerId"
                    value={assignForm.officerId}
                    onChange={handleAssignChange}
                    className={selectClass}
                  >
                    <option value="" className="bg-slate-900 text-white">
                      No officer
                    </option>
                    {officers.map((o) => (
                      <option key={o.id} value={o.id} className="bg-slate-900 text-white">
                        {o.badgeId} - {o.fullName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="text-xs text-slate-400">Device</div>
                  <select
                    name="deviceId"
                    value={assignForm.deviceId}
                    onChange={handleAssignChange}
                    className={selectClass}
                  >
                    <option value="" className="bg-slate-900 text-white">
                      No device
                    </option>
                    {devices.map((d) => (
                      <option key={d.id} value={d.id} className="bg-slate-900 text-white">
                        {d.deviceCode} - {d.serialNumber}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <p className="text-xs text-slate-400">
              Pwede mong iwanang blank ang officer o device para alisin ang current assignment.
            </p>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setOpenAssign(false)} className={btnGhost}>
              Cancel
            </button>
            <button
              onClick={handleAssignParolee}
              className={btnPrimary}
              disabled={saving || loadingAssignOptions}
            >
              {saving ? "Saving..." : "Save Assignments"}
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

function Field({ label, name, placeholder, value, onChange, type = "text" }) {
  return (
    <div>
      <div className="text-xs text-slate-400">{label}</div>
      <input
        type={type}
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