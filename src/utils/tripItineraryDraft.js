import { getActivityPlacesForDisplay, resolveTripDaysForDisplay } from "./tripItinerary";

export const PENDING_ACTIVITY_PREFIX = "pending:";

export function isPendingActivityId(id) {
  return id != null && String(id).startsWith(PENDING_ACTIVITY_PREFIX);
}

function normalizePlaceForDraft(place) {
  if (place == null) return { title: "Place" };
  const title =
    place.title ??
    place.name ??
    place.placeName ??
    place.displayName ??
    place.label ??
    "Place";
  const photoRaw = place.photoUrl ?? place.photo_url;
  const photoUrl =
    photoRaw != null && String(photoRaw).trim() !== "" ? String(photoRaw).trim() : undefined;
  const pid = place.id ?? place.placeId;
  const base = { title: String(title) };
  if (photoUrl) base.photoUrl = photoUrl;
  if (pid != null) base.id = pid;
  return base;
}

export function cloneTripShallow(trip) {
  if (!trip) return trip;
  return {
    ...trip,
    days: Array.isArray(trip.days)
      ? trip.days.map((d) => ({
          ...d,
          activities: Array.isArray(d.activities)
            ? d.activities.map((a) => ({
                ...a,
                places: Array.isArray(a.places) ? [...a.places] : a.places,
                displayPlaces: Array.isArray(a.displayPlaces)
                  ? [...a.displayPlaces]
                  : a.displayPlaces,
              }))
            : d.activities,
        }))
      : trip.days,
  };
}

export function removeActivityFromTrip(trip, activityId) {
  const next = cloneTripShallow(trip);
  const days = extractTripDaysRawMutable(next);
  for (const day of days) {
    const acts = coerceActs(day);
    day.activities = acts.filter((a) => String(pickActId(a)) !== String(activityId));
  }
  return next;
}

export function reorderActivitiesInTrip(trip, dayId, fromIndex, toIndex) {
  const next = cloneTripShallow(trip);
  const day = findDay(next, dayId);
  if (!day) return next;
  const acts = [...coerceActs(day)];
  if (fromIndex < 0 || fromIndex >= acts.length || toIndex < 0 || toIndex >= acts.length) {
    return next;
  }
  const [item] = acts.splice(fromIndex, 1);
  acts.splice(toIndex, 0, item);
  day.activities = acts;
  return next;
}

export function addPendingActivityToTrip(trip, dayId, place, tempId) {
  const next = cloneTripShallow(trip);
  const day = findDay(next, dayId);
  if (!day) return next;
  const normalized = normalizePlaceForDraft(place);
  const activity = {
    id: tempId,
    startTime: "—",
    endTime: "—",
    places: [normalized],
    displayPlaces: [normalized],
    sortOrder: coerceActs(day).length,
  };
  day.activities = [...coerceActs(day), activity];
  return next;
}

export function replaceActivityPlaceInTrip(trip, activityId, place) {
  const next = cloneTripShallow(trip);
  const days = extractTripDaysRawMutable(next);
  const normalized = normalizePlaceForDraft(place);
  for (const day of days) {
    const acts = coerceActs(day);
    let changed = false;
    day.activities = acts.map((a) => {
      if (String(pickActId(a)) !== String(activityId)) return a;
      changed = true;
      return {
        ...a,
        places: [normalized],
        displayPlaces: [normalized],
        userPreference: undefined,
      };
    });
    if (changed) break;
  }
  return next;
}

export function applySmartReplacePreview(trip, activityId, data) {
  const payload = data?.trip ?? data;
  if (!payload) return trip;
  const merged = cloneTripShallow(trip);
  const days = extractTripDaysRawMutable(merged);
  const fromApi = extractTripDaysRawMutable(payload);
  for (const day of days) {
    const acts = coerceActs(day);
    day.activities = acts.map((a) => {
      if (String(pickActId(a)) !== String(activityId)) return a;
      const apiDay = fromApi.find((d) => String(d.id) === String(day.id));
      const apiAct = apiDay?.activities?.find((x) => String(pickActId(x)) === String(activityId));
      if (apiAct) return { ...a, ...apiAct };
      return a;
    });
  }
  return merged;
}

export function serializeItineraryFingerprint(trip) {
  if (!trip) return "";
  const { days } = resolveTripDaysForDisplay(trip);
  return JSON.stringify(
    days.map((d) => ({
      dayId: d.id,
      activities: (d.activities ?? []).map((a) => {
        const places = getActivityPlacesForDisplay(a);
        return {
          id: a.id,
          places: places.map((p) => ({
            pid: p.id ?? p.placeId ?? null,
            title: p.title ?? "",
          })),
        };
      }),
    }))
  );
}

function extractTripDaysRawMutable(trip) {
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
  if (!Array.isArray(arr)) return [];
  if (!trip.days) trip.days = arr;
  return arr;
}

function findDay(trip, dayId) {
  return extractTripDaysRawMutable(trip).find((d) => String(d.id) === String(dayId));
}

function coerceActs(day) {
  const raw = day.activities ?? day.activityList ?? [];
  return Array.isArray(raw) ? raw : [];
}

function pickActId(a) {
  return a?.id;
}

export function nextPendingActivityId() {
  return `${PENDING_ACTIVITY_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
