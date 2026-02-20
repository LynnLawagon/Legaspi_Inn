const USERS_KEY = "legaspi_users";
const SESSION_KEY = "legaspi_session";

export function getUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
  } catch {
    return [];
  }
}

export function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function findUser(userId) {
  return getUsers().find(
    (u) => (u.userId || "").toLowerCase() === String(userId || "").toLowerCase()
  );
}

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

/* LOGIN */
export function loginUser({ userId, password }) {
  const u = findUser(userId?.trim());
  if (!u) return { ok: false, message: "User ID not found. Please sign up first." };
  if (u.password !== password) return { ok: false, message: "Wrong password." };

  setSession({
    userId: u.userId,
    firstName: u.firstName,
    lastName: u.lastName,
    role: u.role || "Staff",
    loginAt: Date.now(),
  });

  return { ok: true };
}

/* SIGNUP */
export function signupUser({
  userId,
  password,
  confirm,
  firstName,
  middleName,
  lastName,
  birthdate,
  phone,
}) {
  userId = String(userId || "").trim();
  firstName = String(firstName || "").trim();
  middleName = String(middleName || "").trim();
  lastName = String(lastName || "").trim();
  phone = String(phone || "").trim();

  if (!userId || !password || !firstName || !lastName) {
    return { ok: false, message: "Please fill required fields." };
  }
  if (password !== confirm) {
    return { ok: false, message: "Password and Confirm Password do not match." };
  }
  if (findUser(userId)) {
    return { ok: false, message: "User ID already exists." };
  }

  const users = getUsers();
  users.push({
    userId,
    password,
    firstName,
    middleName,
    lastName,
    birthdate: birthdate || "",
    phone,
    role: "Staff",
    createdAt: Date.now(),
  });
  saveUsers(users);

  // auto-login
  setSession({ userId, firstName, lastName, role: "Staff", loginAt: Date.now() });

  return { ok: true };
}