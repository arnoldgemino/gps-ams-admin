"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function OfficerLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [stayLoggedIn, setStayLoggedIn] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/officer/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, stayLoggedIn }),
    });

    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data.message || "Login failed");
      return;
    }

    // save officer info for sidebar/profile
    localStorage.setItem("role", "OFFICER");
    localStorage.setItem("officerId", data.officer.id);
    localStorage.setItem("officerName", data.officer.fullName);
    localStorage.setItem("officerEmail", data.officer.email);
    localStorage.setItem("officerBadgeId", data.officer.badgeId);

    router.push("/officer/dashboard");
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-950">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url(/bg.png)" }}
      />
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-slate-950/30" />
      {/* Subtle gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/10 via-slate-950/30 to-slate-950/50" />

      <div className="relative z-10 min-h-screen flex items-center justify-center p-3">
        <div className="w-125 max-w-xl">
          {/* Glass Card */}
          <div className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur-x1 shadow-2xl">
            <div className="p-6 sm:p-10">
              {/* Header */}
              <div className="flex items-center justify-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center">
                  {/* shield icon */}
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-white">
                    <path
                      d="M12 2l7 4v6c0 5-3 9-7 10-4-1-7-5-7-10V6l7-4z"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    />
                    <path
                      d="M12 7.3a4.7 4.7 0 104.7 4.7A4.7 4.7 0 0012 7.3z"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    />
                    <path
                      d="M12 10.3v3.7l2.2 1.3"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>

                <div className="text-center">
                  <div className="text-white font-semibold tracking-wide">GPS-BASED</div>
                  <div className="text-xs text-white/70 tracking-widest -mt-0.5">
                    ANKLE MONITORING SYSTEM
                    <div className="text-xs text-white/70 tracking-widest -mt-0.5">FOR</div>
                    <div className="text-xs text-white/70 tracking-widest -mt-0.5">
                      PROBATION AND PAROLEES
                    </div>
                  </div>
                </div>
              </div>

              <h1 className="text-center text-3xl sm:text-4xl font-bold text-white">
                Officer Login
              </h1>
              <p className="text-center text-white/70 mt-2">
                Please login with your officer credentials
              </p>

              {/* Form */}
              <form onSubmit={handleLogin} className="mt-7 space-y-3">
                {/* Email */}
                <div className="relative">
                  <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/70">
                    {/* mail icon */}
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M4 6h16v12H4V6z" stroke="currentColor" strokeWidth="1.6" />
                      <path
                        d="M4 7l8 6 8-6"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <input
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-11 py-2.5 text-white placeholder:text-white/50 outline-none focus:border-white/25 focus:bg-white/10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    autoComplete="email"
                  />
                </div>

                {/* Password */}
                <div className="relative">
                  <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/70">
                    {/* lock icon */}
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M7 11V8a5 5 0 0110 0v3" stroke="currentColor" strokeWidth="1.6" />
                      <path d="M6 11h12v10H6V11z" stroke="currentColor" strokeWidth="1.6" />
                      <path d="M12 15v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                  </div>
                  <input
                    type="password"
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-11 py-2.5 text-white placeholder:text-white/50 outline-none focus:border-white/25 focus:bg-white/10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                  />
                </div>

                {/* Error */}
                {error && (
                  <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
                    {error}
                  </div>
                )}

                {/* Row */}
                <div className="flex items-center justify-between gap-3 text-sm">
                  <label className="flex items-center gap-2 text-white/80 select-none">
                    <input
                      type="checkbox"
                      checked={stayLoggedIn}
                      onChange={(e) => setStayLoggedIn(e.target.checked)}
                      className="h-4 w-4 rounded border-white/30 bg-white/10"
                    />
                    Stay logged in
                  </label>

                  <Link
                    href="/forgot-password"
                    className="text-white/80 hover:text-white underline underline-offset-4"
                  >
                    I&apos;ve forgotten my password
                  </Link>
                </div>

                {/* Button */}
                <button
                  disabled={loading}
                  className="mt-2 w-full rounded-xl bg-white text-slate-900 font-semibold py-2.5 tracking-wide hover:bg-white/90 disabled:opacity-60"
                >
                  {loading ? "SIGNING IN..." : "SIGN IN"}
                </button>

                {/* Footer links */}
                <div className="text-center text-white/70 text-sm mt-3">
                  Admin login?{" "}
                  <Link href="/login" className="text-white underline underline-offset-4">
                    Go to Admin
                  </Link>
                </div>

                {/* Tiny policy text */}
                <p className="text-center text-xs text-white/50 mt-6 leading-relaxed">
                  This system logs access and activities. Unauthorized use is prohibited.
                  Your usage is monitored and recorded.
                </p>
              </form>
            </div>
          </div>

          <div className="text-center text-xs text-white/40 mt-4">
            © {new Date().getFullYear()} GPS-AMS
          </div>
        </div>
      </div>
    </div>
  );
}
