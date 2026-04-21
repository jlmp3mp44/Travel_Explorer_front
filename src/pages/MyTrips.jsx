import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { deletePublicTrip, fetchMyTrips, updatePublicTrip } from "../api/tripPublic";
import { friendlyNetworkError } from "../utils/friendlyErrors";
import TripListSkeleton from "../components/skeletons/TripListSkeleton";
import "../components/Home.css";
import "../components/MyTrips.css";

function tripIsPublic(t) {
  const v = t?.isPublic ?? t?.is_public;
  if (v === false) return false;
  return true;
}

function MyTrips() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/login", { replace: true, state: { from: "/my-trips" } });
    }
  }, [authLoading, user, navigate]);

  const load = useCallback(async () => {
    if (user?.id == null) return;
    setLoading(true);
    setError("");
    try {
      const list = await fetchMyTrips(user.id);
      setTrips(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : friendlyNetworkError(e));
      setTrips([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (authLoading || !user) return;
    load();
  }, [authLoading, user, load]);

  const handleDeleteTrip = async (trip) => {
    if (trip?.id == null) return;
    setBusyId(trip.id);
    setError("");
    try {
      await deletePublicTrip(trip.id);
      if (typeof window !== "undefined") {
        try {
          window.localStorage.removeItem(`tripSnapshot:${trip.id}`);
        } catch {
          /* ignore */
        }
      }
      setTrips((prev) => prev.filter((t) => String(t.id) !== String(trip.id)));
      setDeleteConfirmId(null);
      navigate(".", { replace: true, state: { tripDeleted: true } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete this trip.");
    } finally {
      setBusyId(null);
    }
  };

  const togglePublic = async (trip, next) => {
    if (trip?.id == null) return;
    setBusyId(trip.id);
    setError("");
    try {
      const updated = await updatePublicTrip(trip.id, { isPublic: next });
      const pub = updated?.isPublic ?? updated?.is_public ?? next;
      setTrips((prev) =>
        prev.map((t) => (String(t.id) === String(trip.id) ? { ...t, isPublic: pub } : t))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update visibility.");
    } finally {
      setBusyId(null);
    }
  };

  if (authLoading) {
    return (
      <div className="my-trips-page">
        <p className="my-trips-loading">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="my-trips-page">
      <header className="my-trips-header">
        <h1 className="my-trips-title">My trips</h1>
        <p className="my-trips-lead">Open a trip or change whether it appears on Discover.</p>
      </header>

      {error ? (
        <p className="my-trips-error" role="alert">
          {error}
        </p>
      ) : null}

      <section className="my-trips-section" aria-labelledby="my-trips-heading">
        <h2 id="my-trips-heading" className="visually-hidden">
          Your trips
        </h2>
        {loading ? (
          <TripListSkeleton count={5} variant="discover" />
        ) : trips.length === 0 ? (
          <p className="my-trips-empty">
            No trips yet.{" "}
            <button type="button" className="my-trips-link" onClick={() => navigate("/trip")}>
              Create a trip
            </button>
          </p>
        ) : (
          <ul className="my-trips-list">
            {trips.map((trip) => {
              const pub = tripIsPublic(trip);
              const busy = busyId === trip.id;
              return (
                <li key={trip.id} className="my-trips-row">
                  <button
                    type="button"
                    className="my-trips-row-main"
                    onClick={() => navigate(`/trip/${trip.id}`)}
                  >
                    <span className="my-trips-row-title">{trip.title ?? `Trip ${trip.id}`}</span>
                    <span className="my-trips-row-dates">
                      {trip.startDate} – {trip.endDate}
                    </span>
                  </button>
                  {deleteConfirmId === trip.id ? (
                    <div className="my-trips-delete-inline" role="group" aria-label="Confirm delete trip">
                      <span className="my-trips-delete-inline__ask">Delete this whole trip?</span>
                      <button
                        type="button"
                        className="my-trips-delete-inline__btn my-trips-delete-inline__btn--cancel"
                        disabled={busy}
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmId(null);
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="my-trips-delete-inline__btn my-trips-delete-inline__btn--danger"
                        disabled={busy}
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleDeleteTrip(trip);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  ) : (
                    <>
                      <label className="my-trips-visibility">
                        <input
                          type="checkbox"
                          checked={pub}
                          disabled={busy}
                          onChange={(e) => togglePublic(trip, e.target.checked)}
                        />
                        <span>On Discover</span>
                      </label>
                      <button
                        type="button"
                        className="my-trips-row-delete"
                        disabled={busy}
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmId(trip.id);
                        }}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

export default MyTrips;
