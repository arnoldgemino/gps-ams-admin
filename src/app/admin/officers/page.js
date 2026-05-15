"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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

export default function AdminOfficersPage() {
  const router = useRouter();

  const [rows, setRows] = useState([]);
  const [parolees, setParolees] = useState([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");

  const [openCreate, setOpenCreate] = useState(false);
  const [openView, setOpenView] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openAssign, setOpenAssign] = useState(false);

  const [saving, setSaving] = useState(false);
  const [loadingView, setLoadingView] = useState(false);
  const [loadingPage, setLoadingPage] = useState(true);

  const [selectedOfficer, setSelectedOfficer] = useState(null);
  const [selectedOfficerDetail, setSelectedOfficerDetail] = useState(null);

  const [form, setForm] = useState({
    badgeId: "",
    fullName: "",
    email: "",
    password: "",
    phone: "",
    status: "ACTIVE",
  });

  const [editForm, setEditForm] = useState({
    badgeId: "",
    fullName: "",
    email: "",
    password: "",
    phone: "",
    status: "ACTIVE",
  });

  const [assignForm, setAssignForm] = useState({
    paroleeId: "",
  });

  useEffect(() => {
    loadPage();
  }, []);

  async function loadPage() {
    try {
      setLoadingPage(true);
      await Promise.all([fetchOfficers(), fetchParolees()]);
    } finally {
      setLoadingPage(false);
    }
  }

  async function fetchOfficers() {
    try {
      const res = await fetch("/api/officers", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        console.error("Failed to fetch officers", data);
        setRows([]);
        return;
      }

      const list = normalizeList(data).map((r) => ({
        id: r.id,
        badgeId: r.badgeId || "—",
        fullName: r.fullName || r.officer || "—",
        email: r.email || "—",
        phone: r.phone || "",
        status: r.status || "INACTIVE",
        createdAt: r.createdAt || null,
        activeParolees: Number(r.activeParolees || r.assigned || 0),
      }));

      setRows(list);
    } catch (error) {
      console.error("Failed to fetch officers", error);
      setRows([]);
    }
  }

  async function fetchParolees() {
    try {
      const res = await fetch("/api/parolees", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        console.error("Failed to fetch parolees", data);
        setParolees([]);
        return;
      }

      const list = normalizeList(data).map((p) => ({
        id: p.id,
        paroleeNo: p.paroleeNo || "—",
        fullName: p.fullName || p.name || "—",
      }));

      setParolees(list);
    } catch (error) {
      console.error("Failed to fetch parolees", error);
      setParolees([]);
    }
  }

  async function fetchOfficerDetail(officerId) {
    try {
      setLoadingView(true);
      const res = await fetch(`/api/officers/${officerId}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data.error || data.message || "Failed to load officer details");
        return null;
      }

      setSelectedOfficerDetail(data);
      return data;
    } catch (error) {
      console.error(error);
      alert("Failed to load officer details");
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

  async function handleCreateOfficer() {
    try {
      setSaving(true);

      const payload = {
        badgeId: form.badgeId.trim(),
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone.trim(),
        status: form.status,
      };

      const res = await fetch("/api/officers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(result.error || result.message || "Failed to create officer");
        return;
      }

      setForm({
        badgeId: "",
        fullName: "",
        email: "",
        password: "",
        phone: "",
        status: "ACTIVE",
      });

      setOpenCreate(false);
      await fetchOfficers();
      alert("Officer added successfully");
    } catch (error) {
      console.error(error);
      alert("Failed to create officer");
    } finally {
      setSaving(false);
    }
  }

  async function handleOpenView(officer) {
    setSelectedOfficer(officer);
    setSelectedOfficerDetail(null);
    setOpenView(true);
    await fetchOfficerDetail(officer.id);
  }

  function handleOpenEdit(officer) {
    setSelectedOfficer(officer);
    setEditForm({
      badgeId: officer.badgeId || "",
      fullName: officer.fullName || "",
      email: officer.email === "—" ? "" : officer.email || "",
      password: "",
      phone: officer.phone || "",
      status: officer.status || "ACTIVE",
    });
    setOpenEdit(true);
  }

  function handleOpenAssign(officer) {
    setSelectedOfficer(officer);
    setAssignForm({ paroleeId: "" });
    setOpenAssign(true);
  }

  async function handleUpdateOfficer() {
    if (!selectedOfficer) return;

    try {
      setSaving(true);

      const badgeId = editForm.badgeId.trim();
      const fullName = editForm.fullName.trim();
      const email = editForm.email.trim();
      const phone = editForm.phone.trim();

      if (!badgeId || !fullName || !email) {
        alert("Badge ID, Full Name, and Email are required");
        return;
      }

      const payload = {
        badgeId,
        fullName,
        email,
        password: editForm.password,
        phone,
        status: editForm.status,
      };

      const res = await fetch(`/api/officers/${selectedOfficer.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await res.json().catch(() => ({}));

      if (!res.ok) {
        console.error("Update officer error:", result);
        alert(result.error || result.message || "Failed to update officer");
        return;
      }

      setOpenEdit(false);
      await fetchOfficers();
      alert("Officer updated successfully");
    } catch (error) {
      console.error("handleUpdateOfficer error:", error);
      alert("Failed to update officer");
    } finally {
      setSaving(false);
    }
  }

  async function handleAssignParolee() {
    if (!selectedOfficer) return;
    if (!assignForm.paroleeId) {
      alert("Please select a parolee");
      return;
    }

    try {
      setSaving(true);

      const res = await fetch(`/api/officers/${selectedOfficer.id}/assign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paroleeId: assignForm.paroleeId,
        }),
      });

      const result = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(result.error || result.message || "Failed to assign parolee");
        return;
      }

      setOpenAssign(false);
      await fetchOfficers();
      alert("Parolee assigned successfully");
    } catch (error) {
      console.error(error);
      alert("Failed to assign parolee");
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
      const badgeId = String(r.badgeId || "").toLowerCase();
      const fullName = String(r.fullName || "").toLowerCase();

      const matchSearch = !s || badgeId.includes(s) || fullName.includes(s);
      const matchStatus = filterStatus === "ALL" ? true : r.status === filterStatus;

      return matchSearch && matchStatus;
    });
  }, [rows, search, filterStatus]);

  const totalOfficers = rows.length;
  const activeOfficers = rows.filter((r) => r.status === "ACTIVE").length;
  const onLeave = rows.filter((r) => r.status === "ON_LEAVE").length;
  const inactive = rows.filter((r) => r.status === "INACTIVE").length;

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
                  Admin • Officers
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link href="/admin/dashboard" className={btnGhost}>
                ← Dashboard
              </Link>
              <button onClick={() => setOpenCreate(true)} className={btnPrimary}>
                + Add Officer
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
                <SideLink active label="Officers" href="/admin/officers" />
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
                title="Total Officers"
                value={String(totalOfficers)}
                tone="bg-sky-500/15 border-sky-400/25 text-sky-100"
              />
              <MiniCard
                title="Active Officers"
                value={String(activeOfficers)}
                tone="bg-emerald-500/15 border-emerald-400/25 text-emerald-100"
              />
              <MiniCard
                title="On Leave"
                value={String(onLeave)}
                tone="bg-amber-400/15 border-amber-300/25 text-amber-100"
              />
              <MiniCard
                title="Inactive"
                value={String(inactive)}
                tone="bg-slate-500/15 border-white/10 text-slate-200"
              />
            </section>

            <section className={sectionCard}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">Officers</h2>
                  <p className="text-sm text-slate-300/75">
                    Manage probation officers and who they monitor.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button className={btnGhost} onClick={fetchOfficers}>
                    Refresh
                  </button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-12">
                <div className="md:col-span-6">
                  <label className="text-xs text-slate-400">Search</label>
                  <input
                    className={inputClass}
                    placeholder="Search by Officer ID or Name..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                <div className="md:col-span-4">
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
                    <option value="ON_LEAVE" className="bg-slate-900 text-white">
                      On Leave
                    </option>
                    <option value="INACTIVE" className="bg-slate-900 text-white">
                      Inactive
                    </option>
                  </select>
                </div>

                <div className="md:col-span-2 flex items-end">
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
                      <th className="py-3 px-3 text-left font-medium">Officer ID</th>
                      <th className="py-3 px-3 text-left font-medium">Name</th>
                      <th className="py-3 px-3 text-left font-medium">Area</th>
                      <th className="py-3 px-3 text-left font-medium">Active Parolees</th>
                      <th className="py-3 px-3 text-left font-medium">Phone</th>
                      <th className="py-3 px-3 text-left font-medium">Status</th>
                      <th className="py-3 px-3 text-left font-medium">Last Login</th>
                      <th className="py-3 px-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-white/10">
                    {loadingPage ? (
                      <tr>
                        <td className="py-10 text-center text-slate-400" colSpan={8}>
                          Loading officers...
                        </td>
                      </tr>
                    ) : filtered.length > 0 ? (
                      filtered.map((r) => (
                        <tr key={r.id} className="hover:bg-white/[0.03]">
                          <td className="py-3 px-3 font-semibold text-white">{r.badgeId}</td>
                          <td className="py-3 px-3 text-slate-200">{r.fullName}</td>
                          <td className="py-3 px-3 text-slate-300">—</td>
                          <td className="py-3 px-3 text-slate-300">{r.activeParolees}</td>
                          <td className="py-3 px-3 text-slate-300">{r.phone || "—"}</td>

                          <td className="py-3 px-3">
                            <Badge
                              tone={
                                r.status === "ACTIVE"
                                  ? "green"
                                  : r.status === "ON_LEAVE"
                                  ? "amber"
                                  : "gray"
                              }
                            >
                              {r.status}
                            </Badge>
                          </td>

                          <td className="py-3 px-3 text-slate-400">
                            {r.createdAt
                              ? new Date(r.createdAt).toLocaleString()
                              : "—"}
                          </td>

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
        <Modal title="Add Officer" onClose={() => setOpenCreate(false)}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field
              label="Full Name"
              name="fullName"
              placeholder="Officer Name"
              value={form.fullName}
              onChange={handleChange}
            />
            <Field
              label="Officer ID"
              name="badgeId"
              placeholder="PO-001"
              value={form.badgeId}
              onChange={handleChange}
            />
            <Field
              label="Email"
              name="email"
              type="email"
              placeholder="officer@email.com"
              value={form.email}
              onChange={handleChange}
            />
            <Field
              label="Password"
              name="password"
              type="password"
              placeholder="Enter password"
              value={form.password}
              onChange={handleChange}
            />
            <Field
              label="Contact Number"
              name="phone"
              placeholder="09xx..."
              value={form.phone}
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
                <option value="ON_LEAVE" className="bg-slate-900 text-white">
                  On Leave
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
            <button onClick={handleCreateOfficer} className={btnPrimary} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </Modal>
      )}

      {openView && (
        <Modal title="Officer Details" onClose={() => setOpenView(false)}>
          {loadingView ? (
            <p className="text-slate-300">Loading...</p>
          ) : !selectedOfficerDetail ? (
            <p className="text-slate-300">No details found.</p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Info label="Officer ID" value={selectedOfficerDetail.badgeId || "—"} />
                <Info label="Full Name" value={selectedOfficerDetail.fullName || "—"} />
                <Info label="Email" value={selectedOfficerDetail.email || "—"} />
                <Info label="Phone" value={selectedOfficerDetail.phone || "—"} />
                <Info label="Status" value={selectedOfficerDetail.status || "—"} />
                <Info
                  label="Created"
                  value={
                    selectedOfficerDetail.createdAt
                      ? new Date(selectedOfficerDetail.createdAt).toLocaleString()
                      : "—"
                  }
                />
              </div>

              <div>
                <div className="mb-2 text-sm font-semibold text-white">
                  Assigned Parolees
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/10">
                  {selectedOfficerDetail.assignedParolees?.length ? (
                    <div className="divide-y divide-white/10">
                      {selectedOfficerDetail.assignedParolees.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between px-4 py-3"
                        >
                          <div>
                            <div className="font-medium text-white">{p.fullName}</div>
                            <div className="text-xs text-slate-400">{p.paroleeNo}</div>
                          </div>
                          <div className="text-xs text-slate-400">
                            Assigned:{" "}
                            {p.startAt ? new Date(p.startAt).toLocaleString() : "—"}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="px-4 py-6 text-sm text-slate-400">
                      No active parolee assignments.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </Modal>
      )}

      {openEdit && (
        <Modal title="Edit Officer" onClose={() => setOpenEdit(false)}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field
              label="Full Name"
              name="fullName"
              placeholder="Officer Name"
              value={editForm.fullName}
              onChange={handleEditChange}
            />
            <Field
              label="Officer ID"
              name="badgeId"
              placeholder="PO-001"
              value={editForm.badgeId}
              onChange={handleEditChange}
            />
            <Field
              label="Email"
              name="email"
              type="email"
              placeholder="officer@email.com"
              value={editForm.email}
              onChange={handleEditChange}
            />
            <Field
              label="New Password (optional)"
              name="password"
              type="password"
              placeholder="Leave blank to keep current"
              value={editForm.password}
              onChange={handleEditChange}
            />
            <Field
              label="Contact Number"
              name="phone"
              placeholder="09xx..."
              value={editForm.phone}
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
                <option value="ON_LEAVE" className="bg-slate-900 text-white">
                  On Leave
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
            <button onClick={handleUpdateOfficer} className={btnPrimary} disabled={saving}>
              {saving ? "Saving..." : "Update"}
            </button>
          </div>
        </Modal>
      )}

      {openAssign && (
        <Modal title="Assign Parolee to Officer" onClose={() => setOpenAssign(false)}>
          <div className="space-y-3">
            <Info
              label="Officer"
              value={
                selectedOfficer
                  ? `${selectedOfficer.badgeId} - ${selectedOfficer.fullName}`
                  : "—"
              }
            />

            <div>
              <div className="text-xs text-slate-400">Select Parolee</div>
              <select
                name="paroleeId"
                value={assignForm.paroleeId}
                onChange={handleAssignChange}
                className={selectClass}
              >
                <option value="" className="bg-slate-900 text-white">
                  Select parolee
                </option>
                {parolees.map((p) => (
                  <option
                    key={p.id}
                    value={p.id}
                    className="bg-slate-900 text-white"
                  >
                    {p.paroleeNo} - {p.fullName}
                  </option>
                ))}
              </select>
            </div>

            <p className="text-xs text-slate-400">
              Kapag may active assignment na ang parolee sa ibang officer, ililipat ito
              sa bagong officer.
            </p>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setOpenAssign(false)} className={btnGhost}>
              Cancel
            </button>
            <button onClick={handleAssignParolee} className={btnPrimary} disabled={saving}>
              {saving ? "Saving..." : "Assign"}
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