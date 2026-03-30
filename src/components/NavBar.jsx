import { useNavigate } from "react-router-dom";
import "../components/Navbar.css";

function Navbar() {
  const navigate = useNavigate();

  return (
    <div className="navbar">
      <div className="nav-right">
        <button
          className="sign-in-btn"
          onClick={() => navigate("/login")}
        >
          Sign In
        </button>

        <button
          className="sign-up-btn"
          onClick={() => navigate("/register")}
        >
          Sign Up
        </button>
      </div>
    </div>
  );
}

export default Navbar;