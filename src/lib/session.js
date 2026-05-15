export function getClientStorageItem(key) {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(key) ?? localStorage.getItem(key);
}

export function setClientStorageItem(key, value, stayLoggedIn = false) {
  if (typeof window === "undefined") return;
  if (stayLoggedIn) {
    localStorage.setItem(key, value);
  } else {
    sessionStorage.setItem(key, value);
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
