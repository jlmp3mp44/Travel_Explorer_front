/**
 * Empty in dev: requests go to the same origin so Vite can proxy `/api` → backend (avoids CORS).
 * For production with API on another host, set `VITE_API_BASE_URL` in `.env` (e.g. http://localhost:8080).
 */
const raw = import.meta.env.VITE_API_BASE_URL ?? "";
export const API_BASE = String(raw).replace(/\/$/, "");

export function apiUrl(path) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${p}`;
}
