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
        // data.content містить масив TripResponce
        setTrips(data.content || []); 
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="home-container">
      <h1 className="home-title">Explore Trips ✈️</h1>

      {/* кнопка створення нового тріпу */}
      <button
        className="create-btn"
        onClick={() => navigate("/trip")}
      >
        Create Your Trip
      </button>


      {/* список тріпів */}
      <div className="trips-list">
        {loading ? (
          <p>Loading trips...</p>
        ) : trips.length === 0 ? (
          <p>No trips available</p>
        ) : (
          trips.map((trip, index) => (
            <div
              key={index}
              className="trip-card"
              onClick={() => navigate(`/trip/${index + 1}`)} // поки що id немає, можна підставити tripId
            >
              <h3>{trip.title}</h3>
              <p>
                {trip.startDate} – {trip.endDate}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Home;