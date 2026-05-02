/**
 * Map various backend JSON shapes to the structure TripDetails expects:
 * { days: [{ date, activities: [{ startTime, endTime, places: [{ title }] }] }] }
 */

function normalizePlace(p) {
  if (p == null) return null;
  if (typeof p === "string") return { title: p };
  const title =
    p.title ??
    p.name ??
    p.placeName ??
    p.label ??
    p.placeTitle ??
    p.displayName ??
    p.text ??
    "";
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

function pickNumericId(v) {
  if (v == null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/** Activity id may be Long or string (e.g. UUID) from the API. */
function pickActivityId(v) {
  if (v == null || v === "") return undefined;
  if (typeof v === "string") {
    const t = v.trim();
    if (!t) return undefined;
    const n = Number(t);
    if (Number.isFinite(n) && String(n) === t) return n;
    return t;
  }
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return undefined;
}

function normalizeUserPreference(raw) {
  if (!raw || typeof raw !== "object") return null;
  const reason = raw.reason ?? raw.changeReason;
  if (reason !== "WAS_HERE" && reason !== "DONT_WANT_TO_GO") return null;
  const rpRaw = raw.replacementPlaces ?? raw.replacement_places ?? [];
  const replacementPlaces = coercePlacesArray(rpRaw).map(normalizePlace).filter(Boolean);
  return { reason, replacementPlaces };
}

function normalizeActivity(act) {
  if (!act) return null;
  const id = pickActivityId(act.id);
  const sortOrder = act.sortOrder != null ? Number(act.sortOrder) : undefined;
  const averageRating =
    act.averageRating != null ? Number(act.averageRating) : undefined;
  const ratingCount = act.ratingCount != null ? Number(act.ratingCount) : undefined;
  const startTime = formatTimeSlot(act.startTime ?? act.start ?? "");
  const endTime = formatTimeSlot(act.endTime ?? act.end ?? "");
  const placesRaw = coercePlacesArray(
    act.places ?? act.placeList ?? act.place_list ?? act.locations ?? act.venueList ?? act.stopovers ?? act.place
  );
  let places = placesRaw.map(normalizePlace).filter(Boolean);
  const userPreference = normalizeUserPreference(act.userPreference);
  const userRatingStars =
    act.userRating != null ||
    act.userStars != null ||
    act.myRating != null ||
    act.myStars != null
      ? (() => {
          const raw =
            act.userRating ?? act.userStars ?? act.myRating ?? act.myStars ?? act.userActivityRating;
          if (typeof raw === "number" && raw >= 1 && raw <= 5) return raw;
          if (raw && typeof raw === "object" && raw.stars != null) {
            const n = Number(raw.stars);
            return Number.isFinite(n) && n >= 1 && n <= 5 ? n : undefined;
          }
          return undefined;
        })()
      : undefined;

  const meta = {
    id,
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : undefined,
    averageRating: Number.isFinite(averageRating) ? averageRating : undefined,
    ratingCount: Number.isFinite(ratingCount) ? ratingCount : undefined,
    ...(userRatingStars != null ? { userRating: userRatingStars } : {}),
  };

  /* Activity-level title if no nested places (some APIs flatten this) */
  if (places.length === 0) {
    const flat = act.title ?? act.placeName ?? act.name ?? act.label;
    if (flat != null && String(flat).trim() !== "") {
      places = [{ title: String(flat) }];
    }
  }

  const displayPlaces =
    userPreference && userPreference.replacementPlaces.length > 0
      ? userPreference.replacementPlaces
      : places;

  return {
    ...meta,
    startTime,
    endTime,
    places,
    displayPlaces,
    ...(userPreference ? { userPreference } : {}),
  };
}

/**
 * Places to show for maps and itinerary: replacement when the user chose one, else canonical `places`.
 */
export function getActivityPlacesForDisplay(activity) {
  if (!activity) return [];
  if (Array.isArray(activity.displayPlaces) && activity.displayPlaces.length > 0) {
    return activity.displayPlaces;
  }
  return activity.places ?? [];
}

export const REPLACEMENT_REASON_LABELS = {
  WAS_HERE: "I was here",
  DONT_WANT_TO_GO: "I don’t want to go here",
};

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
  const dayId = pickNumericId(day.id);
  const activitiesRaw = coerceActivitiesArray(
    day.activities ?? day.activityList ?? day.activity_list ?? day.slots ?? day.items ?? day.blocks ?? day.events
  );
  let activities = activitiesRaw.map(normalizeActivity).filter(Boolean);
  activities.sort((a, b) => {
    const ao = a.sortOrder ?? 0;
    const bo = b.sortOrder ?? 0;
    return ao - bo;
  });
  return { id: dayId, date: date ? String(date) : "", activities };
}

/** Raw days array — hoisted `function` so `unwrapTripPayload` can use it. */
function extractTripDaysRaw(trip) {
  if (!trip || typeof trip !== "object") return [];
  const arr =
    trip.days ??
    trip.tripDays ??
    trip.trip_days ??
    trip.itinerary ??
    trip.dayPlans ??
    trip.day_plans ??
    trip.schedule ??
    trip.plan;
  return Array.isArray(arr) ? arr : [];
}

/**
 * API may wrap the trip: `{ "data": { ... } }`, `{ "trip": {...} }`, Spring `content`, etc.
 */
export function unwrapTripPayload(raw) {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return raw;
  }
  if (
    raw.id != null &&
    (raw.startDate != null ||
      raw.endDate != null ||
      raw.days != null ||
      extractTripDaysRaw(raw).length > 0)
  ) {
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
 * GET /api/public/trips/:id often returns empty itinerary while POST /trips returned it.
 * When ids match and GET has no days, copy days from the create response (any known days key).
 */
export function mergeTripWithPostResponse(getTrip, postTrip) {
  if (!getTrip || typeof getTrip !== "object") return getTrip;
  if (!postTrip || typeof postTrip !== "object") return getTrip;
  if (String(postTrip.id) !== String(getTrip.id)) return getTrip;
  const getDays = extractTripDaysRaw(getTrip);
  const postDays = extractTripDaysRaw(postTrip);
  if (getDays.length === 0 && postDays.length > 0) {
    return { ...getTrip, days: postDays };
  }
  return getTrip;
}

/**
 * Clears per-user activity rating fields on the matching activity id (raw API shape).
 * Used after replace so the UI does not keep stars tied to the previous stop when ids are reused.
 */
export function stripActivityUserRatingForId(trip, activityId) {
  if (!trip || typeof trip !== "object" || activityId == null) return trip;
  const idStr = String(activityId);
  const rawDays = trip.days;
  if (!Array.isArray(rawDays)) return trip;
  const days = rawDays.map((day) => {
    if (!day || typeof day !== "object") return day;
    const acts = day.activities ?? day.activityList;
    if (!Array.isArray(acts)) return day;
    const activities = acts.map((a) => {
      if (!a || typeof a !== "object" || String(a.id) !== idStr) return a;
      const next = { ...a };
      delete next.userRating;
      delete next.userStars;
      delete next.myRating;
      delete next.myStars;
      delete next.userActivityRating;
      return next;
    });
    return { ...day, activities };
  });
  return { ...trip, days };
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
  const raw = extractTripDaysRaw(trip);
  if (raw.length === 0) return [];
  return raw.map(normalizeDay).filter(Boolean);
}

function activityHasDetail(a) {
  if (!a) return false;
  if (a.id != null && String(a.id).trim() !== "") return true;
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

function dayHasActivities(d) {
  return Array.isArray(d?.activities) && d.activities.length > 0;
}

/**
 * Prefer real rows (places/times/ids). If the API returns activities without parsed titles yet,
 * still show days that contain activities so new trips are not blank after create.
 */
export function resolveTripDaysForDisplay(trip) {
  const normalized = normalizeTripDays(trip);
  if (normalized.length === 0) {
    return { days: [], isPlaceholder: true };
  }
  const hasRich = normalized.some(dayHasDetail);
  const hasActivities = normalized.some(dayHasActivities);
  if (hasRich || hasActivities) {
    return { days: normalized, isPlaceholder: false };
  }
  return { days: [], isPlaceholder: true };
}
