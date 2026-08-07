import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../components/NavBar.css";

function Navbar() {
  const navigate = useNavigate();
  const { user, username, loading, logout } = useAuth();

  const goDiscover = () => {
    if (user) {
      navigate("/discover");
    } else {
      navigate("/login", { state: { from: "/discover" } });
    }
  };

  const goBestTrips = () => {
    if (user) {
      navigate("/best-trips");
    } else {
      navigate("/login", { state: { from: "/best-trips" } });
    }
  };

  const goCreateTrip = () => {
    if (user) {
      navigate("/trip");
    } else {
      navigate("/login", { state: { from: "/trip" } });
    }
  };

  const handleLogout = async () => {
    const confirmLogout = window.confirm("Are you sure you want to sign out?");
    if (!confirmLogout) return;
    await logout();
    navigate("/");
  };

  return (
    <header className="navbar">
      <div className="navbar__left">
        <button type="button" className="nav-btn nav-btn--ghost" onClick={() => navigate("/")}>
          Home
        </button>
        <button type="button" className="nav-btn nav-btn--ghost" onClick={goBestTrips}>
          Best trips
        </button>
        <button type="button" className="nav-btn nav-btn--ghost" onClick={goDiscover}>
          Discover
        </button>
      </div>

      {/* Fills the gap so “Create trip” sits by My trips (middle-right), where users expect it */}
      <span className="navbar__spacer" aria-hidden="true" />

      <button type="button" className="nav-btn nav-btn--create navbar__create" onClick={goCreateTrip}>
        Create trip
      </button>

      <div className="navbar__user">
        {loading ? (
          <span className="navbar__user-placeholder" aria-hidden="true" />
        ) : username ? (
          <>
            <button type="button" className="nav-btn nav-btn--ghost" onClick={() => navigate("/my-trips")}>
              My trips
            </button>
            <button type="button" className="nav-btn nav-btn--ghost" onClick={() => navigate("/my-interesting-places")}>
              Interesting places
            </button>
            <button type="button" className="nav-btn nav-btn--ghost" onClick={() => navigate("/profile")}>
              Profile
            </button>
            <span className="navbar__username" title={username}>
              {username}
            </span>
            <button type="button" className="nav-btn nav-btn--muted" onClick={handleLogout}>
              Sign out
            </button>
          </>
        ) : (
          <>
            <button type="button" className="nav-btn nav-btn--ghost" onClick={() => navigate("/login")}>
              Sign in
            </button>
            <button type="button" className="nav-btn nav-btn--solid" onClick={() => navigate("/register")}>
              Sign up
            </button>
          </>
        )}
      </div>
    </header>
  );
}

export default Navbar;
