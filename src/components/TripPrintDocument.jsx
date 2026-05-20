import { forwardRef, useMemo } from "react";
import {
  formatTripHeroTitle,
  getActivityPlacesForDisplay,
  resolveTripDaysForDisplay,
} from "../utils/tripItinerary";
import {
  extractTripCategoryLabels,
  placePhotoUrl,
  tripCoverPhotoUrl,
  tripOwnerDisplayName,
} from "../utils/tripDisplay";
import { isTripOwnerFromPayload } from "../utils/tripOwnership";
import TripPhotoUrl from "./TripPhotoUrl.jsx";
import "../pages/TripPrint.css";

function formatIntensityLabel(raw) {
  if (raw == null || raw === "") return null;
  const u = String(raw).toUpperCase();
  if (u === "LOW") return "Relaxed";
  if (u === "MEDIUM") return "Balanced";
  if (u === "HIGH") return "Intense";
  return null;
}

/**
 * Printable trip itinerary (same layout as /trip/:id/print).
 * Used for browser print and client-side PDF export.
 */
const TripPrintDocument = forwardRef(function TripPrintDocument(
  { trip, user, className = "", forPdfExport = false },
  ref
) {
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

  if (!trip) return null;

  const rootClass = [
    "trip-print-root",
    forPdfExport ? "trip-print-root--pdf-export" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div ref={ref} className={rootClass}>
      <header className="trip-print-hero">
        <div className="trip-print-hero-top">
          {coverUrl ? (
            <div className="trip-print-cover-wrap">
              <TripPhotoUrl
                url={coverUrl}
                alt={heroTitle ? `Cover: ${heroTitle}` : "Trip cover"}
                className="trip-print-cover__photo"
                crossOrigin={forPdfExport ? "anonymous" : undefined}
                loading="eager"
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
                      <li
                        key={activity.id != null ? `a-${activity.id}` : `a-${i}`}
                        className="trip-print-stop"
                      >
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
                                        crossOrigin={forPdfExport ? "anonymous" : undefined}
                                        loading="eager"
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
});

export default TripPrintDocument;
