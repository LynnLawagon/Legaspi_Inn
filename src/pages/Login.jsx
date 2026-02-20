import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/auth.css";
import { getSession, loginUser } from "../utils/auth";

export default function Login() {
  const nav = useNavigate();
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState({ text: "", ok: false });

  useEffect(() => {
    // if already logged in, go dashboard
    const session = getSession();
    if (session) nav("/", { replace: true }); // dashboard route
  }, [nav]);

  function onSubmit(e) {
    e.preventDefault();
    const res = loginUser({ userId, password });

    if (!res.ok) {
      setMsg({ text: res.message, ok: false });
      return;
    }

    setMsg({ text: "Login successful! Redirecting...", ok: true });
    setTimeout(() => nav("/", { replace: true }), 250);
  }

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <div className="brand">
          <img src="/assets/images/legaspi-inn-beige.png" alt="Legaspi Inn Logo" />
        </div>

        <div className="panel">
          <div className="tabs">
            <Link className="tab active" to="/login">Login</Link>
            <Link className="tab" to="/signup">Sign up</Link>
          </div>

          <form className="form" onSubmit={onSubmit}>
            <div className="login-stack">
              <div className="field">
                <label className="label" htmlFor="login_userId">User ID</label>
                <input
                  id="login_userId"
                  className="input"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  required
                />
              </div>

              <div className="field">
                <label className="label" htmlFor="login_password">Password</label>
                <input
                  id="login_password"
                  type="password"
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <a className="forgot" href="#" onClick={(e) => e.preventDefault()}>
                Forgot Password?
              </a>

              <div className="btn-row">
                <button className="btn" type="submit">Log in</button>
              </div>

              <div className={`msg ${msg.ok ? "ok" : ""}`}>{msg.text}</div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}