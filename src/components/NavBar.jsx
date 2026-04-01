import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../components/Navbar.css";

function Navbar() {
  const navigate = useNavigate();
  const { username, loading, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="navbar">
      <div className="nav-right">
        {loading ? null : username ? (
          <>
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