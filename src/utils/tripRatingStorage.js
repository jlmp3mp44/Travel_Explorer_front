/**
 * Persists the current user's trip/activity star ratings so the UI survives reloads
 * when GET /trips/:id does not echo userRating yet.
 */
function key(userId, tripId) {
  return `tripUserRatings:${userId}:${tripId}`;
}

export function readStoredUserRatings(userId, tripId) {
  if (typeof window === "undefined" || userId == null || tripId == null) {
    return { trip: undefined, activities: {} };
  }
  try {
    const raw = window.localStorage.getItem(key(userId, tripId));
    if (!raw) return { trip: undefined, activities: {} };
    const parsed = JSON.parse(raw);
    const trip = typeof parsed.trip === "number" && parsed.trip >= 1 && parsed.trip <= 5 ? parsed.trip : undefined;
    const activities = {};
    if (parsed.activities && typeof parsed.activities === "object") {
      for (const [k, v] of Object.entries(parsed.activities)) {
        if (typeof v === "number" && v >= 1 && v <= 5) activities[k] = v;
      }
    }
    return { trip, activities };
  } catch {
    return { trip: undefined, activities: {} };
  }
}

/**
 * @param {{ trip?: number; activities?: Record<string, number> }} patch
 */
export function persistUserTripRating(userId, tripId, patch) {
  if (typeof window === "undefined" || userId == null || tripId == null) return;
  try {
    const prev = readStoredUserRatings(userId, tripId);
    const next = {
      trip: patch.trip !== undefined ? patch.trip : prev.trip,
      activities: { ...prev.activities, ...(patch.activities || {}) },
    };
    window.localStorage.setItem(key(userId, tripId), JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
}

/** Remove one activity’s stars (e.g. after replace/delete when the slot is semantically new). */
export function removePersistedActivityRating(userId, tripId, activityId) {
  if (typeof window === "undefined" || userId == null || tripId == null || activityId == null) {
    return;
  }
  try {
    const prev = readStoredUserRatings(userId, tripId);
    const activities = { ...prev.activities };
    delete activities[String(activityId)];
    delete activities[activityId];
    window.localStorage.setItem(
      key(userId, tripId),
      JSON.stringify({ trip: prev.trip, activities })
    );
  } catch {
    /* ignore */
  }
}
