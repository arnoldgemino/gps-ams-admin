import crypto from "node:crypto";

export const PASSWORD_RESET_TTL_MINUTES = 30;

export function createPasswordResetToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashPasswordResetToken(token) {
  return crypto.createHash("sha256").update(String(token || "")).digest("hex");
}

export function getPasswordResetExpiry() {
  return new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000);
}
