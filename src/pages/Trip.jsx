import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiUrl } from "../config/api";
import {
  friendlyNetworkError,
  friendlyTripCreateError,
  parseResponseJson,
} from "../utils/friendlyErrors";
import {
  cityId,
  cityLabel,
  countryId,
  countryLabel,
  normalizeListResponse,
  placeCategoryLabel,
  placeCategoryPathKey,
  placeInterestCode,
  placeInterestId,
  placeInterestLabel,
} from "../utils/geoApi";
import { unwrapTripPayload } from "../utils/tripItinerary";
import SearchableSelect from "../components/SearchableSelect";
import InterestingPlacesPrompt from "../components/InterestingPlacesPrompt";
import { matchInterestingPlaces } from "../api/interestingPlaces";
import "../components/Trip.css";

function selectionKey(groupId, interestId) {
  return `${groupId}:${interestId}`;
}

const TRIP_STEPS = [
  { id: 1, label: "Dates", hint: "When do you travel?" },
  { id: 2, label: "Place", hint: "Country & city" },
  { id: 3, label: "Budget", hint: "Spending plan" },
  { id: 4, label: "Interests", hint: "What to explore" },
  { id: 5, label: "Pace", hint: "Trip intensity" },
];

const TRIP_INTENSITY_OPTIONS = [
  {
    value: "LOW",
    emoji: "🧘",
    title: "Relaxed",
    body: "Slow, minimal activities",
  },
  {
    value: "MEDIUM",
    emoji: "🚶",
    title: "Balanced",
    body: "Mix of rest and exploration",
  },
  {
    value: "HIGH",
    emoji: "⚡",
    title: "Intense",
    body: "Packed schedule, many activities",
  },
];

function toLocalISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function Trip() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const todayStr = useMemo(() => toLocalISODate(new Date()), []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/login", { replace: true, state: { from: "/trip" } });
    }
  }, [authLoading, user, navigate]);

  const [step, setStep] = useState(1);
  const [startDate, setstartDate] = useState("");
  const [endDate, setendDate] = useState("");
  const [selectedCountryId, setSelectedCountryId] = useState("");
  const [selectedCityId, setSelectedCityId] = useState("");
  const [budget, setBudget] = useState("");
  const [currency, setCurrency] = useState("EUR");
  /** { key, groupId, interestId, label }[] — interests from API groups */
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  /** Shown in Discover when true; default matches backend default. */
  const [isPublic, setIsPublic] = useState(true);
  /** LOW | MEDIUM | HIGH — sent as `intensity` on create. */
  const [intensity, setIntensity] = useState("");

  const [placeCategories, setPlaceCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState("");
  const [expandedGroupIds, setExpandedGroupIds] = useState(() => new Set());
  const [interestsByGroup, setInterestsByGroup] = useState({});
  const [groupLoading, setGroupLoading] = useState({});
  const [groupErrors, setGroupErrors] = useState({});
  const loadedGroupsRef = useRef(new Set());

  /** Saved "interesting" places that match the current trip geography (city or country). */
  const [interestingMatches, setInterestingMatches] = useState([]);
  /** Modal driving the one-by-one accept/skip prompt before trip POST. */
  const [showInterestingPrompt, setShowInterestingPrompt] = useState(false);
  /** When a queued POST is waiting for the prompt to finish, the data lives here. */
  const [pendingTripPayload, setPendingTripPayload] = useState(null);

  const [countries, setCountries] = useState([]);
  const [countriesLoading, setCountriesLoading] = useState(true);
  const [countriesError, setCountriesError] = useState("");

  const [cities, setCities] = useState([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [citiesError, setCitiesError] = useState("");

  const endDateMin = startDate && startDate >= todayStr ? startDate : todayStr;

  useEffect(() => {
    let cancelled = false;

    const loadCountries = async () => {
      setCountriesLoading(true);
      setCountriesError("");
      try {
        const res = await fetch(apiUrl("/api/public/countries"));
        const data = await parseResponseJson(res);
        if (!res.ok) {
          throw new Error("Could not load countries.");
        }
        const list = normalizeListResponse(data);
        if (!cancelled) setCountries(list);
      } catch (err) {
        if (!cancelled) {
          setCountries([]);
          setCountriesError(friendlyNetworkError(err));
        }
      } finally {
        if (!cancelled) setCountriesLoading(false);
      }
    };

    loadCountries();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadCategories = async () => {
      setCategoriesLoading(true);
      setCategoriesError("");
      try {
        const res = await fetch(apiUrl("/api/public/place-categories"));
        const data = await parseResponseJson(res);
        if (!res.ok) {
          throw new Error("Could not load categories.");
        }
        const list = normalizeListResponse(data);
        if (!cancelled) setPlaceCategories(list);
      } catch (err) {
        if (!cancelled) {
          setPlaceCategories([]);
          setCategoriesError(friendlyNetworkError(err));
        }
      } finally {
        if (!cancelled) setCategoriesLoading(false);
      }
    };

    loadCategories();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedCountryId) {
      setCities([]);
      setCitiesError("");
      return;
    }

    let cancelled = false;

    const loadCities = async () => {
      setCitiesLoading(true);
      setCitiesError("");
      setCities([]);
      setSelectedCityId("");

      try {
        const res = await fetch(
          apiUrl(`/api/public/countries/${encodeURIComponent(selectedCountryId)}/cities`)
        );
        const data = await parseResponseJson(res);
        if (!res.ok) {
          throw new Error("Could not load cities.");
        }
        const list = normalizeListResponse(data);
        if (!cancelled) setCities(list);
      } catch (err) {
        if (!cancelled) {
          setCities([]);
          setCitiesError(friendlyNetworkError(err));
        }
      } finally {
        if (!cancelled) setCitiesLoading(false);
      }
    };

    loadCities();
    return () => {
      cancelled = true;
    };
  }, [selectedCountryId]);

  const selectedCountry = useMemo(
    () => countries.find((c) => countryId(c) === selectedCountryId),
    [countries, selectedCountryId]
  );

  const selectedCity = useMemo(
    () => cities.find((c) => cityId(c) === selectedCityId),
    [cities, selectedCityId]
  );

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
      if (!selectedCountryId) {
        setError("Please choose a country to continue.");
        return;
      }
    }
    if (step === 3) {
      if (!budget) {
        setError("Please enter your budget.");
        return;
      }
      const budgetNum = parseInt(budget, 10);
      if (Number.isNaN(budgetNum) || budgetNum < 0) {
        setError("Budget must be zero or a positive number.");
        return;
      }
    }
    if (step === 4) {
      if (selectedInterests.length === 0) {
        setError("Choose at least one interest from any group.");
        return;
      }
    }
    setError("");
    setStep(step + 1);
  };

  const goBack = () => {
    setError("");
    setStep((s) => Math.max(1, s - 1));
  };

  const loadInterestsForGroup = async (groupId) => {
    if (loadedGroupsRef.current.has(groupId)) return;

    setGroupLoading((prev) => ({ ...prev, [groupId]: true }));
    setGroupErrors((prev) => ({ ...prev, [groupId]: "" }));

    try {
      const res = await fetch(
        apiUrl(`/api/public/place-categories/groups/${encodeURIComponent(groupId)}`)
      );
      const data = await parseResponseJson(res);
      if (!res.ok) {
        throw new Error("Could not load interests.");
      }
      const list = normalizeListResponse(data);
      loadedGroupsRef.current.add(groupId);
      setInterestsByGroup((prev) => ({ ...prev, [groupId]: list }));
    } catch (err) {
      setGroupErrors((prev) => ({
        ...prev,
        [groupId]: friendlyNetworkError(err),
      }));
    } finally {
      setGroupLoading((prev) => ({ ...prev, [groupId]: false }));
    }
  };

  const handleToggleGroup = (groupId) => {
    setExpandedGroupIds((prev) => {
      const next = new Set(prev);
      const wasOpen = next.has(groupId);
      if (wasOpen) {
        next.delete(groupId);
      } else {
        next.add(groupId);
        loadInterestsForGroup(groupId);
      }
      return next;
    });
  };

  const toggleInterest = (groupId, item) => {
    const iid = placeInterestId(item);
    if (!iid) return;
    const key = selectionKey(groupId, iid);
    const label = placeInterestLabel(item);
    const categoryCode = placeInterestCode(item);
    setSelectedInterests((prev) => {
      const exists = prev.some((p) => p.key === key);
      if (exists) {
        return prev.filter((p) => p.key !== key);
      }
      return [...prev, { key, groupId, interestId: iid, categoryCode, label }];
    });
  };

  const isInterestSelected = (groupId, item) => {
    const iid = placeInterestId(item);
    if (!iid) return false;
    return selectedInterests.some((p) => p.key === selectionKey(groupId, iid));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (step !== 5) return;
    if (selectedInterests.length === 0) {
      setError("Choose at least one interest from any group.");
      return;
    }
    if (!intensity) {
      setError("Please choose a pace for your trip.");
      return;
    }
    setLoading(true);

    const countryName = selectedCountry ? countryLabel(selectedCountry) : "";
    const cityName = selectedCity ? cityLabel(selectedCity) : "";
    const categoryCodes = selectedInterests
      .map((s) => s.categoryCode || s.interestId)
      .filter((c) => c != null && String(c).trim() !== "");

    const tripData = {
      startDate,
      endDate,
      country: countryName,
      budget: parseInt(budget, 10),
      /** Backend DTO uses `categories` (e.g. ["museum"]), not only hobbies/interestIds */
      categories: categoryCodes,
      isPublic,
      intensity,
      ...(cityName ? { city: cityName } : {}),
      ...(selectedCityId ? { cityIds: [Number(selectedCityId)] } : {}),
      ...(currency ? { currency } : {}),
      hobbies: selectedInterests.map((s) => s.label),
      interestIds: categoryCodes,
    };

    // Look for "interesting" matches before submitting; if any, the prompt drives the POST.
    try {
      const matches = await matchInterestingPlaces({
        cityId: selectedCityId || undefined,
        countryId: selectedCountryId || undefined,
      });
      if (Array.isArray(matches) && matches.length > 0) {
        setInterestingMatches(matches);
        setPendingTripPayload(tripData);
        setShowInterestingPrompt(true);
        return; // loading stays true until prompt completes / cancels
      }
    } catch (err) {
      // Non-fatal: fall through and submit without injection.
      console.warn("Could not load interesting-place matches:", err);
    }

    await postTripCreate(tripData);
  };

  const postTripCreate = async (tripData) => {
    try {
      const res = await fetch(apiUrl("/api/public/trips"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tripData),
      });

      const data = await parseResponseJson(res);

      if (!res.ok) {
        setError(friendlyTripCreateError(res.status, data));
        return;
      }

      const trip = unwrapTripPayload(data);
      if (trip?.id == null) {
        setError("Trip was created but the response had no id. Please refresh My trips.");
        return;
      }

      try {
        window.localStorage.setItem(`tripSnapshot:${trip.id}`, JSON.stringify(trip));
      } catch {
        /* storage may be unavailable; navigation state still covers the common case */
      }

      navigate(`/trip/${trip.id}`, { state: { tripSnapshot: trip } });
    } catch (err) {
      console.error(err);
      setError(friendlyNetworkError(err));
    } finally {
      setLoading(false);
    }
  };

  const handlePromptComplete = async (acceptedIds) => {
    setShowInterestingPrompt(false);
    const payload = pendingTripPayload;
    setPendingTripPayload(null);
    if (!payload) {
      setLoading(false);
      return;
    }
    const finalPayload =
      Array.isArray(acceptedIds) && acceptedIds.length > 0
        ? { ...payload, mustIncludePlaceIds: acceptedIds }
        : payload;
    await postTripCreate(finalPayload);
  };

  const handlePromptCancel = () => {
    setShowInterestingPrompt(false);
    setPendingTripPayload(null);
    setInterestingMatches([]);
    setLoading(false);
  };

  const sortedCountries = useMemo(() => {
    return [...countries].sort((a, b) =>
      countryLabel(a).localeCompare(countryLabel(b), undefined, { sensitivity: "base" })
    );
  }, [countries]);

  const sortedCities = useMemo(() => {
    return [...cities].sort((a, b) =>
      cityLabel(a).localeCompare(cityLabel(b), undefined, { sensitivity: "base" })
    );
  }, [cities]);

  const countryOptions = useMemo(
    () =>
      sortedCountries
        .map((c) => {
          const id = countryId(c);
          return id ? { id, label: countryLabel(c) } : null;
        })
        .filter(Boolean),
    [sortedCountries]
  );

  const cityOptions = useMemo(
    () =>
      sortedCities
        .map((c) => {
          const id = cityId(c);
          return id ? { id, label: cityLabel(c) } : null;
        })
        .filter(Boolean),
    [sortedCities]
  );

  const sortedPlaceCategories = useMemo(() => {
    return [...placeCategories].sort((a, b) =>
      placeCategoryLabel(a).localeCompare(placeCategoryLabel(b), undefined, { sensitivity: "base" })
    );
  }, [placeCategories]);

  const selectedIntensityOption = useMemo(
    () => TRIP_INTENSITY_OPTIONS.find((o) => o.value === intensity) ?? null,
    [intensity]
  );

  if (authLoading) {
    return (
      <div className="trip-page trip-page--auth-wait">
        <p className="trip-auth-wait-msg">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="trip-page">
      <div className="trip-page__body">
      <div className="trip-page__header">
        <p className="trip-page__kicker">New itinerary</p>
        <h1 className="trip-page__title">Plan your trip</h1>
        <p className="trip-page__subtitle">
          Step {step} of 5 · {TRIP_STEPS[step - 1]?.hint}
        </p>
        <nav className="trip-stepper" aria-label="Planning steps">
          {TRIP_STEPS.map((s) => {
            const isActive = step === s.id;
            const isDone = step > s.id;
            return (
              <div
                key={s.id}
                className={`trip-stepper__item ${isActive ? "is-active" : ""} ${isDone ? "is-done" : ""}`}
                aria-current={isActive ? "step" : undefined}
              >
                <span className="trip-stepper__dot" aria-hidden="true">
                  {isDone ? "✓" : s.id}
                </span>
                <span className="trip-stepper__label">{s.label}</span>
              </div>
            );
          })}
        </nav>
      </div>

      <form
        className={`trip-form ${step === 4 ? "trip-form--interests" : ""} ${step === 5 ? "trip-form--pace" : ""}`}
        onSubmit={handleSubmit}
      >
        {step === 1 && (
          <div className="trip-step-surface form-group">
            <div className="trip-step-heading">
              <h2 className="trip-step-title">Travel dates</h2>
              <p className="trip-step-desc">Pick your arrival and departure dates.</p>
            </div>
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
            <button type="button" className="trip-btn-primary" onClick={handleNext}>
              Continue
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="trip-step-surface form-group trip-location-step">
            <div className="trip-step-heading">
              <h2 className="trip-step-title">Destination</h2>
              <p className="trip-step-desc">Pick a country and optionally narrow down to a city.</p>
            </div>
            {countriesError ? (
              <p className="error" role="alert">
                {countriesError}
              </p>
            ) : (
              <SearchableSelect
                label="Country"
                required
                placeholder="Tap to choose a country"
                inputPlaceholder="Type to search countries…"
                options={countryOptions}
                value={selectedCountryId}
                onChange={(id) => {
                  setSelectedCountryId(id);
                  setSelectedCityId("");
                }}
                loading={countriesLoading}
                disabled={!!countriesError}
              />
            )}

            {selectedCountryId && !countriesError && (
              <>
                {citiesError ? (
                  <p className="error" role="alert">
                    {citiesError}
                  </p>
                ) : (
                  <SearchableSelect
                    label="City"
                    placeholder="Any city"
                    inputPlaceholder="Type to search cities…"
                    emptyOption={{ id: "", label: "Any city (no preference)" }}
                    options={cityOptions}
                    value={selectedCityId}
                    onChange={setSelectedCityId}
                    loading={citiesLoading}
                  />
                )}
              </>
            )}

            {error && <p className="error">{error}</p>}
            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={goBack}>
                Back
              </button>
              <button
                type="button"
                className="trip-btn-primary"
                onClick={handleNext}
                disabled={
                  countriesLoading || !!countriesError || !countryOptions.length
                }
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="trip-step-surface form-group">
            <div className="trip-step-heading">
              <h2 className="trip-step-title">Budget</h2>
              <p className="trip-step-desc">Rough total for the trip — you can adjust later.</p>
            </div>
            <div className="trip-budget-row">
              <div className="trip-budget-amount">
                <label htmlFor="trip-budget-input">Amount</label>
                <input
                  id="trip-budget-input"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={budget}
                  onKeyDown={(e) => {
                    if (e.key === "-" || e.key === "e" || e.key === "E" || e.key === "+") {
                      e.preventDefault();
                    }
                  }}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "") {
                      setBudget("");
                      return;
                    }
                    if (/^\d+$/.test(v)) setBudget(v);
                  }}
                />
              </div>
              <div className="trip-budget-currency">
                <label htmlFor="trip-currency-select">Currency</label>
                <select
                  id="trip-currency-select"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  <option value="EUR">EUR €</option>
                  <option value="USD">USD $</option>
                </select>
              </div>
            </div>
            {error && <p className="error">{error}</p>}
            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={goBack}>
                Back
              </button>
              <button type="button" className="trip-btn-primary" onClick={handleNext}>
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="trip-interests-step">
            <div className="trip-interests-top">
              <h2 className="trip-interests-heading">Interests</h2>
              <p className="trip-interests-lead">
                Open categories to explore options. Mix selections from as many as you like.
              </p>
              {selectedInterests.length > 0 && (
                <span className="trip-interests-pill" aria-live="polite">
                  {selectedInterests.length} selected
                </span>
              )}
            </div>

            {categoriesLoading ? (
              <p className="trip-select-hint">Loading categories…</p>
            ) : categoriesError ? (
              <p className="error trip-interests-error" role="alert">
                {categoriesError}
              </p>
            ) : (
              <div className="trip-categories-scroll">
                {sortedPlaceCategories.map((cat) => {
                  const gid = placeCategoryPathKey(cat);
                  if (!gid) return null;
                  const open = expandedGroupIds.has(gid);
                  const items = interestsByGroup[gid];
                  const gLoading = groupLoading[gid];
                  const gErr = groupErrors[gid];

                  return (
                    <div key={gid} className={`interest-group ${open ? "interest-group--open" : ""}`}>
                      <button
                        type="button"
                        className="interest-group__header"
                        onClick={() => handleToggleGroup(gid)}
                        aria-expanded={open}
                      >
                        <span className="interest-group__title">{placeCategoryLabel(cat)}</span>
                        <span className="interest-group__chevron" aria-hidden="true">
                          {open ? "▴" : "▾"}
                        </span>
                      </button>
                      <div className={`interest-group__body-wrap ${open ? "is-open" : ""}`}>
                        <div className="interest-group__body-inner">
                          {gLoading && <p className="trip-select-hint">Loading interests…</p>}
                          {!gLoading && gErr && (
                            <p className="error interest-group__error" role="alert">
                              {gErr}
                            </p>
                          )}
                          {!gLoading && !gErr && items && items.length === 0 && (
                            <p className="interest-group__empty">No interests in this category yet.</p>
                          )}
                          {!gLoading && !gErr && items && items.length > 0 && (
                            <div className="interest-group__chips-scroll">
                              <div className="interest-group__chips">
                                {items.map((item, idx) => {
                                  const iid = placeInterestId(item);
                                  if (!iid) return null;
                                  const selected = isInterestSelected(gid, item);
                                  return (
                                    <button
                                      key={`${gid}-${iid}-${idx}`}
                                      type="button"
                                      className={`interest-chip ${selected ? "interest-chip--selected" : ""}`}
                                      onClick={() => toggleInterest(gid, item)}
                                    >
                                      {placeInterestLabel(item)}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {error && <p className="error trip-interests-error">{error}</p>}
            <div className="trip-interests-actions form-actions">
              <button type="button" className="btn-secondary" onClick={goBack}>
                Back
              </button>
              <button
                type="button"
                className="trip-btn-primary"
                disabled={
                  categoriesLoading ||
                  !!categoriesError ||
                  !sortedPlaceCategories.length
                }
                onClick={handleNext}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="trip-step-surface form-group trip-pace-step">
            <div className="trip-step-heading">
              <h2 className="trip-step-title">What pace do you prefer for your trip?</h2>
              <p className="trip-step-desc">
                This helps match how full each day feels. You can still adjust stops later.
              </p>
            </div>
            <div className="trip-intensity-grid" role="radiogroup" aria-label="Trip pace">
              {TRIP_INTENSITY_OPTIONS.map((opt) => {
                const selected = intensity === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    className={`trip-intensity-card ${selected ? "trip-intensity-card--selected" : ""}`}
                    onClick={() => setIntensity(opt.value)}
                    aria-pressed={selected}
                    aria-label={
                      selected
                        ? `${opt.title}, selected pace`
                        : `${opt.title}, not selected`
                    }
                  >
                    {selected ? (
                      <span className="trip-intensity-card__badge" aria-hidden="true">
                        ✓
                      </span>
                    ) : null}
                    <span className="trip-intensity-card__emoji" aria-hidden="true">
                      {opt.emoji}
                    </span>
                    <span className="trip-intensity-card__title">{opt.title}</span>
                    <span className="trip-intensity-card__body">{opt.body}</span>
                  </button>
                );
              })}
            </div>
            {selectedIntensityOption ? (
              <div className="trip-pace-summary" role="status" aria-live="polite">
                <span className="trip-pace-summary__mark" aria-hidden="true">
                  ✓
                </span>
                <div className="trip-pace-summary__text">
                  <span className="trip-pace-summary__kicker">Your pace is set to</span>
                  <span className="trip-pace-summary__line">
                    <span className="trip-pace-summary__emoji" aria-hidden="true">
                      {selectedIntensityOption.emoji}
                    </span>
                    <strong className="trip-pace-summary__name">{selectedIntensityOption.title}</strong>
                    <span className="trip-pace-summary__dash"> — </span>
                    <span className="trip-pace-summary__detail">{selectedIntensityOption.body}</span>
                  </span>
                </div>
              </div>
            ) : (
              <p className="trip-pace-hint">Tap an option above to choose your pace.</p>
            )}
            {error && <p className="error">{error}</p>}
            <label className="trip-public-toggle">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
              />
              <span>Include this trip on Discover so others can view it.</span>
            </label>
            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={goBack}>
                Back
              </button>
              <button type="submit" className="trip-btn-primary" disabled={loading}>
                {loading ? "Creating your trip…" : "Create trip"}
              </button>
            </div>
          </div>
        )}
      </form>
      </div>
      {showInterestingPrompt && (
        <InterestingPlacesPrompt
          matches={interestingMatches}
          onComplete={handlePromptComplete}
          onCancel={handlePromptCancel}
        />
      )}
    </div>
  );
}

export default Trip;
