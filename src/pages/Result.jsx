import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

function Result() {
  const location = useLocation();

  const {
    dateFrom,
    dateTo,
    country,
    city,
    budget,
    currency,
    hobbies,
  } = location.state || {};

  const [trip, setTrip] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const mockTrip = {
      "Day 1": ["Museum", "Restaurant A"],
      "Day 2": ["Park", "Cafe B"],
    };
    setTrip(mockTrip);
  }, []);

  // 🔥 рахуємо кількість днів
  const getDays = () => {
    if (!dateFrom || !dateTo) return null;

    const start = new Date(dateFrom);
    const end = new Date(dateTo);

    const diffTime = end - start;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    return diffDays;
  };

  const days = getDays();

  // ❗ перевірка
  if (!dateFrom || !dateTo || !budget || !hobbies || hobbies.length === 0) {
    return (
      <p>
        We don’t have your trip details.{" "}
        <button type="button" onClick={() => navigate("/")}>
          Back to home
        </button>
      </p>
    );
  }

  return (
    <div className="container">
      <h1>Your Trip Plan</h1>

      <p>
        <strong>Dates:</strong> {dateFrom} → {dateTo} <br />
        {days && (
          <>
            <strong>Duration:</strong> {days} {days === 1 ? "day" : "days"} <br />
          </>
        )}

        {country && (
          <>
            <strong>Country:</strong> {country} <br />
          </>
        )}

        {city && (
          <>
            <strong>City:</strong> {city} <br />
          </>
        )}

        <strong>Budget:</strong> {budget} {currency} <br />

        <strong>Hobbies:</strong> {hobbies.join(", ")}
      </p>

      {trip &&
        Object.entries(trip).map(([day, activities]) => (
          <div key={day}>
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