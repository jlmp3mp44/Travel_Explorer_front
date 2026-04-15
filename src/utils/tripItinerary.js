/**
 * Map various backend JSON shapes to the structure TripDetails expects:
 * { days: [{ date, activities: [{ startTime, endTime, places: [{ title }] }] }] }
 */

function normalizePlace(p) {
  if (p == null) return null;
  if (typeof p === "string") return { title: p };
  const title = p.title ?? p.name ?? p.placeName ?? p.label ?? p.placeTitle ?? "";
  if (!title) return null;
  return { title: String(title) };
}

/** Backend may send one place as an object, or a map keyed by index — normalize to an array. */
function coercePlacesArray(raw) {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "object") {
    if (raw.title != null || raw.name != null || raw.placeName != null) {
      return [raw];
    }
    const vals = Object.values(raw);
    if (vals.length > 0 && typeof vals[0] === "object") {
      return vals;
    }
  }
  return [];
}

function normalizeActivity(act) {
  if (!act) return null;
  const startTime = formatTimeSlot(act.startTime ?? act.start ?? "");
  const endTime = formatTimeSlot(act.endTime ?? act.end ?? "");
  const placesRaw = coercePlacesArray(
    act.places ?? act.placeList ?? act.place_list ?? act.locations ?? act.venueList ?? act.stopovers ?? act.place
  );
  const places = placesRaw.map(normalizePlace).filter(Boolean);

  /* Activity-level title if no nested places (some APIs flatten this) */
  if (places.length === 0) {
    const flat = act.title ?? act.placeName ?? act.name ?? act.label;
    if (flat != null && String(flat).trim() !== "") {
      return { startTime, endTime, places: [{ title: String(flat) }] };
    }
  }

  return { startTime, endTime, places };
}

/** Show time as HH:mm when value looks like ISO or has T */
function formatTimeSlot(v) {
  if (v == null || v === "") return "—";
  const s = String(v);
  if (s.includes("T") && s.length >= 16) {
    try {
      const d = new Date(s);
      if (!Number.isNaN(d.getTime())) {
        return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
      }
    } catch {
      /* ignore */
    }
  }
  return s;
}

/** Jackson may serialize LocalDate as [y,m,d] or ISO string */
function coerceDateValue(val) {
  if (val == null) return "";
  if (typeof val === "string") return val.trim();
  if (Array.isArray(val) && val.length >= 3) {
    const y = val[0];
    const m = val[1];
    const d = val[2];
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  return String(val);
}

function coerceActivitiesArray(raw) {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "object") {
    if (
      "places" in raw ||
      "place" in raw ||
      "startTime" in raw ||
      "endTime" in raw ||
      "locations" in raw ||
      "venueList" in raw
    ) {
      return [raw];
    }
    return Object.values(raw).filter((v) => v != null && typeof v === "object");
  }
  return [];
}

function normalizeDay(day) {
  if (!day) return null;
  const rawDate =
    day.date ??
    day.dayDate ??
    day.localDate ??
    day.dateString ??
    (typeof day.day === "string" ? day.day : day.day);
  const date = coerceDateValue(rawDate);
  const activitiesRaw = coerceActivitiesArray(
    day.activities ?? day.activityList ?? day.activity_list ?? day.slots ?? day.items ?? day.blocks ?? day.events
  );
  const activities = activitiesRaw.map(normalizeActivity).filter(Boolean);
  return { date: date ? String(date) : "", activities };
}

/**
 * API may wrap the trip: `{ "data": { ... } }`, `{ "trip": {...} }`, Spring `content`, etc.
 */
export function unwrapTripPayload(raw) {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return raw;
  }
  if (raw.id != null && (raw.startDate != null || raw.endDate != null || raw.days != null)) {
    return raw;
  }
  const nested =
    raw.data ??
    raw.trip ??
    raw.result ??
    raw.payload ??
    raw.body ??
    (raw.content && typeof raw.content === "object" && !Array.isArray(raw.content)
      ? raw.content
      : null);
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    return unwrapTripPayload(nested);
  }
  return raw;
}

/**
 * GET /api/public/trips/:id often returns `"days": []` while the POST /trips response
 * included full `days`. When ids match and GET has no days, copy `days` from the create response.
 */
export function mergeTripWithPostResponse(getTrip, postTrip) {
  if (!getTrip || typeof getTrip !== "object") return getTrip;
  if (!postTrip || typeof postTrip !== "object") return getTrip;
  if (String(postTrip.id) !== String(getTrip.id)) return getTrip;
  const getDays = Array.isArray(getTrip.days) ? getTrip.days : [];
  const postDays = Array.isArray(postTrip.days) ? postTrip.days : [];
  if (getDays.length === 0 && postDays.length > 0) {
    return { ...getTrip, days: postDays };
  }
  return getTrip;
}

/** Trip title as returned by the API (may be numeric — backend-generated). */
export function formatTripHeroTitle(trip) {
  if (!trip) return "Trip";
  const title = trip.title != null ? String(trip.title).trim() : "";
  return title || "Trip";
}

/**
 * Returns normalized days array, or [] if nothing usable.
 */
export function normalizeTripDays(trip) {
  if (!trip || typeof trip !== "object") return [];
  const raw =
    trip.days ??
    trip.tripDays ??
    trip.trip_days ??
    trip.itinerary ??
    trip.dayPlans ??
    trip.day_plans ??
    trip.schedule ??
    trip.plan;
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeDay).filter(Boolean);
}

function activityHasDetail(a) {
  if (!a) return false;
  if (Array.isArray(a.places) && a.places.some((p) => p && String(p.title ?? "").trim())) {
    return true;
  }
  const st = String(a.startTime ?? "").trim();
  const en = String(a.endTime ?? "").trim();
  if (st && st !== "—") return true;
  if (en && en !== "—") return true;
  return false;
}

function dayHasDetail(d) {
  return Array.isArray(d?.activities) && d.activities.some(activityHasDetail);
}

/**
 * Real itinerary rows only — no filler copy when the API omits activities.
 */
export function resolveTripDaysForDisplay(trip) {
  const normalized = normalizeTripDays(trip);
  const hasReal = normalized.length > 0 && normalized.some(dayHasDetail);
  if (hasReal) {
    return { days: normalized, isPlaceholder: false };
  }
  return { days: [], isPlaceholder: true };
}
