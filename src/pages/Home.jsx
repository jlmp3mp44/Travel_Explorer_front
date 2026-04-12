import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../components/Home.css";

function Home() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Беремо перші 3 тріпи з бекенду
    fetch("http://localhost:8080/api/public/trips?pageNumber=0&pageSize=3")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch trips");
        return res.json();
      })
      .then((data) => {
        console.log("Trips from backend:", data.content); // Дебаг
        setTrips(data.content || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching trips:", err);
        setLoading(false);
      });
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
            <p>Loading trips...</p>
          ) : trips.length === 0 ? (
            <p>No trips available</p>
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