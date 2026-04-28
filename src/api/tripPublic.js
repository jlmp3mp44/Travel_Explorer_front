import { apiUrl } from "../config/api";
import { parseResponseJson } from "../utils/friendlyErrors";
import { unwrapTripPayload } from "../utils/tripItinerary";

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
 * POST — body: { userId, reason: "WAS_HERE" | "DONT_WANT_TO_GO" } — returns full trip (same shape as GET by id).
 */
export async function replaceActivity(tripId, activityId, { userId, reason }) {
  const res = await fetch(
    apiUrl(
      `/api/public/trips/${encodeURIComponent(tripId)}/activities/${encodeURIComponent(activityId)}/replace`
    ),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, reason }),
    }
  );
  const data = await parseResponseJson(res);
  if (!res.ok) {
    throw new Error(errorMessageFromBody(data, "Could not replace this activity."));
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
 * DELETE — remove an activity (`ActivityManualEditRequest`: reason; `userId` for current user). Session required for owners.
 * Returns updated trip JSON when present; otherwise `null` (e.g. 204).
 */
export async function deleteTripActivity(tripId, activityId, { userId, reason }) {
  const res = await fetch(
    apiUrl(
      `/api/public/trips/${encodeURIComponent(tripId)}/activities/${encodeURIComponent(activityId)}`
    ),
    {
      method: "DELETE",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, reason }),
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
 * POST — add an activity to a day (no body; path params + session). Session required for owners.
 */
export async function addDayActivity(tripId, dayId) {
  const res = await fetch(
    apiUrl(
      `/api/public/trips/${encodeURIComponent(tripId)}/days/${encodeURIComponent(dayId)}/activities`
    ),
    {
      method: "POST",
      credentials: "include",
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
  const res = await fetch(apiUrl(`/api/public/trips?${params}`), {
    credentials: "include",
  });
  const data = await parseResponseJson(res);
  if (!res.ok) {
    throw new Error(errorMessageFromBody(data, "Could not load your trips."));
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
  const res = await fetch(apiUrl(`/api/public/trips?${qs}`), {
    credentials: "include",
  });
  const data = await parseResponseJson(res);
  if (!res.ok) {
    throw new Error(
      errorMessageFromBody(
        data,
        res.status >= 500
          ? "The server is busy right now. Please try again in a moment."
          : "We couldn’t load trips. Please refresh the page."
      )
    );
  }
  const content = Array.isArray(data?.content) ? data.content : Array.isArray(data) ? data : [];
  return { raw: data, content };
}

/**
 * GET PDF export. Triggers browser download using `Content-Disposition` filename when present.
 */
export async function downloadTripPdf(tripId) {
  const res = await fetch(apiUrl(`/api/public/trips/${encodeURIComponent(tripId)}/pdf`), {
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
