const KEY = "legaspi_session";

export function setSession(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function getSession() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || null;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(KEY);
}

export function getToken() {
  const s = getSession();
  return s?.token || null;
}

export function getUser() {
  const s = getSession();
  return s?.user || null;
}