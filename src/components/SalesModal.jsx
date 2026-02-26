import { useEffect, useMemo, useState } from "react";
import "./SalesModal.css";
import { apiFetch } from "../lib/api";

export default function SalesModal({
  open,
  onClose,
  transId = "",
  guestName = "",
  userId = null,
  items = [],
  onSaved,
}) {
  const normalizedItems = useMemo(() => {
    return (Array.isArray(items) ? items : []).map((x) => ({
      inv_id: x.inv_id,
      name: x.item_name,
      qtyAvailable: Number(x.quantity || 0),
    }));
  }, [items]);

  const first = normalizedItems[0]?.inv_id ?? "";
  const [invId, setInvId] = useState(String(first));
  const [qty, setQty] = useState(1);
  const [unitCost, setUnitCost] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setInvId(String(first || ""));
    setQty(1);
    setUnitCost("");
  }, [open, first]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const selected = normalizedItems.find((x) => String(x.inv_id) === String(invId));

  const subtotal = useMemo(() => {
    const c = Number(unitCost || 0);
    const q = Number(qty || 0);
    return (c * q).toFixed(2);
  }, [unitCost, qty]);

  if (!open) return null;

  async function submit(e) {
    e.preventDefault();

    const q = Number(qty || 0);
    const c = Number(unitCost || 0);

    if (!transId) return alert("Missing transaction.");
    if (!userId) return alert("Missing userId (staff).");
    if (!invId) return alert("Please choose an item.");
    if (q <= 0) return alert("Quantity must be at least 1.");
    if (Number.isNaN(c) || c < 0) return alert("Unit cost must be 0 or higher.");
    if (selected && q > selected.qtyAvailable) return alert("Not enough stock.");

    setSaving(true);
    try {
      await apiFetch("/purchased", {
        method: "POST",
        body: JSON.stringify({
          trans_id: Number(transId),
          user_id: Number(userId),
          inv_id: Number(invId),
          quantity: Number(q),
          unit_cost: Number(c),
        }),
      });

      onSaved?.();
      onClose?.();
    } catch (err) {
      alert(err?.message || "Failed to save purchased item");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="sales-overlay show"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="sales-card" role="dialog" aria-modal="true" aria-label="Purchased Items">
        <button className="sales-close" type="button" onClick={onClose} aria-label="Close">
          ✕
        </button>

        <h2 className="sales-title">Purchased Items</h2>

        <form className="sales-grid" onSubmit={submit}>
          <label className="sfield">
            <span>Transaction ID</span>
            <input value={transId} readOnly />
          </label>

          <label className="sfield">
            <span>Guest</span>
            <input value={guestName} readOnly />
          </label>

          <label className="sfield">
            <span>Item</span>
            <select value={invId} onChange={(e) => setInvId(e.target.value)} required>
              {normalizedItems.length === 0 ? (
                <option value="">No inventory available</option>
              ) : (
                normalizedItems.map((x) => (
                  <option key={x.inv_id} value={x.inv_id}>
                    {x.name} (stock: {x.qtyAvailable})
                  </option>
                ))
              )}
            </select>
          </label>

          <label className="sfield">
            <span>Quantity</span>
            <input
              type="number"
              min="1"
              step="1"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
          </label>

          <label className="sfield">
            <span>Unit Cost</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={unitCost}
              onChange={(e) => setUnitCost(e.target.value)}
              placeholder="0.00"
              required
            />
          </label>

          <label className="sfield">
            <span>Subtotal</span>
            <input value={subtotal} readOnly />
          </label>

          <div className="sales-actions" style={{ gridColumn: "1 / -1" }}>
            <button type="button" className="sbtn ghost" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="sbtn primary" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}