import { apiUrl } from "../config/api";
import { parseResponseJson } from "../utils/friendlyErrors";

function errorMessageFromBody(data, fallback) {
  const raw = typeof data?.message === "string" ? data.message : "";
  if (raw && raw.length < 240) return raw;
  return fallback;
}

/** GET — list current user's saved interesting places. */
export async function listInterestingPlaces() {
  const res = await fetch(apiUrl("/api/user/interesting-places"), {
    credentials: "include",
  });
  const data = await parseResponseJson(res);
  if (!res.ok) {
    throw new Error(errorMessageFromBody(data, "Could not load saved places."));
  }
  return Array.isArray(data) ? data : [];
}

/** POST — save a place to "interesting". `cityId` and `countryId` are optional context. */
export async function saveInterestingPlace({ placeId, cityId, countryId }) {
  const body = { placeId };
  if (cityId != null && cityId !== "") body.cityId = Number(cityId);
  if (countryId != null && countryId !== "") body.countryId = Number(countryId);
  const res = await fetch(apiUrl("/api/user/interesting-places"), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await parseResponseJson(res);
  if (!res.ok) {
    throw new Error(errorMessageFromBody(data, "Could not save this place."));
  }
  return data;
}

/** DELETE — remove a saved place. */
export async function deleteInterestingPlace(id) {
  const res = await fetch(
    apiUrl(`/api/user/interesting-places/${encodeURIComponent(id)}`),
    { method: "DELETE", credentials: "include" }
  );
  if (res.status === 204) return true;
  const data = await parseResponseJson(res);
  if (!res.ok) {
    throw new Error(errorMessageFromBody(data, "Could not remove this saved place."));
  }
  return true;
}

/**
 * GET — saved places that match the trip-creation context.
 * If `cityId` is set, matches by city; otherwise by `countryId`.
 */
export async function matchInterestingPlaces({ cityId, countryId } = {}) {
  const params = new URLSearchParams();
  if (cityId != null && cityId !== "") params.set("cityId", String(cityId));
  if (countryId != null && countryId !== "") params.set("countryId", String(countryId));
  const qs = params.toString();
  const url = apiUrl(
    `/api/user/interesting-places/match${qs ? `?${qs}` : ""}`
  );
  const res = await fetch(url, { credentials: "include" });
  const data = await parseResponseJson(res);
  if (!res.ok) {
    throw new Error(errorMessageFromBody(data, "Could not load matches."));
  }
  return Array.isArray(data) ? data : [];
}

/**
 * POST — Google free-text place search scoped to a city or country. Either `cityId` or
 * `countryId` is required (city is preferred when both are sent).
 */
export async function searchPlacesFreeText({ query, cityId, countryId }) {
  const body = { query: String(query ?? "").trim() };
  if (cityId != null && cityId !== "") body.cityId = Number(cityId);
  if (countryId != null && countryId !== "") body.countryId = Number(countryId);
  const res = await fetch(apiUrl("/api/public/places/search-text"), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await parseResponseJson(res);
  if (!res.ok) {
    throw new Error(errorMessageFromBody(data, "Search failed."));
  }
  return Array.isArray(data) ? data : [];
}
