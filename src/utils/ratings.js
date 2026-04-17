/** Current user's star rating (1–5) from various API shapes. */
export function extractUserStarRating(obj) {
  if (obj == null) return undefined;
  if (typeof obj === "number" && obj >= 1 && obj <= 5) return obj;
  if (typeof obj === "object" && obj.stars != null) {
    const n = Number(obj.stars);
    return Number.isFinite(n) && n >= 1 && n <= 5 ? n : undefined;
  }
  return undefined;
}

export function extractTripUserRating(trip) {
  if (!trip || typeof trip !== "object") return undefined;
  const r =
    trip.userRating ??
    trip.userTripRating ??
    trip.myRating ??
    trip.myTripRating ??
    trip.userTripStars;
  return extractUserStarRating(r);
}

export function extractActivityUserRating(activity) {
  if (!activity || typeof activity !== "object") return undefined;
  const r =
    activity.userRating ??
    activity.userStars ??
    activity.myRating ??
    activity.myStars ??
    activity.userActivityRating;
  return extractUserStarRating(r);
}
