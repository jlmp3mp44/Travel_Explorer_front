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
  replaceActivitySmart,
  replaceActivityWithPlace,
  searchTripPlaces,
  addTripActivityAuto,
  updatePublicTrip,
} from "../api/tripPublic";
import TripPrintDocument from "../components/TripPrintDocument";
import { exportTripPdfFromElement, tripPdfFilename } from "../utils/exportTripPdf";
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
  unwrapTripPayload,
} from "../utils/tripItinerary";
import {
  addPendingActivityToTrip,
  isPendingActivityId,
  nextPendingActivityId,
  removeActivityFromTrip,
  reorderActivitiesInTrip,
  replaceActivityPlaceInTrip,
} from "../utils/tripItineraryDraft";
import InterestingPlaceToggle from "../components/InterestingPlaceToggle";
import { listInterestingPlaces } from "../api/interestingPlaces";
import { useAuth } from "../context/AuthContext";
import { isTripOwnerFromPayload } from "../utils/tripOwnership";
import {
  extractTripCategoryLabels,
  placePhotoUrl,
  tripCoverPhotoUrl,
  tripOwnerDisplayName,
  tripOwnerId,
} from "../utils/tripDisplay";
import { extractTripUserRating } from "../utils/ratings";
import {
  persistUserTripRating,
  readStoredUserRatings,
  removePersistedActivityRating,
} from "../utils/tripRatingStorage";
import TripRouteMap from "../components/TripRouteMap";
import TripPhotoUrl from "../components/TripPhotoUrl.jsx";
import TripDetailsSkeleton from "../components/skeletons/TripDetailsSkeleton";
import "../components/TripDetails.css";

function formatAvg(n) {
  if (n == null || Number.isNaN(Number(n))) return null;
  return Number(n).toFixed(1);
}

function formatIntensityLabel(raw) {
  if (raw == null || raw === "") return null;
  const u = String(raw).toUpperCase();
  if (u === "LOW") return "Relaxed";
  if (u === "MEDIUM") return "Balanced";
  if (u === "HIGH") return "Intense";
  return null;
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

function placeSearchRowLabel(p) {
  if (p == null) return { name: "Place", addr: "" };
  const name =
    p.name ?? p.title ?? p.placeName ?? p.displayName ?? p.label ?? "";
  const addr = p.address ?? p.formattedAddress ?? p.vicinity ?? p.shortFormattedAddress ?? "";
  return { name: String(name || "Unnamed place"), addr: String(addr || "") };
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

function StarPicker({ value, onPick, disabled, label = "Rate", pulse = false }) {
  const v = value != null && value >= 1 && value <= 5 ? value : null;
  return (
    <div
      className={["trip-star-picker-wrap", pulse && "trip-star-picker-wrap--pulse"]
        .filter(Boolean)
        .join(" ")}
    >
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
    const fromNav = location.state?.tripSnapshot;
    const fromNavUnwrapped = fromNav ? unwrapTripPayload(fromNav) : null;
    if (fromNavUnwrapped?.id != null && String(fromNavUnwrapped.id) === String(id)) {
      return fromNavUnwrapped;
    }
    const stored = readStoredTripSnapshot(id);
    const storedUnwrapped = stored ? unwrapTripPayload(stored) : null;
    if (storedUnwrapped?.id != null && String(storedUnwrapped.id) === String(id)) {
      return storedUnwrapped;
    }
    return null;
  }, [id, location.state]);

  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(null);
  const [pdfCaptureActive, setPdfCaptureActive] = useState(false);
  const pdfCaptureRef = useRef(null);

  /** Pre-loaded "interesting places" for this user so each toggle starts in the right state. */
  const [interestingSavedSet, setInterestingSavedSet] = useState(() => new Set());
  const [interestingIdMap, setInterestingIdMap] = useState(() => new Map());
  useEffect(() => {
    if (!user) {
      setInterestingSavedSet(new Set());
      setInterestingIdMap(new Map());
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const list = await listInterestingPlaces();
        if (cancelled) return;
        const set = new Set();
        const map = new Map();
        for (const ip of list || []) {
          const pid = ip?.place?.id;
          if (pid != null) {
            set.add(Number(pid));
            map.set(Number(pid), ip.id);
          }
        }
        setInterestingSavedSet(set);
        setInterestingIdMap(map);
      } catch {
        /* non-fatal — toggles will lazy-load their own state */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);
  const [dndDraggingKey, setDndDraggingKey] = useState(null);
  const [dndDropTargetKey, setDndDropTargetKey] = useState(null);
  /** `{ activityId }` while choosing reason for delete */
  const [deleteActivityModal, setDeleteActivityModal] = useState(null);
  const deleteModalDescId = useId();
  const deleteModalFirstFocusRef = useRef(null);
  /** Same modal as delete — pick reason, then `{ activityId, anchorEl }` closes and opens panel */
  const [replaceActivityReasonModal, setReplaceActivityReasonModal] = useState(null);
  const replaceReasonModalDescId = useId();
  const replaceReasonModalFirstFocusRef = useRef(null);
  /** Owner change-activity popover: `{ activityId, top, left }` in viewport px */
  const [changeActivityPanel, setChangeActivityPanel] = useState(null);
  const changePanelFirstFocusRef = useRef(null);
  const [placeSearchInput, setPlaceSearchInput] = useState("");
  const [placeSearchResults, setPlaceSearchResults] = useState([]);
  const [placeSearchLoading, setPlaceSearchLoading] = useState(false);
  const [changePanelError, setChangePanelError] = useState("");
  /** Backend ActivityChangeReason — set from the pre-panel modal (same copy as delete). */
  const [changeActivityReason, setChangeActivityReason] = useState("DONT_WANT_TO_GO");
  const [canEditVisibility, setCanEditVisibility] = useState(null);
  const [visibilityBusy, setVisibilityBusy] = useState(false);
  /** Unsaved itinerary edits — flushed on Save. */
  const [pendingDeletes, setPendingDeletes] = useState([]);
  const [pendingAdds, setPendingAdds] = useState([]);
  const [pendingReplaces, setPendingReplaces] = useState([]);
  const [pendingReorderByDay, setPendingReorderByDay] = useState({});
  /** Fallback when API omits user rating on GET */
  const [localRatings, setLocalRatings] = useState({ trip: undefined, activities: {} });
  /** Brief highlight after saving a rating (`trip` | `act:${id}`). */
  const [ratingPulseKey, setRatingPulseKey] = useState(null);
  /** Bumps when persisted activity ratings are removed so `storedRatings` re-reads localStorage. */
  const [ratingStorageRev, setRatingStorageRev] = useState(0);
  /** Inline two-step delete (no blocking browser dialog). */
  const [wholeTripDeleteConfirm, setWholeTripDeleteConfirm] = useState(false);
  /** Add stop: floating panel with suggest + search (no reason prompt; backend defaults reason). */
  const [addActivityPanel, setAddActivityPanel] = useState(null);
  const addPanelFirstFocusRef = useRef(null);
  const [addPlaceSearchInput, setAddPlaceSearchInput] = useState("");
  const [addPlaceSearchResults, setAddPlaceSearchResults] = useState([]);
  const [addPlaceSearchLoading, setAddPlaceSearchLoading] = useState(false);
  const [addPanelError, setAddPanelError] = useState("");

  const displayDays = useMemo(() => {
    if (!trip) return [];
    return resolveTripDaysForDisplay(trip).days;
  }, [trip]);

  /** Map uses last saved itinerary; updates when there are no unsaved edits. */
  const [tripSnapshotForMap, setTripSnapshotForMap] = useState(null);

  useEffect(() => {
    setTripSnapshotForMap(null);
    setPendingDeletes([]);
    setPendingAdds([]);
    setPendingReplaces([]);
    setPendingReorderByDay({});
  }, [id]);

  const itineraryDirty = useMemo(
    () =>
      pendingDeletes.length > 0 ||
      pendingAdds.length > 0 ||
      pendingReplaces.length > 0 ||
      Object.keys(pendingReorderByDay).length > 0,
    [pendingDeletes, pendingAdds, pendingReplaces, pendingReorderByDay]
  );

  useEffect(() => {
    if (trip && String(trip.id) === String(id) && !itineraryDirty) {
      setTripSnapshotForMap(trip);
    }
  }, [trip, id, itineraryDirty]);

  const mapDisplayDays = useMemo(() => {
    const t = tripSnapshotForMap ?? trip;
    if (!t) return [];
    return resolveTripDaysForDisplay(t).days;
  }, [tripSnapshotForMap, trip]);

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

  const intensityLabel = useMemo(() => {
    if (!trip) return null;
    const raw = trip.intensity ?? trip.tripIntensity ?? trip.trip_intensity;
    return formatIntensityLabel(raw);
  }, [trip]);

  const tripCategoryLabels = useMemo(() => extractTripCategoryLabels(trip), [trip]);
  const tripOwnerName = useMemo(() => tripOwnerDisplayName(trip), [trip]);
  const tripOwnerProfileId = useMemo(() => tripOwnerId(trip), [trip]);
  const tripCoverPhotoUrlStr = useMemo(() => tripCoverPhotoUrl(trip), [trip]);

  const handleDownloadPdf = useCallback(async () => {
    if (!trip?.id) return;
    setActionError("");
    setBusy("pdf");
    setPdfCaptureActive(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 100));
      await new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      });
      const el = pdfCaptureRef.current;
      if (!el) {
        throw new Error("Could not prepare PDF.");
      }
      await exportTripPdfFromElement(el, { filename: tripPdfFilename(trip) });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not download the PDF.");
    } finally {
      setPdfCaptureActive(false);
      setBusy(null);
    }
  }, [trip]);

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
    if (!id) return null;
    setRefreshing(true);
    setLoadError("");
    try {
      const res = await fetch(publicTripUrl(id, user?.id), {
        credentials: "include",
      });
      const data = await parseResponseJson(res);
      if (!res.ok) {
        setLoadError(friendlyPublicLoadError(res.status, "trip"));
        return null;
      }
      const merged = mergeTripWithPostResponse(unwrapTripPayload(data), postCreateSnapshot);
      persistTripSnapshot(merged);
      setTrip(merged);
      return merged;
    } catch (err) {
      console.error("Error fetching trip:", err);
      setLoadError(friendlyNetworkError(err));
      return null;
    } finally {
      setRefreshing(false);
    }
  }, [id, postCreateSnapshot, user?.id]);

  const handleSaveItinerary = useCallback(async () => {
    if (!trip?.id || !itineraryDirty) return;
    setActionError("");
    setBusy("save-itinerary");
    try {
      for (const del of pendingDeletes) {
        await deleteTripActivity(trip.id, del.activityId, { reason: del.reason });
      }
      for (const add of pendingAdds) {
        if (add.mode === "auto") {
          await addTripActivityAuto(trip.id, add.dayId);
        } else {
          await addDayActivity(trip.id, add.dayId, { placeId: add.placeId });
        }
      }
      for (const rep of pendingReplaces) {
        if (rep.mode === "smart") {
          await replaceActivitySmart(trip.id, rep.activityId, { reason: rep.reason });
        } else {
          await replaceActivityWithPlace(trip.id, rep.activityId, {
            placeId: rep.placeId,
            reason: rep.reason,
          });
        }
      }
      for (const [dayId, orderedIds] of Object.entries(pendingReorderByDay)) {
        const realIds = orderedIds.filter((aid) => !isPendingActivityId(aid));
        if (realIds.length >= 2) {
          await reorderDayActivities(trip.id, dayId, realIds);
        }
      }
      const merged = await refetchTrip();
      if (merged) {
        setPendingDeletes([]);
        setPendingAdds([]);
        setPendingReplaces([]);
        setPendingReorderByDay({});
        setTripSnapshotForMap(merged);
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not save itinerary changes.");
    } finally {
      setBusy(null);
    }
  }, [
    trip?.id,
    itineraryDirty,
    pendingDeletes,
    pendingAdds,
    pendingReplaces,
    pendingReorderByDay,
    refetchTrip,
  ]);

  const handleRateTrip = useCallback(
    async (stars) => {
      if (!trip?.id || user?.id == null) return;
      setActionError("");
      setBusy("rate-trip");
      try {
        await postTripRating(trip.id, user.id, stars);
        persistUserTripRating(user.id, trip.id, { trip: stars });
        setLocalRatings((prev) => ({ ...prev, trip: stars }));
        setRatingPulseKey("trip");
        window.setTimeout(() => setRatingPulseKey((k) => (k === "trip" ? null : k)), 1100);
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
        const pulse = `act:${activityId}`;
        setRatingPulseKey(pulse);
        window.setTimeout(() => setRatingPulseKey((k) => (k === pulse ? null : k)), 1100);
        await refetchTrip();
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Could not save rating.");
      } finally {
        setBusy(null);
      }
    },
    [trip?.id, user?.id, refetchTrip]
  );

  const applyLocalReorder = useCallback((day, reorderedActivities, fromIndex, toIndex) => {
    if (day.id == null || !trip) return;
    setTrip((prev) => reorderActivitiesInTrip(prev, day.id, fromIndex, toIndex));
    setPendingReorderByDay((prev) => ({
      ...prev,
      [day.id]: reorderedActivities.map((a) => a.id).filter((x) => x != null),
    }));
  }, [trip]);

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
      applyLocalReorder(day, reordered, fromIndex, toIndex);
      setDndDraggingKey(null);
      setDndDropTargetKey(null);
    },
    [handleActivityDragEnd, applyLocalReorder]
  );

  const handleDeleteActivityReason = useCallback(
    (reason) => {
      if (!trip?.id || user?.id == null || !deleteActivityModal?.activityId) return;
      const activityId = deleteActivityModal.activityId;
      if (isPendingActivityId(activityId)) {
        setPendingAdds((prev) => prev.filter((a) => a.tempId !== activityId));
      } else {
        setPendingDeletes((prev) => [...prev, { activityId, reason }]);
      }
      setPendingReplaces((prev) => prev.filter((r) => r.activityId !== activityId));
      removePersistedActivityRating(user.id, trip.id, activityId);
      setRatingStorageRev((n) => n + 1);
      setLocalRatings((prev) => {
        const activities = { ...prev.activities };
        delete activities[activityId];
        delete activities[String(activityId)];
        return { ...prev, activities };
      });
      setTrip((prev) => removeActivityFromTrip(prev, activityId));
      setDeleteActivityModal(null);
    },
    [trip?.id, user?.id, deleteActivityModal?.activityId]
  );

  const closeChangeActivityPanel = useCallback(() => {
    setChangeActivityPanel(null);
    setPlaceSearchInput("");
    setPlaceSearchResults([]);
    setPlaceSearchLoading(false);
    setChangePanelError("");
    setChangeActivityReason("DONT_WANT_TO_GO");
  }, []);

  const computeChangePanelPosition = useCallback((anchorEl) => {
    const rect = anchorEl.getBoundingClientRect();
    const panelW = 300;
    const margin = 8;
    let left = rect.left;
    if (left + panelW + margin > window.innerWidth) {
      left = Math.max(margin, window.innerWidth - panelW - margin);
    }
    let top = rect.bottom + margin;
    const estH = 320;
    if (top + estH > window.innerHeight) {
      top = Math.max(margin, rect.top - margin - estH);
    }
    return { top, left };
  }, []);

  const closeAddActivityPanel = useCallback(() => {
    setAddActivityPanel(null);
    setAddPlaceSearchInput("");
    setAddPlaceSearchResults([]);
    setAddPlaceSearchLoading(false);
    setAddPanelError("");
  }, []);

  const openAddActivityPanel = useCallback(
    (dayId, anchorEl) => {
      if (user?.id == null) {
        navigate("/login", { state: { from: `/trip/${id}` } });
        return;
      }
      if (!isTripOwner) {
        setActionError("Only the trip owner can add stops.");
        return;
      }
      setReplaceActivityReasonModal(null);
      closeChangeActivityPanel();
      const { top, left } = computeChangePanelPosition(anchorEl);
      setAddActivityPanel({ dayId, top, left });
      setAddPlaceSearchInput("");
      setAddPlaceSearchResults([]);
      setAddPanelError("");
    },
    [user?.id, isTripOwner, navigate, id, closeChangeActivityPanel, computeChangePanelPosition]
  );

  const handleAddPlaceSearchSubmit = useCallback(async () => {
    if (!trip?.id || !addActivityPanel?.dayId) return;
    const q = addPlaceSearchInput.trim();
    if (!q) {
      setAddPanelError("Type a search query, then press Search.");
      return;
    }
    setAddPanelError("");
    setAddPlaceSearchLoading(true);
    setBusy(`add-search:${addActivityPanel.dayId}`);
    try {
      const list = await searchTripPlaces(trip.id, q);
      setAddPlaceSearchResults(Array.isArray(list) ? list : []);
      if (!list?.length) {
        setAddPanelError("No places found. Try different words.");
      }
    } catch (err) {
      setAddPlaceSearchResults([]);
      setAddPanelError(err instanceof Error ? err.message : "Search failed.");
    } finally {
      setAddPlaceSearchLoading(false);
      setBusy(null);
    }
  }, [trip?.id, addActivityPanel?.dayId, addPlaceSearchInput]);

  const handleAddPickSearchPlace = useCallback(
    (place) => {
      if (!trip?.id || !addActivityPanel?.dayId || place == null) return;
      const pid = place.id ?? place.placeId;
      if (pid == null) {
        setAddPanelError("This result has no place id.");
        return;
      }
      const dayId = addActivityPanel.dayId;
      const tempId = nextPendingActivityId();
      setAddPanelError("");
      setPendingAdds((prev) => [
        ...prev,
        { mode: "place", dayId, placeId: pid, tempId, place },
      ]);
      setTrip((prev) => addPendingActivityToTrip(prev, dayId, place, tempId));
      closeAddActivityPanel();
    },
    [trip?.id, addActivityPanel, closeAddActivityPanel]
  );

  const handleAddSmartSuggest = useCallback(() => {
    if (!trip?.id || !addActivityPanel?.dayId) return;
    const dayId = addActivityPanel.dayId;
    const tempId = nextPendingActivityId();
    setAddPanelError("");
    setPendingAdds((prev) => [...prev, { mode: "auto", dayId, tempId }]);
    setTrip((prev) =>
      addPendingActivityToTrip(
        prev,
        dayId,
        { title: "Suggested stop (unsaved)" },
        tempId
      )
    );
    closeAddActivityPanel();
  }, [trip?.id, addActivityPanel?.dayId, closeAddActivityPanel]);

  /** Opens the same reason modal as delete; panel opens after a choice. */
  const openReplaceActivityReasonModal = useCallback(
    (activityId, anchorEl) => {
      if (user?.id == null) {
        navigate("/login", { state: { from: `/trip/${id}` } });
        return;
      }
      if (!isTripOwner) {
        setActionError("Only the trip owner can change stops.");
        return;
      }
      closeAddActivityPanel();
      setReplaceActivityReasonModal({ activityId, anchorEl });
    },
    [user, isTripOwner, navigate, id, closeAddActivityPanel]
  );

  const confirmReplaceActivityReason = useCallback(
    (reason) => {
      if (!replaceActivityReasonModal) return;
      const { activityId, anchorEl } = replaceActivityReasonModal;
      const { top, left } = computeChangePanelPosition(anchorEl);
      setChangeActivityReason(reason);
      setChangeActivityPanel({ activityId, top, left });
      setPlaceSearchInput("");
      setPlaceSearchResults([]);
      setChangePanelError("");
      setReplaceActivityReasonModal(null);
    },
    [replaceActivityReasonModal, computeChangePanelPosition]
  );

  const handleSmartSuggest = useCallback(() => {
    if (!trip?.id || !changeActivityPanel?.activityId) return;
    const activityId = changeActivityPanel.activityId;
    if (isPendingActivityId(activityId)) {
      setChangePanelError("Save this new stop first, or remove it and add again.");
      return;
    }
    setChangePanelError("");
    setPendingReplaces((prev) => [
      ...prev.filter((r) => r.activityId !== activityId),
      { activityId, mode: "smart", reason: changeActivityReason },
    ]);
    closeChangeActivityPanel();
  }, [trip?.id, changeActivityPanel?.activityId, changeActivityReason, closeChangeActivityPanel]);

  const handlePlaceSearchSubmit = useCallback(async () => {
    if (!trip?.id || !changeActivityPanel?.activityId) return;
    const q = placeSearchInput.trim();
    if (!q) {
      setChangePanelError("Type a search query, then press Search.");
      return;
    }
    setChangePanelError("");
    setPlaceSearchLoading(true);
    setBusy(`place-search:${changeActivityPanel.activityId}`);
    try {
      const list = await searchTripPlaces(trip.id, q);
      setPlaceSearchResults(Array.isArray(list) ? list : []);
      if (!list?.length) {
        setChangePanelError("No places found. Try different words.");
      }
    } catch (err) {
      setPlaceSearchResults([]);
      setChangePanelError(err instanceof Error ? err.message : "Search failed.");
    } finally {
      setPlaceSearchLoading(false);
      setBusy(null);
    }
  }, [trip?.id, changeActivityPanel?.activityId, placeSearchInput]);

  const handlePickSearchPlace = useCallback(
    (place) => {
      if (!trip?.id || !changeActivityPanel?.activityId || place == null) return;
      const pid = place.id ?? place.placeId;
      if (pid == null) {
        setChangePanelError("This result has no place id.");
        return;
      }
      const activityId = changeActivityPanel.activityId;
      if (isPendingActivityId(activityId)) {
        setChangePanelError("This stop is not saved yet — remove it and add the place again.");
        return;
      }
      setChangePanelError("");
      setPendingReplaces((prev) => [
        ...prev.filter((r) => r.activityId !== activityId),
        {
          activityId,
          mode: "place",
          placeId: pid,
          reason: changeActivityReason,
          place,
        },
      ]);
      setTrip((prev) => replaceActivityPlaceInTrip(prev, activityId, place));
      closeChangeActivityPanel();
    },
    [trip?.id, changeActivityPanel?.activityId, changeActivityReason, closeChangeActivityPanel]
  );

  const openDeleteActivityModal = useCallback(
    (activityId) => {
      if (user?.id == null) {
        navigate("/login", { state: { from: `/trip/${id}` } });
        return;
      }
      setDeleteActivityModal({ activityId });
    },
    [user?.id, navigate, id]
  );

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
    if (!deleteActivityModal) return;
    const focusEl = deleteModalFirstFocusRef.current;
    const raf = window.requestAnimationFrame(() => {
      focusEl?.focus();
    });
    const onKey = (e) => {
      if (e.key === "Escape") setDeleteActivityModal(null);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      window.cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey);
    };
  }, [deleteActivityModal]);

  useEffect(() => {
    if (!replaceActivityReasonModal) return;
    const focusEl = replaceReasonModalFirstFocusRef.current;
    const raf = window.requestAnimationFrame(() => {
      focusEl?.focus();
    });
    const onKey = (e) => {
      if (e.key === "Escape") setReplaceActivityReasonModal(null);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      window.cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey);
    };
  }, [replaceActivityReasonModal]);

  useEffect(() => {
    if (!changeActivityPanel) return;
    const focusEl = changePanelFirstFocusRef.current;
    const raf = window.requestAnimationFrame(() => {
      focusEl?.focus();
    });
    const onKey = (e) => {
      if (e.key === "Escape") closeChangeActivityPanel();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      window.cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey);
    };
  }, [changeActivityPanel, closeChangeActivityPanel]);

  useEffect(() => {
    if (!addActivityPanel) return;
    const focusEl = addPanelFirstFocusRef.current;
    const raf = window.requestAnimationFrame(() => {
      focusEl?.focus();
    });
    const onKey = (e) => {
      if (e.key === "Escape") closeAddActivityPanel();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      window.cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey);
    };
  }, [addActivityPanel, closeAddActivityPanel]);

  useEffect(() => {
    let cancelled = false;

    const fetchOnce = async () => {
      const res = await fetch(publicTripUrl(id, user?.id), {
        credentials: "include",
      });
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
      setTripSnapshotForMap(mergedFirst);
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
        {isTripOwner && itineraryDirty ? (
          <button
            type="button"
            className="trip-save-itinerary-btn"
            onClick={() => void handleSaveItinerary()}
            disabled={!!busy}
            title="Save itinerary changes and update the map"
          >
            {busy === "save-itinerary" ? "Saving…" : "Save changes"}
          </button>
        ) : null}
        <button
          type="button"
          className="trip-pdf-btn"
          onClick={() => void handleDownloadPdf()}
          disabled={!!busy}
          title="Download trip as a PDF file"
        >
          {busy === "pdf" ? "Preparing PDF…" : "PDF"}
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

      {itineraryDirty && isTripOwner ? (
        <p className="trip-unsaved-hint" role="status">
          You have unsaved itinerary changes. Press <strong>Save changes</strong> to keep them and
          refresh the map.
        </p>
      ) : null}

      {actionError ? (
        <p className="trip-action-error" role="alert">
          {actionError}
        </p>
      ) : null}

      <div className="trip-details-grid">
        <div className="trip-details-main">
          <header className="trip-hero" id="trip-overview">
            <div className="trip-hero-layout">
              {tripCoverPhotoUrlStr ? (
                <div className="trip-hero-cover-wrap">
                  <TripPhotoUrl
                    url={tripCoverPhotoUrlStr}
                    alt={heroTitle ? `Cover image for ${heroTitle}` : "Trip cover"}
                    className="trip-hero-cover__photo"
                  />
                </div>
              ) : null}
              <div className="trip-hero-body">
            <h1>{heroTitle}</h1>
            {trip.desc && <p className="trip-hero-desc">{trip.desc}</p>}
            <div className="trip-meta-bar">
              <span className="trip-meta-pill">
                <span className="icon" aria-hidden="true">
                  📅
                </span>
                {trip.startDate} — {trip.endDate}
              </span>
              {intensityLabel && (
                <span className="trip-meta-pill trip-meta-pill--pace" title="Trip pace">
                  <span className="icon" aria-hidden="true">
                    ⏱
                  </span>
                  {intensityLabel}
                </span>
              )}
            </div>
            {tripCategoryLabels.length > 0 ? (
              <ul className="trip-hero-categories" aria-label="Trip categories">
                {tripCategoryLabels.map((label) => (
                  <li key={label}>{label}</li>
                ))}
              </ul>
            ) : null}
            {!isTripOwner && tripOwnerName && tripOwnerProfileId != null ? (
              <p className="trip-hero-owner">
                Organised by{" "}
                <Link to={`/users/${tripOwnerProfileId}`}>{tripOwnerName}</Link>
              </p>
            ) : null}
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
            <div className="trip-hero-rating" aria-label="Trip ratings">
              <div
                className={[
                  "trip-rating-unified",
                  user?.id != null && tripStarValue != null && "trip-rating-unified--user-rated",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <div className="trip-rating-unified__section">
                  <span className="trip-rating-unified__label">Everyone’s average</span>
                  <p className="trip-rating-unified__text">
                    {trip.averageRating != null || (trip.ratingCount ?? 0) > 0 ? (
                      <>
                        <span className="trip-rating-unified__star" aria-hidden="true">
                          ★
                        </span>{" "}
                        <strong>{formatAvg(trip.averageRating) ?? "—"}</strong>
                        <span className="trip-rating-unified__meta">
                          {" "}
                          · {trip.ratingCount ?? 0}{" "}
                          {(trip.ratingCount ?? 0) === 1 ? "rating" : "ratings"} from other
                          travellers
                        </span>
                      </>
                    ) : (
                      <span className="trip-rating-unified__muted">
                        No ratings from other travellers yet.
                      </span>
                    )}
                  </p>
                </div>
                {user?.id != null ? (
                  <>
                    <div className="trip-rating-unified__divider" aria-hidden="true" />
                    <div className="trip-rating-unified__section">
                      <span className="trip-rating-unified__label">
                        {tripStarValue != null
                          ? `Your rating (${tripStarValue} of 5)`
                          : "Your rating"}
                      </span>
                      <div className="trip-rating-unified__picker-row">
                        <StarPicker
                          value={tripStarValue}
                          onPick={handleRateTrip}
                          disabled={!!busy}
                          label="Your rating for this trip"
                          pulse={ratingPulseKey === "trip"}
                        />
                        {tripStarValue != null ? (
                          <span className="trip-rating-unified__saved" aria-live="polite">
                            Saved
                          </span>
                        ) : (
                          <span className="trip-rating-unified__hint">Choose stars to add yours</span>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="trip-rating-unified__divider" aria-hidden="true" />
                    <p className="trip-rating-unified__login-hint trip-rate-hint">
                      <Link to="/login" state={{ from: `/trip/${id}` }}>
                        Sign in
                      </Link>{" "}
                      to add your own rating.
                    </p>
                  </>
                )}
              </div>
            </div>
              </div>
            </div>
          </header>

          <section
            className="trip-days-section"
            aria-labelledby="trip-plan-heading"
            id="trip-plan-section"
          >
            {displayDays.length === 0 ? (
              <p className="trip-itinerary-empty">No details yet.</p>
            ) : (
              <>
                <div className="trip-plan-section-head">
                  <h2 id="trip-plan-heading" className="trip-plan-heading">
                    Itinerary
                  </h2>
                  <nav className="trip-plan-jump" aria-label="Jump on this page">
                    <a className="trip-plan-jump__link" href="#trip-overview">
                      Overview
                    </a>
                    <span className="trip-plan-jump__sep" aria-hidden="true">
                      ·
                    </span>
                    {displayDays.map((d, di) => {
                      const anchor =
                        d.id != null ? `trip-day-${d.id}` : `trip-day-idx-${di}`;
                      return (
                        <span key={anchor} className="trip-plan-jump__group">
                          <a className="trip-plan-jump__link" href={`#${anchor}`}>
                            Day {di + 1}
                          </a>
                          {di < displayDays.length - 1 ? (
                            <span className="trip-plan-jump__sep" aria-hidden="true">
                              ·
                            </span>
                          ) : null}
                        </span>
                      );
                    })}
                    <span className="trip-plan-jump__sep" aria-hidden="true">
                      ·
                    </span>
                    <a className="trip-plan-jump__link" href="#trip-route-map">
                      Map
                    </a>
                  </nav>
                </div>
              <div className="trip-days-scroll" role="region" aria-label="Daily plan">
                {displayDays.map((day, index) => {
                  const dayKey = day.id != null ? `day-${day.id}` : `${day.date}-${index}`;
                  const dayAnchorId =
                    day.id != null ? `trip-day-${day.id}` : `trip-day-idx-${index}`;
                  const dayActivities = day.activities ?? [];
                  const canReorder =
                    day.id != null &&
                    dayActivities.length > 1 &&
                    dayActivities.every((a) => a.id != null);

                  return (
                    <article key={dayKey} id={dayAnchorId} className="trip-day-card">
                      <div className="trip-day-header">
                        <div className="trip-day-header__primary">
                          <span className="trip-day-badge">Day {index + 1}</span>
                          <span className="trip-day-date">{day.date || "—"}</span>
                        </div>
                        {isTripOwner && day.id != null ? (
                          <button
                            type="button"
                            className="trip-itinerary-add-btn trip-day-header__add-btn"
                            onClick={(e) => openAddActivityPanel(day.id, e.currentTarget)}
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
                        const dndKey = day.id != null ? activityDndKey(day.id, i) : null;
                        const heroPhotoUrl =
                          displayPlacesList.map((p) => placePhotoUrl(p)).find((u) => u && u.trim()) ||
                          "";
                        const primaryPlaceTitle =
                          displayPlacesList[0]?.title != null
                            ? String(displayPlacesList[0].title)
                            : "Stop";
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
                              <div className="trip-activity-body">
                                <div className="trip-activity-media">
                                  <figure className="trip-activity-media__frame">
                                    <TripPhotoUrl
                                      url={heroPhotoUrl}
                                      alt={
                                        heroPhotoUrl
                                          ? `Photo: ${primaryPlaceTitle}`
                                          : "No photo for this stop"
                                      }
                                      className="trip-activity-media__photo"
                                    />
                                  </figure>
                                </div>
                                <div className="trip-activity-content">
                                  {showTimes ? (
                                    <div className="trip-activity-time">
                                      {activity.startTime} – {activity.endTime}
                                    </div>
                                  ) : null}
                                  {displayPlacesList.length > 0 ? (
                                    <ul
                                      className="trip-activity-place-titles"
                                      aria-label="Places in this stop"
                                    >
                                      {displayPlacesList.map((place, j) => {
                                        const pid = place?.id ?? place?.placeId;
                                        return (
                                          <li
                                            key={pid != null ? String(pid) : j}
                                            className="trip-activity-place-titles__item"
                                          >
                                            <span className="trip-place-index">
                                              {stopsBefore + j + 1}.
                                            </span>
                                            <span className="trip-activity-place-titles__name">
                                              {place.title}
                                            </span>
                                            {user && pid != null ? (
                                              <span className="trip-activity-place-titles__toggle">
                                                <InterestingPlaceToggle
                                                  placeId={Number(pid)}
                                                  size="sm"
                                                  context={{
                                                    cityId: trip?.cityIds?.[0],
                                                    countryId: trip?.countryIds?.[0],
                                                  }}
                                                  savedSet={interestingSavedSet}
                                                  savedIdMap={interestingIdMap}
                                                  onChange={({ saved, savedRecord }) => {
                                                    setInterestingSavedSet((prev) => {
                                                      const next = new Set(prev);
                                                      if (saved) next.add(Number(pid));
                                                      else next.delete(Number(pid));
                                                      return next;
                                                    });
                                                    setInterestingIdMap((prev) => {
                                                      const next = new Map(prev);
                                                      if (saved && savedRecord?.id != null) {
                                                        next.set(Number(pid), savedRecord.id);
                                                      } else {
                                                        next.delete(Number(pid));
                                                      }
                                                      return next;
                                                    });
                                                  }}
                                                />
                                              </span>
                                            ) : null}
                                          </li>
                                        );
                                      })}
                                    </ul>
                                  ) : (
                                    <p className="trip-activity-empty trip-activity-empty--in-content">
                                      No place name in this stop.
                                    </p>
                                  )}
                                  <div className="trip-activity-footer">
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
                                    {isTripOwner && activity.id != null && (
                                      <button
                                        type="button"
                                        className="trip-activity-replace-btn"
                                        onClick={(e) =>
                                          openReplaceActivityReasonModal(
                                            activity.id,
                                            e.currentTarget
                                          )
                                        }
                                        disabled={!!busy}
                                        title="Change this stop — smart suggestion or search"
                                      >
                                        Change activity
                                      </button>
                                    )}
                                  </div>
                                  <div
                                    className="trip-activity-ratings"
                                    aria-label="Ratings for this stop"
                                  >
                                    <div
                                      className={[
                                        "trip-rating-unified trip-rating-unified--compact",
                                        user?.id != null &&
                                          activity.id != null &&
                                          activityStarValue != null &&
                                          "trip-rating-unified--user-rated",
                                      ]
                                        .filter(Boolean)
                                        .join(" ")}
                                    >
                                      <div className="trip-rating-unified__section">
                                        <span className="trip-rating-unified__label">
                                          Everyone’s average
                                        </span>
                                        <p className="trip-rating-unified__text">
                                          {activity.averageRating != null ||
                                          (activity.ratingCount ?? 0) > 0 ? (
                                            <>
                                              <span
                                                className="trip-rating-unified__star"
                                                aria-hidden="true"
                                              >
                                                ★
                                              </span>{" "}
                                              <strong>
                                                {formatAvg(activity.averageRating) ?? "—"}
                                              </strong>
                                              <span className="trip-rating-unified__meta">
                                                {" "}
                                                · {activity.ratingCount ?? 0}{" "}
                                                {(activity.ratingCount ?? 0) === 1
                                                  ? "rating"
                                                  : "ratings"}{" "}
                                                from other travellers
                                              </span>
                                            </>
                                          ) : (
                                            <span className="trip-rating-unified__muted">
                                              No ratings from other travellers yet.
                                            </span>
                                          )}
                                        </p>
                                      </div>
                                      {user?.id != null && activity.id != null ? (
                                        <>
                                          <div
                                            className="trip-rating-unified__divider"
                                            aria-hidden="true"
                                          />
                                          <div className="trip-rating-unified__section">
                                            <span className="trip-rating-unified__label">
                                              {activityStarValue != null
                                                ? `Your rating (${activityStarValue} of 5)`
                                                : "Your rating"}
                                            </span>
                                            <div className="trip-rating-unified__picker-row">
                                              <StarPicker
                                                value={activityStarValue}
                                                onPick={(stars) =>
                                                  handleRateActivity(activity.id, stars)
                                                }
                                                disabled={!!busy}
                                                label="Your rating for this stop"
                                                pulse={
                                                  ratingPulseKey === `act:${activity.id}`
                                                }
                                              />
                                              {activityStarValue != null ? (
                                                <span
                                                  className="trip-rating-unified__saved"
                                                  aria-live="polite"
                                                >
                                                  Saved
                                                </span>
                                              ) : (
                                                <span className="trip-rating-unified__hint">
                                                  Choose stars to add yours
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </>
                                      ) : null}
                                    </div>
                                  </div>
                                  </div>
                              </div>
                            </div>
                          </div>
                          </div>
                        );
                      })}
                    </article>
                  );
                })}
              </div>
              </>
            )}
          </section>
        </div>

        <div className="trip-map-column" id="trip-route-map">
          <div className="trip-map-wrap">
            <TripRouteMap
              trip={tripSnapshotForMap ?? trip}
              displayDays={tripSnapshotForMap ? mapDisplayDays : displayDays}
            />
          </div>
        </div>
      </div>

      {deleteActivityModal ? (
        <div
          className="trip-replace-modal-backdrop"
          role="presentation"
          onClick={() => !busy && setDeleteActivityModal(null)}
        >
          <div
            className="trip-replace-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="trip-delete-activity-modal-title"
            aria-describedby={deleteModalDescId}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="trip-delete-activity-modal-title" className="trip-replace-modal__title">
              Why remove this stop?
            </h2>
            <p id={deleteModalDescId} className="trip-replace-modal__lead">
              Your choice is saved only for you — the shared trip stays the same for others.
            </p>
            <div className="trip-replace-modal__actions">
              <button
                ref={deleteModalFirstFocusRef}
                type="button"
                className="trip-replace-modal__choice"
                disabled={!!busy}
                onClick={() => handleDeleteActivityReason("WAS_HERE")}
              >
                I was here
              </button>
              <button
                type="button"
                className="trip-replace-modal__choice trip-replace-modal__choice--secondary"
                disabled={!!busy}
                onClick={() => handleDeleteActivityReason("DONT_WANT_TO_GO")}
              >
                I don’t want to go here
              </button>
            </div>
            <button
              type="button"
              className="trip-replace-modal__cancel"
              disabled={!!busy}
              onClick={() => setDeleteActivityModal(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {replaceActivityReasonModal ? (
        <div
          className="trip-replace-modal-backdrop"
          role="presentation"
          onClick={() => !busy && setReplaceActivityReasonModal(null)}
        >
          <div
            className="trip-replace-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="trip-replace-activity-reason-modal-title"
            aria-describedby={replaceReasonModalDescId}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="trip-replace-activity-reason-modal-title" className="trip-replace-modal__title">
              Why remove this stop?
            </h2>
            <p id={replaceReasonModalDescId} className="trip-replace-modal__lead">
              Your choice is saved only for you — the shared trip stays the same for others.
            </p>
            <div className="trip-replace-modal__actions">
              <button
                ref={replaceReasonModalFirstFocusRef}
                type="button"
                className="trip-replace-modal__choice"
                disabled={!!busy}
                onClick={() => confirmReplaceActivityReason("WAS_HERE")}
              >
                I was here
              </button>
              <button
                type="button"
                className="trip-replace-modal__choice trip-replace-modal__choice--secondary"
                disabled={!!busy}
                onClick={() => confirmReplaceActivityReason("DONT_WANT_TO_GO")}
              >
                I don’t want to go here
              </button>
            </div>
            <button
              type="button"
              className="trip-replace-modal__cancel"
              disabled={!!busy}
              onClick={() => setReplaceActivityReasonModal(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {changeActivityPanel ? (
        <>
          <div
            className="trip-change-panel-backdrop"
            role="presentation"
            aria-hidden="true"
            onClick={() => !busy && closeChangeActivityPanel()}
          />
          <div
            className="trip-change-activity-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="trip-change-activity-title"
            style={{
              top: changeActivityPanel.top,
              left: changeActivityPanel.left,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="trip-change-activity-panel__head">
              <h2 id="trip-change-activity-title" className="trip-change-activity-panel__title">
                Change this stop
              </h2>
              <button
                type="button"
                className="trip-change-activity-panel__close"
                disabled={!!busy}
                onClick={closeChangeActivityPanel}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <p className="trip-change-activity-panel__hint">
              Suggest picks the next best match for you. Or search, then choose a place from the list.
            </p>
            <button
              ref={changePanelFirstFocusRef}
              type="button"
              className="trip-change-activity-panel__suggest"
              disabled={!!busy || placeSearchLoading}
              onClick={() => handleSmartSuggest()}
            >
              {busy === `smart-replace:${changeActivityPanel.activityId}`
                ? "Working…"
                : "Suggest for me"}
            </button>
            <div className="trip-change-activity-panel__search">
              <label className="trip-change-activity-panel__label" htmlFor="trip-place-search-input">
                Search manually
              </label>
              <div className="trip-change-activity-panel__search-row">
                <input
                  id="trip-place-search-input"
                  type="search"
                  className="trip-change-activity-panel__input"
                  value={placeSearchInput}
                  onChange={(e) => setPlaceSearchInput(e.target.value)}
                  placeholder="e.g. vegan restaurant near museum"
                  disabled={!!busy || placeSearchLoading}
                  autoComplete="off"
                />
                <button
                  type="button"
                  className="trip-change-activity-panel__search-btn"
                  disabled={!!busy || placeSearchLoading || !placeSearchInput.trim()}
                  onClick={() => handlePlaceSearchSubmit()}
                >
                  {placeSearchLoading ? "…" : "Search"}
                </button>
              </div>
            </div>
            {changePanelError ? (
              <p className="trip-change-activity-panel__error" role="alert">
                {changePanelError}
              </p>
            ) : null}
            <ul
              className="trip-change-activity-panel__results"
              aria-label="Search results"
            >
              {placeSearchResults.map((p, idx) => {
                const key = p.id ?? p.placeId ?? idx;
                const { name, addr } = placeSearchRowLabel(p);
                const pUrl = placePhotoUrl(p);
                return (
                  <li key={String(key)}>
                    <button
                      type="button"
                      className="trip-change-activity-panel__result-btn"
                      disabled={!!busy}
                      onClick={() => handlePickSearchPlace(p)}
                    >
                      {pUrl ? (
                        <div className="trip-change-activity-panel__result-thumb">
                          <TripPhotoUrl
                            url={pUrl}
                            alt=""
                            className="trip-change-activity-panel__result-photo"
                          />
                        </div>
                      ) : null}
                      <span className="trip-change-activity-panel__result-text">
                        <span className="trip-change-activity-panel__result-name">{name}</span>
                        {addr ? (
                          <span className="trip-change-activity-panel__result-addr">{addr}</span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      ) : null}

      {addActivityPanel ? (
        <>
          <div
            className="trip-change-panel-backdrop"
            role="presentation"
            aria-hidden="true"
            onClick={() => !busy && closeAddActivityPanel()}
          />
          <div
            className="trip-change-activity-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="trip-add-activity-title"
            style={{
              top: addActivityPanel.top,
              left: addActivityPanel.left,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="trip-change-activity-panel__head">
              <h2 id="trip-add-activity-title" className="trip-change-activity-panel__title">
                Add a stop
              </h2>
              <button
                type="button"
                className="trip-change-activity-panel__close"
                disabled={!!busy}
                onClick={closeAddActivityPanel}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <p className="trip-change-activity-panel__hint">
              Suggest adds a stop automatically. Or search manually and choose a place from the list.
            </p>
            <button
              ref={addPanelFirstFocusRef}
              type="button"
              className="trip-change-activity-panel__suggest"
              disabled={!!busy || addPlaceSearchLoading}
              onClick={() => handleAddSmartSuggest()}
            >
              {busy === `add-smart:${addActivityPanel.dayId}` ? "Working…" : "Suggest for me"}
            </button>
            <div className="trip-change-activity-panel__search">
              <label className="trip-change-activity-panel__label" htmlFor="trip-add-place-search-input">
                Search manually
              </label>
              <div className="trip-change-activity-panel__search-row">
                <input
                  id="trip-add-place-search-input"
                  type="search"
                  className="trip-change-activity-panel__input"
                  value={addPlaceSearchInput}
                  onChange={(e) => setAddPlaceSearchInput(e.target.value)}
                  placeholder="e.g. rooftop café near hotel"
                  disabled={!!busy || addPlaceSearchLoading}
                  autoComplete="off"
                />
                <button
                  type="button"
                  className="trip-change-activity-panel__search-btn"
                  disabled={!!busy || addPlaceSearchLoading || !addPlaceSearchInput.trim()}
                  onClick={() => handleAddPlaceSearchSubmit()}
                >
                  {addPlaceSearchLoading ? "…" : "Search"}
                </button>
              </div>
            </div>
            {addPanelError ? (
              <p className="trip-change-activity-panel__error" role="alert">
                {addPanelError}
              </p>
            ) : null}
            <ul className="trip-change-activity-panel__results" aria-label="Search results">
              {addPlaceSearchResults.map((p, idx) => {
                const key = p.id ?? p.placeId ?? idx;
                const { name, addr } = placeSearchRowLabel(p);
                const pUrl = placePhotoUrl(p);
                return (
                  <li key={String(key)}>
                    <button
                      type="button"
                      className="trip-change-activity-panel__result-btn"
                      disabled={!!busy}
                      onClick={() => handleAddPickSearchPlace(p)}
                    >
                      {pUrl ? (
                        <div className="trip-change-activity-panel__result-thumb">
                          <TripPhotoUrl
                            url={pUrl}
                            alt=""
                            className="trip-change-activity-panel__result-photo"
                          />
                        </div>
                      ) : null}
                      <span className="trip-change-activity-panel__result-text">
                        <span className="trip-change-activity-panel__result-name">{name}</span>
                        {addr ? (
                          <span className="trip-change-activity-panel__result-addr">{addr}</span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      ) : null}

      {pdfCaptureActive ? (
        <div className="trip-pdf-capture-host" aria-hidden="true">
          <TripPrintDocument ref={pdfCaptureRef} trip={trip} user={user} forPdfExport />
        </div>
      ) : null}
    </div>
  );
}

export default TripDetails;
