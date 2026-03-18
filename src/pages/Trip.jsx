import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../components/Trip.css";

const allHobbies = ["Culture", "Nature", "Food", "Nightlife", "Adventure", "Shopping"];

function Trip() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [duration, setDuration] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [budget, setBudget] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [hobbies, setHobbies] = useState([]);
  const [error, setError] = useState("");

  const handleNext = () => {
    if (step === 1 && !duration) {
      setError("Please select trip duration!");
      return;
    }
    if (step === 3 && !budget) {
      setError("Please enter your budget!");
      return;
    }
    if (step === 4 && hobbies.length === 0) {
      setError("Please select at least one hobby!");
      return;
    }

    setError("");
    setStep(step + 1);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    navigate("/result", {
      state: { duration, country, city, budget, currency, hobbies },
    });
  };

  const toggleHobby = (hobby) => {
    if (hobbies.includes(hobby)) {
      setHobbies(hobbies.filter((h) => h !== hobby));
    } else {
      setHobbies([...hobbies, hobby]);
    }
  };

  return (
    <div className="container">
      <h1>Plan your trip</h1>
      <form onSubmit={handleSubmit}>

        {/* Step 1: Duration */}
        {step === 1 && (
          <div className="form-group">
            <label>Trip duration</label>
            <select value={duration} onChange={(e) => setDuration(e.target.value)}>
              <option value="">Select duration</option>
              {[...Array(10)].map((_, i) => (
                <option key={i} value={i + 1}>
                  {i + 1} {i === 0 ? "day" : "days"}
                </option>
              ))}
              <option value="other">Other duration</option>
            </select>
            {error && <p className="error">{error}</p>}
            <button type="button" onClick={handleNext}>Next</button>
          </div>
        )}

        {/* Step 2: Country + optional City */}
        {step === 2 && (
          <div className="form-group">
            <label>Country (optional)</label>
            <select
              value={country}
              onChange={(e) => {
                setCountry(e.target.value);
                setCity("");
              }}
            >
              <option value="">Any country</option>
              <option value="france">France</option>
              <option value="italy">Italy</option>
              <option value="spain">Spain</option>
            </select>

            {country && (
              <select value={city} onChange={(e) => setCity(e.target.value)}>
                <option value="">Select city (optional)</option>
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

            <button type="button" onClick={handleNext}>Next</button>
          </div>
        )}

        {/* Step 3: Budget */}
        {step === 3 && (
          <div className="form-group">
            <label>Budget</label>
            <input
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
            />
            <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
            </select>
            {error && <p className="error">{error}</p>}
            <button type="button" onClick={handleNext}>Next</button>
          </div>
        )}

        {/* Step 4: Hobbies */}
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
            <button type="submit">Create Trip</button>
          </div>
        )}

      </form>
    </div>
  );
}

export default Trip;