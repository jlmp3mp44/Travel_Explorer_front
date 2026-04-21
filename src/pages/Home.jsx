import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiUrl } from "../config/api";
import { friendlyNetworkError, parseResponseJson } from "../utils/friendlyErrors";
import TripListSkeleton from "../components/skeletons/TripListSkeleton";
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
    text: "Sign in to create trips and revisit them from My trips whenever you like.",
  },
];

const HOW_STEPS = [
  {
    step: "1",
    title: "Tell us the basics",
    text: "Dates, where you’re going, budget, and what you enjoy — takes just a minute.",
  },
  {
    step: "2",
    title: "Get a structured plan",
    text: "We organize stops into days so you see the flow at a glance, not a wall of notes.",
  },
  {
    step: "3",
    title: "Open & refine anytime",
    text: "View the full itinerary, adjust visibility, rate stops, and share a link with friends.",
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
          <p className="home-hero-banner__badge">Trip planning, simplified</p>
          <h1 className="home-hero-banner__title">Turn your next trip into a clear day-by-day plan</h1>
          <p className="home-hero-banner__tagline">
            Set dates and a destination, choose what you care about, and get an itinerary you can open,
            share, and refine — without juggling ten browser tabs.
          </p>
          <div className="home-hero-banner__actions">
            <button type="button" className="home-hero-banner__cta" onClick={goCreateTrip}>
              {user ? "Create a new trip" : "Create your trip — sign in to save"}
            </button>
            <button
              type="button"
              className="home-hero-banner__cta home-hero-banner__cta--secondary"
              onClick={() => navigate("/discover")}
            >
              Browse Discover
            </button>
          </div>
          <p className="home-hero-banner__note">
            {user ? (
              <>
                Signed in as <strong>{user.username ?? "traveler"}</strong>.{" "}
                <button type="button" className="home-hero-inline-link" onClick={() => navigate("/my-trips")}>
                  Open My trips
                </button>
                {" · "}
                <Link className="home-hero-inline-link" to="/profile">
                  Profile
                </Link>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <Link className="home-hero-inline-link" to="/login" state={{ from: "/" }}>
                  Sign in
                </Link>{" "}
                or{" "}
                <Link className="home-hero-inline-link" to="/register">
                  create one
                </Link>{" "}
                — your trips sync across devices.
              </>
            )}
          </p>
        </div>
      </section>

      <div className="home-container">
        <section className="home-how" aria-labelledby="home-how-heading">
          <h2 id="home-how-heading" className="home-section-title">
            How it works
          </h2>
          <p className="home-section-lead">
            Three steps from “I have dates” to “here’s my itinerary.”
          </p>
          <ol className="home-how__steps">
            {HOW_STEPS.map((s) => (
              <li key={s.step} className="home-how-step">
                <span className="home-how-step__num" aria-hidden="true">
                  {s.step}
                </span>
                <div className="home-how-step__body">
                  <h3 className="home-how-step__title">{s.title}</h3>
                  <p className="home-how-step__text">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="home-trips-panel" aria-labelledby="home-trips-heading">
          <div className="home-trips-panel__head">
            <div>
              <h2 id="home-trips-heading" className="home-trips-heading">
                Featured trips
              </h2>
              <p className="home-trips-lead">
                Real examples from the community — open any card for dates, stops, and a map-ready route.
              </p>
            </div>
            <button type="button" className="home-trips-see-all" onClick={() => navigate("/discover")}>
              View all
              <span aria-hidden="true" className="home-trips-see-all__arrow">
                →
              </span>
            </button>
          </div>
          <div className="home-trips-scroll">
            {loading ? (
              <TripListSkeleton count={6} variant="home" />
            ) : loadError ? (
              <div className="home-error-panel" role="alert">
                <p className="home-inline-error">{loadError}</p>
                <button type="button" className="home-retry-btn" onClick={() => window.location.reload()}>
                  Retry
                </button>
              </div>
            ) : trips.length === 0 ? (
              <div className="home-empty-trips">
                <p className="home-trips-status">No public trips to show yet.</p>
                <p className="home-empty-trips__hint">Be the first — create a trip and choose to show it on Discover.</p>
                <button type="button" className="home-empty-trips__btn" onClick={goCreateTrip}>
                  Create a trip
                </button>
              </div>
            ) : (
              <div className="trips-list">
                {trips.map((trip) => (
                  <article
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
                        <span>
                          {trip.startDate} – {trip.endDate}
                        </span>
                      </p>
                      <div className="trip-card-cta">
                        View itinerary <span aria-hidden="true">→</span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="home-benefits" aria-labelledby="home-benefits-heading">
          <h2 id="home-benefits-heading" className="home-section-title home-benefits__title">
            Why plan here
          </h2>
          <p className="home-benefits__intro">
            One place to sketch your trip, keep dates and interests together, and open a clear itinerary
            when you’re ready to go.
          </p>
          <ul className="home-benefits__grid">
            {BENEFITS.map((b, i) => (
              <li key={b.title} className="home-benefit-card">
                <span className="home-benefit-card__icon" aria-hidden="true">
                  {i === 0 && "✓"}
                  {i === 1 && "◇"}
                  {i === 2 && "◎"}
                  {i === 3 && "★"}
                </span>
                <h3 className="home-benefit-card__title">{b.title}</h3>
                <p className="home-benefit-card__text">{b.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <aside className="home-bottom-cta" aria-label="Get started">
          <h2 className="home-bottom-cta__title">Ready when you are</h2>
          <p className="home-bottom-cta__text">
            Start a new plan in minutes, or explore Discover for inspiration from other travellers.
          </p>
          <div className="home-bottom-cta__actions">
            <button type="button" className="home-bottom-cta__primary" onClick={goCreateTrip}>
              {user ? "Create a trip" : "Get started"}
            </button>
            <button type="button" className="home-bottom-cta__ghost" onClick={() => navigate("/discover")}>
              Explore Discover
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default Home;
