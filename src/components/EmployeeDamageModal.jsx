import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";
import "./EmployeeDamageModal.css";

export default function EmployeeDamageModal({
  open,
  onClose,
  user,
  damageRows = [],
  items = [],
  locked = false,
  onAdded,
}) {
  const damageStatuses = useMemo(
    () => [
      { damage_status_id: 1, status_name: "Reported" },
      { damage_status_id: 2, status_name: "Under Review" },
      { damage_status_id: 3, status_name: "Resolved" },
      { damage_status_id: 4, status_name: "Charged" },
    ],
    []
  );

  function statusName(damage_status_id) {
    return (
      damageStatuses.find((s) => s.damage_status_id === Number(damage_status_id))?.status_name ??
      "—"
    );
  }

  const totalDamages = useMemo(() => {
    return (damageRows || []).reduce((sum, r) => sum + Number(r.cost || 0), 0);
  }, [damageRows]);

  const [invId, setInvId] = useState("");
  const [statusId, setStatusId] = useState("1");
  const [cost, setCost] = useState("");
  const [err, setErr] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selected = useMemo(
    () => items.find((x) => String(x.inv_id) === String(invId)),
    [items, invId]
  );

  useEffect(() => {
    if (!open) return;
    setInvId("");
    setStatusId("1");
    setCost("");
    setErr("");
    setSubmitting(false);
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

  async function handleAdd(e) {
    e.preventDefault();
    if (locked) return;

    setErr("");

    if (!user?.user_id) return setErr("No employee selected.");
    if (!invId) return setErr("Please select an inventory item.");

    const costNum = Number(cost || 0);
    if (!Number.isFinite(costNum) || costNum <= 0) {
      return setErr("Cost must be greater than 0.");
    }

    setSubmitting(true);
    try {
      await apiFetch("/employee-damage", {
        method: "POST",
        body: JSON.stringify({
          user_id: Number(user.user_id),
          inv_id: Number(invId),
          damage_status_id: Number(statusId),
          cost: costNum,
        }),
      });

      setInvId("");
      setStatusId("1");
      setCost("");

      await onAdded?.();
    } catch (e2) {
      setErr(e2?.message || "Failed to add employee damage.");
    } finally {
      setSubmitting(false);
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
              {user?.username ?? user?.name ?? "Employee"} <span className="edm-dot">•</span>{" "}
              {user?.user_id ?? "—"}
            </p>
          </div>

          <div className="edm-kpis">
            <span className="edm-chip">Total: ₱{totalDamages.toLocaleString()}</span>
            <span className="edm-chip ghost">Count: {(damageRows || []).length}</span>
          </div>
        </div>

        <div className="edm-add">
          <div className="edm-add-title">Add Damage</div>
          <div className="edm-add-sub">Please select an inventory item.</div>

          {err ? <div className="edm-alert">{err}</div> : null}
          {locked ? <div className="edm-lock">Locked</div> : null}

          <form className="edm-add-grid" onSubmit={handleAdd}>
            <label className="edm-field">
              <span>Inventory</span>
              <select value={invId} onChange={(e) => setInvId(e.target.value)} disabled={locked}>
                <option value="">Select inventory</option>
                {items.map((it) => (
                  <option key={it.inv_id} value={it.inv_id}>
                    {it.item_name} (stock: {it.quantity})
                  </option>
                ))}
              </select>
            </label>

            <label className="edm-field">
              <span>Status</span>
              <select value={statusId} onChange={(e) => setStatusId(e.target.value)} disabled={locked}>
                {damageStatuses.map((s) => (
                  <option key={s.damage_status_id} value={s.damage_status_id}>
                    {s.status_name}
                  </option>
                ))}
              </select>
            </label>

            <label className="edm-field">
              <span>Cost to Hotel (₱)</span>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                disabled={locked}
              />
            </label>

            <button className="edm-btn primary" type="submit" disabled={locked || submitting}>
              {submitting ? "Adding..." : "Add"}
            </button>
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
              </tr>
            </thead>

            <tbody>
              {!damageRows || damageRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="edm-empty">
                    No employee damages found.
                  </td>
                </tr>
              ) : (
                damageRows.map((r) => (
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
                    <td>₱{Number(r.cost ?? 0).toLocaleString()}</td>
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