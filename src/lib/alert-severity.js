const SEVERITY_PREFIX_RE = /^(CRITICAL|HIGH|MEDIUM|LOW|WARNING):\s*/i;

export function normalizeAlertSeverity(value) {
  const severity = String(value || "").trim().toUpperCase();
  if (["CRITICAL", "HIGH", "MEDIUM", "LOW", "WARNING"].includes(severity)) {
    return severity;
  }
  return "";
}

export function stripAlertSeverityPrefix(details) {
  return String(details || "").replace(SEVERITY_PREFIX_RE, "").trim();
}

export function withAlertSeverityPrefix(severity, details) {
  const normalized = normalizeAlertSeverity(severity) || "MEDIUM";
  const cleanDetails = stripAlertSeverityPrefix(details);
  return `${normalized}: ${cleanDetails}`;
}

export function getAlertSeverity(type, details = "") {
  const prefixedSeverity = normalizeAlertSeverity(
    String(details || "").match(SEVERITY_PREFIX_RE)?.[1]
  );

  if (prefixedSeverity) return prefixedSeverity;
  if (type === "TAMPER") return "CRITICAL";
  if (type === "GEOFENCE") return "HIGH";
  if (type === "OFFLINE") return "HIGH";
  if (type === "LOW_BATTERY") return "MEDIUM";
  return "MEDIUM";
}
