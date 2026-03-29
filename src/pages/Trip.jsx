import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../components/Trip.css";

const allHobbies = ["Culture", "Nature", "Food", "Nightlife", "Adventure", "Shopping"];

function Trip() {
  const navigate = useNavigate();

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

  const handleNext = () => {
    if (step === 1 && (!startDate || !endDate)) {
      setError("Please select travel dates!");
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
  setLoading(true);

  const tripData = {
    startDate,
    endDate,
    country,
    city,
    budget: budget ? parseInt(budget, 10) : null, // <-- сюди
    currency,
    hobbies
  };

  try {
    const res = await fetch("http://localhost:8080/api/public/trips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tripData),
    });

    console.log("Response status:", res.status);

    if (!res.ok) throw new Error("Failed to create trip on backend");
    const data = await res.json();
    navigate("/result", { state: data });
  } catch (err) {
    console.error(err);
    setError("Something went wrong. Please try again.");
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="container">
      <h1>Plan your trip</h1>
      <form onSubmit={handleSubmit}>

        {/* Step 1: Dates */}
        {step === 1 && (
          <div className="form-group">
            <label>Travel dates</label>
            <input type="date" value={startDate} onChange={(e) => setstartDate(e.target.value)} />
            <input type="date" value={endDate} onChange={(e) => setendDate(e.target.value)} />
            {error && <p className="error">{error}</p>}
            <button type="button" onClick={handleNext}>Next</button>
          </div>
        )}

        {/* Step 2: Country + optional City */}
        {step === 2 && (
          <div className="form-group">
            <label>Country (optional)</label>
            <select value={country} onChange={(e) => { setCountry(e.target.value); setCity(""); }}>
              <option value="">Any country</option>
              <option value="france">France</option>
              <option value="italy">Italy</option>
              <option value="spain">Spain</option>
            </select>

            {country && (
              <select value={city} onChange={(e) => setCity(e.target.value)}>
                <option value="">Select city (optional)</option>
                {country === "france" && <> <option>Paris</option> <option>Lyon</option> </>}
                {country === "italy" && <> <option>Rome</option> <option>Milan</option> </>}
                {country === "spain" && <> <option>Barcelona</option> <option>Madrid</option> </>}
              </select>
            )}

            <button type="button" onClick={handleNext}>Next</button>
          </div>
        )}

        {/* Step 3: Budget */}
        {step === 3 && (
          <div className="form-group">
            <label>Budget</label>
            <input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} />
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
            <button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Trip"}
            </button>
          </div>
        )}

      </form>
    </div>
  );
}

export default Trip;