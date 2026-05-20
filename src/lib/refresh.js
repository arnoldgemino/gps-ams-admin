export const DEFAULT_LIVE_REFRESH_MS = 10000;

export function normalizeRefreshMs(value, fallbackMs = DEFAULT_LIVE_REFRESH_MS) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds < 1) return fallbackMs;
  return Math.min(Math.floor(seconds), 30) * 1000;
}

export async function fetchLiveRefreshMs(fallbackMs = DEFAULT_LIVE_REFRESH_MS) {
  try {
    const res = await fetch("/api/settings", { cache: "no-store" });
    const settings = await res.json().catch(() => null);
    if (!res.ok) return fallbackMs;

    return normalizeRefreshMs(
      settings?.liveFeedRefreshSec ?? settings?.telemetryIntervalSec,
      fallbackMs
    );
  } catch {
    return fallbackMs;
  }
}
