import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiUrl } from "../config/api";
import { friendlyNetworkError, parseResponseJson } from "../utils/friendlyErrors";
import "../components/Home.css";

function Home() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;

    fetch(apiUrl("/api/public/trips?pageNumber=0&pageSize=3"))
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
        setTrips(data.content || []);
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

  return (
    <div>
      <div className="home-container">
        <h1 className="home-title">Explore Trips ✈️</h1>
        <p className="home-sub">Ready-made itineraries from the community. Open one to see the full plan.</p>

        <button
          className="create-btn"
          onClick={() => navigate("/trip")}
        >
          Create Your Trip
        </button>

        <div className="trips-list">
          {loading ? (
            <p>Loading trips…</p>
          ) : loadError ? (
            <p className="home-inline-error" role="alert">
              {loadError}
            </p>
          ) : trips.length === 0 ? (
            <p>No trips to show yet.</p>
          ) : (
            trips.map((trip) => (
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
                  <h3>{trip.title}</h3>
                  <p className="trip-card-dates">
                    <span className="cal" aria-hidden="true">
                      📅
                    </span>
                    {trip.startDate} – {trip.endDate}
                  </p>
                  <div className="trip-card-cta">View itinerary →</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default Home;
