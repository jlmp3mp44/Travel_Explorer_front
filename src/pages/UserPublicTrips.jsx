import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { fetchUserPublicTripsList } from "../api/tripPublic";
import { friendlyNetworkError } from "../utils/friendlyErrors";
import { tripOwnerDisplayName, tripOwnerId } from "../utils/tripDisplay";
import TripListSkeleton from "../components/skeletons/TripListSkeleton";
import "../components/Home.css";
import "../components/Discover.css";

function isTripPublic(trip) {
  if (trip == null || typeof trip !== "object") return false;
  const v = trip.isPublic ?? trip.is_public;
  if (v === false) return false;
  return true;
}

function UserPublicTrips() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isOwnPublicPage = user?.id != null && String(user.id) === String(userId);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [profileTitle, setProfileTitle] = useState("");

  useEffect(() => {
    let cancelled = false;
    if (userId == null || String(userId).trim() === "") {
      setLoading(false);
      setLoadError("Missing user id.");
      return;
    }
    setLoading(true);
    setLoadError("");
    fetchUserPublicTripsList(userId, { pageNumber: 0, pageSize: 48 })
      .then(({ content }) => {
        if (cancelled) return;
        const list = Array.isArray(content) ? content : [];
        setTrips(list.filter(isTripPublic));
        const first = list[0];
        const oid = tripOwnerId(first);
        const name = tripOwnerDisplayName(first);
        if (name && String(oid) === String(userId)) {
          setProfileTitle(name);
        } else if (name) {
          setProfileTitle(name);
        } else {
          setProfileTitle("");
        }
        setLoadError("");
      })
      .catch((err) => {
        if (cancelled) return;
        console.error(err);
        setLoadError(friendlyNetworkError(err));
        setTrips([]);
        setProfileTitle("");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const heading = useMemo(() => {
    if (profileTitle) return `${profileTitle}'s trips`;
    return "Public trips";
  }, [profileTitle]);

  const lead = useMemo(() => {
    if (profileTitle) {
      return "Itineraries this traveller chose to show on Discover.";
    }
    return `Public itineraries for user #${userId}.`;
  }, [profileTitle, userId]);

  return (
    <div className="discover-page">
      <div className="discover-container">
        <header className="discover-header">
          <h1 className="discover-title">{heading}</h1>
          <p className="discover-lead">{lead}</p>
          <p className="discover-lead" style={{ marginTop: 8 }}>
            <Link to="/discover" className="trip-card-owner-link">
              ← Back to Discover
            </Link>
          </p>
        </header>

        <section className="discover-panel" aria-labelledby="user-trips-heading">
          <h2 id="user-trips-heading" className="discover-subheading">
            Trips
          </h2>
          <div className="home-trips-scroll">
            {loading ? (
              <TripListSkeleton count={6} variant="discover" />
            ) : loadError ? (
              <p className="home-inline-error" role="alert">
                {loadError}
              </p>
            ) : trips.length === 0 ? (
              <p className="home-trips-status">No public trips to show for this profile yet.</p>
            ) : (
              <div className="trips-list">
                {trips.map((trip) => {
                  const owner = tripOwnerDisplayName(trip);
                  const oid = tripOwnerId(trip);
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
                        {owner && oid != null && !isOwnPublicPage ? (
                          <p className="trip-card-owner">
                            <span
                              role="link"
                              tabIndex={0}
                              className="trip-card-owner-link"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/users/${oid}`);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  navigate(`/users/${oid}`);
                                }
                              }}
                            >
                              {owner}
                            </span>
                          </p>
                        ) : null}
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

export default UserPublicTrips;
