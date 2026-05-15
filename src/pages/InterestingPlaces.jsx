import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiUrl } from "../config/api";
import { friendlyNetworkError, parseResponseJson } from "../utils/friendlyErrors";
import {
  cityId,
  cityLabel,
  countryId,
  countryLabel,
  normalizeListResponse,
} from "../utils/geoApi";
import SearchableSelect from "../components/SearchableSelect";
import {
  deleteInterestingPlace,
  listInterestingPlaces,
  saveInterestingPlace,
  searchPlacesFreeText,
} from "../api/interestingPlaces";
import "./InterestingPlaces.css";

function InterestingPlaces() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/login", { replace: true, state: { from: "/my-interesting-places" } });
    }
  }, [authLoading, user, navigate]);

  const [countries, setCountries] = useState([]);
  const [countriesLoading, setCountriesLoading] = useState(true);
  const [countriesError, setCountriesError] = useState("");
  const [selectedCountryId, setSelectedCountryId] = useState("");
  const [cities, setCities] = useState([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [citiesError, setCitiesError] = useState("");
  const [selectedCityId, setSelectedCityId] = useState("");

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [results, setResults] = useState([]);

  const [savedList, setSavedList] = useState([]);
  const [savedLoading, setSavedLoading] = useState(true);
  const [savedError, setSavedError] = useState("");
  const [busyPlaceId, setBusyPlaceId] = useState(null);

  // ---- Load countries ----
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setCountriesLoading(true);
      setCountriesError("");
      try {
        const res = await fetch(apiUrl("/api/public/countries"));
        const data = await parseResponseJson(res);
        if (!res.ok) throw new Error("Could not load countries.");
        if (!cancelled) setCountries(normalizeListResponse(data));
      } catch (err) {
        if (!cancelled) {
          setCountries([]);
          setCountriesError(friendlyNetworkError(err));
        }
      } finally {
        if (!cancelled) setCountriesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---- Load cities for selected country ----
  useEffect(() => {
    if (!selectedCountryId) {
      setCities([]);
      setCitiesError("");
      setSelectedCityId("");
      return;
    }
    let cancelled = false;
    (async () => {
      setCitiesLoading(true);
      setCitiesError("");
      setCities([]);
      setSelectedCityId("");
      try {
        const res = await fetch(
          apiUrl(`/api/public/countries/${encodeURIComponent(selectedCountryId)}/cities`)
        );
        const data = await parseResponseJson(res);
        if (!res.ok) throw new Error("Could not load cities.");
        if (!cancelled) setCities(normalizeListResponse(data));
      } catch (err) {
        if (!cancelled) {
          setCities([]);
          setCitiesError(friendlyNetworkError(err));
        }
      } finally {
        if (!cancelled) setCitiesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedCountryId]);

  // ---- Load saved list ----
  const refreshSaved = async () => {
    setSavedLoading(true);
    setSavedError("");
    try {
      const list = await listInterestingPlaces();
      setSavedList(Array.isArray(list) ? list : []);
    } catch (err) {
      setSavedError(err instanceof Error ? err.message : friendlyNetworkError(err));
      setSavedList([]);
    } finally {
      setSavedLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading || !user) return;
    refreshSaved();
  }, [authLoading, user]);

  const savedPlaceIds = useMemo(() => {
    const s = new Set();
    for (const ip of savedList) {
      if (ip?.place?.id != null) s.add(Number(ip.place.id));
    }
    return s;
  }, [savedList]);

  const countryOptions = useMemo(
    () =>
      [...countries]
        .sort((a, b) =>
          countryLabel(a).localeCompare(countryLabel(b), undefined, { sensitivity: "base" })
        )
        .map((c) => {
          const id = countryId(c);
          return id ? { id, label: countryLabel(c) } : null;
        })
        .filter(Boolean),
    [countries]
  );

  const cityOptions = useMemo(
    () =>
      [...cities]
        .sort((a, b) =>
          cityLabel(a).localeCompare(cityLabel(b), undefined, { sensitivity: "base" })
        )
        .map((c) => {
          const id = cityId(c);
          return id ? { id, label: cityLabel(c) } : null;
        })
        .filter(Boolean),
    [cities]
  );

  const handleSearch = async (e) => {
    e?.preventDefault?.();
    if (!query.trim()) {
      setSearchError("Type something to search.");
      return;
    }
    if (!selectedCountryId && !selectedCityId) {
      setSearchError("Pick a country (and optionally a city) first.");
      return;
    }
    setSearchError("");
    setSearching(true);
    try {
      const list = await searchPlacesFreeText({
        query: query.trim(),
        cityId: selectedCityId || undefined,
        countryId: selectedCountryId || undefined,
      });
      setResults(Array.isArray(list) ? list : []);
      if (!list?.length) {
        setSearchError("No places found. Try different words.");
      }
    } catch (err) {
      setResults([]);
      setSearchError(err instanceof Error ? err.message : friendlyNetworkError(err));
    } finally {
      setSearching(false);
    }
  };

  const handleSave = async (place) => {
    const pid = place?.id ?? place?.placeId;
    if (pid == null) return;
    setBusyPlaceId(pid);
    try {
      await saveInterestingPlace({
        placeId: Number(pid),
        cityId: selectedCityId || undefined,
        countryId: selectedCountryId || undefined,
      });
      await refreshSaved();
    } catch (err) {
      setSavedError(err instanceof Error ? err.message : friendlyNetworkError(err));
    } finally {
      setBusyPlaceId(null);
    }
  };

  const handleDelete = async (ip) => {
    if (ip?.id == null) return;
    setBusyPlaceId(ip.place?.id ?? ip.id);
    try {
      await deleteInterestingPlace(ip.id);
      setSavedList((prev) => prev.filter((row) => row.id !== ip.id));
    } catch (err) {
      setSavedError(err instanceof Error ? err.message : friendlyNetworkError(err));
    } finally {
      setBusyPlaceId(null);
    }
  };

  const canSearch = !!(query.trim() && (selectedCountryId || selectedCityId));

  return (
    <div className="ip-page">
      <div className="ip-container">
        <header className="ip-header">
          <h1 className="ip-title">My interesting places</h1>
          <p className="ip-lead">
            Find places you'd love to visit and save them here...
          </p>
        </header>

        <section className="ip-search-section" aria-labelledby="ip-search-h">
          <h2 id="ip-search-h" className="ip-section-title">
            Search places
          </h2>

          <div className="ip-filters">
            <div className="ip-filter">
              {countriesError ? (
                <p className="ip-error" role="alert">
                  {countriesError}
                </p>
              ) : (
                <SearchableSelect
                  label="Country"
                  placeholder="Pick a country"
                  inputPlaceholder="Type to search countries…"
                  options={countryOptions}
                  value={selectedCountryId}
                  onChange={setSelectedCountryId}
                  loading={countriesLoading}
                  required
                />
              )}
            </div>
            <div className="ip-filter">
              {citiesError ? (
                <p className="ip-error" role="alert">
                  {citiesError}
                </p>
              ) : (
                <SearchableSelect
                  label="City (optional)"
                  placeholder={selectedCountryId ? "Any city" : "Pick a country first"}
                  inputPlaceholder="Type to search cities…"
                  options={cityOptions}
                  value={selectedCityId}
                  onChange={setSelectedCityId}
                  loading={citiesLoading}
                  disabled={!selectedCountryId}
                  emptyOption={{ id: "", label: "Any city" }}
                />
              )}
            </div>
          </div>

          <form className="ip-search-form" onSubmit={handleSearch}>
            <input
              type="text"
              className="ip-search-input"
              placeholder="Search e.g. 'Eiffel Tower'…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button
              type="submit"
              className="ip-btn ip-btn--primary"
              disabled={!canSearch || searching}
            >
              {searching ? "Searching…" : "Search"}
            </button>
          </form>

          {searchError && (
            <p className="ip-error" role="alert">
              {searchError}
            </p>
          )}

          {results.length > 0 && (
            <ul className="ip-results">
              {results.map((p) => {
                const pid = p?.id ?? p?.placeId;
                const alreadySaved = pid != null && savedPlaceIds.has(Number(pid));
                return (
                  <li key={pid ?? p?.title} className="ip-result-row">
                    <div className="ip-result-info">
                      <span className="ip-result-title">{p.title || "(unnamed)"}</span>
                      {p.location && (
                        <span className="ip-result-coords">
                          {Number(p.location.lat).toFixed(3)},{" "}
                          {Number(p.location.lng).toFixed(3)}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      className={`ip-btn ${alreadySaved ? "ip-btn--ghost" : "ip-btn--solid"}`}
                      disabled={alreadySaved || busyPlaceId === pid}
                      onClick={() => handleSave(p)}
                    >
                      {alreadySaved ? "Saved ✓" : "Save"}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="ip-saved-section" aria-labelledby="ip-saved-h">
          <h2 id="ip-saved-h" className="ip-section-title">
            Saved places
          </h2>

          {savedError && (
            <p className="ip-error" role="alert">
              {savedError}
            </p>
          )}

          {savedLoading ? (
            <p>Loading…</p>
          ) : savedList.length === 0 ? (
            <p className="ip-empty">
              You haven't saved any places yet. Use the search above to add some.
            </p>
          ) : (
            <ul className="ip-saved-list">
              {savedList.map((ip) => (
                <li key={ip.id} className="ip-saved-row">
                  <div className="ip-saved-info">
                    <span className="ip-result-title">
                      {ip.place?.title || "(unnamed place)"}
                    </span>
                    {(ip.cityName || ip.countryName) && (
                      <span className="ip-result-coords">
                        {[ip.cityName, ip.countryName].filter(Boolean).join(", ")}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="ip-btn ip-btn--danger"
                    onClick={() => handleDelete(ip)}
                    disabled={busyPlaceId === (ip.place?.id ?? ip.id)}
                    aria-label={`Remove ${ip.place?.title ?? "place"}`}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

export default InterestingPlaces;
