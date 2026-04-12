import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import "../components/TripDetails.css";

function TripDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrip = async () => {
      try {
        const res = await fetch(`http://localhost:8080/api/public/trips/${id}`);
        if (!res.ok) throw new Error("Failed to fetch trip");
        const data = await res.json();
        setTrip(data);
      } catch (err) {
        console.error("Error fetching trip:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTrip();
  }, [id]);

  if (loading) {
    return (
      <div className="trip-details-loading" role="status">
        Loading your itinerary…
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="trip-details-empty">
        <p>No trip found.</p>
        <button type="button" className="trip-back-btn" onClick={() => navigate("/")}>
          ← Back to home
        </button>
      </div>
    );
  }

  return (
    <div className="trip-details-page">
      <button type="button" className="trip-back-btn" onClick={() => navigate("/")}>
        ← Back
      </button>

      <div className="trip-details-grid">
        <div className="trip-details-main">
          <header className="trip-hero">
            <h1>{trip.title}</h1>
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

          <section className="trip-days-section">
            <h2>Itinerary</h2>
            {trip.days?.map((day, index) => (
              <article key={index} className="trip-day-card">
                <div className="trip-day-header">
                  <span className="trip-day-badge">Day {index + 1}</span>
                  <span className="trip-day-date">{day.date}</span>
                </div>

                {day.activities?.map((activity, i) => (
                  <div key={i} className="trip-activity">
                    <div className="trip-activity-time">
                      {activity.startTime} – {activity.endTime}
                    </div>

                    {activity.places?.length > 0 && (
                      <ul className="trip-places">
                        {activity.places.map((place, j) => (
                          <li key={j}>{place.title}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </article>
            ))}
          </section>
        </div>

        <aside className="trip-map-aside" aria-label="Map preview (coming soon)">
          <span className="trip-map-placeholder-icon" aria-hidden="true">
            🗺️
          </span>
          <p className="trip-map-placeholder-title">Map</p>
          <p className="trip-map-placeholder-hint">Your route will appear here in a future update.</p>
        </aside>
      </div>
    </div>
  );
}

export default TripDetails;
