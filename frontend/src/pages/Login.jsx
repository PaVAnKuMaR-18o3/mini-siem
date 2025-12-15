// src/pages/Login.jsx
import { useState } from "react";
import { login } from "../services/api";

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Username and password are required");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const token = await login(username, password);
      onLogin(token);
    } catch (err) {
      setError(err.message || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-card-wrapper">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-logo">🔒</div>
        <h2>Mini-SIEM</h2>
        <p className="login-subtitle">Security Monitoring & Threat Detection</p>

        {error && <div className="error-banner">{error}</div>}

        <div className="form-group">
          <label htmlFor="username">Username</label>
          <input
            id="username"
            type="text"
            value={username}
            autoComplete="username"
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
            placeholder="Enter username"
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            autoComplete="current-password"
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            placeholder="••••••••"
          />
        </div>

        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? (
            <>
              <span className="spinner"></span> Authenticating…
            </>
          ) : (
            "Sign In"
          )}
        </button>

        <p className="login-hint">
          Default credentials: <strong>admin</strong> / <strong>admin123</strong>
        </p>
      </form>
    </div>
  );
}