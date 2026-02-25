import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Auth.css";

const API_BASE = "/api"; // works with Vite proxy

export default function Auth() {
  const nav = useNavigate();

  const [mode, setMode] = useState("signup"); // "login" | "signup"
  const [error, setError] = useState("");
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // meta
  const [genders, setGenders] = useState([]);
  const [roles, setRoles] = useState([]);

  // form fields
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [genderId, setGenderId] = useState("");
  const [roleId, setRoleId] = useState("");

  const [shiftStart, setShiftStart] = useState(""); // "HH:MM"
  const [shiftEnd, setShiftEnd] = useState("");

  // Fetch genders + roles when in signup mode (or on page load)
  useEffect(() => {
    let alive = true;

    async function loadMeta() {
      setError("");
      setLoadingMeta(true);
      try {
        const [gRes, rRes] = await Promise.all([
          fetch(`${API_BASE}/meta/genders`),
          fetch(`${API_BASE}/meta/roles`),
        ]);

        const gData = await gRes.json().catch(() => []);
        const rData = await rRes.json().catch(() => []);

        if (!gRes.ok) throw new Error(gData?.message || "Failed to load genders");
        if (!rRes.ok) throw new Error(rData?.message || "Failed to load roles");

        if (!alive) return;

        setGenders(Array.isArray(gData) ? gData : []);
        setRoles(Array.isArray(rData) ? rData : []);

        // set defaults (optional)
        if (!genderId && Array.isArray(gData) && gData[0]) setGenderId(String(gData[0].gender_id));
        if (!roleId && Array.isArray(rData) && rData[0]) setRoleId(String(rData[0].role_id));
      } catch (e) {
        if (!alive) return;
        setError(e?.message || "Failed to fetch meta data");
      } finally {
        if (!alive) return;
        setLoadingMeta(false);
      }
    }

    loadMeta();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetFormErrorsOnly() {
    setError("");
  }

  function switchMode(nextMode) {
    setMode(nextMode);
    resetFormErrorsOnly();
  }

  function validate() {
    if (!username.trim()) return "Username is required.";
    if (!password) return "Password is required.";

    if (mode === "signup") {
      if (!confirmPassword) return "Confirm password is required.";
      if (password !== confirmPassword) return "Passwords do not match.";
      if (!genderId) return "Please select a gender.";
      if (!roleId) return "Please select a role.";
      if (!shiftStart) return "Please set time in (shift start).";
      if (!shiftEnd) return "Please set time out (shift end).";
    }
    return "";
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const v = validate();
    if (v) return setError(v);

    setSubmitting(true);
    try {
      if (mode === "signup") {
        const res = await fetch(`${API_BASE}/auth/signup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: username.trim(),
            password,
            confirmPassword,
            gender_id: Number(genderId),
            role_id: Number(roleId),
            shift_start: shiftStart,
            shift_end: shiftEnd,
          }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data?.message || `Signup failed (${res.status})`);
          return;
        }

        // after success, go to login mode
        setMode("login");
        setPassword("");
        setConfirmPassword("");
        setError("Account created. Please login.");
        return;
      }

      // LOGIN
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message || `Login failed (${res.status})`);
        return;
      }

      // EXPECTED: { token: "...", user: {...} }
      if (data?.token) localStorage.setItem("token", data.token);
      if (data?.user) localStorage.setItem("user", JSON.stringify(data.user));

      nav("/dashboard", { replace: true });
    } catch (err) {
      setError("Failed to fetch. Check backend is running and Vite proxy is set.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="authPage">
      <div className="authCard">
        <div className="brandPane">
          <div className="brandTop">EST. 2019</div>
          <div className="brandTitle">LegaspiInn</div>
          <div className="brandSub">Hotel Management System</div>
        </div>

        <div className="formPane">
          <div className="tabs">
            <button
              className={`tab ${mode === "login" ? "active" : ""}`}
              onClick={() => switchMode("login")}
              type="button"
            >
              Login
            </button>
            <button
              className={`tab ${mode === "signup" ? "active" : ""}`}
              onClick={() => switchMode("signup")}
              type="button"
            >
              Sign up
            </button>
          </div>

          <h2 className="heading">{mode === "login" ? "Welcome back" : "Create account"}</h2>

          {error && <div className="alert">{error}</div>}

          <form className="form" onSubmit={handleSubmit}>
            <div className="field">
              <label>Username</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                autoComplete="username"
              />
            </div>

            <div className="field">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
            </div>

            {mode === "signup" && (
              <>
                <div className="field">
                  <label>Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    autoComplete="new-password"
                  />
                </div>

                <div className="grid2">
                  <div className="field">
                    <label>Gender</label>
                    <select
                      value={genderId}
                      onChange={(e) => setGenderId(e.target.value)}
                      disabled={loadingMeta}
                    >
                      <option value="">Select gender</option>
                      {genders.map((g) => (
                        <option key={g.gender_id} value={g.gender_id}>
                          {g.gender_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="field">
                    <label>Role</label>
                    <select
                      value={roleId}
                      onChange={(e) => setRoleId(e.target.value)}
                      disabled={loadingMeta}
                    >
                      <option value="">Select role</option>
                      {roles.map((r) => (
                        <option key={r.role_id} value={r.role_id}>
                          {r.role_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid2">
                  <div className="field">
                    <label>Time In</label>
                    <input
                      type="time"
                      value={shiftStart}
                      onChange={(e) => setShiftStart(e.target.value)}
                    />
                  </div>

                  <div className="field">
                    <label>Time Out</label>
                    <input
                      type="time"
                      value={shiftEnd}
                      onChange={(e) => setShiftEnd(e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}

            <button className="primaryBtn" type="submit" disabled={submitting}>
              {submitting ? "Please wait..." : mode === "login" ? "Login" : "Create account"}
            </button>

            <div className="helper">
              {mode === "login" ? (
                <span>
                  No account?{" "}
                  <button type="button" className="linkBtn" onClick={() => switchMode("signup")}>
                    Sign up
                  </button>
                </span>
              ) : (
                <span>
                  Already have one?{" "}
                  <button type="button" className="linkBtn" onClick={() => switchMode("login")}>
                    Login
                  </button>
                </span>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}