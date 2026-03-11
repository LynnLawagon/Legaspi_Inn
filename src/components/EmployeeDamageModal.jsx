import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";
import "./EmployeeDamageModal.css";

export default function EmployeeDamageModal({
  open,
  onClose,
  user,
  items = [],
  users = [],
  locked = false,
  onAdded,
}) {
  const damageStatuses = useMemo(
    () => [
      { damage_status_id: 1, status_name: "Small Damage (10%)" },
      { damage_status_id: 2, status_name: "Medium Damage (30%)" },
      { damage_status_id: 3, status_name: "Large Damage (70%)" },
      { damage_status_id: 4, status_name: "Total Loss (100%)" },
    ],
    []
  );

  const [rows, setRows] = useState([]);
  const [rowsLoading, setRowsLoading] = useState(false);

  const [invId, setInvId] = useState("");
  const [statusId, setStatusId] = useState("1");
  const [assignUserId, setAssignUserId] = useState("");
  const [err, setErr] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [editingId, setEditingId] = useState(null);

  const selected = useMemo(
    () => items.find((x) => String(x.inv_id) === String(invId)),
    [items, invId]
  );

  const totalDamages = useMemo(() => {
    return rows.reduce((sum, r) => sum + Number(r.cost || 0), 0);
  }, [rows]);

  const estimatedFee = useMemo(() => {
    const value = Number(selected?.item_value || 0);
    const rateMap = {
      1: 0.1,
      2: 0.3,
      3: 0.7,
      4: 1.0,
    };
    const rate = rateMap[Number(statusId)] ?? 0;
    return value * rate;
  }, [selected, statusId]);

  function statusName(damage_status_id) {
    return (
      damageStatuses.find((s) => s.damage_status_id === Number(damage_status_id))?.status_name ??
      "—"
    );
  }

  async function loadRows() {
    if (!user?.user_id) {
      setRows([]);
      return;
    }

    setRowsLoading(true);
    try {
      const data = await apiFetch(`/employee-damage?user_id=${user.user_id}&limit=100`);
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setRows([]);
      setErr(e.message || "Failed to load employee damages.");
    } finally {
      setRowsLoading(false);
    }
  }

  function resetForm() {
    setInvId("");
    setStatusId("1");
    setAssignUserId(String(user?.user_id || ""));
    setEditingId(null);
    setErr("");
    setSubmitting(false);
  }

  useEffect(() => {
    if (!open) return;
    resetForm();
    loadRows();
  }, [open, user?.user_id]);

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape" && open) onClose?.();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (locked) return;

    setErr("");

    const finalUserId = Number(assignUserId || user?.user_id);
    if (!finalUserId) return setErr("No employee selected.");
    if (!invId) return setErr("Please select an inventory item.");
    if (!selected) return setErr("Selected inventory item not found.");
    if (!editingId && Number(selected.quantity || 0) <= 0) {
      return setErr("Selected item is out of stock.");
    }

    setSubmitting(true);
    try {
      const payload = {
        user_id: finalUserId,
        inv_id: Number(invId),
        damage_status_id: Number(statusId),
      };

      if (editingId) {
        await apiFetch(`/employee-damage/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch("/employee-damage", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      resetForm();
      await loadRows();
      await onAdded?.();
    } catch (e2) {
      setErr(e2?.message || "Failed to save employee damage.");
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(row) {
    setEditingId(row.edam_id);
    setInvId(String(row.inv_id || ""));
    setStatusId(String(row.damage_status_id || 1));
    setAssignUserId(String(row.user_id || user?.user_id || ""));
    setErr("");
  }

  async function handleDelete(row) {
    if (!window.confirm(`Delete employee damage ED${row.edam_id}?`)) return;

    try {
      await apiFetch(`/employee-damage/${row.edam_id}`, {
        method: "DELETE",
      });
      if (editingId === row.edam_id) resetForm();
      await loadRows();
      await onAdded?.();
    } catch (e) {
      setErr(e.message || "Failed to delete employee damage.");
    }
  }

  if (!open) return null;

  return (
    <div
      className="edm-overlay show"
      id="employeeDamageModal"
      aria-hidden={!open}
      onClick={(e) => {
        if (e.target.id === "employeeDamageModal") onClose?.();
      }}
    >
      <div className="edm-card" role="dialog" aria-modal="true" aria-labelledby="edmTitle">
        <button className="edm-close" type="button" aria-label="Close" onClick={onClose}>
          ✕
        </button>

        <div className="edm-head">
          <div>
            <h2 id="edmTitle">Employee Damage</h2>
            <p className="edm-sub">
              {user?.username ?? "Employee"} <span className="edm-dot">•</span> {user?.user_id ?? "—"}
            </p>
          </div>

          <div className="edm-kpis">
            <span className="edm-chip">
              Total: ₱
              {totalDamages.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
            <span className="edm-chip ghost">Count: {rows.length}</span>
          </div>
        </div>

        <div className="edm-add">
          <div className="edm-add-title">{editingId ? "Edit Damage" : "Add Damage"}</div>
          <div className="edm-add-sub">Select an inventory item and severity.</div>

          {err ? <div className="edm-alert">{err}</div> : null}
          {locked ? <div className="edm-lock">Locked</div> : null}

          <form className="edm-add-grid" onSubmit={handleSubmit}>
            {users.length > 0 ? (
              <label className="edm-field">
                <span>Employee</span>
                <select
                  value={assignUserId}
                  onChange={(e) => setAssignUserId(e.target.value)}
                  disabled={locked || submitting}
                >
                  <option value="">Select employee</option>
                  {users.map((u) => (
                    <option key={u.user_id} value={u.user_id}>
                      {u.username}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <label className="edm-field">
              <span>Inventory</span>
              <select
                value={invId}
                onChange={(e) => setInvId(e.target.value)}
                disabled={locked || submitting}
              >
                <option value="">Select inventory</option>
                {items.map((it) => (
                  <option key={it.inv_id} value={it.inv_id}>
                    {it.item_name} (stock: {it.quantity})
                  </option>
                ))}
              </select>
            </label>

            <label className="edm-field">
              <span>Severity</span>
              <select
                value={statusId}
                onChange={(e) => setStatusId(e.target.value)}
                disabled={locked || submitting}
              >
                {damageStatuses.map((s) => (
                  <option key={s.damage_status_id} value={s.damage_status_id}>
                    {s.status_name}
                  </option>
                ))}
              </select>
            </label>

            <label className="edm-field">
              <span>Estimated Cost (₱)</span>
              <input
                type="text"
                value={estimatedFee.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
                readOnly
              />
            </label>

            <div style={{ display: "flex", gap: 8, alignItems: "end" }}>
              <button className="edm-btn primary" type="submit" disabled={locked || submitting}>
                {submitting ? "Saving..." : editingId ? "Update" : "Add"}
              </button>

              {editingId ? (
                <button
                  className="edm-btn"
                  type="button"
                  onClick={resetForm}
                  disabled={submitting}
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </form>
        </div>

        <div className="edm-divider" />

        <div className="edm-table-wrap">
          <table className="edm-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Inventory</th>
                <th>Date Reported</th>
                <th>Status</th>
                <th>Cost</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {rowsLoading ? (
                <tr>
                  <td colSpan={6} className="edm-empty">Loading...</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="edm-empty">
                    No employee damages found.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.edam_id}>
                    <td className="edm-mono">ED{r.edam_id}</td>
                    <td title={r.inventory_name || r.item_name || ""}>
                      {r.inventory_name ?? r.item_name ?? `INV-${r.inv_id}`}
                    </td>
                    <td className="edm-mono">{r.date_reported}</td>
                    <td>
                      <span className={`edm-status s-${String(r.damage_status_id)}`}>
                        {statusName(r.damage_status_id)}
                      </span>
                    </td>
                    <td>
                      ₱
                      {Number(r.cost ?? 0).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                        <button
                          className="edm-btn"
                          type="button"
                          onClick={() => startEdit(r)}
                        >
                          Edit
                        </button>
                        <button
                          className="edm-btn"
                          type="button"
                          onClick={() => handleDelete(r)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="edm-actions">
          <button className="edm-btn" type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}