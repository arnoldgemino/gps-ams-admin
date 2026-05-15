"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { setClientStorageItem } from "@/lib/session";

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

    try {
      const res = await fetch("/api/auth/officer/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, stayLoggedIn }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || data.message || "Login failed");
        return;
      }

      setClientStorageItem("role", "OFFICER", stayLoggedIn);
      setClientStorageItem("officerId", data.officer?.id || "", stayLoggedIn);
      setClientStorageItem("officerName", data.officer?.fullName || "", stayLoggedIn);
      setClientStorageItem("officerEmail", data.officer?.email || "", stayLoggedIn);
      setClientStorageItem("officerBadgeId", data.officer?.badgeId || "", stayLoggedIn);
      setClientStorageItem("officerLoggedInAt", new Date().toISOString(), stayLoggedIn);

      router.push("/officer/dashboard");
    } catch (err) {
      console.error(err);
      setError("Unable to connect to server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/bg.png')" }}
      />
      <div className="absolute inset-0 bg-slate-950/30" />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/10 via-slate-950/30 to-slate-950/50" />

      <div className="relative z-10 flex min-h-screen items-center justify-center p-3">
        <div className="w-full max-w-xl">
          <div className="rounded-2xl border border-white/15 bg-white/5 shadow-2xl backdrop-blur-xl">
            <div className="p-6 sm:p-10">
              <div className="mb-6 flex items-center justify-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/10">
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
                  <div className="font-semibold tracking-wide text-white">GPS-BASED</div>
                  <div className="text-xs tracking-widest text-white/70">
                    ANKLE MONITORING SYSTEM
                  </div>
                  <div className="text-xs tracking-widest text-white/70">FOR</div>
                  <div className="text-xs tracking-widest text-white/70">
                    PROBATION AND PAROLEES
                  </div>
                </div>
              </div>

              <h1 className="text-center text-3xl font-bold text-white sm:text-4xl">
                Officer Login
              </h1>
              <p className="mt-2 text-center text-white/70">
                Please login with your officer credentials
              </p>

              <form onSubmit={handleLogin} className="mt-7 space-y-3">
                <div className="relative">
                  <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/70">
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
                    type="email"
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-11 py-2.5 text-white placeholder:text-white/50 outline-none focus:border-white/25 focus:bg-white/10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    autoComplete="email"
                    required
                  />
                </div>

                <div className="relative">
                  <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/70">
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
                    required
                  />
                </div>

                {error && (
                  <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
                    {error}
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 text-sm">
                  <label className="flex select-none items-center gap-2 text-white/80">
                    <input
                      type="checkbox"
                      checked={stayLoggedIn}
                      onChange={(e) => setStayLoggedIn(e.target.checked)}
                      className="h-4 w-4 rounded border-white/30 bg-white/10"
                    />
                    Stay logged in
                  </label>

                  <span className="text-white/50">
                    <Link href="/officer/forgot-password" className="underline hover:text-white">
                      Forgot password?
                    </Link>
                  </span>
                </div>

                <button
                  disabled={loading}
                  className="mt-2 w-full rounded-xl bg-white py-2.5 font-semibold tracking-wide text-slate-900 hover:bg-white/90 disabled:opacity-60"
                >
                  {loading ? "SIGNING IN..." : "SIGN IN"}
                </button>

                <div className="mt-3 text-center text-sm text-white/70">
                  Admin login?{" "}
                  <Link href="/login" className="text-white underline underline-offset-4">
                    Go to Admin
                  </Link>
                </div>

                <p className="mt-6 text-center text-xs leading-relaxed text-white/50">
                  This system logs access and activities. Unauthorized use is prohibited.
                  Your usage is monitored and recorded.
                </p>
              </form>
            </div>
          </div>

          <div className="mt-4 text-center text-xs text-white/40">
            © {new Date().getFullYear()} GPS-AMS
          </div>
        </div>
      </div>
    </div>
  );
}