import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { fetchPublicTripsList } from "../api/tripPublic";
import { apiUrl } from "../config/api";
import { friendlyNetworkError, parseResponseJson } from "../utils/friendlyErrors";
import {
  countryId,
  countryLabel,
  normalizeListResponse,
} from "../utils/geoApi";
import SearchableSelect from "../components/SearchableSelect";
import PlaceCategoryCodesFilter from "../components/PlaceCategoryCodesFilter";
import TripListSkeleton from "../components/skeletons/TripListSkeleton";
import TripPhotoUrl from "../components/TripPhotoUrl.jsx";
import { tripCoverPhotoUrl, tripOwnerDisplayName, tripOwnerId } from "../utils/tripDisplay";
import "../components/Home.css";
import "../components/Discover.css";

function isTripPublic(trip) {
  if (trip == null || typeof trip !== "object") return false;
  const v = trip.isPublic ?? trip.is_public;
  if (v === false) return false;
  return true;
}

function filtersActive(countryId, categoryCodes) {
  return (countryId != null && String(countryId).trim() !== "") || categoryCodes.length > 0;
}

/** Stable dependency for category array contents (not reference). */
function categoryCodesKey(codes) {
  return [...(codes || [])].map(String).sort().join("\n");
}

function Discover() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [countries, setCountries] = useState([]);
  const [countriesLoading, setCountriesLoading] = useState(true);
  const [countriesError, setCountriesError] = useState("");

  const [pendingCountryId, setPendingCountryId] = useState("");
  const [pendingCategoryCodes, setPendingCategoryCodes] = useState([]);
  const [activeCountryId, setActiveCountryId] = useState("");
  const [activeCategoryCodes, setActiveCategoryCodes] = useState([]);

  const activeCategoryCodesKey = useMemo(
    () => categoryCodesKey(activeCategoryCodes),
    [activeCategoryCodes]
  );

  const activeCountryName = useMemo(() => {
    if (!String(activeCountryId).trim()) return "";
    const row = countries.find((c) => countryId(c) === activeCountryId);
    return row ? String(countryLabel(row)).trim() : "";
  }, [countries, activeCountryId]);

  useEffect(() => {
    let cancelled = false;
    const loadCountries = async () => {
      setCountriesLoading(true);
      setCountriesError("");
      try {
        const res = await fetch(apiUrl("/api/public/countries"));
        const data = await parseResponseJson(res);
        if (!res.ok) throw new Error("Could not load countries.");
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
    if (authLoading) return;
    if (!user) {
      navigate("/login", { replace: true, state: { from: "/discover" } });
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    let cancelled = false;
    if (authLoading || !user) return;
    setLoading(true);
    setLoadError("");
    const hasCategories = activeCategoryCodes.length > 0;
    const hasCountry = String(activeCountryId).trim() !== "";
    const hasFilters = hasCountry || hasCategories;
    const listOpts = {
      pageNumber: 0,
      pageSize: 48,
    };
    if (hasFilters) {
      if (hasCountry) {
        if (activeCountryName) {
          listOpts.countryName = activeCountryName;
        } else {
          listOpts.countryId = activeCountryId.trim();
        }
      }
      if (hasCategories) {
        listOpts.categoryCodes = activeCategoryCodes;
      }
    }
    fetchPublicTripsList(listOpts)
      .then(({ content }) => {
        if (cancelled) return;
        setTrips(Array.isArray(content) ? content.filter(isTripPublic) : []);
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
  }, [authLoading, user, activeCountryId, activeCountryName, activeCategoryCodesKey]);

  const sortedCountries = useMemo(() => {
    return [...countries].sort((a, b) =>
      countryLabel(a).localeCompare(countryLabel(b), undefined, { sensitivity: "base" })
    );
  }, [countries]);

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

  const applyFilters = () => {
    setActiveCountryId(pendingCountryId.trim());
    setActiveCategoryCodes([...pendingCategoryCodes]);
  };

  const clearFilters = () => {
    setPendingCountryId("");
    setPendingCategoryCodes([]);
    setActiveCountryId("");
    setActiveCategoryCodes([]);
  };

  const hasActiveFilters = filtersActive(activeCountryId, activeCategoryCodes);

  const emptyMessage = useMemo(() => {
    if (loading || loadError) return null;
    if (trips.length === 0) {
      if (hasActiveFilters) {
        return "No trips match these filters. Try other categories or a different country.";
      }
      return "Nothing here yet. Create a trip and choose to show it on Discover.";
    }
    return null;
  }, [loading, loadError, trips.length, hasActiveFilters]);

  return (
    <div className="discover-page">
      <div className="discover-container">
        <header className="discover-header">
          <h1 className="discover-title">Discover</h1>
          <p className="discover-lead">
            Pick a country to filter right away. Choose place types, then <strong>Apply search</strong> to
            match trips that include those categories.
          </p>
        </header>

        <section className="discover-filters" aria-labelledby="discover-filters-heading">
          <h2 id="discover-filters-heading" className="discover-filters__title">
            Search
          </h2>
          <div className="discover-filters__grid">
            <div className="discover-filters__field">
              {countriesError ? (
                <p className="home-inline-error" role="alert">
                  {countriesError}
                </p>
              ) : (
                <SearchableSelect
                  label="Country"
                  placeholder="Any country"
                  inputPlaceholder="Type to search countries…"
                options={countryOptions}
                value={pendingCountryId}
                onChange={(id) => {
                  setPendingCountryId(id);
                  setActiveCountryId(String(id).trim());
                }}
                loading={countriesLoading}
                  disabled={!!countriesError}
                  emptyOption={{ id: "", label: "Any country" }}
                />
              )}
            </div>
            <div className="discover-filters__categories">
              <span className="discover-filters__label">Place categories</span>
              <PlaceCategoryCodesFilter
                selectedCodes={pendingCategoryCodes}
                onSelectedCodesChange={setPendingCategoryCodes}
              />
            </div>
          </div>
          <div className="discover-filters__actions">
            <button type="button" className="discover-filters__btn discover-filters__btn--primary" onClick={applyFilters}>
              Apply search
            </button>
            <button
              type="button"
              className="discover-filters__btn discover-filters__btn--ghost"
              onClick={clearFilters}
              disabled={
                !filtersActive(pendingCountryId, pendingCategoryCodes) && !hasActiveFilters
              }
            >
              Clear
            </button>
          </div>
        </section>

        <section className="discover-panel" aria-labelledby="discover-trips-heading">
          <h2 id="discover-trips-heading" className="discover-subheading">
            Trips to explore
          </h2>
          <div className="home-trips-scroll">
            {loading ? (
              <TripListSkeleton count={6} variant="discover" />
            ) : loadError ? (
              <p className="home-inline-error" role="alert">
                {loadError}
              </p>
            ) : emptyMessage ? (
              <p className="home-trips-status">{emptyMessage}</p>
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
                    {tripCoverPhotoUrl(trip) ? (
                      <div className="trip-card-cover-wrap">
                        <TripPhotoUrl
                          url={tripCoverPhotoUrl(trip)}
                          alt={trip.title ? `Cover: ${trip.title}` : "Trip cover"}
                          className="trip-card-cover__photo"
                        />
                      </div>
                    ) : null}
                    <div className="trip-card-inner">
                      <h3 className="trip-card-title">{trip.title}</h3>
                      {(() => {
                        const oid = tripOwnerId(trip);
                        const name = tripOwnerDisplayName(trip);
                        if (!name || oid == null) return null;
                        if (user?.id != null && String(user.id) === String(oid)) return null;
                        return (
                          <p className="trip-card-owner">
                            <Link
                              className="trip-card-owner-link"
                              to={`/users/${oid}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {name}
                            </Link>
                          </p>
                        );
                      })()}
                      {(trip.desc || trip.description) && (
                        <p className="trip-card-preview">{trip.desc || trip.description}</p>
                      )}
                      <p className="trip-card-dates">
                        <span className="cal" aria-hidden="true">
                          📅
                        </span>
                        {trip.startDate} – {trip.endDate}
                      </p>
                      <div className="trip-card-cta">View trip →</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default Discover;
