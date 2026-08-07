import { apiUrl } from "../config/api";
import { parseResponseJson } from "../utils/friendlyErrors";
import { unwrapTripPayload } from "../utils/tripItinerary";
import { authRequestInit, catalogAuthRequiredMessage } from "./authRequest";

function errorMessageFromBody(data, fallback) {
  const raw = typeof data?.message === "string" ? data.message : "";
  if (raw && raw.length < 240) return raw;
  return fallback;
}

/**
 * PUT — body: activity IDs for that day, each exactly once, desired order.
 */
export async function reorderDayActivities(tripId, dayId, activityIds) {
  const res = await fetch(
    apiUrl(`/api/public/trips/${encodeURIComponent(tripId)}/days/${encodeURIComponent(dayId)}/activities/order`),
    {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(activityIds),
    }
  );
  const data = await parseResponseJson(res);
  if (!res.ok) {
    throw new Error(
      errorMessageFromBody(data, "Could not update activity order.")
    );
  }
  return data;
}

/** GET single trip; optional `userId` loads per-user activity preferences on the response. */
export function publicTripUrl(tripId, userId) {
  let url = apiUrl(`/api/public/trips/${encodeURIComponent(tripId)}`);
  if (userId != null && userId !== "") {
    url += `${url.includes("?") ? "&" : "?"}userId=${encodeURIComponent(String(userId))}`;
  }
  return url;
}

/**
 * POST — smart replacement (reserve pool / re-rank). Session cookie; trip owner only.
 * Body optional: `{ reason }` — backend `ActivityChangeReason`: WAS_HERE | DONT_WANT_TO_GO.
 * Returns full trip (same shape as GET by id).
 */
export async function replaceActivitySmart(tripId, activityId, { reason } = {}) {
  const body = {};
  if (reason != null && String(reason).trim() !== "") {
    body.reason = String(reason).trim();
  }
  const res = await fetch(
    apiUrl(
      `/api/public/trips/${encodeURIComponent(tripId)}/activities/${encodeURIComponent(activityId)}/replace-smart`
    ),
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
  const data = await parseResponseJson(res);
  if (!res.ok) {
    throw new Error(errorMessageFromBody(data, "Could not suggest a replacement."));
  }
  return data;
}

/**
 * GET — free-text place search for this trip’s geography. Session cookie; owner only.
 * @returns {Promise<Array>} list of place objects (PlaceResponse shape from backend).
 */
export async function searchTripPlaces(tripId, q) {
  const query = String(q ?? "").trim();
  const params = new URLSearchParams({ q: query });
  const res = await fetch(
    apiUrl(
      `/api/public/trips/${encodeURIComponent(tripId)}/places/search?${params.toString()}`
    ),
    { credentials: "include" }
  );
  const data = await parseResponseJson(res);
  if (!res.ok) {
    throw new Error(errorMessageFromBody(data, "Search failed."));
  }
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.places)) return data.places;
  return [];
}

/**
 * POST — set a specific place on the activity. Session cookie; owner only.
 * Body: { placeId, reason? }
 */
export async function replaceActivityWithPlace(tripId, activityId, { placeId, reason }) {
  const body = { placeId };
  if (reason != null && String(reason).trim() !== "") {
    body.reason = String(reason).trim();
  }
  const res = await fetch(
    apiUrl(
      `/api/public/trips/${encodeURIComponent(tripId)}/activities/${encodeURIComponent(activityId)}/replace-with-place`
    ),
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
  const data = await parseResponseJson(res);
  if (!res.ok) {
    throw new Error(errorMessageFromBody(data, "Could not apply this place."));
  }
  return data;
}

/**
 * DELETE — remove the trip. Session required (owner).
 * Success often 204 No Content.
 */
export async function deletePublicTrip(tripId) {
  const res = await fetch(apiUrl(`/api/public/trips/${encodeURIComponent(tripId)}`), {
    method: "DELETE",
    credentials: "include",
  });
  if (res.status === 204) return true;
  const data = await parseResponseJson(res);
  if (!res.ok) {
    throw new Error(errorMessageFromBody(data, "Could not delete this trip."));
  }
  return true;
}

/**
 * PUT — partial update (e.g. `{ isPublic: true }`). Sends session cookies when present.
 */
export async function updatePublicTrip(tripId, patch) {
  const res = await fetch(apiUrl(`/api/public/trips/${encodeURIComponent(tripId)}`), {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  const data = await parseResponseJson(res);
  if (!res.ok) {
    throw new Error(errorMessageFromBody(data, "Could not update this trip."));
  }
  return unwrapTripPayload(data);
}

/**
 * DELETE — remove an activity. Body: `ActivityManualEditRequest` with required `reason`
 * (`ActivityChangeReason`: WAS_HERE | DONT_WANT_TO_GO). Session cookie required for owners.
 * Returns updated trip JSON when present; otherwise `null` (e.g. 204).
 */
export async function deleteTripActivity(tripId, activityId, { reason }) {
  const res = await fetch(
    apiUrl(
      `/api/public/trips/${encodeURIComponent(tripId)}/activities/${encodeURIComponent(activityId)}`
    ),
    {
      method: "DELETE",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    }
  );
  const data = await parseResponseJson(res);
  if (!res.ok) {
    throw new Error(errorMessageFromBody(data, "Could not remove this stop."));
  }
  if (data && typeof data === "object" && data.id != null) {
    return unwrapTripPayload(data);
  }
  return null;
}

/**
 * POST — add an activity to a day. Session required for owners (assertTripAccess).
 * Body: AddTripActivityRequest — `placeId` only.
 */
export async function addDayActivity(tripId, dayId, { placeId } = {}) {
  const res = await fetch(
    apiUrl(
      `/api/public/trips/${encodeURIComponent(tripId)}/days/${encodeURIComponent(dayId)}/activities`
    ),
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ placeId }),
    }
  );
  if (res.status === 204) return null;
  const data = await parseResponseJson(res);
  if (!res.ok) {
    throw new Error(errorMessageFromBody(data, "Could not add this stop."));
  }
  return unwrapTripPayload(data);
}

/**
 * POST — system-picked place for a new stop (`addTripActivityAuto`), same endpoint as manual add.
 * No body. Backend decides auto mode when `placeId` is absent.
 */
export async function addTripActivityAuto(tripId, dayId) {
  const res = await fetch(
    apiUrl(
      `/api/public/trips/${encodeURIComponent(tripId)}/days/${encodeURIComponent(dayId)}/activities`
    ),
    {
      method: "POST",
      credentials: "include",
    }
  );
  const data = await parseResponseJson(res);
  if (!res.ok) {
    throw new Error(errorMessageFromBody(data, "Could not add a stop automatically."));
  }
  return unwrapTripPayload(data);
}

/**
 * Lists trips for an owner. When `ownerUserId` is the signed-in user (JWT cookie + credentials),
 * the API returns public and private trips; otherwise only public trips for that owner.
 * Expects `{ content: [...] }` or a plain array.
 */
export async function fetchMyTrips(ownerUserId) {
  const params = new URLSearchParams({
    userId: String(ownerUserId),
    pageNumber: "0",
    pageSize: "100",
  });
  const res = await fetch(apiUrl(`/api/public/trips?${params}`), authRequestInit());
  const data = await parseResponseJson(res);
  if (!res.ok) {
    throw new Error(
      errorMessageFromBody(
        data,
        catalogAuthRequiredMessage(res.status) ?? "Could not load your trips."
      )
    );
  }
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  return [];
}

/**
 * POST — 204 No Content on success.
 */
export async function postTripRating(tripId, userId, stars) {
  const res = await fetch(apiUrl(`/api/public/trips/${encodeURIComponent(tripId)}/ratings`), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, stars }),
  });
  if (res.status === 204) return null;
  const data = await parseResponseJson(res);
  if (!res.ok) {
    throw new Error(errorMessageFromBody(data, "Could not save your rating."));
  }
  return data;
}

/**
 * POST — 204 No Content on success.
 */
/**
 * Builds query string for GET /api/public/trips (pagination, sort, filters).
 * Repeats `categoryCodes` as separate query params when multiple.
 */
export function buildPublicTripsQueryString({
  pageNumber = 0,
  pageSize = 48,
  sortBy,
  sortOrder,
  categoryCodes = [],
  countryId,
  countryName,
  userId,
} = {}) {
  const q = new URLSearchParams();
  q.set("pageNumber", String(pageNumber));
  q.set("pageSize", String(pageSize));
  if (sortBy != null && String(sortBy).trim() !== "") {
    q.set("sortBy", String(sortBy).trim());
  }
  if (sortOrder != null && String(sortOrder).trim() !== "") {
    q.set("sortOrder", String(sortOrder).trim());
  }
  const codes = Array.isArray(categoryCodes) ? categoryCodes : [];
  for (const code of codes) {
    const c = code != null ? String(code).trim() : "";
    if (c) q.append("categoryCodes", c);
  }
  const name = countryName != null ? String(countryName).trim() : "";
  const id = countryId != null ? String(countryId).trim() : "";
  /** Prefer name when both sent: backend uses name only if id omitted; name match is often more reliable for city joins. */
  if (name) {
    q.set("countryName", name);
  } else if (id) {
    q.set("countryId", id);
  }
  if (userId != null && userId !== "") {
    q.set("userId", String(userId));
  }
  return q.toString();
}

/**
 * Paged public trip list. With filters, an empty page is valid; unfiltered empty may still error per API.
 */
export async function fetchPublicTripsList(options = {}) {
  const qs = buildPublicTripsQueryString(options);
  const res = await fetch(apiUrl(`/api/public/trips?${qs}`), authRequestInit());
  const data = await parseResponseJson(res);
  if (!res.ok) {
    throw new Error(
      errorMessageFromBody(
        data,
        catalogAuthRequiredMessage(res.status) ??
          (res.status >= 500
            ? "The server is busy right now. Please try again in a moment."
            : "We couldn’t load trips. Please refresh the page.")
      )
    );
  }
  const content = Array.isArray(data?.content) ? data.content : Array.isArray(data) ? data : [];
  return { raw: data, content };
}

/**
 * GET — public trips for a user (same filters/sort/pagination as GET /api/public/trips).
 * Owner sees all trips; others only `isPublic === true`.
 */
export async function fetchUserPublicTripsList(userId, options = {}) {
  const listOptions = { ...options };
  delete listOptions.userId;
  const qs = buildPublicTripsQueryString(listOptions);
  const res = await fetch(
    apiUrl(`/api/public/users/${encodeURIComponent(String(userId))}/trips?${qs}`),
    { credentials: "include" }
  );
  const data = await parseResponseJson(res);
  if (!res.ok) {
    throw new Error(
      errorMessageFromBody(
        data,
        res.status >= 500
          ? "The server is busy right now. Please try again in a moment."
          : "We couldn’t load this user’s trips."
      )
    );
  }
  const content = Array.isArray(data?.content) ? data.content : Array.isArray(data) ? data : [];
  return { raw: data, content };
}

/**
 * @deprecated Server PDF export — prefer client-side `exportTripPdfFromElement` (TripPrint layout).
 * GET PDF export. Triggers browser download using `Content-Disposition` filename when present.
 */
export async function downloadTripPdf(tripId, { largePhotos = true } = {}) {
  const qs = largePhotos ? "?largePhotos=true" : "";
  const res = await fetch(apiUrl(`/api/public/trips/${encodeURIComponent(tripId)}/pdf${qs}`), {
    credentials: "include",
  });
  if (!res.ok) {
    const data = await parseResponseJson(res);
    throw new Error(errorMessageFromBody(data, "Could not download the PDF."));
  }
  const blob = await res.blob();
  let filename = `trip-${tripId}.pdf`;
  const cd = res.headers.get("Content-Disposition");
  if (cd) {
    const m = /filename\*?=(?:UTF-8''|")?([^";\n]+)/i.exec(cd);
    if (m) {
      try {
        filename = decodeURIComponent(m[1].replace(/"/g, "").trim());
      } catch {
        filename = m[1].replace(/"/g, "").trim();
      }
    }
  }
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function postActivityRating(tripId, activityId, userId, stars) {
  const res = await fetch(
    apiUrl(
      `/api/public/trips/${encodeURIComponent(tripId)}/activities/${encodeURIComponent(activityId)}/ratings`
    ),
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, stars }),
    }
  );
  if (res.status === 204) return null;
  const data = await parseResponseJson(res);
  if (!res.ok) {
    throw new Error(errorMessageFromBody(data, "Could not save your rating."));
  }
  return data;
}
