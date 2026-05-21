"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatPhilippinesDateTime } from "@/lib/time";
import { logoutAndRedirect } from "@/lib/session";

const sectionCard =
  "rounded-[28px] border border-white/10 bg-white/[0.06] p-5 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.35)]";

const btnPrimary =
  "inline-flex items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 active:scale-[0.99] disabled:opacity-60";

const btnSecondary =
  "inline-flex items-center justify-center rounded-xl border border-sky-400/30 bg-sky-500/15 px-4 py-2 text-sm font-medium text-sky-100 transition hover:bg-sky-500/25 active:scale-[0.99]";

const btnGhost =
  "inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-medium text-white transition hover:bg-white/[0.10] active:scale-[0.99]";

const btnDanger =
  "inline-flex items-center justify-center rounded-xl border border-rose-400/30 bg-rose-500/15 px-4 py-2 text-sm font-medium text-rose-100 transition hover:bg-rose-500/25 active:scale-[0.99]";

const inputClass =
  "mt-1 h-10 w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 text-sm text-white outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-sky-300/30";

export default function AdminSettingsPage() {
  const [tab, setTab] = useState("GENERAL");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [settings, setSettings] = useState({
    systemName: "",
    organizationName: "",
    supportEmail: "",
    defaultMapLat: "7.9064",
    defaultMapLng: "125.0942",
    defaultGeofenceRadiusM: "300",
    telemetryIntervalSec: "10",
    lowBatteryThreshold: "20",
    liveFeedRefreshSec: "10",
    geofenceBreachAlerts: true,
    deviceTamperAlerts: true,
    lowBatteryAlerts: true,
    offlineAlerts: true,
  });

  const [admins, setAdmins] = useState([]);
  const [logs, setLogs] = useState([]);

  const [adminForm, setAdminForm] = useState({
    fullName: "",
    email: "",
    password: "",
  });

  const [officerForm, setOfficerForm] = useState({
    fullName: "",
    email: "",
    badgeId: "",
    password: "",
    phone: "",
    status: "ACTIVE",
  });

  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [settingsError, setSettingsError] = useState("");

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    try {
      setLoading(true);

      const [settingsRes, adminsRes, logsRes] = await Promise.all([
        fetch("/api/settings", { cache: "no-store" }),
        fetch("/api/settings/admins", { cache: "no-store" }),
        fetch("/api/settings/logs", { cache: "no-store" }),
      ]);

      const settingsData = await settingsRes.json();
      const adminsData = await adminsRes.json();
      const logsData = await logsRes.json();

      if (settingsRes.ok && settingsData) {
        setSettings({
          systemName: settingsData.systemName || "",
          organizationName: settingsData.organizationName || "",
          supportEmail: settingsData.supportEmail || "",
          defaultMapLat: String(settingsData.defaultMapLat ?? "7.9064"),
          defaultMapLng: String(settingsData.defaultMapLng ?? "125.0942"),
          defaultGeofenceRadiusM: String(settingsData.defaultGeofenceRadiusM ?? "300"),
          telemetryIntervalSec: String(settingsData.telemetryIntervalSec ?? "10"),
          lowBatteryThreshold: String(settingsData.lowBatteryThreshold ?? "20"),
          liveFeedRefreshSec: String(
            settingsData.telemetryIntervalSec ??
              settingsData.liveFeedRefreshSec ??
              "10"
          ),
          geofenceBreachAlerts: Boolean(settingsData.geofenceBreachAlerts),
          deviceTamperAlerts: Boolean(settingsData.deviceTamperAlerts),
          lowBatteryAlerts: Boolean(settingsData.lowBatteryAlerts),
          offlineAlerts: Boolean(settingsData.offlineAlerts),
        });
      }

      if (adminsRes.ok) {
        setAdmins(Array.isArray(adminsData) ? adminsData : []);
      }

      if (logsRes.ok) {
        setLogs(Array.isArray(logsData) ? logsData : []);
      }
    } catch (error) {
      console.error(error);
      alert("Failed to load settings");
    } finally {
      setLoading(false);
    }
  }

  function validateSettings(settingsToValidate) {
    const telemetry = Number(settingsToValidate.telemetryIntervalSec || 0);
    const liveFeed = Number(settingsToValidate.liveFeedRefreshSec || 0);

    if (!telemetry || telemetry < 1) {
      return "Telemetry Interval must be at least 1 second.";
    }

    if (telemetry > 30) {
      return "Telemetry Interval cannot exceed 30 seconds.";
    }

    if (!liveFeed || liveFeed < 1) {
      return "Live Feed Refresh must be at least 1 second.";
    }

    if (liveFeed !== telemetry) {
      return "Live Feed Refresh must match Telemetry Interval.";
    }

    return "";
  }

  function handleSettingsChange(e) {
    const { name, value, type, checked } = e.target;
    setSettings((prev) => {
      const nextValue = type === "checkbox" ? checked : value;
      const nextState = {
        ...prev,
        [name]: nextValue,
      };

      if (name === "telemetryIntervalSec" || name === "liveFeedRefreshSec") {
        const normalized = String(nextValue).replace(/[^0-9]/g, "");
        nextState.telemetryIntervalSec = normalized;
        nextState.liveFeedRefreshSec = normalized;
      }

      const validationError = validateSettings(nextState);
      setSettingsError(validationError);
      return nextState;
    });
  }

  function handleAdminChange(e) {
    const { name, value } = e.target;
    setAdminForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleOfficerChange(e) {
    const { name, value } = e.target;
    setOfficerForm((prev) => ({ ...prev, [name]: value }));
  }

  async function saveGeneralSettings() {
    try {
      setSaving(true);
      setMsg("");
      setErr("");
      setSettingsError("");

      const validationError = validateSettings(settings);
      if (validationError) {
        setSettingsError(validationError);
        setErr(validationError);
        return;
      }

      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...settings,
          defaultMapLat: Number(settings.defaultMapLat),
          defaultMapLng: Number(settings.defaultMapLng),
          defaultGeofenceRadiusM: Number(settings.defaultGeofenceRadiusM),
          telemetryIntervalSec: Number(settings.telemetryIntervalSec),
          lowBatteryThreshold: Number(settings.lowBatteryThreshold),
          liveFeedRefreshSec: Number(settings.liveFeedRefreshSec),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErr(data.error || "Failed to save settings");
        return;
      }

      setMsg("Settings saved successfully.");
      await loadAll();
    } catch (error) {
      console.error(error);
      setErr("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  async function createAdmin(e) {
    e.preventDefault();
    try {
      setSaving(true);
      setMsg("");
      setErr("");

      const res = await fetch("/api/settings/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(adminForm),
      });

      const data = await res.json();

      if (!res.ok) {
        setErr(data.error || "Failed to create admin");
        return;
      }

      setAdminForm({
        fullName: "",
        email: "",
        password: "",
      });

      setMsg("Admin created successfully.");
      await loadAll();
    } catch (error) {
      console.error(error);
      setErr("Failed to create admin");
    } finally {
      setSaving(false);
    }
  }

  async function createOfficer(e) {
    e.preventDefault();
    try {
      setSaving(true);
      setMsg("");
      setErr("");

      const res = await fetch("/api/officers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(officerForm),
      });

      const data = await res.json();

      if (!res.ok) {
        setErr(data.error || "Failed to create officer");
        return;
      }

      setOfficerForm({
        fullName: "",
        email: "",
        badgeId: "",
        password: "",
        phone: "",
        status: "ACTIVE",
      });

      setMsg("Officer created successfully.");
    } catch (error) {
      console.error(error);
      setErr("Failed to create officer");
    } finally {
      setSaving(false);
    }
  }

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
                  Admin • Settings
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link href="/admin/dashboard" className={btnGhost}>
                ← Dashboard
              </Link>
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
                <SideLink label="Geofences" href="/admin/geofences" />
                <SideLink active label="Settings" href="/admin/settings" />
              </nav>

              <div className="border-t border-white/10 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 font-semibold">
                    A
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">Admin</div>
                    <div className="text-xs text-slate-300/70">Logged in</div>
                  </div>
                </div>
                <button
                  onClick={() => logoutAndRedirect("/login")}
                  className={`${btnDanger} mt-3 w-full`}
                >
                  Logout
                </button>
              </div>
            </div>
          </aside>

          <main className="col-span-12 md:col-span-9 lg:col-span-10 space-y-6 overflow-y-auto h-[calc(95vh-5rem)] pb-0.5">
            <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.06] shadow-[0_10px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl">
              <div className="flex flex-wrap border-b border-white/10">
                <Tab label="General" active={tab === "GENERAL"} onClick={() => setTab("GENERAL")} />
                <Tab label="Admins" active={tab === "ADMINS"} onClick={() => setTab("ADMINS")} />
                <Tab label="Officers" active={tab === "OFFICERS"} onClick={() => setTab("OFFICERS")} />
                <Tab label="Notifications" active={tab === "NOTIFICATIONS"} onClick={() => setTab("NOTIFICATIONS")} />
                <Tab label="System Logs" active={tab === "LOGS"} onClick={() => setTab("LOGS")} />
              </div>

              <div className="p-6">
                {loading ? (
                  <div className="text-slate-300">Loading...</div>
                ) : (
                  <>
                    {err && (
                      <div className="mb-4 rounded-xl border border-rose-400/20 bg-rose-500/15 p-3 text-sm text-rose-100">
                        {err}
                      </div>
                    )}
                    {msg && (
                      <div className="mb-4 rounded-xl border border-emerald-400/20 bg-emerald-500/15 p-3 text-sm text-emerald-100">
                        {msg}
                      </div>
                    )}

                    {tab === "GENERAL" && (
                      <section className="space-y-4">
                        <h2 className="text-lg font-semibold text-white">General Settings</h2>

                        <FieldControlled
                          label="System Name"
                          name="systemName"
                          value={settings.systemName}
                          onChange={handleSettingsChange}
                          placeholder="GPS-Based Ankle Monitoring System"
                        />
                        <FieldControlled
                          label="Organization Name"
                          name="organizationName"
                          value={settings.organizationName}
                          onChange={handleSettingsChange}
                          placeholder="Organization"
                        />
                        <FieldControlled
                          label="Support Email"
                          name="supportEmail"
                          value={settings.supportEmail}
                          onChange={handleSettingsChange}
                          placeholder="support@email.com"
                        />
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <FieldControlled
                            label="Default Map Latitude"
                            name="defaultMapLat"
                            value={settings.defaultMapLat}
                            onChange={handleSettingsChange}
                            placeholder="7.9064"
                          />
                          <FieldControlled
                            label="Default Map Longitude"
                            name="defaultMapLng"
                            value={settings.defaultMapLng}
                            onChange={handleSettingsChange}
                            placeholder="125.0942"
                          />
                          <FieldControlled
                            label="Default Geofence Radius (meters)"
                            name="defaultGeofenceRadiusM"
                            value={settings.defaultGeofenceRadiusM}
                            onChange={handleSettingsChange}
                            placeholder="300"
                          />
                          <div>
                            <div className="text-xs text-slate-400">Telemetry Interval (seconds)</div>
                            <input
                              type="number"
                              name="telemetryIntervalSec"
                              min={15}
                              max={30}
                              className={inputClass}
                              value={settings.telemetryIntervalSec}
                              onChange={handleSettingsChange}
                            />
                            <p className="mt-2 text-xs text-slate-400">
                              Must be between 15 and 30 seconds. Live Feed Refresh is synced automatically.
                            </p>
                          </div>
                          <FieldControlled
                            label="Low Battery Threshold"
                            name="lowBatteryThreshold"
                            value={settings.lowBatteryThreshold}
                            onChange={handleSettingsChange}
                            placeholder="20"
                          />
                          <div>
                            <div className="text-xs text-slate-400">Live Feed Refresh (seconds)</div>
                            <input
                              type="number"
                              name="liveFeedRefreshSec"
                              min={1}
                              className={inputClass}
                              value={settings.liveFeedRefreshSec}
                              readOnly
                            />
                            <p className="mt-2 text-xs text-slate-400">
                              Synced with Telemetry Interval for consistent live refresh behavior.
                            </p>
                          </div>
                        </div>

                        <button
                          className={btnPrimary}
                          onClick={saveGeneralSettings}
                          disabled={saving}
                        >
                          {saving ? "Saving..." : "Save Changes"}
                        </button>
                        {settingsError && (
                          <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-100">
                            {settingsError}
                          </div>
                        )}
                      </section>
                    )}

                    {tab === "ADMINS" && (
                      <section className="space-y-5">
                        <h2 className="text-lg font-semibold text-white">Admin Management</h2>

                        <form onSubmit={createAdmin} className="space-y-3">
                          <FieldControlled
                            label="Admin Full Name"
                            name="fullName"
                            value={adminForm.fullName}
                            onChange={handleAdminChange}
                            placeholder="Juan Dela Cruz"
                          />
                          <FieldControlled
                            label="Admin Email"
                            name="email"
                            value={adminForm.email}
                            onChange={handleAdminChange}
                            placeholder="admin@gpsams.com"
                          />
                          <FieldControlled
                            label="Password"
                            name="password"
                            type="password"
                            value={adminForm.password}
                            onChange={handleAdminChange}
                            placeholder="Enter password"
                          />
                          <button className={btnPrimary} disabled={saving}>
                            {saving ? "Saving..." : "Add Admin"}
                          </button>
                        </form>

                        <div className="rounded-2xl border border-white/10 bg-black/10">
                          <div className="border-b border-white/10 px-4 py-3 text-sm font-semibold text-white">
                            Existing Admins
                          </div>
                          <div className="divide-y divide-white/10">
                            {admins.length ? (
                              admins.map((admin) => (
                                <div
                                  key={admin.id}
                                  className="flex items-center justify-between px-4 py-3"
                                >
                                  <div>
                                    <div className="text-white font-medium">{admin.fullName}</div>
                                    <div className="text-xs text-slate-400">{admin.email}</div>
                                  </div>
                                  <div className="text-xs text-slate-400">{admin.role}</div>
                                </div>
                              ))
                            ) : (
                              <div className="px-4 py-6 text-sm text-slate-400">
                                No admins found.
                              </div>
                            )}
                          </div>
                        </div>
                      </section>
                    )}

                    {tab === "OFFICERS" && (
                      <section className="space-y-4">
                        <h2 className="text-lg font-semibold text-white">Officer Quick Add</h2>
                        <p className="text-sm text-slate-300/75">
                          Create officer accounts directly from settings.
                        </p>

                        <form onSubmit={createOfficer} className="space-y-3">
                          <FieldControlled
                            label="Full Name"
                            name="fullName"
                            value={officerForm.fullName}
                            onChange={handleOfficerChange}
                            placeholder="Officer Name"
                          />
                          <FieldControlled
                            label="Email"
                            name="email"
                            value={officerForm.email}
                            onChange={handleOfficerChange}
                            placeholder="officer@email.com"
                          />
                          <FieldControlled
                            label="Badge ID"
                            name="badgeId"
                            value={officerForm.badgeId}
                            onChange={handleOfficerChange}
                            placeholder="B-0001"
                          />
                          <FieldControlled
                            label="Phone"
                            name="phone"
                            value={officerForm.phone}
                            onChange={handleOfficerChange}
                            placeholder="09xx..."
                          />
                          <FieldControlled
                            label="Password"
                            name="password"
                            type="password"
                            value={officerForm.password}
                            onChange={handleOfficerChange}
                            placeholder="Minimum 6 characters"
                          />

                          <div>
                            <div className="text-xs text-slate-400">Status</div>
                            <select
                              name="status"
                              value={officerForm.status}
                              onChange={handleOfficerChange}
                              className={inputClass}
                            >
                              <option value="ACTIVE" className="bg-slate-900 text-white">ACTIVE</option>
                              <option value="ON_LEAVE" className="bg-slate-900 text-white">ON_LEAVE</option>
                              <option value="INACTIVE" className="bg-slate-900 text-white">INACTIVE</option>
                            </select>
                          </div>

                          <button className={btnPrimary} disabled={saving}>
                            {saving ? "Saving..." : "Add Officer"}
                          </button>
                        </form>
                      </section>
                    )}

                    {tab === "NOTIFICATIONS" && (
                      <section className="space-y-4">
                        <h2 className="text-lg font-semibold text-white">Notification Settings</h2>

                        <Toggle
                          label="Geofence Breach Alerts"
                          name="geofenceBreachAlerts"
                          checked={settings.geofenceBreachAlerts}
                          onChange={handleSettingsChange}
                        />
                        <Toggle
                          label="Device Tamper Alerts"
                          name="deviceTamperAlerts"
                          checked={settings.deviceTamperAlerts}
                          onChange={handleSettingsChange}
                        />
                        <Toggle
                          label="Low Battery Alerts"
                          name="lowBatteryAlerts"
                          checked={settings.lowBatteryAlerts}
                          onChange={handleSettingsChange}
                        />
                        <Toggle
                          label="Offline Alerts"
                          name="offlineAlerts"
                          checked={settings.offlineAlerts}
                          onChange={handleSettingsChange}
                        />

                        <button
                          className={btnPrimary}
                          onClick={saveGeneralSettings}
                          disabled={saving}
                        >
                          {saving ? "Saving..." : "Save Preferences"}
                        </button>
                      </section>
                    )}

                    {tab === "LOGS" && (
                      <section className="space-y-4">
                        <h2 className="text-lg font-semibold text-white">System Logs</h2>

                        <div className="rounded-2xl border border-white/10 bg-black/10 p-4 text-sm text-slate-300">
                          {logs.length ? (
                            <div className="space-y-2">
                              {logs.map((log) => (
                                <div key={log.id}>
                                  [{formatPhilippinesDateTime(log.createdAt)}] {log.action}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p>No logs found.</p>
                          )}
                        </div>
                      </section>
                    )}
                  </>
                )}
              </div>
            </div>
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

function Tab({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={[
        "px-5 py-3 text-sm font-medium border-b-2 transition",
        active
          ? "border-white text-white"
          : "border-transparent text-slate-400 hover:text-slate-200",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function FieldControlled({ label, value, onChange, placeholder, type = "text", name }) {
  return (
    <div>
      <div className="text-xs text-slate-400">{label}</div>
      <input
        type={type}
        name={name}
        className={inputClass}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      />
    </div>
  );
}

function Toggle({ label, name, checked, onChange }) {
  return (
    <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] p-3">
      <span className="text-sm text-slate-200">{label}</span>
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 accent-sky-400"
      />
    </label>
  );
}
