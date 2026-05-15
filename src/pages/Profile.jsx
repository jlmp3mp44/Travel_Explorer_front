import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { updateUserProfile } from "../api/userApi";
import { friendlyNetworkError } from "../utils/friendlyErrors";
import "../components/Profile.css";

const MASK = "••••••••";

function Profile() {
  const navigate = useNavigate();
  const { user, username, email, phone: phoneFromAuth, loading: authLoading, refreshUser } =
    useAuth();

  const [phoneEditing, setPhoneEditing] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [showPasswordHint, setShowPasswordHint] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSaved, setProfileSaved] = useState("");
  const [saving, setSaving] = useState(false);

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

  const handleSavePhone = async (e) => {
    e.preventDefault();
    setProfileError("");
    setProfileSaved("");
    setSaving(true);
    try {
      await updateUserProfile({ phoneNumber: phoneInput.trim() });
      await refreshUser();
      setProfileSaved("Profile saved.");
      setPhoneEditing(false);
      window.setTimeout(() => setProfileSaved(""), 3000);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : friendlyNetworkError(err));
    } finally {
      setSaving(false);
    }
  };

  const startPhoneChange = () => {
    const p = user?.phoneNumber ?? user?.phone ?? phoneFromAuth ?? "";
    setPhoneInput(p ? String(p) : "");
    setPhoneEditing(true);
    setProfileError("");
    setProfileSaved("");
  };

  const cancelPhoneChange = () => {
    const p = user?.phoneNumber ?? user?.phone ?? phoneFromAuth ?? "";
    setPhoneInput(p ? String(p) : "");
    setPhoneEditing(false);
    setProfileError("");
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
  const displayPhoneRaw = user.phoneNumber ?? user.phone ?? phoneFromAuth ?? "";
  const displayPhone = displayPhoneRaw ? String(displayPhoneRaw) : "";

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
        </aside>

        <section
          className="profile-trips-panel profile-settings-page"
          aria-labelledby="profile-settings-heading"
          id="profile-settings"
        >
          <header className="profile-trips-header">
            <h1 id="profile-settings-heading" className="profile-trips-title">
              Settings
            </h1>
            <p className="profile-trips-lead">
              Account details for this profile. Your trips are on{" "}
              <Link to="/my-trips">My trips</Link>.
            </p>
          </header>

          <div className="profile-private-card profile-private-card--in-main">
            <h2 className="profile-card-overline">Account (private)</h2>
            <dl className="profile-fields profile-fields--compact">
              <div className="profile-field">
                <dt>Email</dt>
                <dd>{displayEmail ?? "—"}</dd>
              </div>
              <div className="profile-field profile-field--full">
                <dt>Phone</dt>
                <dd>
                  {!phoneEditing ? (
                    <div className="profile-phone-readonly">
                      <p className="profile-phone-readonly__value">{displayPhone || "Not set"}</p>
                      <button
                        type="button"
                        className="profile-change-phone-btn"
                        onClick={startPhoneChange}
                      >
                        Change phone number
                      </button>
                    </div>
                  ) : (
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
                      <button
                        type="button"
                        className="profile-phone-cancel-btn"
                        disabled={saving}
                        onClick={cancelPhoneChange}
                      >
                        Cancel
                      </button>
                    </form>
                  )}
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

          <div className="profile-home-actions profile-home-actions--below-settings">
            <Link to="/my-trips" className="profile-home-link-btn">
              Go to My trips
            </Link>
            <button type="button" className="profile-trips-cta" onClick={() => navigate("/trip")}>
              Create a trip
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Profile;
