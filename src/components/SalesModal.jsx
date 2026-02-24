import { useEffect, useMemo, useState } from "react";
import "./SalesModal.css";

const API_BASE = "http://localhost:5000/api";

/**
 * RECOMMENDED items shape from backend:
 * items = [{ inv_id, item_name, unit_cost }]
 *
 * But will also accept:
 * items = [{ name, cost }]
 */
export default function SalesModal({
  open,
  onClose,
  transId = "",
  guestName = "",
  userId = null, // ✅ pass logged-in user_id here (required for purchased.user_id)
  items = [],
  onSave, // optional callback (kept)
}) {
  const normalizedItems = useMemo(() => {
    return (Array.isArray(items) ? items : []).map((x) => ({
      inv_id: x.inv_id ?? x.id ?? null,
      name: x.item_name ?? x.name ?? "",
      cost: x.unit_cost ?? x.cost ?? "",
    }));
  }, [items]);

  const firstItemName = normalizedItems[0]?.name || "";

  const [itemName, setItemName] = useState(firstItemName);
  const [cost, setCost] = useState(normalizedItems[0]?.cost ?? "");
  const [qty, setQty] = useState(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setItemName(firstItemName);
    setCost(normalizedItems.find((x) => x.name === firstItemName)?.cost ?? "");
    setQty(1);
  }, [open, firstItemName, normalizedItems]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const subtotal = useMemo(() => {
    const c = Number(cost || 0);
    const q = Number(qty || 0);
    return (c * q).toFixed(2);
  }, [cost, qty]);

  if (!open) return null;

  const onItemChange = (e) => {
    const v = e.target.value;
    setItemName(v);
    const found = normalizedItems.find((x) => x.name === v);
    if (found) setCost(found.cost);
  };

  async function submit(e) {
    e.preventDefault();

    const c = Number(cost || 0);
    const q = Number(qty || 0);

    if (!transId || !guestName || !itemName || q <= 0 || c < 0) {
      alert("Please complete the fields.");
      return;
    }

    if (!userId) {
      alert("Missing userId. Pass userId prop to SalesModal (logged-in user_id).");
      return;
    }

    const selected = normalizedItems.find((x) => x.name === itemName);
    const inv_id = selected?.inv_id;

    if (!inv_id) {
      alert(
        "Missing inv_id for this item. Please load items from DB with inv_id (recommended)."
      );
      return;
    }

    setSaving(true);
    try {
      // ✅ SAVE TO DB: purchased + purchased_details
      const res = await fetch(`${API_BASE}/purchased`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trans_id: Number(transId),
          user_id: Number(userId),
          inv_id: Number(inv_id),
          quantity: Number(q),
          unit_cost: Number(c),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.message || "Failed to save purchased item");
        setSaving(false);
        return;
      }

      // ✅ optional: let parent update UI state
      onSave?.({
        trans_id: transId,
        guest: guestName,
        inv_id,
        item: itemName,
        qty: q,
        cost: Number(c.toFixed(2)),
        subtotal: Number((c * q).toFixed(2)),
        date: new Date().toISOString(),
      });

      onClose?.();
    } catch (err) {
      console.error(err);
      alert("Network error saving purchased item");
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
      <div className="sales-card" role="dialog" aria-modal="true" aria-label="Sales modal">
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
            <select value={itemName} onChange={onItemChange} required>
              {normalizedItems.map((x) => (
                <option key={`${x.inv_id ?? "x"}-${x.name}`} value={x.name}>
                  {x.name}
                </option>
              ))}
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
            <span>Cost</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
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