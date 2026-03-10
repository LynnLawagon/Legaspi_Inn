// src/components/UserModal.jsx
import { useEffect, useMemo, useState } from "react";
import EmployeeDamageModal from "./EmployeeDamageModal";
import { apiFetch } from "../lib/api";
import { getSession, setSession } from "../utils/auth";

export default function UserModal({ open, onClose, onLogout, user }) {
  const [isEdit, setIsEdit] = useState(false);
  const [openEDM, setOpenEDM] = useState(false);

  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const userId = user?.user_id;

  const [form, setForm] = useState({
    user_id: userId ?? "",
    username: user?.username ?? "",
    password: "",
    role_id: user?.role_id ?? 2,
    shift_start: user?.shift_start ?? "08:00",
    shift_end: user?.shift_end ?? "17:00",
  });

  // (your existing damageRows demo; keep if you want)
  const [damageRows, setDamageRows] = useState(user?.employee_damages ?? []);
  const [invItems, setInvItems] = useState([]);

  // lock bg scroll
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => (document.body.style.overflow = prev);
  }, [open]);

  // load roles + latest user info when modal opens
  useEffect(() => {
    if (!open || !userId) return;

    (async () => {
      try {
        setLoading(true);
        setErr("");

        const [roleRows, u] = await Promise.all([
          apiFetch("/meta/roles"),
          apiFetch(`/users/${userId}`),
        ]);

        setRoles(roleRows);

        setForm({
          user_id: u.user_id,
          username: u.username ?? "",
          password: "",
          role_id: u.role_id ?? 2,
          shift_start: (u.shift_start || "08:00").slice(0, 5),
          shift_end: (u.shift_end || "17:00").slice(0, 5),
        });

        setIsEdit(false);
        setOpenEDM(false);
      } catch (e) {
        setErr(e?.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    })();
  }, [open, userId]);

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape" && open) handleClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line
  }, [open]);

  function handleClose() {
    setIsEdit(false);
    setOpenEDM(false);
    setErr("");
    onClose?.();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!isEdit) return;

    try {
      setErr("");
      setLoading(true);

      const payload = {
        username: form.username,
        role_id: Number(form.role_id),
        shift_start: form.shift_start,
        shift_end: form.shift_end,
      };

      if (form.password && String(form.password).trim()) {
        payload.password = form.password;
      }

      const resp = await apiFetch(`/users/${form.user_id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      const updatedUser = resp?.user;

      // ✅ update saved session so sidebar + app reflect changes
      const session = getSession();
      if (session?.token && updatedUser) {
        setSession({
          token: session.token,
          user: {
            ...session.user,
            ...updatedUser,
          },
        });
      }

      setForm((p) => ({ ...p, password: "" }));
      setIsEdit(false);
    } catch (e) {
      setErr(e?.message || "Update failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
  if (!openEDM) return;

  (async () => {
    try {
      const rows = await apiFetch("/inventory");
      setInvItems(Array.isArray(rows) ? rows : []);
    } catch (e) {
      console.error("Failed to load inventory", e);
      setInvItems([]);
    }
  })();
}, [openEDM]);  

  const roleName =
    roles.find((r) => Number(r.role_id) === Number(form.role_id))?.role_name ??
    "—";

  if (!open) return null;

  return (
    <>
      <div
        className="modal-overlay show"
        id="userModal"
        aria-hidden={!open}
        onClick={(e) => {
          if (e.target.id === "userModal") handleClose();
        }}
      >
        <div className="modal-card user-modal" role="dialog" aria-modal="true">
          <button className="modal-close" type="button" aria-label="Close" onClick={handleClose}>
            ✕
          </button>

          {/* LEFT */}
          <div className="modal-left">
            <div className="modal-avatar">
              <img src="/assets/images/user.png" alt="User" />
            </div>

            {/* ✅ username visible */}
            <h2>{form.username || "User"}</h2>

            {/* ✅ still show id */}
            <p className="um-sub">{form.user_id}</p>

            {/* ✅ role visible */}
            <p className="um-sub muted">{roleName}</p>

            <div className="um-left-actions">
              {!isEdit ? (
                <button className="modal-edit" type="button" onClick={() => setIsEdit(true)}>
                  Edit Profile
                </button>
              ) : (
                <button className="modal-edit ghost" type="button" onClick={() => setIsEdit(false)}>
                  Cancel Edit
                </button>
              )}

              <button className="modal-edit ghost" type="button" onClick={() => setOpenEDM(true)}>
                Employee Damage
              </button>

              <button
                className="modal-edit danger"
                type="button"
                onClick={() => {
                  handleClose();
                  onLogout?.();
                }}
              >
                Logout
              </button>
            </div>
          </div>

          {/* RIGHT */}
          <div className="modal-right">
            <form id="userForm" onSubmit={handleSubmit}>
              <div className="um-section-head">
                <h3>Profile</h3>
                <span className="um-chip">{isEdit ? "Editing" : "View"}</span>
              </div>

              {err ? <div className="um-error">{err}</div> : null}

              <label className="field">
                <span>User ID</span>
                <input className="um-input" type="text" value={form.user_id} disabled />
              </label>

              <label className="field">
                <span>Username</span>
                <input
                  className="um-input"
                  type="text"
                  value={form.username}
                  disabled={!isEdit || loading}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                />
              </label>

              <label className="field">
                <span>Password</span>
                <input
                  className="um-input"
                  type="password"
                  placeholder="Leave blank if no change"
                  value={form.password}
                  disabled={!isEdit || loading}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </label>

              <label className="field">
                <span>Role</span>
                <select
                  className="um-input"
                  value={form.role_id}
                  disabled={!isEdit || loading}
                  onChange={(e) => setForm({ ...form, role_id: Number(e.target.value) })}
                >
                  {roles.map((r) => (
                    <option key={r.role_id} value={r.role_id}>
                      {r.role_name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="um-grid2">
                <label className="field">
                  <span>Shift Start</span>
                  <input
                    className="um-input"
                    type="time"
                    value={form.shift_start}
                    disabled={!isEdit || loading}
                    onChange={(e) => setForm({ ...form, shift_start: e.target.value })}
                  />
                </label>

                <label className="field">
                  <span>Shift End</span>
                  <input
                    className="um-input"
                    type="time"
                    value={form.shift_end}
                    disabled={!isEdit || loading}
                    onChange={(e) => setForm({ ...form, shift_end: e.target.value })}
                  />
                </label>
              </div>

              {isEdit ? (
                <div className="modal-actions">
                  <button className="btn secondary" type="button" onClick={() => setIsEdit(false)} disabled={loading}>
                    Cancel
                  </button>
                  <button className="btn primary" type="submit" disabled={loading}>
                    {loading ? "Saving..." : "Save"}
                  </button>
                </div>
              ) : null}
            </form>
          </div>
        </div>
      </div>

<EmployeeDamageModal
  open={openEDM}
  onClose={() => setOpenEDM(false)}
  user={user ?? form}
  damageRows={damageRows}
  items={invItems}
/>
    </>
  );
}