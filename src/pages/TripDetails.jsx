import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiUrl } from "../config/api";
import {
  friendlyNetworkError,
  friendlyPublicLoadError,
  parseResponseJson,
} from "../utils/friendlyErrors";
import {
  formatTripHeroTitle,
  mergeTripWithPostResponse,
  resolveTripDaysForDisplay,
  unwrapTripPayload,
} from "../utils/tripItinerary";
import TripRouteMap from "../components/TripRouteMap";
import "../components/TripDetails.css";

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

  const displayDays = useMemo(() => {
    if (!trip) return [];
    return resolveTripDaysForDisplay(trip).days;
  }, [trip]);

  const heroTitle = useMemo(() => formatTripHeroTitle(trip), [trip]);

  const refetchTrip = useCallback(async () => {
    if (!id) return;
    setRefreshing(true);
    setLoadError("");
    try {
      const res = await fetch(apiUrl(`/api/public/trips/${id}`));
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
  }, [id, postCreateSnapshot]);

  useEffect(() => {
    let cancelled = false;

    const fetchOnce = async () => {
      const res = await fetch(apiUrl(`/api/public/trips/${id}`));
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
  }, [id, postCreateSnapshot]);

  if (loading) {
    return (
      <div className="trip-details-loading" role="status" aria-live="polite">
        <div className="trip-details-loading-inner">Loading your itinerary…</div>
      </div>
    );
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
        <button
          type="button"
          className="trip-refresh-btn"
          onClick={() => refetchTrip()}
          disabled={refreshing}
        >
          {refreshing ? "Refreshing…" : "Refresh itinerary"}
        </button>
      </div>

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
            </div>
          </header>

          <section className="trip-days-section" aria-labelledby="trip-itinerary-heading">
            <h2 id="trip-itinerary-heading">Itinerary</h2>
            {displayDays.length === 0 ? (
              <p className="trip-itinerary-empty">No itinerary details yet.</p>
            ) : (
              <div className="trip-days-scroll" role="region" aria-label="Daily itinerary">
                {displayDays.map((day, index) => (
                  <article key={`${day.date}-${index}`} className="trip-day-card">
                    <div className="trip-day-header">
                      <span className="trip-day-badge">Day {index + 1}</span>
                      <span className="trip-day-date">{day.date || "—"}</span>
                    </div>

                    {day.activities?.map((activity, i) => {
                      const showTimes =
                        (activity.startTime && activity.startTime !== "—") ||
                        (activity.endTime && activity.endTime !== "—");
                      const stopsBefore =
                        day.activities?.slice(0, i).reduce((n, a) => n + (a.places?.length ?? 0), 0) ??
                        0;
                      return (
                        <div key={i} className="trip-activity">
                          {showTimes ? (
                            <div className="trip-activity-time">
                              {activity.startTime} – {activity.endTime}
                            </div>
                          ) : null}

                          {activity.places?.length > 0 ? (
                            <ul className="trip-places">
                              {activity.places.map((place, j) => (
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
                      );
                    })}
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        <TripRouteMap trip={trip} displayDays={displayDays} />
      </div>
    </div>
  );
}

export default TripDetails;
