import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";
import "./EmployeeDamageModal.css";

export default function GuestDamageModal({
  open,
  onClose,
  transId,
  guestName,
  roomNumber = "",
  items = [],
  locked = false,
  onSave,
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

  const [invId, setInvId] = useState("");
  const [statusId, setStatusId] = useState("1");
  const [err, setErr] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [rows, setRows] = useState([]);
  const [rowsLoading, setRowsLoading] = useState(false);

  const selected = useMemo(
    () => items.find((x) => String(x.inv_id) === String(invId)),
    [items, invId]
  );

  const estimatedFee = useMemo(() => {
    const value = Number(selected?.item_value || 0);
    const statusNum = Number(statusId);
    const rateMap = {
      1: 0.1,
      2: 0.3,
      3: 0.7,
      4: 1.0,
    };
    const rate = rateMap[statusNum] ?? 0;
    return value * rate;
  }, [selected, statusId]);

  async function loadRows() {
    if (!transId) {
      setRows([]);
      return;
    }

    setRowsLoading(true);
    try {
      const data = await apiFetch(`/damages/transaction/${transId}`);
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setRows([]);
      setErr(e.message || "Failed to load guest damages.");
    } finally {
      setRowsLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    setInvId("");
    setStatusId("1");
    setErr("");
    setSubmitting(false);
    loadRows();
  }, [open, transId]);

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

    if (!transId) return setErr("No transaction selected.");
    if (!invId) return setErr("Please select an inventory item.");
    if (!selected) return setErr("Selected item not found.");
    if (Number(selected.quantity || 0) <= 0) return setErr("Selected item is out of stock.");

    setSubmitting(true);
    try {
      await onSave?.({
        trans_id: Number(transId),
        inv_id: Number(invId),
        damage_status_id: Number(statusId),
      });

      setInvId("");
      setStatusId("1");
      await loadRows();
    } catch (e2) {
      setErr(e2?.message || "Failed to add guest damage.");
    } finally {
      setSubmitting(false);
    }
  }

  const totalGuestDamage = useMemo(() => {
    return rows.reduce((sum, r) => sum + Number(r.charge_amount || 0), 0);
  }, [rows]);

  if (!open) return null;

  return (
    <div
      className="edm-overlay show"
      id="guestDamageModal"
      aria-hidden={!open}
      onClick={(e) => {
        if (e.target.id === "guestDamageModal") onClose?.();
      }}
    >
      <div className="edm-card" role="dialog" aria-modal="true" aria-labelledby="gdmTitle">
        <button className="edm-close" type="button" aria-label="Close" onClick={onClose}>
          ✕
        </button>

        <div className="edm-head">
          <div>
            <h2 id="gdmTitle">Guest Damage</h2>
            <p className="edm-sub">
              Transaction <b>#{transId ?? "—"}</b>
              {guestName ? (
                <>
                  <span className="edm-dot">•</span> {guestName}
                </>
              ) : null}
              {roomNumber ? (
                <>
                  <span className="edm-dot">•</span> Room {roomNumber}
                </>
              ) : null}
            </p>
          </div>

          <div className="edm-kpis">
            <span className="edm-chip">
              Total: ₱
              {totalGuestDamage.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
            <span className="edm-chip ghost">Count: {rows.length}</span>
          </div>
        </div>

        <div className="edm-add">
          <div className="edm-add-title">Add Damage</div>
          <div className="edm-add-sub">Select a damaged item and severity.</div>

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
              <span>Severity</span>
              <select value={statusId} onChange={(e) => setStatusId(e.target.value)} disabled={locked}>
                {damageStatuses.map((s) => (
                  <option key={s.damage_status_id} value={s.damage_status_id}>
                    {s.status_name}
                  </option>
                ))}
              </select>
            </label>

            <label className="edm-field">
              <span>Item Value (₱)</span>
              <input
                type="text"
                value={
                  selected
                    ? Number(selected.item_value || 0).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    : "0.00"
                }
                readOnly
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
                <th>Charge</th>
              </tr>
            </thead>

            <tbody>
              {rowsLoading ? (
                <tr>
                  <td colSpan={5} className="edm-empty">Loading...</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="edm-empty">
                    No guest damages found.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.gdam_id}>
                    <td className="edm-mono">GD{r.gdam_id}</td>
                    <td>{r.item_name ?? `INV-${r.inv_id}`}</td>
                    <td className="edm-mono">{r.date_reported}</td>
                    <td>{r.damage_status}</td>
                    <td>
                      ₱
                      {Number(r.charge_amount ?? 0).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
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