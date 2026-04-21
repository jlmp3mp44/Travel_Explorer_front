import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  addDayActivity,
  deletePublicTrip,
  deleteTripActivity,
  fetchMyTrips,
  postActivityRating,
  postTripRating,
  publicTripUrl,
  reorderDayActivities,
  replaceActivity,
  updatePublicTrip,
} from "../api/tripPublic";
import {
  friendlyNetworkError,
  friendlyPublicLoadError,
  parseResponseJson,
} from "../utils/friendlyErrors";
import {
  formatTripHeroTitle,
  getActivityPlacesForDisplay,
  mergeTripWithPostResponse,
  resolveTripDaysForDisplay,
  stripActivityUserRatingForId,
  unwrapTripPayload,
} from "../utils/tripItinerary";
import { useAuth } from "../context/AuthContext";
import { isTripOwnerFromPayload } from "../utils/tripOwnership";
import { extractTripUserRating } from "../utils/ratings";
import {
  persistUserTripRating,
  readStoredUserRatings,
  removePersistedActivityRating,
} from "../utils/tripRatingStorage";
import TripRouteMap from "../components/TripRouteMap";
import TripDetailsSkeleton from "../components/skeletons/TripDetailsSkeleton";
import "../components/TripDetails.css";

function formatAvg(n) {
  if (n == null || Number.isNaN(Number(n))) return null;
  return Number(n).toFixed(1);
}

/** Move array item from `from` to `to` (inclusive indices). */
function moveItem(arr, from, to) {
  if (from === to) return arr;
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function activityDndKey(dayId, index) {
  return `${dayId}-${index}`;
}

function ActivityTrashIcon() {
  return (
    <svg
      className="trip-activity-sq__icon"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

function StarPicker({ value, onPick, disabled, label = "Rate" }) {
  const v = value != null && value >= 1 && value <= 5 ? value : null;
  return (
    <div
      className="trip-star-picker"
      role="radiogroup"
      aria-label={label}
      aria-valuemin={1}
      aria-valuemax={5}
      aria-valuenow={v ?? undefined}
    >
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          className={[
            "trip-star-picker__btn",
            v != null && s <= v ? "trip-star-picker__btn--filled" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          disabled={disabled}
          onClick={() => onPick(s)}
          aria-label={`${label}: ${s} out of 5 stars`}
          aria-pressed={v != null && s <= v ? "true" : "false"}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function readStoredTripSnapshot(id) {
  if (typeof window === "undefined" || !id) return null;
  try {
    const raw = window.localStorage.getItem(`tripSnapshot:${id}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && String(parsed.id) === String(id) ? parsed : null;
  } catch {
    return null;
  }
}

function persistTripSnapshot(trip) {
  if (typeof window === "undefined" || !trip?.id) return;
  try {
    window.localStorage.setItem(`tripSnapshot:${trip.id}`, JSON.stringify(trip));
  } catch {
    /* ignore storage failures */
  }
}

function TripDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  /** Full trip JSON from POST /trips — used when GET returns empty `days`. */
  const postCreateSnapshot = useMemo(() => {
    const s = location.state?.tripSnapshot;
    if (s && String(s.id) === String(id)) return s;
    return readStoredTripSnapshot(id);
  }, [id, location.state]);

  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(null);
  const [dndDraggingKey, setDndDraggingKey] = useState(null);
  const [dndDropTargetKey, setDndDropTargetKey] = useState(null);
  /** `{ activityId, mode?: 'replace' | 'delete' }` while choosing reason for replace or delete */
  const [replaceModal, setReplaceModal] = useState(null);
  const replaceModalDescId = useId();
  const replaceModalFirstFocusRef = useRef(null);
  const [canEditVisibility, setCanEditVisibility] = useState(null);
  const [visibilityBusy, setVisibilityBusy] = useState(false);
  const [shareStatus, setShareStatus] = useState("");
  /** Fallback when API omits user rating on GET */
  const [localRatings, setLocalRatings] = useState({ trip: undefined, activities: {} });
  /** Bumps when persisted activity ratings are removed so `storedRatings` re-reads localStorage. */
  const [ratingStorageRev, setRatingStorageRev] = useState(0);
  /** Inline two-step delete (no blocking browser dialog). */
  const [wholeTripDeleteConfirm, setWholeTripDeleteConfirm] = useState(false);

  const displayDays = useMemo(() => {
    if (!trip) return [];
    return resolveTripDaysForDisplay(trip).days;
  }, [trip]);

  /**
   * Map geocoding is expensive; `TripRouteMap` only reloads when this snapshot changes.
   * Edits keep the live `trip` in sync; user clicks "Update map" to copy `trip` here.
   */
  const [tripSnapshotForMap, setTripSnapshotForMap] = useState(null);

  useEffect(() => {
    setTripSnapshotForMap(null);
  }, [id]);

  useEffect(() => {
    if (trip && String(trip.id) === String(id)) {
      setTripSnapshotForMap((prev) => (prev == null ? trip : prev));
    }
  }, [trip, id]);

  const mapDisplayDays = useMemo(() => {
    const t = tripSnapshotForMap;
    if (!t) return [];
    return resolveTripDaysForDisplay(t).days;
  }, [tripSnapshotForMap]);

  const handleUpdateRouteMap = useCallback(() => {
    if (trip && String(trip.id) === String(id)) {
      setTripSnapshotForMap(trip);
    }
  }, [trip, id]);

  const performDeleteTrip = useCallback(async () => {
    if (!trip?.id) return;
    setActionError("");
    setBusy("delete-trip");
    setWholeTripDeleteConfirm(false);
    try {
      await deletePublicTrip(trip.id);
      if (typeof window !== "undefined") {
        try {
          window.localStorage.removeItem(`tripSnapshot:${trip.id}`);
        } catch {
          /* ignore */
        }
      }
      navigate("/", { replace: true, state: { tripDeleted: true } });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not delete this trip.");
    } finally {
      setBusy(null);
    }
  }, [trip?.id, navigate]);

  const heroTitle = useMemo(() => formatTripHeroTitle(trip), [trip]);

  /** Cached ratings from localStorage (survives reload when GET omits userRating). */
  const storedRatings = useMemo(() => {
    if (!trip?.id || user?.id == null) return { trip: undefined, activities: {} };
    return readStoredUserRatings(user.id, trip.id);
  }, [trip?.id, user?.id, ratingStorageRev]);

  const tripStarValue = useMemo(() => {
    if (!trip) return undefined;
    const fromApi = extractTripUserRating(trip);
    if (fromApi != null) return fromApi;
    if (localRatings.trip != null) return localRatings.trip;
    return storedRatings.trip;
  }, [trip, localRatings.trip, storedRatings.trip]);

  const tripIsPublic = useMemo(() => {
    if (!trip) return true;
    const v = trip.isPublic ?? trip.is_public;
    if (v === false) return false;
    return true;
  }, [trip]);

  const isTripOwner = useMemo(() => isTripOwnerFromPayload(trip, user), [trip, user]);

  const refetchTrip = useCallback(async () => {
    if (!id) return;
    setRefreshing(true);
    setLoadError("");
    try {
      const res = await fetch(publicTripUrl(id, user?.id));
      const data = await parseResponseJson(res);
      if (!res.ok) {
        setLoadError(friendlyPublicLoadError(res.status, "trip"));
        return;
      }
      const merged = mergeTripWithPostResponse(unwrapTripPayload(data), postCreateSnapshot);
      persistTripSnapshot(merged);
      setTrip(merged);
    } catch (err) {
      console.error("Error fetching trip:", err);
      setLoadError(friendlyNetworkError(err));
    } finally {
      setRefreshing(false);
    }
  }, [id, postCreateSnapshot, user?.id]);

  const handleRateTrip = useCallback(
    async (stars) => {
      if (!trip?.id || user?.id == null) return;
      setActionError("");
      setBusy("rate-trip");
      try {
        await postTripRating(trip.id, user.id, stars);
        persistUserTripRating(user.id, trip.id, { trip: stars });
        setLocalRatings((prev) => ({ ...prev, trip: stars }));
        await refetchTrip();
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Could not save rating.");
      } finally {
        setBusy(null);
      }
    },
    [trip?.id, user?.id, refetchTrip]
  );

  const handleRateActivity = useCallback(
    async (activityId, stars) => {
      if (!trip?.id || user?.id == null) return;
      setActionError("");
      setBusy(`rate-act:${activityId}`);
      try {
        await postActivityRating(trip.id, activityId, user.id, stars);
        persistUserTripRating(user.id, trip.id, {
          activities: { [String(activityId)]: stars },
        });
        setLocalRatings((prev) => ({
          ...prev,
          activities: { ...prev.activities, [activityId]: stars },
        }));
        await refetchTrip();
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Could not save rating.");
      } finally {
        setBusy(null);
      }
    },
    [trip?.id, user?.id, refetchTrip]
  );

  const handleReorderDay = useCallback(
    async (day, reorderedActivities) => {
      if (!trip?.id || day.id == null) return;
      const ids = reorderedActivities.map((a) => a.id).filter((x) => x != null);
      if (ids.length !== reorderedActivities.length) return;
      setActionError("");
      setBusy(`reorder:${day.id}`);
      try {
        await reorderDayActivities(trip.id, day.id, ids);
        await refetchTrip();
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Could not reorder activities.");
      } finally {
        setBusy(null);
      }
    },
    [trip?.id, refetchTrip]
  );

  const handleActivityDragStart = useCallback((e, day, fromIndex) => {
    if (day.id == null) return;
    e.dataTransfer.setData(
      "application/x-trip-activity-order",
      JSON.stringify({ dayId: day.id, fromIndex })
    );
    e.dataTransfer.effectAllowed = "move";
    setDndDraggingKey(activityDndKey(day.id, fromIndex));
  }, []);

  const handleActivityDragEnd = useCallback(() => {
    setDndDraggingKey(null);
    setDndDropTargetKey(null);
  }, []);

  const handleActivityDragOver = useCallback((e, day, overIndex) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (day.id != null) setDndDropTargetKey(activityDndKey(day.id, overIndex));
  }, []);

  const handleActivityDrop = useCallback(
    (e, day, toIndex) => {
      e.preventDefault();
      const raw = e.dataTransfer.getData("application/x-trip-activity-order");
      if (!raw) return;
      let payload;
      try {
        payload = JSON.parse(raw);
      } catch {
        return;
      }
      const { dayId, fromIndex } = payload;
      if (dayId !== day.id || typeof fromIndex !== "number") return;
      if (fromIndex === toIndex) {
        handleActivityDragEnd();
        return;
      }
      const acts = [...(day.activities ?? [])];
      const reordered = moveItem(acts, fromIndex, toIndex);
      handleReorderDay(day, reordered);
      setDndDraggingKey(null);
      setDndDropTargetKey(null);
    },
    [handleActivityDragEnd, handleReorderDay]
  );

  const handleReplaceOrDeleteReason = useCallback(
    async (reason) => {
      if (!trip?.id || user?.id == null || !replaceModal?.activityId) return;
      const activityId = replaceModal.activityId;
      const mode = replaceModal.mode ?? "replace";
      setActionError("");
      setBusy(mode === "delete" ? `del:${activityId}` : `replace:${activityId}`);
      try {
        if (mode === "delete") {
          const updated = await deleteTripActivity(trip.id, activityId, {
            userId: user.id,
            reason,
          });
          removePersistedActivityRating(user.id, trip.id, activityId);
          setRatingStorageRev((n) => n + 1);
          setLocalRatings((prev) => {
            const activities = { ...prev.activities };
            delete activities[activityId];
            delete activities[String(activityId)];
            return { ...prev, activities };
          });
          if (updated?.id) {
            const merged = mergeTripWithPostResponse(updated, postCreateSnapshot);
            persistTripSnapshot(merged);
            setTrip(merged);
          } else {
            await refetchTrip();
          }
        } else {
          const data = await replaceActivity(trip.id, activityId, {
            userId: user.id,
            reason,
          });
          removePersistedActivityRating(user.id, trip.id, activityId);
          setRatingStorageRev((n) => n + 1);
          setLocalRatings((prev) => {
            const activities = { ...prev.activities };
            delete activities[activityId];
            delete activities[String(activityId)];
            return { ...prev, activities };
          });
          const merged = mergeTripWithPostResponse(unwrapTripPayload(data), postCreateSnapshot);
          const cleared = stripActivityUserRatingForId(merged, activityId);
          persistTripSnapshot(cleared);
          setTrip(cleared);
        }
        setReplaceModal(null);
      } catch (err) {
        setActionError(
          err instanceof Error
            ? err.message
            : mode === "delete"
              ? "Could not remove this stop."
              : "Could not replace activity."
        );
      } finally {
        setBusy(null);
      }
    },
    [trip?.id, user?.id, replaceModal?.activityId, replaceModal?.mode, postCreateSnapshot, refetchTrip]
  );

  const openReplaceModal = useCallback(
    (activityId) => {
      if (user?.id == null) {
        navigate("/login", { state: { from: `/trip/${id}` } });
        return;
      }
      setReplaceModal({ activityId, mode: "replace" });
    },
    [user?.id, navigate, id]
  );

  const openDeleteActivityModal = useCallback(
    (activityId) => {
      if (user?.id == null) {
        navigate("/login", { state: { from: `/trip/${id}` } });
        return;
      }
      setReplaceModal({ activityId, mode: "delete" });
    },
    [user?.id, navigate, id]
  );

  const handleAddDayActivity = useCallback(
    async (dayId) => {
      if (!trip?.id || dayId == null) return;
      setActionError("");
      setBusy(`add:${dayId}`);
      try {
        const updated = await addDayActivity(trip.id, dayId);
        if (updated?.id) {
          const merged = mergeTripWithPostResponse(updated, postCreateSnapshot);
          persistTripSnapshot(merged);
          setTrip(merged);
        } else {
          await refetchTrip();
        }
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Could not add a stop.");
      } finally {
        setBusy(null);
      }
    },
    [trip?.id, postCreateSnapshot, refetchTrip]
  );

  const handleCopyShareLink = useCallback(async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setShareStatus("Link copied to clipboard.");
    } catch {
      setShareStatus("Could not copy automatically — copy from the address bar.");
    }
    window.setTimeout(() => setShareStatus(""), 3200);
  }, []);

  const handleVisibilityChange = useCallback(
    async (nextPublic) => {
      if (!trip?.id) return;
      setActionError("");
      setVisibilityBusy(true);
      try {
        const updated = await updatePublicTrip(trip.id, { isPublic: nextPublic });
        const payload =
          updated && typeof updated === "object" && updated.id != null
            ? updated
            : { ...trip, isPublic: nextPublic };
        const merged = mergeTripWithPostResponse(payload, postCreateSnapshot);
        persistTripSnapshot(merged);
        setTrip(merged);
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Could not update visibility.");
      } finally {
        setVisibilityBusy(false);
      }
    },
    [trip, postCreateSnapshot]
  );

  useEffect(() => {
    if (!trip) return;
    const title = formatTripHeroTitle(trip);
    const prev = document.title;
    document.title = `${title} · Trip`;
    return () => {
      document.title = prev;
    };
  }, [trip]);

  useEffect(() => {
    if (!trip?.id || user?.id == null) {
      setCanEditVisibility(false);
      return;
    }
    if (isTripOwnerFromPayload(trip, user)) {
      setCanEditVisibility(true);
      return;
    }
    let cancelled = false;
    setCanEditVisibility(null);
    (async () => {
      try {
        const list = await fetchMyTrips(user.id);
        const mine = list.some((t) => String(t.id) === String(trip.id));
        if (!cancelled) setCanEditVisibility(mine);
      } catch {
        if (!cancelled) setCanEditVisibility(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [trip, user]);

  useEffect(() => {
    if (!replaceModal) return;
    const focusEl = replaceModalFirstFocusRef.current;
    const raf = window.requestAnimationFrame(() => {
      focusEl?.focus();
    });
    const onKey = (e) => {
      if (e.key === "Escape") setReplaceModal(null);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      window.cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey);
    };
  }, [replaceModal]);

  useEffect(() => {
    let cancelled = false;

    const fetchOnce = async () => {
      const res = await fetch(publicTripUrl(id, user?.id));
      const data = await parseResponseJson(res);
      if (!res.ok) {
        return { ok: false, error: friendlyPublicLoadError(res.status, "trip"), trip: null };
      }
      return { ok: true, error: "", trip: unwrapTripPayload(data) };
    };

    (async () => {
      setLoading(true);
      setLoadError("");

      const first = await fetchOnce();
      if (cancelled) return;

      if (!first.ok) {
        setTrip(null);
        setLoadError(first.error);
        setLoading(false);
        return;
      }

      const mergedFirst = mergeTripWithPostResponse(first.trip, postCreateSnapshot);
      persistTripSnapshot(mergedFirst);
      setTrip(mergedFirst);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [id, postCreateSnapshot, user?.id]);

  useEffect(() => {
    setLocalRatings({ trip: undefined, activities: {} });
  }, [id]);

  useEffect(() => {
    setWholeTripDeleteConfirm(false);
  }, [id]);

  if (loading) {
    return <TripDetailsSkeleton />;
  }

  if (loadError) {
    return (
      <div className="trip-details-empty">
        <p role="alert">{loadError}</p>
        <button type="button" className="trip-back-btn" onClick={() => navigate("/")}>
          ← Back to home
        </button>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="trip-details-empty">
        <p>This trip isn’t available.</p>
        <button type="button" className="trip-back-btn" onClick={() => navigate("/")}>
          ← Back to home
        </button>
      </div>
    );
  }

  return (
    <div className="trip-details-page">
      <div className="trip-details-toolbar">
        <button type="button" className="trip-back-btn" onClick={() => navigate("/")}>
          ← Back
        </button>
        <div className="trip-details-toolbar-spacer" aria-hidden="true" />
        <button
          type="button"
          className="trip-share-btn"
          onClick={() => handleCopyShareLink()}
          disabled={!!busy}
        >
          Copy link
        </button>
        <button
          type="button"
          className="trip-refresh-btn"
          onClick={() => refetchTrip()}
          disabled={refreshing || !!busy}
        >
          {refreshing ? "Refreshing…" : "Refresh trip"}
        </button>
        {isTripOwner ? (
          <button
            type="button"
            className="trip-toolbar-delete-trip-btn"
            onClick={() =>
              wholeTripDeleteConfirm ? performDeleteTrip() : setWholeTripDeleteConfirm(true)
            }
            disabled={!!busy}
            title="Permanently remove this trip (all days and stops)"
          >
            {wholeTripDeleteConfirm ? "Click again to delete" : "Delete entire trip"}
          </button>
        ) : null}
      </div>

      {isTripOwner && wholeTripDeleteConfirm ? (
        <p className="trip-delete-whole-hint" role="status">
          This removes the whole trip for everyone.&nbsp;
          <button
            type="button"
            className="trip-delete-whole-hint__cancel"
            onClick={() => setWholeTripDeleteConfirm(false)}
          >
            Cancel
          </button>
        </p>
      ) : null}

      <p className="trip-share-status" role="status" aria-live="polite" aria-atomic="true">
        {shareStatus}
      </p>

      {actionError ? (
        <p className="trip-action-error" role="alert">
          {actionError}
        </p>
      ) : null}

      <div className="trip-details-grid">
        <div className="trip-details-main">
          <header className="trip-hero">
            <h1>{heroTitle}</h1>
            {trip.desc && <p className="trip-hero-desc">{trip.desc}</p>}
            <div className="trip-meta-bar">
              <span className="trip-meta-pill">
                <span className="icon" aria-hidden="true">
                  📅
                </span>
                {trip.startDate} — {trip.endDate}
              </span>
              {(trip.averageRating != null || (trip.ratingCount ?? 0) > 0) && (
                <span className="trip-meta-pill">
                  <span className="icon" aria-hidden="true">
                    ★
                  </span>
                  {formatAvg(trip.averageRating) ?? "—"} · {trip.ratingCount ?? 0}{" "}
                  {trip.ratingCount === 1 ? "rating" : "ratings"}
                </span>
              )}
            </div>
            {canEditVisibility === true ? (
              <div className="trip-visibility-row">
                <label className="trip-visibility-label" htmlFor="trip-visibility-input">
                  <input
                    id="trip-visibility-input"
                    type="checkbox"
                    checked={tripIsPublic}
                    disabled={visibilityBusy || !!busy}
                    onChange={(e) => handleVisibilityChange(e.target.checked)}
                  />
                  <span>Show on Discover</span>
                </label>
                <span className="trip-visibility-hint">
                  When off, others won’t see this trip on Discover.
                </span>
              </div>
            ) : null}
            <div className="trip-hero-rating">
              {user?.id != null ? (
                <div className="trip-hero-rating-row">
                  <span className="trip-hero-rating-label">Rate this trip</span>
                  <StarPicker
                    value={tripStarValue}
                    onPick={handleRateTrip}
                    disabled={!!busy}
                    label="Rate this trip"
                  />
                </div>
              ) : (
                <p className="trip-rate-hint">
                  <Link to="/login" state={{ from: `/trip/${id}` }}>
                    Sign in
                  </Link>{" "}
                  to rate this trip.
                </p>
              )}
            </div>
          </header>

          <section className="trip-days-section" aria-label="Trip plan" id="trip-plan-section">
            {displayDays.length === 0 ? (
              <p className="trip-itinerary-empty">No details yet.</p>
            ) : (
              <div className="trip-days-scroll" role="region" aria-label="Daily plan">
                {displayDays.map((day, index) => {
                  const dayKey = day.id != null ? `day-${day.id}` : `${day.date}-${index}`;
                  const dayActivities = day.activities ?? [];
                  const canReorder =
                    day.id != null &&
                    dayActivities.length > 1 &&
                    dayActivities.every((a) => a.id != null);

                  return (
                    <article key={dayKey} className="trip-day-card">
                      <div className="trip-day-header">
                        <div className="trip-day-header__primary">
                          <span className="trip-day-badge">Day {index + 1}</span>
                          <span className="trip-day-date">{day.date || "—"}</span>
                        </div>
                        {isTripOwner && day.id != null ? (
                          <button
                            type="button"
                            className="trip-itinerary-add-btn trip-day-header__add-btn"
                            onClick={() => handleAddDayActivity(day.id)}
                            disabled={!!busy}
                          >
                            Add new Stop
                          </button>
                        ) : null}
                      </div>

                      {dayActivities.map((activity, i) => {
                        const showTimes =
                          (activity.startTime && activity.startTime !== "—") ||
                          (activity.endTime && activity.endTime !== "—");
                        const stopsBefore =
                          dayActivities.slice(0, i).reduce(
                            (n, a) => n + getActivityPlacesForDisplay(a).length,
                            0
                          ) ?? 0;
                        const displayPlacesList = getActivityPlacesForDisplay(activity);
                        const aid = activity.id;
                        const activityStarValue =
                          activity.userRating ??
                          (aid != null ? localRatings.activities[aid] : undefined) ??
                          (aid != null
                            ? storedRatings.activities[String(aid)] ??
                              storedRatings.activities[aid]
                            : undefined);
                        const actKey =
                          activity.id != null ? `activity-${activity.id}` : `activity-${index}-${i}`;
                        const showAvg =
                          activity.averageRating != null || (activity.ratingCount ?? 0) > 0;
                        const dndKey = day.id != null ? activityDndKey(day.id, i) : null;
                        return (
                          <div
                            key={actKey}
                            className={[
                              "trip-activity",
                              canReorder && "trip-activity--reorderable",
                              canReorder && dndDropTargetKey === dndKey && "trip-activity--drop-target",
                              canReorder && dndDraggingKey === dndKey && "trip-activity--dragging",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            onDragOver={
                              canReorder ? (e) => handleActivityDragOver(e, day, i) : undefined
                            }
                            onDrop={canReorder ? (e) => handleActivityDrop(e, day, i) : undefined}
                          >
                            {canReorder && (
                              <div
                                className="trip-activity-drag-handle"
                                draggable={!busy}
                                onDragStart={(e) => handleActivityDragStart(e, day, i)}
                                onDragEnd={handleActivityDragEnd}
                                title="Hold and drag to move this stop"
                                aria-label="Drag to reorder this stop"
                              >
                                <span className="trip-activity-drag-grip" aria-hidden="true" />
                              </div>
                            )}
                            <div
                              className={
                                canReorder
                                  ? "trip-activity-main"
                                  : "trip-activity-main trip-activity-main--solo"
                              }
                            >
                            <div className="trip-activity-toolbar">
                              {isTripOwner && day.id != null && activity.id != null && (
                                <div
                                  className="trip-activity-sq-actions"
                                  role="group"
                                  aria-label="Remove stop"
                                >
                                  <button
                                    type="button"
                                    className="trip-activity-sq trip-activity-sq--danger"
                                    onClick={() => openDeleteActivityModal(activity.id)}
                                    disabled={!!busy}
                                    title="Remove this stop"
                                    aria-label="Remove this stop"
                                  >
                                    <ActivityTrashIcon />
                                  </button>
                                </div>
                              )}
                              {activity.id != null && (
                                <button
                                  type="button"
                                  className="trip-activity-replace-btn"
                                  onClick={() => openReplaceModal(activity.id)}
                                  disabled={!!busy}
                                  title={
                                    user?.id != null
                                      ? "Swap this stop for another place (saved for you on shared trips)"
                                      : "Sign in to personalize this stop"
                                  }
                                >
                                  Replace stop
                                </button>
                              )}
                              {showAvg && (
                                <span className="trip-activity-rating-summary" title="Average rating">
                                  ★ {formatAvg(activity.averageRating) ?? "—"} · {activity.ratingCount ?? 0}
                                </span>
                              )}
                              {user?.id != null && activity.id != null && (
                                <div className="trip-activity-rate">
                                  <span className="trip-activity-rate-label">Rate</span>
                                  <StarPicker
                                    value={activityStarValue}
                                    onPick={(stars) => handleRateActivity(activity.id, stars)}
                                    disabled={!!busy}
                                    label="Rate this stop"
                                  />
                                </div>
                              )}
                            </div>
                            {showTimes ? (
                              <div className="trip-activity-time">
                                {activity.startTime} – {activity.endTime}
                              </div>
                            ) : null}

                            {displayPlacesList.length > 0 ? (
                              <ul className="trip-places">
                                {displayPlacesList.map((place, j) => (
                                  <li key={j}>
                                    <span className="trip-place-index">{stopsBefore + j + 1}.</span>
                                    {place.title}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="trip-activity-empty">No place name in this stop.</p>
                            )}
                            </div>
                          </div>
                        );
                      })}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <div className="trip-map-column">
          <TripRouteMap
            trip={tripSnapshotForMap ?? trip}
            displayDays={tripSnapshotForMap ? mapDisplayDays : displayDays}
          />
          <div className="trip-map-column__actions">
            <button
              type="button"
              className="trip-map-update-btn"
              onClick={handleUpdateRouteMap}
              disabled={!!busy || !trip}
              title="Reload the map with the latest stops (avoids slow reloads on every edit)"
            >
              Update map
            </button>
          </div>
        </div>
      </div>

      {replaceModal ? (
        <div
          className="trip-replace-modal-backdrop"
          role="presentation"
          onClick={() => !busy && setReplaceModal(null)}
        >
          <div
            className="trip-replace-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="trip-replace-modal-title"
            aria-describedby={replaceModalDescId}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="trip-replace-modal-title" className="trip-replace-modal__title">
              {replaceModal.mode === "delete" ? "Why remove this stop?" : "Why replace this stop?"}
            </h2>
            <p id={replaceModalDescId} className="trip-replace-modal__lead">
              Your choice is saved only for you — the shared trip stays the same for others.
            </p>
            <div className="trip-replace-modal__actions">
              <button
                ref={replaceModalFirstFocusRef}
                type="button"
                className="trip-replace-modal__choice"
                disabled={!!busy}
                onClick={() => handleReplaceOrDeleteReason("WAS_HERE")}
              >
                I was here
              </button>
              <button
                type="button"
                className="trip-replace-modal__choice trip-replace-modal__choice--secondary"
                disabled={!!busy}
                onClick={() => handleReplaceOrDeleteReason("DONT_WANT_TO_GO")}
              >
                I don’t want to go here
              </button>
            </div>
            <button
              type="button"
              className="trip-replace-modal__cancel"
              disabled={!!busy}
              onClick={() => setReplaceModal(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default TripDetails;
