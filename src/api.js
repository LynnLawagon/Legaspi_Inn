// src/lib/api.js
import { getSession } from "../utils/auth";

export const API_BASE = "/api";

export async function apiFetch(path, options = {}) {
  const session = getSession();
  const token = session?.token;

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  // ✅ only add token if naa
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  // parse json if possible
  let data = null;
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  if (!res.ok) {
    const msg =
      (data && data.message) ||
      (data && data.error) ||
      (typeof data === "string" ? data : `Request failed (${res.status})`);
    throw new Error(msg);
  }

  return data;
}