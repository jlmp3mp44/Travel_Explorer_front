import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../components/Profile.css";

function Profile() {
  const navigate = useNavigate();
  const { user, username, email, roles, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/login", { replace: true, state: { from: "/profile" } });
    }
  }, [authLoading, user, navigate]);

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
            {Array.isArray(roles) && roles.length > 0 && (
              <div className="profile-field">
                <dt>Roles</dt>
                <dd>{roles.join(", ")}</dd>
              </div>
            )}
          </dl>
        </section>
      </div>
    </div>
  );
}

export default Profile;
