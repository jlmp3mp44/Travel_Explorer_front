import { apiUrl } from "../config/api";
import { parseResponseJson } from "../utils/friendlyErrors";

function errorMessageFromBody(data, fallback) {
  const raw = typeof data?.message === "string" ? data.message : "";
  if (raw && raw.length < 240) return raw;
  return fallback;
}

/**
 * Updates profile fields (e.g. phone). Backend should accept JSON body with known user fields.
 */
export async function updateUserProfile(payload) {
  const res = await fetch(apiUrl("/api/user"), {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await parseResponseJson(res);
  if (!res.ok) {
    throw new Error(errorMessageFromBody(data, "Could not save profile."));
  }
  return data;
}
