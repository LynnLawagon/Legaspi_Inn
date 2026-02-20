import { useEffect, useMemo, useState } from "react";
import EmployeeDamageModal from "./EmployeeDamageModal"; // adjust path if needed

export default function UserModal({ open, onClose, onLogout, user }) {
  const [isEdit, setIsEdit] = useState(false);
  const [openEDM, setOpenEDM] = useState(false);

  const roles = useMemo(
    () => [
      { role_id: 1, role_name: "Admin" },
      { role_id: 2, role_name: "Staff" },
    ],
    []
  );

  const [form, setForm] = useState({
    user_id: user?.user_id ?? "U0001",
    name: user?.name ?? "Employee Name",
    password: "",
    role_id: user?.role_id ?? 2,
    shift_start: user?.shift_start ?? "08:00",
    shift_end: user?.shift_end ?? "17:00",
  });

  const [damageRows, setDamageRows] = useState(
    user?.employee_damages ?? [
      {
        edam_id: 101,
        inventory_id: 12,
        inventory_name: "Towel",
        cost_to_hotel: 250,
        date_reported: "2026-02-18 10:30",
        status_id: 2,
      },
      {
        edam_id: 102,
        inventory_id: 7,
        inventory_name: "Soap",
        cost_to_hotel: 60,
        date_reported: "2026-02-19 16:10",
        status_id: 1,
      },
    ]
  );

  // ✅ LOCK BG scroll (MUST be inside component)
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden"; // 🔒 lock background

    return () => {
      document.body.style.overflow = previousOverflow; // 🔓 restore
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setIsEdit(false);
    setOpenEDM(false);
    setForm({
      user_id: user?.user_id ?? "U0001",
      name: user?.name ?? "Employee Name",
      password: "",
      role_id: user?.role_id ?? 2,
      shift_start: user?.shift_start ?? "08:00",
      shift_end: user?.shift_end ?? "17:00",
    });
    setDamageRows(user?.employee_damages ?? damageRows);
    // eslint-disable-next-line
  }, [open, user?.user_id]);

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
    onClose?.();
  }

  function handleSubmit(e) {
    e.preventDefault();
    setIsEdit(false);
    handleClose();
  }

  const roleName =
    roles.find((r) => r.role_id === Number(form.role_id))?.role_name ?? "—";

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
          <button
            className="modal-close"
            type="button"
            aria-label="Close"
            onClick={handleClose}
          >
            ✕
          </button>

          {/* LEFT */}
          <div className="modal-left">
            <div className="modal-avatar">
              <img src="/assets/images/user.png" alt="User" />
            </div>

            <h2>User</h2>
            <p className="um-sub">{form.user_id}</p>
            <p className="um-sub muted">{roleName}</p>

            <div className="um-left-actions">
              {!isEdit ? (
                <button
                  className="modal-edit"
                  type="button"
                  onClick={() => setIsEdit(true)}
                >
                  Edit Profile
                </button>
              ) : (
                <button
                  className="modal-edit ghost"
                  type="button"
                  onClick={() => setIsEdit(false)}
                >
                  Cancel Edit
                </button>
              )}

              {/* ✅ Employee Damage button */}
              <button
                className="modal-edit ghost"
                type="button"
                onClick={() => setOpenEDM(true)}
              >
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

              <label className="field">
                <span>User ID</span>
                <input
                  className="um-input"
                  type="text"
                  value={form.user_id}
                  disabled
                />
              </label>

              <label className="field">
                <span>Name</span>
                <input
                  className="um-input"
                  type="text"
                  value={form.name}
                  disabled={!isEdit}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </label>

              <label className="field">
                <span>Password</span>
                <input
                  className="um-input"
                  type="password"
                  placeholder="Leave blank if no change"
                  value={form.password}
                  disabled={!isEdit}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                />
              </label>

              <label className="field">
                <span>Role</span>
                <select
                  className="um-input"
                  value={form.role_id}
                  disabled={!isEdit}
                  onChange={(e) =>
                    setForm({ ...form, role_id: Number(e.target.value) })
                  }
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
                    disabled={!isEdit}
                    onChange={(e) =>
                      setForm({ ...form, shift_start: e.target.value })
                    }
                  />
                </label>

                <label className="field">
                  <span>Shift End</span>
                  <input
                    className="um-input"
                    type="time"
                    value={form.shift_end}
                    disabled={!isEdit}
                    onChange={(e) =>
                      setForm({ ...form, shift_end: e.target.value })
                    }
                  />
                </label>
              </div>

              {isEdit ? (
                <div className="modal-actions">
                  <button
                    className="btn secondary"
                    type="button"
                    onClick={() => setIsEdit(false)}
                  >
                    Cancel
                  </button>
                  <button className="btn primary" type="submit">
                    Save
                  </button>
                </div>
              ) : null}
            </form>
          </div>
        </div>
      </div>

      {/* ✅ Separate modal */}
      <EmployeeDamageModal
        open={openEDM}
        onClose={() => setOpenEDM(false)}
        user={user ?? form}
        damageRows={damageRows}
      />
    </>
  );
}