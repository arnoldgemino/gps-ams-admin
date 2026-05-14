"use client";

import { useEffect, useMemo, useState } from "react";
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

export default function OfficerProfilePage() {
  const [isEditing, setIsEditing] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [area, setArea] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [officerName, setOfficerName] = useState("");
  const [officerEmail, setOfficerEmail] = useState("");
  const [officerBadge, setOfficerBadge] = useState("");

  useEffect(() => {
    const name = localStorage.getItem("officerName");
    const mail = localStorage.getItem("officerEmail");
    const badge = localStorage.getItem("officerBadgeId");

    if (name) {
      setOfficerName(name);
      setFullName(name);
    }
    if (mail) {
      setOfficerEmail(mail);
      setEmail(mail);
    }
    if (badge) setOfficerBadge(badge);
  }, []);

  function handleLogout() {
    localStorage.removeItem("role");
    localStorage.removeItem("officerId");
    localStorage.removeItem("officerName");
    localStorage.removeItem("officerEmail");
    localStorage.removeItem("officerBadgeId");
    window.location.href = "/officer/login";
  }

  const quick = useMemo(
    () => [
      {
        label: "Assigned Parolees",
        value: "—",
        tone: "bg-sky-500/15 border-sky-400/25 text-sky-100",
      },
      {
        label: "Active Alerts",
        value: "—",
        tone: "bg-rose-500/15 border-rose-400/25 text-rose-100",
      },
      {
        label: "Last Login",
        value: "—",
        tone: "bg-white/[0.08] border-white/10 text-slate-200",
      },
      {
        label: "Status",
        value: "ACTIVE",
        tone: "bg-emerald-500/15 border-emerald-400/25 text-emerald-100",
      },
    ],
    []
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[url('/images/login-bg.jpg')] bg-cover bg-center opacity-20" />
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
                  Officer • Profile
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link href="/officer/dashboard" className={btnGhost}>
                ← Dashboard
              </Link>
              <button onClick={handleLogout} className={btnDanger}>
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
                <SideLink label="My Parolees" href="/officer/parolees" />
                <SideLink label="Alerts" href="/officer/alerts" />
                <SideLink active label="Profile" href="/officer/profile" />
              </nav>

              <div className="border-t border-white/10 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 font-semibold">
                    {officerName?.charAt(0) || "O"}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-white">
                      {officerName || "Officer"}
                    </div>
                    <div className="truncate text-xs text-slate-300/70">
                      Logged in
                    </div>
                  </div>
                </div>
                <button onClick={handleLogout} className={`${btnDanger} mt-3 w-full`}>
                  Logout
                </button>
              </div>
            </div>
          </aside>

          <main className="col-span-12 md:col-span-9 lg:col-span-10 space-y-6 overflow-y-auto h-[calc(95vh-5rem)] pb-0.5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {quick.map((s) => (
                <div
                  key={s.label}
                  className={`rounded-[24px] border p-4 shadow-[0_10px_30px_rgba(0,0,0,0.22)] backdrop-blur-xl ${s.tone}`}
                >
                  <div className="text-sm opacity-90">{s.label}</div>
                  <div className="mt-2 text-2xl font-bold tracking-tight text-white">
                    {s.value}
                  </div>
                </div>
              ))}
            </div>

            <section className={sectionCard}>
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-lg font-semibold text-white">
                    Officer Profile
                  </h1>
                  <p className="text-sm text-slate-300/75">
                    View your account information. (DB connection can be added later.)
                  </p>
                </div>
                <button
                  onClick={() => setIsEditing(true)}
                  className={btnGhost}
                >
                  Edit
                </button>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="rounded-[24px] border border-white/10 bg-black/10 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-lg font-bold text-slate-950">
                      {officerName?.charAt(0) || "O"}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm text-slate-300">
                        {officerName || "Officer"}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 text-sm">
                    <Row label="Badge ID" value={officerBadge || "—"} />
                    <Row label="Role" value="OFFICER" />
                    <Row label="Account Status" value="ACTIVE" />
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-black/10 p-4 lg:col-span-2">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field
                      label="Full Name"
                      value={fullName}
                      onChange={setFullName}
                      readOnly={!isEditing}
                    />

                    <Field
                      label="Email"
                      value={email}
                      onChange={setEmail}
                      readOnly={!isEditing}
                    />

                    <Field
                      label="Phone"
                      value={phone}
                      onChange={setPhone}
                      readOnly={!isEditing}
                    />

                    <Field
                      label="Area / Assignment"
                      value={area}
                      onChange={setArea}
                      readOnly={!isEditing}
                    />
                  </div>

                  <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                    <div className="text-sm font-semibold text-white">Security</div>
                    <p className="mt-1 text-xs text-slate-400">
                      For capstone demo, password change is optional. Later you can
                      add OTP / reset flow.
                    </p>

                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <Field
                        label="New Password"
                        value={password}
                        onChange={setPassword}
                        readOnly={!isEditing}
                        type="password"
                      />
                      <Field
                        label="Confirm Password"
                        value={confirm}
                        onChange={setConfirm}
                        readOnly={!isEditing}
                        type="password"
                      />
                    </div>

                    {isEditing && (
                      <div className="mt-4 flex gap-2">
                        <button
                          onClick={() => {
                            localStorage.setItem("officerName", fullName);
                            localStorage.setItem("officerEmail", email);

                            setOfficerName(fullName);
                            setOfficerEmail(email);
                            setIsEditing(false);
                          }}
                          className={btnPrimary}
                        >
                          Save Changes
                        </button>

                        <button
                          onClick={() => {
                            setFullName(officerName);
                            setEmail(officerEmail);
                            setPhone("");
                            setArea("");
                            setPassword("");
                            setConfirm("");
                            setIsEditing(false);
                          }}
                          className={btnGhost}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
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

function Field({ label, value, onChange, readOnly, type = "text" }) {
  return (
    <div>
      <div className="text-xs font-medium text-slate-400">{label}</div>
      <input
        type={type}
        value={value}
        readOnly={readOnly}
        onChange={(e) => onChange && onChange(e.target.value)}
        className={`mt-1 h-10 w-full rounded-xl border border-white/10 px-3 text-sm text-white outline-none ${
          readOnly ? "bg-white/[0.04]" : "bg-white/[0.07]"
        } focus:ring-2 focus:ring-sky-300/30`}
      />
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="text-slate-400">{label}</div>
      <div className="truncate font-semibold text-white">{value}</div>
    </div>
  );
}