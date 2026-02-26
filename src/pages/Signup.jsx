// src/pages/Signup.jsx
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiFetch } from "../lib/api";
import "./Auth.css";

export default function Signup() {
  const nav = useNavigate();

  const [loadingMeta, setLoadingMeta] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  const [genders, setGenders] = useState([]);
  const [roles, setRoles] = useState([]);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [genderId, setGenderId] = useState("");
  const [roleId, setRoleId] = useState("");

  const [shiftStart, setShiftStart] = useState("");
  const [shiftEnd, setShiftEnd] = useState("");

  useEffect(() => {
    let alive = true;

    async function loadMeta() {
      setErrMsg("");
      setLoadingMeta(true);
      try {
        const [gData, rData] = await Promise.all([
          apiFetch("/meta/genders"),
          apiFetch("/meta/roles"),
        ]);

        if (!alive) return;

        setGenders(Array.isArray(gData) ? gData : []);
        setRoles(Array.isArray(rData) ? rData : []);

        if (Array.isArray(gData) && gData[0]) setGenderId(String(gData[0].gender_id));
        if (Array.isArray(rData) && rData[0]) setRoleId(String(rData[0].role_id));
      } catch (e) {
        if (!alive) return;
        setErrMsg(e?.message || "Failed to load genders/roles");
      } finally {
        if (!alive) return;
        setLoadingMeta(false);
      }
    }

    loadMeta();
    return () => {
      alive = false;
    };
  }, []);

  function validate() {
    if (!username.trim()) return "Username is required.";
    if (!password) return "Password is required.";
    if (password.length < 4) return "Password must be at least 4 characters.";
    if (password !== confirmPassword) return "Passwords do not match.";
    if (!genderId) return "Please select a gender.";
    if (!roleId) return "Please select a role.";
    if (!shiftStart) return "Please set time in.";
    if (!shiftEnd) return "Please set time out.";
    return "";
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErrMsg("");

    const v = validate();
    if (v) return setErrMsg(v);

    setSubmitting(true);
    try {
      await apiFetch("/auth/signup", {
        method: "POST",
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

      nav("/login", { replace: true });
    } catch (e) {
      setErrMsg(e?.message || "Signup failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <img className="auth-logo" src="/assets/images/logo.png" alt="Logo" />
          <h1 className="auth-title">Create account</h1>
          <p className="auth-subtitle">Register to access Legaspi Inn system</p>
        </div>

        {errMsg && <div className="auth-alert">{errMsg}</div>}

        {loadingMeta ? (
          <p className="auth-subtitle">Loading gender/roles…</p>
        ) : (
          <form className="auth-form" onSubmit={onSubmit}>
            <label className="auth-label">
              Username
              <input
                className="auth-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Choose a username"
              />
            </label>

            <label className="auth-label">
              Password
              <input
                className="auth-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
              />
            </label>

            <label className="auth-label">
              Confirm Password
              <input
                className="auth-input"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
              />
            </label>

            <label className="auth-label">
              Gender
              <select
                className="auth-select"
                value={genderId}
                onChange={(e) => setGenderId(e.target.value)}
              >
                <option value="">Select gender</option>
                {genders.map((g) => (
                  <option key={g.gender_id} value={g.gender_id}>
                    {g.gender_name}
                  </option>
                ))}
              </select>
            </label>

            <label className="auth-label">
              Role
              <select
                className="auth-select"
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
              >
                <option value="">Select role</option>
                {roles.map((r) => (
                  <option key={r.role_id} value={r.role_id}>
                    {r.role_name}
                  </option>
                ))}
              </select>
            </label>

            <div className="auth-row">
              <label className="auth-label">
                Time In
                <input
                  className="auth-input"
                  type="time"
                  value={shiftStart}
                  onChange={(e) => setShiftStart(e.target.value)}
                />
              </label>

              <label className="auth-label">
                Time Out
                <input
                  className="auth-input"
                  type="time"
                  value={shiftEnd}
                  onChange={(e) => setShiftEnd(e.target.value)}
                />
              </label>
            </div>

            <button className="auth-btn" type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Create account"}
            </button>

            <p className="auth-foot">
              Already have an account?{" "}
              <Link className="auth-link" to="/login">
                Login
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}