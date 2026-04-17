import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiUrl } from "../config/api";
import AuthPasswordField from "../components/AuthPasswordField";
import {
  friendlyNetworkError,
  friendlyRegisterError,
  parseResponseJson,
} from "../utils/friendlyErrors";
import "../components/AuthPages.css";

function Register() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (password !== confirmPassword) {
      setError("Those passwords don’t match. Please type the same password twice.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(apiUrl("/api/auth/signup"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          username,
          email,
          password,
          phoneNumber: phoneNumber.trim() || undefined,
          roles: [],
        }),
      });

      const data = await parseResponseJson(res);

      if (res.ok) {
        setSuccess("You’re registered! Taking you to sign in…");
        setTimeout(() => navigate("/login"), 2000);
      } else {
        setError(friendlyRegisterError(res.status, data));
      }
    } catch (err) {
      console.error(err);
      setError(friendlyNetworkError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Create an account</h1>
        <p className="auth-lead">Choose a username, email, phone, and a strong password.</p>

        <form className="auth-form" onSubmit={handleRegister} noValidate>
          <div className="form-group">
            <label htmlFor="register-username">Username</label>
            <input
              id="register-username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              maxLength={22}
            />
          </div>

          <div className="form-group">
            <label htmlFor="register-email">Email</label>
            <input
              id="register-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="register-phone">Phone number</label>
            <input
              id="register-phone"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              placeholder="+1 234 567 8900"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
          </div>

          <AuthPasswordField
            id="register-password"
            name="password"
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={126}
          />

          <AuthPasswordField
            id="register-confirm"
            name="confirmPassword"
            label="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={126}
          />

          {error ? (
            <div className="auth-alert auth-alert--error" role="alert">
              {error}
            </div>
          ) : null}
          {success ? (
            <div className="auth-alert auth-alert--success" role="status">
              {success}
            </div>
          ) : null}

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
