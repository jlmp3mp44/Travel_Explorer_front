import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiUrl } from "../config/api";
import {
  friendlyNetworkError,
  friendlyTripCreateError,
  parseResponseJson,
} from "../utils/friendlyErrors";
import "../components/Trip.css";

const allHobbies = ["Culture", "Nature", "Food", "Nightlife", "Adventure", "Shopping"];

function toLocalISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function Trip() {
  const navigate = useNavigate();
  const todayStr = useMemo(() => toLocalISODate(new Date()), []);

  const [step, setStep] = useState(1);
  const [startDate, setstartDate] = useState("");
  const [endDate, setendDate] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [budget, setBudget] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [hobbies, setHobbies] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const endDateMin = startDate && startDate >= todayStr ? startDate : todayStr;

  const handleStartChange = (value) => {
    setstartDate(value);
    if (endDate && value && endDate < value) {
      setendDate(value);
    }
  };

  const handleNext = () => {
    if (step === 1) {
      if (!startDate || !endDate) {
        setError("Please choose both a start date and an end date.");
        return;
      }
      if (startDate < todayStr || endDate < todayStr) {
        setError("Pick dates from today onward.");
        return;
      }
      if (endDate < startDate) {
        setError("The end date can’t be before the start date.");
        return;
      }
    }
    if (step === 2) {
      if (!country) {
        setError("Please choose a country to continue.");
        return;
      }
    }
    if (step === 3 && !budget) {
      setError("Please enter your budget.");
      return;
    }
    setError("");
    setStep(step + 1);
  };

  const goBack = () => {
    setError("");
    setStep((s) => Math.max(1, s - 1));
  };

  const toggleHobby = (hobby) => {
    if (hobbies.includes(hobby)) {
      setHobbies(hobbies.filter((h) => h !== hobby));
    } else {
      setHobbies([...hobbies, hobby]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (hobbies.length === 0) {
      setError("Choose at least one interest for your trip.");
      return;
    }
    setLoading(true);

    const tripData = {
      startDate,
      endDate,
      country,
      city,
      budget: budget ? parseInt(budget, 10) : null,
      currency,
      hobbies,
    };

    try {
      const res = await fetch(apiUrl("/api/public/trips"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tripData),
      });

      const data = await parseResponseJson(res);

      if (!res.ok) {
        setError(friendlyTripCreateError(res.status, data));
        return;
      }

      navigate(`/trip/${data.id}`);
    } catch (err) {
      console.error(err);
      setError(friendlyNetworkError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h1>Plan your trip</h1>
      <div className="trip-step-dots" aria-hidden="true">
        {[1, 2, 3, 4].map((n) => (
          <span key={n} className={n === step ? "dot active" : n < step ? "dot done" : "dot"} />
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        {step === 1 && (
          <div className="form-group">
            <label>Travel dates</label>
            <div className="date-row">
              <div className="date-field">
                <span className="date-label">Start</span>
                <input
                  type="date"
                  min={todayStr}
                  value={startDate}
                  onChange={(e) => handleStartChange(e.target.value)}
                />
              </div>
              <div className="date-field">
                <span className="date-label">End</span>
                <input
                  type="date"
                  min={endDateMin}
                  value={endDate}
                  onChange={(e) => setendDate(e.target.value)}
                />
              </div>
            </div>
            {error && <p className="error">{error}</p>}
            <button type="button" onClick={handleNext}>
              Next
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="form-group">
            <label>
              Country <span className="required-star">*</span>
            </label>
            <select
              value={country}
              onChange={(e) => {
                setCountry(e.target.value);
                setCity("");
              }}
              required
            >
              <option value="">Select a country</option>
              <option value="france">France</option>
              <option value="italy">Italy</option>
              <option value="spain">Spain</option>
            </select>

            {country && (
              <select value={city} onChange={(e) => setCity(e.target.value)}>
                <option value="">City (optional)</option>
                {country === "france" && (
                  <>
                    <option>Paris</option>
                    <option>Lyon</option>
                  </>
                )}
                {country === "italy" && (
                  <>
                    <option>Rome</option>
                    <option>Milan</option>
                  </>
                )}
                {country === "spain" && (
                  <>
                    <option>Barcelona</option>
                    <option>Madrid</option>
                  </>
                )}
              </select>
            )}

            {error && <p className="error">{error}</p>}
            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={goBack}>
                Back
              </button>
              <button type="button" onClick={handleNext}>
                Next
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="form-group">
            <label>Budget</label>
            <input type="number" min="0" value={budget} onChange={(e) => setBudget(e.target.value)} />
            <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
            </select>
            {error && <p className="error">{error}</p>}
            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={goBack}>
                Back
              </button>
              <button type="button" onClick={handleNext}>
                Next
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="form-group">
            <label>Hobbies</label>
            <div className="hobbies-container">
              {allHobbies.map((hobby) => (
                <button
                  key={hobby}
                  type="button"
                  className={hobbies.includes(hobby) ? "hobby selected" : "hobby"}
                  onClick={() => toggleHobby(hobby)}
                >
                  {hobby}
                </button>
              ))}
            </div>
            {error && <p className="error">{error}</p>}
            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={goBack}>
                Back
              </button>
              <button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Trip"}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}

export default Trip;
