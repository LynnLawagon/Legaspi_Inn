import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

const API_BASE = "/api";

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
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErrMsg(data?.message || `Login failed (${res.status})`);
        return;
      }

      // Expected backend response:
      // { ok:true, token:"...", user:{ user_id, username, role_id, gender_id, shift_start, shift_end } }
      if (data?.token) {
        localStorage.setItem("token", data.token);
      }
      if (data?.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
      }

      nav("/dashboard", { replace: true });
    } catch (e) {
      setErrMsg("Failed to fetch (backend down / proxy/CORS / wrong URL).");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "40px auto", padding: 16 }}>
      <h2 style={{ marginBottom: 10 }}>Login</h2>

      {errMsg && (
        <div style={{ background: "#ffecec", border: "1px solid #ffb4b4", padding: 10, borderRadius: 10, marginBottom: 12 }}>
          {errMsg}
        </div>
      )}

      <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <label>
          Username
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter username"
            autoComplete="username"
            style={{ width: "100%", height: 40, padding: "0 10px", borderRadius: 10, border: "1px solid #ddd" }}
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            autoComplete="current-password"
            style={{ width: "100%", height: 40, padding: "0 10px", borderRadius: 10, border: "1px solid #ddd" }}
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
            opacity: submitting ? 0.7 : 1,
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