import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { tripOwnerDisplayName, tripOwnerId } from "../utils/tripDisplay";
import { fetchPublicTripsList } from "../api/tripPublic";
import { friendlyNetworkError } from "../utils/friendlyErrors";
import TripListSkeleton from "../components/skeletons/TripListSkeleton";
import "../components/Home.css";
import "../components/Discover.css";

/** Matches Spring sort field exposed on trip payloads (`averageRating`). */
const SORT_BY_RATING = "averageRating";
const SORT_ORDER_DESC = "desc";

function isTripPublic(trip) {
  if (trip == null || typeof trip !== "object") return false;
  const v = trip.isPublic ?? trip.is_public;
  if (v === false) return false;
  return true;
}

function formatAvg(n) {
  if (n == null || Number.isNaN(Number(n))) return null;
  return Number(n).toFixed(1);
}

function BestTrips() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchPublicTripsList({
      pageNumber: 0,
      pageSize: 48,
      sortBy: SORT_BY_RATING,
      sortOrder: SORT_ORDER_DESC,
    })
      .then(({ content }) => {
        if (cancelled) return;
        setTrips(Array.isArray(content) ? content.filter(isTripPublic) : []);
        setLoadError("");
      })
      .catch((err) => {
        if (cancelled) return;
        console.error(err);
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
      ? "No rated trips yet. Open Discover or create a trip and invite ratings."
      : null;
  }, [loading, loadError, trips.length]);

  return (
    <div className="discover-page">
      <div className="discover-container">
        <header className="discover-header">
          <h1 className="discover-title">Best trips</h1>
          <p className="discover-lead">
            Public itineraries sorted by average trip rating — highest first.
          </p>
        </header>

        <section className="discover-panel" aria-labelledby="best-trips-heading">
          <h2 id="best-trips-heading" className="discover-subheading">
            Top-rated
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
                {trips.map((trip) => {
                  const avg = formatAvg(trip.averageRating);
                  const count = trip.ratingCount ?? 0;
                  return (
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
                        {(() => {
                          const oid = tripOwnerId(trip);
                          const name = tripOwnerDisplayName(trip);
                          if (!name || oid == null) return null;
                          if (user?.id != null && String(user.id) === String(oid)) return null;
                          return (
                            <p className="trip-card-owner">
                              <Link
                                className="trip-card-owner-link"
                                to={`/users/${oid}`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {name}
                              </Link>
                            </p>
                          );
                        })()}
                        {(trip.desc || trip.description) && (
                          <p className="trip-card-preview">{trip.desc || trip.description}</p>
                        )}
                        <p className="trip-card-dates">
                          <span className="cal" aria-hidden="true">
                            📅
                          </span>
                          {trip.startDate} – {trip.endDate}
                        </p>
                        {(avg != null || count > 0) && (
                          <p className="trip-card-rating" aria-label="Average rating">
                            <span aria-hidden="true">★</span> {avg ?? "—"}
                            <span className="trip-card-rating-count">
                              {" "}
                              · {count} {count === 1 ? "rating" : "ratings"}
                            </span>
                          </p>
                        )}
                        <div className="trip-card-cta">View trip →</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default BestTrips;
