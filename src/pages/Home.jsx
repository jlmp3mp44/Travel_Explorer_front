import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiUrl } from "../config/api";
import { friendlyNetworkError, parseResponseJson } from "../utils/friendlyErrors";
import "../components/Home.css";

const BENEFITS = [
  {
    title: "Plans that fit you",
    text: "Pick dates, destination, budget, and interests — we structure everything into a clear day-by-day view.",
  },
  {
    title: "Less planning stress",
    text: "Skip endless tabs and spreadsheets. One flow takes you from idea to a trip you can open and refine.",
  },
  {
    title: "Ideas from real categories",
    text: "Museums, food, nature, nightlife — choose what matters and build an itinerary around it.",
  },
  {
    title: "Your trip, saved",
    text: "Sign in to create trips and revisit them from your profile whenever you like.",
  },
];

function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const goCreateTrip = () => {
    if (user) {
      navigate("/trip");
    } else {
      navigate("/login", { state: { from: "/trip" } });
    }
  };

  useEffect(() => {
    let cancelled = false;

    fetch(apiUrl("/api/public/trips?pageNumber=0&pageSize=6"))
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
    <div className="home-page">
      <section className="home-hero-banner" aria-label="Create a trip">
        <div className="home-hero-banner__bg" aria-hidden="true" />
        <div className="home-hero-banner__overlay" aria-hidden="true" />
        <div className="home-hero-banner__inner">
          <h1 className="home-hero-banner__title">Create your trip</h1>
          <p className="home-hero-banner__tagline">
            Start with dates and a destination — we help you turn it into a plan you can follow.
          </p>
          <button type="button" className="home-hero-banner__cta" onClick={goCreateTrip}>
            Create your trip
          </button>
        </div>
      </section>

      <div className="home-container">
        <section className="home-trips-panel" aria-labelledby="home-trips-heading">
          <h2 id="home-trips-heading" className="home-trips-heading">
            Featured trips
          </h2>
          <p className="home-trips-lead">
            Browse examples from the community — open any card for the full itinerary.
          </p>
          <div className="home-trips-scroll">
            {loading ? (
              <p className="home-trips-status">Loading trips…</p>
            ) : loadError ? (
              <p className="home-inline-error" role="alert">
                {loadError}
              </p>
            ) : trips.length === 0 ? (
              <p className="home-trips-status">No trips to show yet.</p>
            ) : (
              <div className="trips-list">
                {trips.map((trip) => (
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
                      {(trip.desc || trip.description) && (
                        <p className="trip-card-preview">
                          {trip.desc || trip.description}
                        </p>
                      )}
                      <p className="trip-card-dates">
                        <span className="cal" aria-hidden="true">
                          📅
                        </span>
                        {trip.startDate} – {trip.endDate}
                      </p>
                      <div className="trip-card-cta">View itinerary →</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="home-benefits" aria-labelledby="home-benefits-heading">
          <h2 id="home-benefits-heading" className="home-benefits__title">
            Why plan here
          </h2>
          <p className="home-benefits__intro">
            A single place to sketch your trip, keep dates and interests together, and open a clear
            itinerary when you’re ready to go.
          </p>
          <ul className="home-benefits__grid">
            {BENEFITS.map((b) => (
              <li key={b.title} className="home-benefit-card">
                <h3 className="home-benefit-card__title">{b.title}</h3>
                <p className="home-benefit-card__text">{b.text}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

export default Home;
