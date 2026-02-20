import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/auth.css";
import { signupUser } from "../utils/auth";

export default function Signup() {
  const nav = useNavigate();

  const [form, setForm] = useState({
    userId: "",
    firstName: "",
    middleName: "",
    lastName: "",
    password: "",
    confirm: "",
    birthdate: "",
    phone: "",
  });

  const [msg, setMsg] = useState({ text: "", ok: false });

  function setField(k, v) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  function onSubmit(e) {
    e.preventDefault();

    const res = signupUser({
      userId: form.userId,
      password: form.password,
      confirm: form.confirm,
      firstName: form.firstName,
      middleName: form.middleName,
      lastName: form.lastName,
      birthdate: form.birthdate,
      phone: form.phone,
    });

    if (!res.ok) {
      setMsg({ text: res.message, ok: false });
      return;
    }

    setMsg({ text: "Account created! Redirecting...", ok: true });
    setTimeout(() => nav("/", { replace: true }), 250); // dashboard
  }

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <div className="brand">
          <img src="/assets/images/legaspi-inn-beige.png" alt="Legaspi Inn Logo" />
        </div>

        <div className="panel">
          <div className="tabs">
            <Link className="tab" to="/login">Login</Link>
            <Link className="tab active" to="/signup">Sign up</Link>
          </div>

          <form className="form" onSubmit={onSubmit}>
            <div className="signup-grid">
              <div className="field">
                <label className="label" htmlFor="su_userId">User ID</label>
                <input
                  id="su_userId"
                  className="input"
                  value={form.userId}
                  onChange={(e) => setField("userId", e.target.value)}
                  required
                />
              </div>

              <div className="field">
                <label className="label" htmlFor="su_first">Firstname</label>
                <input
                  id="su_first"
                  className="input"
                  value={form.firstName}
                  onChange={(e) => setField("firstName", e.target.value)}
                  required
                />
              </div>

              <div className="field">
                <label className="label" htmlFor="su_password">Password</label>
                <input
                  id="su_password"
                  type="password"
                  className="input"
                  value={form.password}
                  onChange={(e) => setField("password", e.target.value)}
                  required
                />
              </div>

              <div className="field">
                <label className="label" htmlFor="su_middle">Middle name</label>
                <input
                  id="su_middle"
                  className="input"
                  value={form.middleName}
                  onChange={(e) => setField("middleName", e.target.value)}
                />
              </div>

              <div className="field">
                <label className="label" htmlFor="su_confirm">Confirm Password</label>
                <input
                  id="su_confirm"
                  type="password"
                  className="input"
                  value={form.confirm}
                  onChange={(e) => setField("confirm", e.target.value)}
                  required
                />
              </div>

              <div className="field">
                <label className="label" htmlFor="su_last">Lastname</label>
                <input
                  id="su_last"
                  className="input"
                  value={form.lastName}
                  onChange={(e) => setField("lastName", e.target.value)}
                  required
                />
              </div>

              <div className="field">
                <label className="label" htmlFor="su_birthdate">Birthdate</label>
                <input
                  id="su_birthdate"
                  type="date"
                  className="input"
                  value={form.birthdate}
                  onChange={(e) => setField("birthdate", e.target.value)}
                />
              </div>

              <div className="field">
                <label className="label" htmlFor="su_phone">Phone number</label>
                <input
                  id="su_phone"
                  className="input"
                  value={form.phone}
                  onChange={(e) => setField("phone", e.target.value)}
                />
              </div>
            </div>

            <div className="signup-actions">
              <button className="btn small" type="button" onClick={() => nav("/login")}>
                Go Back
              </button>
              <button className="btn small" type="submit">Sign up</button>
            </div>

            <div className={`msg ${msg.ok ? "ok" : ""}`}>{msg.text}</div>
          </form>
        </div>
      </div>
    </div>
  );
}