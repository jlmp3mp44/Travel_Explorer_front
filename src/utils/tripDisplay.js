/**
 * Display helpers for trip list/detail payloads (owner, categories).
 */

export function tripOwnerDisplayName(trip) {
  if (!trip || typeof trip !== "object") return "";
  const o = trip.owner;
  if (o && typeof o === "object") {
    const u = o.username ?? o.userName ?? o.name;
    if (u != null && String(u).trim() !== "") return String(u).trim();
  }
  return (
    trip.ownerUsername ??
    trip.ownerName ??
    trip.ownerDisplayName ??
    trip.createdByUsername ??
    ""
  );
}

export function tripOwnerId(trip) {
  if (!trip || typeof trip !== "object") return null;
  const o = trip.owner;
  if (o && typeof o === "object" && o.id != null) return o.id;
  if (trip.ownerId != null) return trip.ownerId;
  if (trip.userId != null) return trip.userId;
  return null;
}

/**
 * Normalize trip category / place-type entries to human-readable strings for chips.
 */
export function extractTripCategoryLabels(trip) {
  if (!trip || typeof trip !== "object") return [];

  const raw =
    trip.tripPlaceCategories ??
    trip.placeCategories ??
    trip.trip_place_categories ??
    trip.categories ??
    trip.categoryCodes ??
    trip.interests;

  if (raw == null) return [];

  const asArray = Array.isArray(raw) ? raw : typeof raw === "object" ? Object.values(raw) : [];

  const labels = [];
  const seen = new Set();

  for (const item of asArray) {
    if (item == null) continue;
    if (typeof item === "string") {
      const t = item.trim();
      if (t && !seen.has(t.toLowerCase())) {
        seen.add(t.toLowerCase());
        labels.push(t);
      }
      continue;
    }
    if (typeof item === "object") {
      const label =
        item.label ??
        item.name ??
        item.title ??
        item.interestName ??
        item.displayName ??
        item.code ??
        item.slug ??
        item.categoryCode;
      const t = label != null ? String(label).trim() : "";
      if (t && !seen.has(t.toLowerCase())) {
        seen.add(t.toLowerCase());
        labels.push(t);
      }
    }
  }
  return labels;
}

/** First itinerary photo URL on trip list/detail payloads (camelCase or snake_case). */
export function tripCoverPhotoUrl(trip) {
  if (!trip || typeof trip !== "object") return "";
  const u = trip.coverPhotoUrl ?? trip.cover_photo_url;
  return u != null && String(u).trim() !== "" ? String(u).trim() : "";
}

/** Place photo from `PlaceResponse` (or normalized place object). */
export function placePhotoUrl(place) {
  if (!place || typeof place !== "object") return "";
  const u = place.photoUrl ?? place.photo_url;
  return u != null && String(u).trim() !== "" ? String(u).trim() : "";
}
