// src/pages/Login.jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { setSession } from "../utils/auth";
import "./Auth.css";

export default function Login() {
  const nav = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErrMsg("");

    if (!username.trim() || !password) {
      setErrMsg("Username and password are required.");
      return;
    }

    setSubmitting(true);
    try {
      const data = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username: username.trim(), password }),
      });

      setSession({ token: data.token, user: data.user });
      nav("/dashboard", { replace: true });
    } catch (e) {
      setErrMsg(e?.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <img className="auth-logo" src="/assets/images/logo-light.png" alt="Logo" />
          <h1 className="auth-title">Welcome back!</h1>
          <p className="auth-subtitle">Login to continue</p>
        </div>

        {errMsg && <div className="auth-alert">{errMsg}</div>}

        <form className="auth-form" onSubmit={onSubmit}>
          <label className="auth-label">
            Username
            <input
              className="auth-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              placeholder="Enter your username"
            />
          </label>

          <label className="auth-label">
            Password
            <input
              className="auth-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="Enter your password"
            />
          </label>

          <button className="auth-btn" type="submit" disabled={submitting}>
            {submitting ? "Logging in..." : "Login"}
          </button>

          <p className="auth-foot">
            No account?{" "}
            <Link className="auth-link" to="/signup">
              Sign up
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}