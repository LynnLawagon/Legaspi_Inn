import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiFetch } from "../lib/api";

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

        // defaults
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
    return () => { alive = false; };
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
    <div style={{ maxWidth: 420, margin: "40px auto", padding: 16 }}>
      <h2 style={{ marginBottom: 10 }}>Create account</h2>

      {errMsg && (
        <div style={{ background: "#ffecec", border: "1px solid #ffb4b4", padding: 10, borderRadius: 10, marginBottom: 12 }}>
          {errMsg}
        </div>
      )}

      {loadingMeta ? (
        <p>Loading gender/roles…</p>
      ) : (
        <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <label>
            Username
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{ width: "100%", height: 40, padding: "0 10px", borderRadius: 10, border: "1px solid #ddd" }}
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: "100%", height: 40, padding: "0 10px", borderRadius: 10, border: "1px solid #ddd" }}
            />
          </label>

          <label>
            Confirm Password
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={{ width: "100%", height: 40, padding: "0 10px", borderRadius: 10, border: "1px solid #ddd" }}
            />
          </label>

          <label>
            Gender
            <select
              value={genderId}
              onChange={(e) => setGenderId(e.target.value)}
              style={{ width: "100%", height: 40, padding: "0 10px", borderRadius: 10, border: "1px solid #ddd" }}
            >
              <option value="">Select gender</option>
              {genders.map((g) => (
                <option key={g.gender_id} value={g.gender_id}>
                  {g.gender_name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Role
            <select
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              style={{ width: "100%", height: 40, padding: "0 10px", borderRadius: 10, border: "1px solid #ddd" }}
            >
              <option value="">Select role</option>
              {roles.map((r) => (
                <option key={r.role_id} value={r.role_id}>
                  {r.role_name}
                </option>
              ))}
            </select>
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label>
              Time In
              <input
                type="time"
                value={shiftStart}
                onChange={(e) => setShiftStart(e.target.value)}
                style={{ width: "100%", height: 40, padding: "0 10px", borderRadius: 10, border: "1px solid #ddd" }}
              />
            </label>

            <label>
              Time Out
              <input
                type="time"
                value={shiftEnd}
                onChange={(e) => setShiftEnd(e.target.value)}
                style={{ width: "100%", height: 40, padding: "0 10px", borderRadius: 10, border: "1px solid #ddd" }}
              />
            </label>
          </div>

          <button type="submit" disabled={submitting} style={{ height: 42, borderRadius: 10, border: 0, cursor: "pointer", fontWeight: 700 }}>
            {submitting ? "Creating..." : "Create account"}
          </button>

          <p style={{ textAlign: "center", marginTop: 6 }}>
            Already have an account? <Link to="/login">Login</Link>
          </p>
        </form>
      )}
    </div>
  );
}