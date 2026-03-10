//src/components/GuestDamageModal.jsx
import { useMemo, useState, useEffect } from "react";
import "./GuestDamageModal.css";

export default function GuestDamageModal({
  open,
  onClose,
  transId,
  guestName,
  roomNumber = "",
  items = [],
  locked = false,
  onSave, // (payload)=>void
}) {
  const [invId, setInvId] = useState("");
  const [qty, setQty] = useState(1);
  const [type, setType] = useState("Broken");
  const [charge, setCharge] = useState("");
  const [status, setStatus] = useState("Pending");
  const [desc, setDesc] = useState("");

  useEffect(() => {
    if (!open) return;
    setInvId("");
    setQty(1);
    setType("Broken");
    setCharge("");
    setStatus("Pending");
    setDesc("");
  }, [open, transId]);

  const selected = useMemo(
    () => items.find((x) => String(x.inv_id) === String(invId)),
    [items, invId]
  );
  const stock = Number(selected?.quantity || 0);

  function clampQty(v) {
    const n = Math.max(1, Math.floor(Number(v || 1)));
    return stock ? Math.min(n, stock) : n;
  }

  function handleSave() {
    onSave?.({
      trans_id: transId,
      inv_id: invId,
      qty: Number(qty),
      damage_type: type,
      charge_amount: Number(charge || 0),
      status,
      description: desc,
    });
  }

  if (!open) return null;

  return (
    <div
      className={`gd-overlay ${open ? "show" : ""}`}
      onClick={(e) => e.target.classList.contains("gd-overlay") && onClose?.()}
    >
      <div className="gd-modal" role="dialog" aria-modal="true" aria-label="Guest Damage">
        <button className="gd-x" type="button" onClick={onClose}>✕</button>

        <div className="gd-head">
          <h2>Report Guest Damage</h2>
          <p className="gd-sub">
            Transaction <b>#{transId || "—"}</b>
            {guestName ? <> • Guest: <b>{guestName}</b></> : null}
            {roomNumber ? <> • Room: <b>{roomNumber}</b></> : null}
          </p>

          {locked ? <div className="gd-lock">Locked: This transaction is already paid.</div> : null}
        </div>

        <div className="gd-body">
          <div className="gd-grid">
            <label className="gd-field">
              <span>Damaged Item</span>
              <select value={invId} onChange={(e) => setInvId(e.target.value)} disabled={locked}>
                <option value="">Select item</option>
                {items.map((it) => (
                  <option key={it.inv_id} value={it.inv_id}>
                    {it.item_name} (stock: {it.quantity})
                  </option>
                ))}
              </select>
            </label>

            <label className="gd-field">
              <span>Damage Type</span>
              <select value={type} onChange={(e) => setType(e.target.value)} disabled={locked}>
                <option>Broken</option>
                <option>Missing</option>
                <option>Stained</option>
                <option>Other</option>
              </select>
            </label>

            <label className="gd-field">
              <span>Quantity</span>
              <div className="gd-stepper">
                <button type="button" onClick={() => setQty((p) => Math.max(1, p - 1))} disabled={locked || !invId}>
                  −
                </button>
                <input
                  type="number"
                  min="1"
                  value={qty}
                  onChange={(e) => setQty(clampQty(e.target.value))}
                  disabled={locked || !invId}
                />
                <button
                  type="button"
                  onClick={() => setQty((p) => clampQty(p + 1))}
                  disabled={locked || !invId || (stock ? qty >= stock : false)}
                >
                  +
                </button>
              </div>
              <small className="gd-hint">
                {invId ? `Available stock: ${stock}` : "Pick an item first"}
              </small>
            </label>

            <label className="gd-field">
              <span>Charge Amount (₱)</span>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={charge}
                onChange={(e) => setCharge(e.target.value)}
                disabled={locked}
              />
              <small className="gd-hint">This will appear in the guest receipt.</small>
            </label>

            <label className="gd-field">
              <span>Status</span>
              <select value={status} onChange={(e) => setStatus(e.target.value)} disabled={locked}>
                <option>Pending</option>
                <option>Paid</option>
                <option>Waived</option>
              </select>
            </label>

            <label className="gd-field gd-wide">
              <span>Description (optional)</span>
              <textarea
                rows={3}
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Short notes about what happened"
                disabled={locked}
              />
            </label>
          </div>

          <div className="gd-actions">
            <button className="gd-btn gd-secondary" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="gd-btn gd-primary" type="button" onClick={handleSave} disabled={locked || !invId}>
              Save Damage Fee
            </button>
          </div>

          <div className="gd-footnote">
            Note: Guest damages affect the receipt totals. Employee damages should be recorded under Profile.
          </div>
        </div>
      </div>
    </div>
  );
}