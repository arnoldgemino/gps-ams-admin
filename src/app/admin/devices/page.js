"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const DEVICE_INFO_SERVICE = 0x180a;
const MODEL_NUMBER_CHAR = 0x2a24;
const SERIAL_NUMBER_CHAR = 0x2a25;

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

function decodeCharacteristicValue(value) {
  try {
    return new TextDecoder().decode(value).trim();
  } catch {
    return "";
  }
}

export default function AdminDevicesPage() {
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
  const [scanning, setScanning] = useState(false);

  const [selectedDevice, setSelectedDevice] = useState(null);
  const [selectedDeviceDetail, setSelectedDeviceDetail] = useState(null);

  const [form, setForm] = useState({
    deviceCode: "",
    serialNumber: "",
    status: "IN_SERVICE",
  });

  const [editForm, setEditForm] = useState({
    deviceCode: "",
    serialNumber: "",
    status: "IN_SERVICE",
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
      await Promise.all([fetchDevices(), fetchParolees()]);
    } finally {
      setLoadingPage(false);
    }
  }

  async function fetchDevices() {
    try {
      const res = await fetch("/api/devices", { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        console.error("Failed to fetch devices", data);
        setRows([]);
        return;
      }

      const list = normalizeList(data).map((r) => ({
        id: r.id,
        deviceCode: r.deviceCode || "—",
        serialNumber: r.serialNumber || "—",
        status: r.status || "IN_STOCK",
        paroleeId: r.paroleeId || "",
        paroleeLabel: r.paroleeLabel || "—",
        latestBatteryLevel: r.latestBatteryLevel ?? null,
        latestSignalRssiDbm: r.latestSignalRssiDbm ?? null,
        lastPing: r.lastPing || null,
        liveState: r.liveState || "OFFLINE",
        createdAt: r.createdAt || null,
      }));

      setRows(list);
    } catch (error) {
      console.error("Failed to fetch devices", error);
      setRows([]);
    }
  }

  async function fetchParolees() {
    try {
      const res = await fetch("/api/parolees", { cache: "no-store" });
      const data = await res.json();

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

  async function fetchDeviceDetail(deviceId) {
    if (!deviceId) {
      alert("Device ID is missing. Please reload the page.");
      setSelectedDeviceDetail(null);
      return null;
    }

    try {
      setLoadingView(true);
      const res = await fetch(`/api/devices/${deviceId}`, { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Failed to load device details");
        return null;
      }

      setSelectedDeviceDetail(data);
      return data;
    } catch (error) {
      console.error(error);
      alert("Failed to load device details");
      return null;
    } finally {
      setLoadingView(false);
    }
  }

  async function scanBluetoothDevice() {
    if (typeof navigator === "undefined" || !navigator.bluetooth) {
      alert("Web Bluetooth is not supported on this browser/device.");
      return;
    }

    let bleDevice = null;
    let gattServer = null;

    try {
      setScanning(true);

      bleDevice = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [DEVICE_INFO_SERVICE],
      });

      let deviceCode = "";
      let serialNumber = "";

      if (bleDevice.gatt) {
        try {
          gattServer = await bleDevice.gatt.connect();
          const service = await gattServer.getPrimaryService(DEVICE_INFO_SERVICE);

          try {
            const modelChar = await service.getCharacteristic(MODEL_NUMBER_CHAR);
            const modelValue = await modelChar.readValue();
            deviceCode = decodeCharacteristicValue(modelValue);
          } catch {
            // fallback later
          }

          try {
            const serialChar = await service.getCharacteristic(SERIAL_NUMBER_CHAR);
            const serialValue = await serialChar.readValue();
            serialNumber = decodeCharacteristicValue(serialValue);
          } catch {
            // fallback later
          }
        } catch {
          // fallback later
        }
      }

      if (!deviceCode) {
        deviceCode = (bleDevice.name || "ESP32-DEVICE")
          .replace(/\s+/g, "-")
          .toUpperCase();
      }

      if (!serialNumber) {
        serialNumber = bleDevice.id || bleDevice.name || "UNKNOWN-SERIAL";
      }

      setForm((prev) => ({
        ...prev,
        deviceCode,
        serialNumber,
      }));
    } catch (error) {
      if (error?.name !== "NotFoundError") {
        console.error("Bluetooth scan failed:", error);
        alert("Bluetooth scan failed.");
      }
    } finally {
      try {
        if (gattServer?.connected) {
          gattServer.disconnect();
        }
      } catch {}
      setScanning(false);
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

  async function handleCreateDevice() {
    try {
      setSaving(true);

      const payload = {
        deviceCode: form.deviceCode.trim(),
        serialNumber: form.serialNumber.trim(),
        status: form.status,
      };

      const res = await fetch("/api/devices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (!res.ok) {
        alert(result.error || result.message || "Failed to create device");
        return;
      }

      setForm({
        deviceCode: "",
        serialNumber: "",
        status: "IN_SERVICE",
      });

      setOpenCreate(false);
      await fetchDevices();
      alert("Device added successfully");
    } catch (error) {
      console.error(error);
      alert("Failed to create device");
    } finally {
      setSaving(false);
    }
  }

  async function handleOpenView(device) {
    if (!device?.id) {
      alert("Device ID is missing. Please reload the page.");
      return;
    }

    setSelectedDevice(device);
    setSelectedDeviceDetail(null);
    setOpenView(true);
    await fetchDeviceDetail(device.id);
  }

  function handleOpenEdit(device) {
    if (!device?.id) {
      alert("Device ID is missing. Please reload the page.");
      return;
    }

    setSelectedDevice(device);
    setEditForm({
      deviceCode: device.deviceCode || "",
      serialNumber: device.serialNumber || "",
      status: device.status || "IN_SERVICE",
    });
    setOpenEdit(true);
  }

  function handleOpenAssign(device) {
    if (!device?.id) {
      alert("Device ID is missing. Please reload the page.");
      return;
    }

    setSelectedDevice(device);
    setAssignForm({ paroleeId: "" });
    setOpenAssign(true);
  }

  async function handleUpdateDevice() {
    if (!selectedDevice?.id) {
      alert("Device ID is missing. Please reload the page.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        deviceCode: editForm.deviceCode.trim(),
        serialNumber: editForm.serialNumber.trim(),
        status: editForm.status,
      };

      const res = await fetch(`/api/devices/${selectedDevice.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (!res.ok) {
        alert(result.error || result.message || "Failed to update device");
        return;
      }

      setOpenEdit(false);
      await fetchDevices();
      alert("Device updated successfully");
    } catch (error) {
      console.error(error);
      alert("Failed to update device");
    } finally {
      setSaving(false);
    }
  }

  async function handleAssignDevice() {
    if (!selectedDevice?.id) {
      alert("Device ID is missing. Please reload the page.");
      return;
    }
    if (!assignForm.paroleeId) {
      alert("Please select a parolee");
      return;
    }

    try {
      setSaving(true);

      const res = await fetch(`/api/devices/${selectedDevice.id}/assign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(assignForm),
      });

      const result = await res.json();

      if (!res.ok) {
        alert(result.error || result.message || "Failed to assign device");
        return;
      }

      setOpenAssign(false);
      await fetchDevices();
      alert("Device assigned successfully");
    } catch (error) {
      console.error(error);
      alert("Failed to assign device");
    } finally {
      setSaving(false);
    }
  }

  async function handleRefresh() {
    await loadPage();

    if (openView && selectedDevice?.id) {
      await fetchDeviceDetail(selectedDevice.id);
    }
  }

  function handleLogout() {
    router.push("/login");
  }

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const s = search.trim().toLowerCase();
      const matchSearch =
        !s ||
        String(r.deviceCode || "").toLowerCase().includes(s) ||
        String(r.serialNumber || "").toLowerCase().includes(s) ||
        String(r.paroleeId || "").toLowerCase().includes(s) ||
        String(r.paroleeLabel || "").toLowerCase().includes(s);

      const matchStatus = filterStatus === "ALL" ? true : r.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [rows, search, filterStatus]);

  const totalDevices = rows.length;
  const inService = rows.filter((r) => r.status === "IN_SERVICE").length;
  const inStock = rows.filter((r) => r.status === "IN_STOCK").length;
  const maintenanceOrLost = rows.filter(
    (r) => r.status === "MAINTENANCE" || r.status === "LOST"
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
                  Admin • Devices
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link href="/admin/dashboard" className={btnGhost}>
                ← Dashboard
              </Link>
              <button onClick={() => setOpenCreate(true)} className={btnPrimary}>
                + Add Device
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
                <SideLink active label="Devices" href="/admin/devices" />
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
                title="Total Devices"
                value={String(totalDevices)}
                tone="bg-sky-500/15 border-sky-400/25 text-sky-100"
              />
              <MiniCard
                title="In Service"
                value={String(inService)}
                tone="bg-emerald-500/15 border-emerald-400/25 text-emerald-100"
              />
              <MiniCard
                title="In Stock"
                value={String(inStock)}
                tone="bg-slate-500/15 border-white/10 text-slate-200"
              />
              <MiniCard
                title="Maintenance / Lost"
                value={String(maintenanceOrLost)}
                tone="bg-amber-400/15 border-amber-300/25 text-amber-100"
              />
            </section>

            <section className={sectionCard}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">Devices</h2>
                  <p className="text-sm text-slate-300/75">
                    Manage GPS ankle devices, assignments, and last status.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    className={btnGhost}
                    onClick={handleRefresh}
                    disabled={loadingPage || loadingView}
                  >
                    {loadingPage ? "Refreshing..." : "Refresh"}
                  </button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-12">
                <div className="md:col-span-7">
                  <label className="text-xs text-slate-400">Search</label>
                  <input
                    className={inputClass}
                    placeholder="Search by Device Code / Serial / Parolee ID..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
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
                    <option value="IN_SERVICE" className="bg-slate-900 text-white">
                      In Service
                    </option>
                    <option value="IN_STOCK" className="bg-slate-900 text-white">
                      In Stock
                    </option>
                    <option value="MAINTENANCE" className="bg-slate-900 text-white">
                      Maintenance
                    </option>
                    <option value="LOST" className="bg-slate-900 text-white">
                      Lost
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
                      <th className="px-3 py-3 text-left font-medium">Device Code</th>
                      <th className="px-3 py-3 text-left font-medium">Serial</th>
                      <th className="px-3 py-3 text-left font-medium">Assigned Parolee</th>
                      <th className="px-3 py-3 text-left font-medium">Status</th>
                      <th className="px-3 py-3 text-left font-medium">Battery</th>
                      <th className="px-3 py-3 text-left font-medium">Signal</th>
                      <th className="px-3 py-3 text-left font-medium">Last Ping</th>
                      <th className="px-3 py-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-white/10">
                    {loadingPage ? (
                      <tr>
                        <td className="py-10 text-center text-slate-400" colSpan={8}>
                          Loading devices...
                        </td>
                      </tr>
                    ) : filtered.length > 0 ? (
                      filtered.map((r) => (
                        <tr key={r.id} className="hover:bg-white/[0.03]">
                          <td className="px-3 py-3 font-semibold text-white">{r.deviceCode}</td>
                          <td className="px-3 py-3 text-slate-300">{r.serialNumber}</td>
                          <td className="px-3 py-3 text-slate-300">{r.paroleeLabel || "—"}</td>

                          <td className="px-3 py-3">
                            <Badge
                              tone={
                                r.status === "IN_SERVICE"
                                  ? "green"
                                  : r.status === "IN_STOCK"
                                  ? "gray"
                                  : r.status === "MAINTENANCE"
                                  ? "amber"
                                  : "red"
                              }
                            >
                              {r.status}
                            </Badge>
                          </td>

                          <td className="px-3 py-3 text-slate-300">
                            {r.liveState === "ONLINE" ? (r.latestBatteryLevel ?? "—") : "—"}
                          </td>
                          <td className="px-3 py-3 text-slate-300">
                            {r.liveState === "ONLINE" ? (r.latestSignalRssiDbm ?? "—") : "—"}
                          </td>
                          <td className="px-3 py-3 text-slate-400">
                            {r.liveState === "ONLINE"
                              ? r.lastPing
                                ? new Date(r.lastPing).toLocaleString()
                                : "—"
                              : "OFFLINE"}
                          </td>

                          <td className="px-3 py-3">
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
        <Modal title="Add Device" onClose={() => setOpenCreate(false)}>
          <div className="space-y-4">
            <div className="rounded-2xl border border-sky-400/20 bg-sky-500/10 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-semibold text-white">Bluetooth Scan</div>
                  <div className="text-sm text-slate-300">
                    Search your ESP32 device and auto-fill Device Code and Serial Number.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={scanBluetoothDevice}
                  className={btnSecondary}
                  disabled={scanning}
                >
                  {scanning ? "Scanning..." : "Search Device"}
                </button>
              </div>
              <p className="mt-3 text-xs text-slate-300/80">
                Best result: expose BLE Device Information Service on the ESP32.
                Fallback: device name and device ID will be used if characteristics are unavailable.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field
                label="Device Code"
                name="deviceCode"
                placeholder="DEV-001"
                value={form.deviceCode}
                onChange={handleChange}
              />
              <Field
                label="Serial Number"
                name="serialNumber"
                placeholder="SN-XXXXXX"
                value={form.serialNumber}
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
                  <option value="IN_SERVICE" className="bg-slate-900 text-white">
                    In Service
                  </option>
                  <option value="IN_STOCK" className="bg-slate-900 text-white">
                    In Stock
                  </option>
                  <option value="MAINTENANCE" className="bg-slate-900 text-white">
                    Maintenance
                  </option>
                  <option value="LOST" className="bg-slate-900 text-white">
                    Lost
                  </option>
                </select>
              </div>
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setOpenCreate(false)} className={btnGhost}>
              Cancel
            </button>
            <button onClick={handleCreateDevice} className={btnPrimary} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </Modal>
      )}

      {openView && (
        <Modal title="Device Details" onClose={() => setOpenView(false)}>
          {loadingView ? (
            <p className="text-slate-300">Loading...</p>
          ) : !selectedDeviceDetail ? (
            <p className="text-slate-300">No details found.</p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Info label="Device Code" value={selectedDeviceDetail.deviceCode || "—"} />
                <Info label="Serial Number" value={selectedDeviceDetail.serialNumber || "—"} />
                <Info label="Status" value={selectedDeviceDetail.status || "—"} />
                <Info
                  label="Created"
                  value={
                    selectedDeviceDetail.createdAt
                      ? new Date(selectedDeviceDetail.createdAt).toLocaleString()
                      : "—"
                  }
                />
                <Info
                  label="Assigned Parolee"
                  value={selectedDeviceDetail.assignedParoleeLabel || "—"}
                />
                <Info
                  label="Last Ping"
                  value={
                    selectedDeviceDetail.latestTelemetry?.createdAt
                      ? new Date(selectedDeviceDetail.latestTelemetry.createdAt).toLocaleString()
                      : "—"
                  }
                />
                <Info
                  label="Battery"
                  value={selectedDeviceDetail.latestTelemetry?.batteryLevel ?? "—"}
                />
                <Info
                  label="Signal"
                  value={selectedDeviceDetail.latestTelemetry?.signalRssiDbm ?? "—"}
                />
              </div>
            </div>
          )}
        </Modal>
      )}

      {openEdit && (
        <Modal title="Edit Device" onClose={() => setOpenEdit(false)}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field
              label="Device Code"
              name="deviceCode"
              placeholder="DEV-001"
              value={editForm.deviceCode}
              onChange={handleEditChange}
            />
            <Field
              label="Serial Number"
              name="serialNumber"
              placeholder="SN-XXXXXX"
              value={editForm.serialNumber}
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
                <option value="IN_SERVICE" className="bg-slate-900 text-white">
                  In Service
                </option>
                <option value="IN_STOCK" className="bg-slate-900 text-white">
                  In Stock
                </option>
                <option value="MAINTENANCE" className="bg-slate-900 text-white">
                  Maintenance
                </option>
                <option value="LOST" className="bg-slate-900 text-white">
                  Lost
                </option>
              </select>
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setOpenEdit(false)} className={btnGhost}>
              Cancel
            </button>
            <button onClick={handleUpdateDevice} className={btnPrimary} disabled={saving}>
              {saving ? "Saving..." : "Update"}
            </button>
          </div>
        </Modal>
      )}

      {openAssign && (
        <Modal title="Assign Device to Parolee" onClose={() => setOpenAssign(false)}>
          <div className="space-y-3">
            <Info
              label="Device"
              value={
                selectedDevice
                  ? `${selectedDevice.deviceCode} - ${selectedDevice.serialNumber}`
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
                  <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                    {p.paroleeNo} - {p.fullName}
                  </option>
                ))}
              </select>
            </div>

            <p className="text-xs text-slate-400">
              Kapag may active assignment na ang device o parolee, papalitan ito ng bagong assignment.
            </p>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setOpenAssign(false)} className={btnGhost}>
              Cancel
            </button>
            <button onClick={handleAssignDevice} className={btnPrimary} disabled={saving}>
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
