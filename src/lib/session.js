export function getClientStorageItem(key) {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(key) ?? localStorage.getItem(key);
}

export function getClientSessionPersistence(key = "role") {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(key) != null;
}

export function setClientStorageItem(key, value, stayLoggedIn = false) {
  if (typeof window === "undefined") return;
  if (stayLoggedIn) {
    localStorage.setItem(key, value);
    sessionStorage.removeItem(key);
  } else {
    sessionStorage.setItem(key, value);
    localStorage.removeItem(key);
  }
}

export function removeClientStorageItem(key) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(key);
  sessionStorage.removeItem(key);
}

export function clearOfficerSession() {
  if (typeof window === "undefined") return;
  ["role", "officerId", "officerName", "officerEmail", "officerBadgeId"].forEach(
    (key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    }
  );
}

export function clearClientSession() {
  if (typeof window === "undefined") return;
  [
    "role",
    "adminEmail",
    "adminLoggedInAt",
    "officerId",
    "officerName",
    "officerEmail",
    "officerBadgeId",
    "officerLoggedInAt",
  ].forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
}

export async function logoutAndRedirect(path = "/login") {
  clearClientSession();

  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      cache: "no-store",
    });
  } catch {
    // The local session is already cleared; redirect even if the network fails.
  }

  window.location.href = path;
}
