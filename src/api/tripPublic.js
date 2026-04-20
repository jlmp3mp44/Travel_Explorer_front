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
