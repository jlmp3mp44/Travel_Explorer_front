import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { updateUserProfile } from "../api/userApi";
import { deletePublicTrip, fetchMyTrips, updatePublicTrip } from "../api/tripPublic";
import { friendlyNetworkError } from "../utils/friendlyErrors";
import TripListSkeleton from "../components/skeletons/TripListSkeleton";
import "../components/Profile.css";
import "../components/MyTrips.css";

const MASK = "••••••••";

function tripIsPublic(t) {
  const v = t?.isPublic ?? t?.is_public;
  if (v === false) return false;
  return true;
}

function Profile() {
  const navigate = useNavigate();
  const { user, username, email, phone: phoneFromAuth, roles, loading: authLoading, refreshUser } =
    useAuth();

  const [phoneInput, setPhoneInput] = useState("");
  const [showPasswordHint, setShowPasswordHint] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSaved, setProfileSaved] = useState("");
  const [saving, setSaving] = useState(false);

  const [trips, setTrips] = useState([]);
  const [tripsLoading, setTripsLoading] = useState(true);
  const [tripsError, setTripsError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/login", { replace: true, state: { from: "/profile" } });
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    const p = user.phoneNumber ?? user.phone ?? phoneFromAuth ?? "";
    setPhoneInput(p ? String(p) : "");
  }, [user, phoneFromAuth]);

  const loadTrips = useCallback(async () => {
    if (user?.id == null) return;
    setTripsLoading(true);
    setTripsError("");
    try {
      const list = await fetchMyTrips(user.id);
      setTrips(Array.isArray(list) ? list : []);
    } catch (e) {
      setTripsError(e instanceof Error ? e.message : friendlyNetworkError(e));
      setTrips([]);
    } finally {
      setTripsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (authLoading || !user) return;
    void loadTrips();
  }, [authLoading, user, loadTrips]);

  const handleSavePhone = async (e) => {
    e.preventDefault();
    setProfileError("");
    setProfileSaved("");
    setSaving(true);
    try {
      await updateUserProfile({ phoneNumber: phoneInput.trim() });
      await refreshUser();
      setProfileSaved("Profile saved.");
      window.setTimeout(() => setProfileSaved(""), 3000);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : friendlyNetworkError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTrip = async (trip) => {
    if (trip?.id == null) return;
    setBusyId(trip.id);
    setTripsError("");
    try {
      await deletePublicTrip(trip.id);
      if (typeof window !== "undefined") {
        try {
          window.localStorage.removeItem(`tripSnapshot:${trip.id}`);
        } catch {
          /* ignore */
        }
      }
      setTrips((prev) => prev.filter((t) => String(t.id) !== String(trip.id)));
      setDeleteConfirmId(null);
    } catch (e) {
      setTripsError(e instanceof Error ? e.message : "Could not delete this trip.");
    } finally {
      setBusyId(null);
    }
  };

  const togglePublic = async (trip, next) => {
    if (trip?.id == null) return;
    setBusyId(trip.id);
    setTripsError("");
    try {
      const updated = await updatePublicTrip(trip.id, { isPublic: next });
      const pub = updated?.isPublic ?? updated?.is_public ?? next;
      setTrips((prev) =>
        prev.map((t) => (String(t.id) === String(trip.id) ? { ...t, isPublic: pub } : t))
      );
    } catch (e) {
      setTripsError(e instanceof Error ? e.message : "Could not update visibility.");
    } finally {
      setBusyId(null);
    }
  };

  if (authLoading) {
    return (
      <div className="profile-page">
        <p className="profile-loading">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const displayUsername = user.username ?? username;
  const displayEmail = user.email ?? email;

  const initial =
    displayUsername && String(displayUsername).length > 0
      ? String(displayUsername).charAt(0).toUpperCase()
      : "?";

  return (
    <div className="profile-page profile-page--wide">
      <div className="profile-layout">
        <aside className="profile-sidebar" aria-label="Profile sidebar">
          <div className="profile-photo-ring" aria-hidden="true">
            <div className="profile-photo-inner">{initial}</div>
            <span className="profile-photo-caption">Photo coming soon</span>
          </div>

          <div className="profile-public-card">
            <h2 className="profile-card-overline">Public on your trips</h2>
            <p className="profile-public-name">{displayUsername ?? "—"}</p>
            <p className="profile-public-note">
              Travellers who open your public trips see your username on the itinerary.
            </p>
            {user.id != null ? (
              <Link className="profile-public-link" to={`/users/${user.id}`}>
                Open your public trips page →
              </Link>
            ) : null}
          </div>

          <div className="profile-private-card">
            <h2 className="profile-card-overline">Account (private)</h2>
            <dl className="profile-fields profile-fields--compact">
              <div className="profile-field">
                <dt>Email</dt>
                <dd>{displayEmail ?? "—"}</dd>
              </div>
              <div className="profile-field profile-field--full">
                <dt>Phone</dt>
                <dd>
                  <form className="profile-phone-form" onSubmit={handleSavePhone}>
                    <input
                      id="profile-phone"
                      type="tel"
                      autoComplete="tel"
                      inputMode="tel"
                      className="profile-phone-input"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      placeholder="Your phone number"
                      aria-label="Phone number"
                    />
                    <button type="submit" className="profile-save-btn" disabled={saving}>
                      {saving ? "Saving…" : "Save"}
                    </button>
                  </form>
                </dd>
              </div>
              <div className="profile-field profile-field--full">
                <dt>Password</dt>
                <dd className="profile-password-cell">
                  <div className="profile-password-display">
                    {showPasswordHint ? (
                      <p className="profile-password-hint" id="profile-password-hint">
                        Your password is stored securely. For safety it is never shown or sent to the
                        browser.
                      </p>
                    ) : (
                      <span className="profile-password-mask" aria-hidden="true">
                        {MASK}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="profile-password-toggle"
                    aria-expanded={showPasswordHint}
                    aria-controls="profile-password-hint"
                    onClick={() => setShowPasswordHint((v) => !v)}
                  >
                    {showPasswordHint ? "Hide" : "Show"}
                  </button>
                </dd>
              </div>
              {Array.isArray(roles) && roles.length > 0 && (
                <div className="profile-field">
                  <dt>Roles</dt>
                  <dd>{roles.join(", ")}</dd>
                </div>
              )}
            </dl>
            {profileError ? (
              <p className="profile-inline-error" role="alert">
                {profileError}
              </p>
            ) : null}
            {profileSaved ? (
              <p className="profile-inline-success" role="status">
                {profileSaved}
              </p>
            ) : null}
          </div>
        </aside>

        <section className="profile-trips-panel" aria-labelledby="profile-trips-heading">
          <header className="profile-trips-header">
            <h1 id="profile-trips-heading" className="profile-trips-title">
              Your trips
            </h1>
            <p className="profile-trips-lead">
              Open an itinerary or control whether it appears on Discover.
            </p>
            <button type="button" className="profile-trips-cta" onClick={() => navigate("/trip")}>
              Create a trip
            </button>
          </header>

          {tripsError ? (
            <p className="my-trips-error" role="alert">
              {tripsError}
            </p>
          ) : null}

          {tripsLoading ? (
            <TripListSkeleton count={4} variant="discover" />
          ) : trips.length === 0 ? (
            <p className="my-trips-empty">
              No trips yet.{" "}
              <button type="button" className="my-trips-link" onClick={() => navigate("/trip")}>
                Create a trip
              </button>
            </p>
          ) : (
            <ul className="my-trips-list">
              {trips.map((trip) => {
                const pub = tripIsPublic(trip);
                const busy = busyId === trip.id;
                return (
                  <li key={trip.id} className="my-trips-row">
                    <button
                      type="button"
                      className="my-trips-row-main"
                      onClick={() => navigate(`/trip/${trip.id}`)}
                    >
                      <span className="my-trips-row-title">{trip.title ?? `Trip ${trip.id}`}</span>
                      <span className="my-trips-row-dates">
                        {trip.startDate} – {trip.endDate}
                      </span>
                    </button>
                    {deleteConfirmId === trip.id ? (
                      <div className="my-trips-delete-inline" role="group" aria-label="Confirm delete trip">
                        <span className="my-trips-delete-inline__ask">Delete this whole trip?</span>
                        <button
                          type="button"
                          className="my-trips-delete-inline__btn my-trips-delete-inline__btn--cancel"
                          disabled={busy}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(null);
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="my-trips-delete-inline__btn my-trips-delete-inline__btn--danger"
                          disabled={busy}
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleDeleteTrip(trip);
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    ) : (
                      <>
                        <label className="my-trips-visibility">
                          <input
                            type="checkbox"
                            checked={pub}
                            disabled={busy}
                            onChange={(e) => togglePublic(trip, e.target.checked)}
                          />
                          <span>On Discover</span>
                        </label>
                        <button
                          type="button"
                          className="my-trips-row-delete"
                          disabled={busy}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(trip.id);
                          }}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

export default Profile;
