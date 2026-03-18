import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

function Result() {
  const location = useLocation();
  const { duration, country, city, budget, currency, hobbies } = location.state || {};
  const [trip, setTrip] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Тут можна викликати backend API для генерації маршруту
    const mockTrip = {
      "Day 1": ["Visit Museum", "Lunch at Restaurant A"],
      "Day 2": ["City Park", "Cafe B"],
      "Day 3": ["Local Market", "Dinner at Restaurant C"]
    };
    setTrip(mockTrip);
  }, []);

  if (!duration || !budget || !hobbies || hobbies.length === 0) {
    return (
      <p>
        No data. Go back to <button onClick={() => navigate("/")}>Home</button>
      </p>
    );
  }

  return (
    <div style={{ padding: "20px" }}>
      <h1>Your Trip Plan</h1>
      <p>
        <strong>Duration:</strong> {duration} {duration === "1" ? "day" : "days"} <br />
        {country && <><strong>Country:</strong> {country}<br/></>}
        {city && <><strong>City:</strong> {city}<br/></>}
        <strong>Budget:</strong> {budget} {currency} <br />
        <strong>Hobbies / Interests:</strong> {hobbies.join(", ")}
      </p>

      {trip && Object.entries(trip).map(([day, activities]) => (
        <div key={day} style={{ marginBottom: "15px" }}>
          <h3>{day}</h3>
          <ul>
            {activities.map((act, idx) => (
              <li key={idx}>{act}</li>
            ))}
          </ul>
        </div>
      ))}

      <button onClick={() => navigate("/")}>Back</button>
    </div>
  );
}

export default Result;