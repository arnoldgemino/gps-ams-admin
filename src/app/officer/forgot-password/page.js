"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function OfficerForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [resetUrl, setResetUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get("token") || "");
  }, []);

  async function requestReset(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    setResetUrl("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/officer/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "Unable to request password reset");
        return;
      }

      setMessage(data.message || "Password reset request sent.");
      setResetUrl(data.resetUrl || "");
    } catch {
      setError("Unable to connect to server");
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, accountType: "officer" }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "Unable to reset password");
        return;
      }

      setMessage(data.message || "Password has been reset.");
      setPassword("");
      setConfirm("");
    } catch {
      setError("Unable to connect to server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[url('/bg.png')] bg-cover bg-center opacity-35" />
      <div className="absolute inset-0 bg-slate-950/60" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
          <h1 className="text-2xl font-bold">
            {token ? "Reset Officer Password" : "Officer Forgot Password"}
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            {token
              ? "Create a new password for your officer account."
              : "Enter your officer email to generate a reset link."}
          </p>

          <form onSubmit={token ? resetPassword : requestReset} className="mt-6 space-y-3">
            {token ? (
              <>
                <input
                  type="password"
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-white outline-none placeholder:text-white/50"
                  placeholder="New password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
                <input
                  type="password"
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-white outline-none placeholder:text-white/50"
                  placeholder="Confirm new password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </>
            ) : (
              <input
                type="email"
                className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-white outline-none placeholder:text-white/50"
                placeholder="Officer email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            )}

            {error && (
              <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
                {error}
              </div>
            )}

            {message && (
              <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">
                <div>{message}</div>
                {resetUrl && (
                  <a className="mt-2 block underline" href={resetUrl}>
                    Open reset link
                  </a>
                )}
              </div>
            )}

            <button
              disabled={loading}
              className="w-full rounded-xl bg-white py-2.5 font-semibold text-slate-950 disabled:opacity-60"
            >
              {loading ? "Processing..." : token ? "Reset Password" : "Send Reset Link"}
            </button>
          </form>

          <Link
            href="/officer/login"
            className="mt-4 block text-center text-sm text-white/70 underline"
          >
            Back to officer login
          </Link>
        </div>
      </div>
    </div>
  );
}
