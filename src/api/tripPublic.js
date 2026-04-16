import { apiUrl } from "../config/api";
import { parseResponseJson } from "../utils/friendlyErrors";

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

/**
 * POST — returns full trip (same shape as GET by id).
 */
export async function replaceActivity(tripId, activityId) {
  const res = await fetch(
    apiUrl(
      `/api/public/trips/${encodeURIComponent(tripId)}/activities/${encodeURIComponent(activityId)}/replace`
    ),
    { method: "POST" }
  );
  const data = await parseResponseJson(res);
  if (!res.ok) {
    throw new Error(errorMessageFromBody(data, "Could not replace this activity."));
  }
  return data;
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
