import { useNavigate } from "react-router-dom";
import "../components/Home.css";

function Home() {
  const navigate = useNavigate();

  // мок дані (потім підключиш бек)
  const trips = [
    { id: 1, title: "Paris Getaway", days: 3, price: "€300" },
    { id: 2, title: "Rome Adventure", days: 5, price: "€500" },
    { id: 3, title: "Barcelona Weekend", days: 2, price: "€250" },
  ];

  return (
    <div className="home-container">

      <h1 className="home-title">Explore Trips ✈️</h1>

      {/* кнопка створення */}
      <button
        className="create-btn"
        onClick={() => navigate("/trip")}
      >
        Create Your Trip
      </button>

      {/* список тріпів */}
      <div className="trips-list">
        {trips.map((trip) => (
          <div
            key={trip.id}
            className="trip-card"
            onClick={() => navigate(`/trip/${trip.id}`)}
          >
            <h3>{trip.title}</h3>
            <p>{trip.days} days</p>
            <p>{trip.price}</p>
          </div>
        ))}
      </div>

    </div>
  );
}

export default Home;