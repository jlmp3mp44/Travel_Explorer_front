import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../components/NavBar.css";

function Navbar() {
  const navigate = useNavigate();
  const { username, loading, logout } = useAuth();

  const handleLogout = () => {
    const confirmLogout = window.confirm("Are you sure you want to sign out?");
    if (confirmLogout) {
      logout();
      navigate("/");
    }
  };

  return (
    <div className="navbar">
      {/* 🔹 LEFT SIDE */}
      <div className="nav-left">
        <button className="home-btn" onClick={() => navigate("/")}>
          🏠 Home
        </button>
      </div>

      {/* 🔹 RIGHT SIDE */}
      <div className="nav-right">
        {loading ? null : username ? (
          <>
            <button type="button" className="profile-btn" onClick={() => navigate("/profile")}>
              Profile
            </button>
            <span className="username">{username}</span>
            <button className="logout-btn" onClick={handleLogout}>
              Sign Out
            </button>
          </>
        ) : (
          <>
            <button className="sign-in-btn" onClick={() => navigate("/login")}>
              Sign In
            </button>
            <button className="sign-up-btn" onClick={() => navigate("/register")}>
              Sign Up
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default Navbar;