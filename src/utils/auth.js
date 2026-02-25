const API = "/api";
const SESSION_KEY = "legaspi_session";

export function setSession(payload) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(payload));
}

export function getSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

async function request(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
  return data;
}

export async function signupUser({ userId, password, confirm }) {
  const username = String(userId || "").trim();
  if (!username || !password) return { ok: false, message: "Please fill required fields." };
  if (password !== confirm) return { ok: false, message: "Password and Confirm Password do not match." };

  try {
    await request("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });

    // auto-login
    const login = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });

    setSession({ token: login.token, user: login.user, loginAt: Date.now() });
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e.message };
  }
}

export async function loginUser({ userId, password }) {
  const username = String(userId || "").trim();
  if (!username || !password) return { ok: false, message: "Missing credentials" };

  try {
    const data = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });

    setSession({ token: data.token, user: data.user, loginAt: Date.now() });
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e.message };
  }
}