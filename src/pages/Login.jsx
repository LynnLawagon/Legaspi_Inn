// src/pages/Login.jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { setSession } from "../utils/auth";

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
    <div style={{ maxWidth: 420, margin: "40px auto", padding: 16 }}>
      <h2 style={{ marginBottom: 10 }}>Login</h2>

      {errMsg && (
        <div
          style={{
            background: "#ffecec",
            border: "1px solid #ffb4b4",
            padding: 10,
            borderRadius: 10,
            marginBottom: 12,
          }}
        >
          {errMsg}
        </div>
      )}

      <form
        onSubmit={onSubmit}
        style={{ display: "flex", flexDirection: "column", gap: 10 }}
      >
        <label>
          Username
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            style={{
              width: "100%",
              height: 40,
              padding: "0 10px",
              borderRadius: 10,
              border: "1px solid #ddd",
            }}
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            style={{
              width: "100%",
              height: 40,
              padding: "0 10px",
              borderRadius: 10,
              border: "1px solid #ddd",
            }}
          />
        </label>

        <button
          type="submit"
          disabled={submitting}
          style={{
            height: 42,
            borderRadius: 10,
            border: 0,
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          {submitting ? "Logging in..." : "Login"}
        </button>

        <p style={{ textAlign: "center", marginTop: 6 }}>
          No account? <Link to="/signup">Sign up</Link>
        </p>
      </form>
    </div>
  );
}