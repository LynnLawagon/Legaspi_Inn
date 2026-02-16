import { useEffect, useState } from "react";

export default function UserModal({ open, onClose }) {
  const [isEdit, setIsEdit] = useState(false);

  // sample values (later you can connect to backend)
  const [form, setForm] = useState({
    user_id: "U0001",
    name: "Employee Name",
    password: "",
    role: "staff",
    shift: "day",
  });

  // ESC to close
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape" && open) {
        handleClose();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line
  }, [open]);

  function handleClose() {
    setIsEdit(false);
    onClose?.();
  }

  function handleSubmit(e) {
    e.preventDefault();
    // TODO: save to backend/db later
    setIsEdit(false);
    handleClose();
  }

  if (!open) return null;

  return (
    <div
      className="modal-overlay show"
      id="userModal"
      aria-hidden={!open}
      onClick={(e) => {
        if (e.target.id === "userModal") handleClose(); // click outside
      }}
    >
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="userModalTitle"
      >
        <button
          className="modal-close"
          id="closeUserModal"
          type="button"
          aria-label="Close"
          onClick={handleClose}
        >
          ✕
        </button>

        <div className="modal-left">
          <div className="modal-avatar">
            <img src="/assets/images/user.png" alt="User" />
          </div>
          <h2 id="userModalTitle">User</h2>

          {!isEdit ? (
            <button
              className="modal-edit"
              id="editUserBtn"
              type="button"
              onClick={() => setIsEdit(true)}
            >
              Edit
            </button>
          ) : null}
        </div>

        <div className="modal-right">
          <form id="userForm" onSubmit={handleSubmit}>
            <label className="field">
              <span>User ID</span>
              <input type="text" value={form.user_id} disabled />
            </label>

            <label className="field">
              <span>Name</span>
              <input
                type="text"
                value={form.name}
                disabled={!isEdit}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>

            <label className="field">
              <span>Password</span>
              <input
                type="password"
                placeholder="••••••••"
                value={form.password}
                disabled={!isEdit}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </label>

            <label className="field">
              <span>Role</span>
              <select
                value={form.role}
                disabled={!isEdit}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="admin">Admin</option>
                <option value="staff">Staff</option>
              </select>
            </label>

            <label className="field">
              <span>Shift</span>
              <select
                value={form.shift}
                disabled={!isEdit}
                onChange={(e) => setForm({ ...form, shift: e.target.value })}
              >
                <option value="day">Day</option>
                <option value="night">Night</option>
              </select>
            </label>

            <div className="modal-actions">
              {isEdit ? (
                <>
                  <button
                    className="btn secondary"
                    id="cancelEdit"
                    type="button"
                    onClick={() => setIsEdit(false)}
                  >
                    Cancel
                  </button>
                  <button className="btn primary" id="saveUser" type="submit">
                    Save
                  </button>
                </>
              ) : null}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
