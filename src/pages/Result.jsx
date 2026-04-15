import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import "../components/Result.css";

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

  const getDays = () => {
    if (!dateFrom || !dateTo) return null;

    const start = new Date(dateFrom);
    const end = new Date(dateTo);

    const diffTime = end - start;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    return diffDays;
  };

  const days = getDays();

  if (!dateFrom || !dateTo || !budget || !hobbies || hobbies.length === 0) {
    return (
      <div className="result-missing">
        <div className="result-empty">
          <p>
            We don&apos;t have your trip details. Start from the trip planner to build an
            itinerary.
          </p>
          <button type="button" className="result-btn-primary" onClick={() => navigate("/")}>
            Back to home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="result-page">
      <button type="button" className="result-back" onClick={() => navigate(-1)}>
        ← Back
      </button>

      <header className="result-hero">
        <h1 className="result-title">Your trip plan</h1>
        <p className="result-lead">
          Here&apos;s a quick summary and a sample day-by-day outline. (Demo data — connect
          your backend when ready.)
        </p>
      </header>

      <div className="result-summary" aria-label="Trip summary">
        <div className="result-stat">
          <span className="result-stat-label">Dates</span>
          <p className="result-stat-value">
            {dateFrom} → {dateTo}
          </p>
        </div>
        {days != null ? (
          <div className="result-stat">
            <span className="result-stat-label">Duration</span>
            <p className="result-stat-value">
              {days} {days === 1 ? "day" : "days"}
            </p>
          </div>
        ) : null}
        {country ? (
          <div className="result-stat">
            <span className="result-stat-label">Country</span>
            <p className="result-stat-value">{country}</p>
          </div>
        ) : null}
        {city ? (
          <div className="result-stat">
            <span className="result-stat-label">City</span>
            <p className="result-stat-value">{city}</p>
          </div>
        ) : null}
        <div className="result-stat">
          <span className="result-stat-label">Budget</span>
          <p className="result-stat-value">
            {budget} {currency}
          </p>
        </div>
        <div className="result-stat" style={{ gridColumn: "1 / -1" }}>
          <span className="result-stat-label">Interests</span>
          <p className="result-stat-value">{hobbies.join(", ")}</p>
        </div>
      </div>

      <h2 className="result-section-title">Sample itinerary</h2>
      <div className="result-days">
        {trip &&
          Object.entries(trip).map(([day, activities]) => (
            <article key={day} className="result-day">
              <h3>{day}</h3>
              <ul>
                {activities.map((act, idx) => (
                  <li key={idx}>{act}</li>
                ))}
              </ul>
            </article>
          ))}
      </div>

      <div className="result-actions">
        <button type="button" className="result-btn-primary" onClick={() => navigate("/")}>
          Back to home
        </button>
      </div>
    </div>
  );
}

export default Result;
