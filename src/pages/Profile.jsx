import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { updateUserProfile } from "../api/userApi";
import { friendlyNetworkError } from "../utils/friendlyErrors";
import "../components/Profile.css";

const MASK = "••••••••";

function Profile() {
  const navigate = useNavigate();
  const { user, username, email, phone: phoneFromAuth, roles, loading: authLoading, refreshUser } =
    useAuth();

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
      window.setTimeout(() => setProfileSaved(""), 3000);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : friendlyNetworkError(err));
    } finally {
      setSaving(false);
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
    <div className="profile-page">
      <div className="profile-card">
        <div className="profile-header">
          <div className="profile-avatar" aria-hidden="true">
            {initial}
          </div>
          <div>
            <h1>Your profile</h1>
            <p className="profile-lead">Personal information tied to your account.</p>
          </div>
        </div>

        <section className="profile-section" aria-labelledby="profile-personal-heading">
          <h2 id="profile-personal-heading">Personal info</h2>
          <dl className="profile-fields">
            {user.id != null && (
              <div className="profile-field">
                <dt>User ID</dt>
                <dd>{user.id}</dd>
              </div>
            )}
            <div className="profile-field">
              <dt>Username</dt>
              <dd>{displayUsername ?? "—"}</dd>
            </div>
            <div className="profile-field">
              <dt>Email</dt>
              <dd>{displayEmail ?? "—"}</dd>
            </div>
            <div className="profile-field profile-field--full">
              <dt>Phone number</dt>
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
        </section>
      </div>
    </div>
  );
}

export default Profile;
