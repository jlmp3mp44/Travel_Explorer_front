import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { publicTripUrl } from "../api/tripPublic";
import { friendlyNetworkError, friendlyPublicLoadError, parseResponseJson } from "../utils/friendlyErrors";
import {
  formatTripHeroTitle,
  getActivityPlacesForDisplay,
  resolveTripDaysForDisplay,
  unwrapTripPayload,
} from "../utils/tripItinerary";
import { extractTripCategoryLabels, placePhotoUrl, tripCoverPhotoUrl, tripOwnerDisplayName } from "../utils/tripDisplay";
import { isTripOwnerFromPayload } from "../utils/tripOwnership";
import { useAuth } from "../context/AuthContext";
import TripPhotoUrl from "../components/TripPhotoUrl.jsx";
import "./TripPrint.css";

function formatIntensityLabel(raw) {
  if (raw == null || raw === "") return null;
  const u = String(raw).toUpperCase();
  if (u === "LOW") return "Relaxed";
  if (u === "MEDIUM") return "Balanced";
  if (u === "HIGH") return "Intense";
  return null;
}

function TripPrint() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [trip, setTrip] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const autoPrintDoneRef = useRef(false);

  useEffect(() => {
    document.body.classList.add("trip-print-route");
    return () => {
      document.body.classList.remove("trip-print-route");
    };
  }, []);

  useEffect(() => {
    autoPrintDoneRef.current = false;
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id) {
        setLoading(false);
        setLoadError("Missing trip id.");
        return;
      }
      setLoading(true);
      setLoadError("");
      try {
        const res = await fetch(publicTripUrl(id, user?.id), { credentials: "include" });
        const data = await parseResponseJson(res);
        if (!res.ok) {
          if (!cancelled) {
            setTrip(null);
            setLoadError(friendlyPublicLoadError(res.status, "trip"));
          }
          return;
        }
        if (!cancelled) {
          setTrip(unwrapTripPayload(data));
          setLoadError("");
        }
      } catch (e) {
        if (!cancelled) {
          setTrip(null);
          setLoadError(friendlyNetworkError(e));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, user?.id]);

  const displayDays = useMemo(() => {
    if (!trip) return [];
    return resolveTripDaysForDisplay(trip).days;
  }, [trip]);

  const heroTitle = useMemo(() => formatTripHeroTitle(trip), [trip]);
  const intensityLabel = useMemo(() => {
    if (!trip) return null;
    const raw = trip.intensity ?? trip.tripIntensity ?? trip.trip_intensity;
    return formatIntensityLabel(raw);
  }, [trip]);

  const categoryLabels = useMemo(() => extractTripCategoryLabels(trip), [trip]);
  const ownerName = useMemo(() => tripOwnerDisplayName(trip), [trip]);
  const viewerIsOwner = useMemo(() => isTripOwnerFromPayload(trip, user), [trip, user]);
  const coverUrl = useMemo(() => tripCoverPhotoUrl(trip), [trip]);

  useEffect(() => {
    if (loading || loadError || !trip) return;
    if (searchParams.get("auto") !== "1") return;
    if (autoPrintDoneRef.current) return;
    autoPrintDoneRef.current = true;
    const t = window.setTimeout(() => {
      window.print();
    }, 350);
    return () => window.clearTimeout(t);
  }, [loading, loadError, trip, searchParams]);

  if (loading) {
    return (
      <div className="trip-print-root">
        <p className="trip-print-status">Loading…</p>
      </div>
    );
  }

  if (loadError || !trip) {
    return (
      <div className="trip-print-root">
        <p className="trip-print-error" role="alert">
          {loadError || "This trip isn’t available."}
        </p>
        <Link to="/" className="trip-print-back">
          ← Home
        </Link>
      </div>
    );
  }

  return (
    <div className="trip-print-root">
      <div className="trip-print-toolbar no-print">
        <Link to={`/trip/${id}`} className="trip-print-back">
          ← Back to trip
        </Link>
        <button type="button" className="trip-print-action" onClick={() => window.print()}>
          Print or save as PDF
        </button>
      </div>

      <header className="trip-print-hero">
        <div className="trip-print-hero-top">
          {coverUrl ? (
            <div className="trip-print-cover-wrap">
              <TripPhotoUrl
                url={coverUrl}
                alt={heroTitle ? `Cover: ${heroTitle}` : "Trip cover"}
                className="trip-print-cover__photo"
              />
            </div>
          ) : null}
          <div className="trip-print-hero-text">
        <h1 className="trip-print-title">{heroTitle}</h1>
        {trip.desc ? <p className="trip-print-desc">{trip.desc}</p> : null}
        <div className="trip-print-meta">
          <span className="trip-print-pill">
            {trip.startDate} — {trip.endDate}
          </span>
          {intensityLabel ? <span className="trip-print-pill">{intensityLabel}</span> : null}
          {!viewerIsOwner && ownerName ? (
            <span className="trip-print-pill trip-print-pill--muted">
              By <strong>{ownerName}</strong>
            </span>
          ) : null}
        </div>
        {categoryLabels.length > 0 ? (
          <ul className="trip-print-categories" aria-label="Trip categories">
            {categoryLabels.map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
        ) : null}
          </div>
        </div>
      </header>

      <section className="trip-print-days" aria-label="Itinerary">
        {displayDays.length === 0 ? (
          <p className="trip-print-empty">No itinerary details.</p>
        ) : (
          displayDays.map((day, index) => {
            const dayKey = day.id != null ? `day-${day.id}` : `${day.date}-${index}`;
            const acts = day.activities ?? [];
            return (
              <article key={dayKey} className="trip-print-day">
                <h2 className="trip-print-day-head">
                  <span className="trip-print-day-num">Day {index + 1}</span>
                  <span className="trip-print-day-date">{day.date || "—"}</span>
                </h2>
                <ol className="trip-print-stops">
                  {acts.map((activity, i) => {
                    const places = getActivityPlacesForDisplay(activity);
                    const showTimes =
                      (activity.startTime && activity.startTime !== "—") ||
                      (activity.endTime && activity.endTime !== "—");
                    return (
                      <li key={activity.id != null ? `a-${activity.id}` : `a-${i}`} className="trip-print-stop">
                        {showTimes ? (
                          <div className="trip-print-stop-time">
                            {activity.startTime} – {activity.endTime}
                          </div>
                        ) : null}
                        {places.length > 0 ? (
                          <ul className="trip-print-place-list">
                            {places.map((place, j) => {
                              const pUrl = placePhotoUrl(place);
                              return (
                                <li key={j} className="trip-print-place-row">
                                  {pUrl ? (
                                    <div className="trip-print-place-thumb">
                                      <TripPhotoUrl
                                        url={pUrl}
                                        alt={place.title ?? "Place"}
                                        className="trip-print-place-thumb__img"
                                      />
                                    </div>
                                  ) : null}
                                  <span className="trip-print-place-title">{place.title}</span>
                                </li>
                              );
                            })}
                          </ul>
                        ) : (
                          <span className="trip-print-stop-empty">No place name</span>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}

export default TripPrint;
