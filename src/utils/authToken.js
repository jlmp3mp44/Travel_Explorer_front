const STORAGE_KEY = "authToken";

/** Read persisted JWT (set on sign-in). */
export function getAuthToken() {
  try {
    const t = localStorage.getItem(STORAGE_KEY);
    return t && String(t).trim() ? String(t).trim() : null;
  } catch {
    return null;
  }
}

export function setAuthToken(token) {
  const t = token != null ? String(token).trim() : "";
  try {
    if (t) localStorage.setItem(STORAGE_KEY, t);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearAuthToken() {
  setAuthToken(null);
}

/** Pick JWT from common Spring / auth response shapes. */
export function extractTokenFromAuthResponse(data) {
  if (data == null || typeof data !== "object") return null;
  const candidates = [
    data.token,
    data.accessToken,
    data.access_token,
    data.jwt,
    data.idToken,
  ];
  for (const c of candidates) {
    if (c != null && String(c).trim()) return String(c).trim();
  }
  return null;
}

/**
 * fetch init: session cookie + Bearer when token is stored.
 * @param {Record<string, string>} [extraHeaders]
 */
export function authRequestInit(extraHeaders = {}) {
  const headers = { ...extraHeaders };
  const token = getAuthToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return {
    credentials: "include",
    headers,
  };
}
