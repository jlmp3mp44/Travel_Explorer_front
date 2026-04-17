import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiUrl } from "../config/api";
import { friendlyNetworkError, parseResponseJson } from "../utils/friendlyErrors";
import TripListSkeleton from "../components/skeletons/TripListSkeleton";
import "../components/Home.css";
import "../components/Discover.css";

function isTripPublic(trip) {
  if (trip == null || typeof trip !== "object") return false;
  const v = trip.isPublic ?? trip.is_public;
  if (v === false) return false;
  return true;
}

function Discover() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;

    fetch(apiUrl("/api/public/trips?pageNumber=0&pageSize=48"))
      .then(async (res) => {
        const data = await parseResponseJson(res);
        if (!res.ok) {
          throw new Error(
            res.status >= 500
              ? "The server is busy right now. Please try again in a moment."
              : "We couldn’t load trips. Please refresh the page."
          );
        }
        return data;
      })
      .then((data) => {
        if (cancelled) return;
        const raw = data.content || [];
        setTrips(Array.isArray(raw) ? raw.filter(isTripPublic) : []);
        setLoadError("");
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Error fetching trips:", err);
        setLoadError(friendlyNetworkError(err));
        setTrips([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const emptyMessage = useMemo(() => {
    if (loading || loadError) return null;
    return trips.length === 0
      ? "Nothing here yet. Create a trip and choose to show it on Discover."
      : null;
  }, [loading, loadError, trips.length]);

  return (
    <div className="discover-page">
      <div className="discover-container">
        <header className="discover-header">
          <h1 className="discover-title">Discover</h1>
          <p className="discover-lead">
            See where others are going — open a card to view the trip.
          </p>
        </header>

        <section className="discover-panel" aria-labelledby="discover-trips-heading">
          <h2 id="discover-trips-heading" className="discover-subheading">
            Trips to explore
          </h2>
          <div className="home-trips-scroll">
            {loading ? (
              <TripListSkeleton count={6} variant="discover" />
            ) : loadError ? (
              <p className="home-inline-error" role="alert">
                {loadError}
              </p>
            ) : emptyMessage ? (
              <p className="home-trips-status">{emptyMessage}</p>
            ) : (
              <div className="trips-list">
                {trips.map((trip) => (
                  <div
                    key={trip.id}
                    className="trip-card"
                    onClick={() => navigate(`/trip/${trip.id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        navigate(`/trip/${trip.id}`);
                      }
                    }}
                  >
                    <div className="trip-card-inner">
                      <h3 className="trip-card-title">{trip.title}</h3>
                      {(trip.desc || trip.description) && (
                        <p className="trip-card-preview">{trip.desc || trip.description}</p>
                      )}
                      <p className="trip-card-dates">
                        <span className="cal" aria-hidden="true">
                          📅
                        </span>
                        {trip.startDate} – {trip.endDate}
                      </p>
                      <div className="trip-card-cta">View trip →</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default Discover;
