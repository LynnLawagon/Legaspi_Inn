import { useEffect, useMemo, useState } from "react";
import "./SalesModal.css";

export default function SalesModal({
  open,
  onClose,
  transId = "",
  guestName = "",
  items = [], // [{name:"Soap", cost:70}, ...]
  onSave,
}) {
  const firstItem = items[0]?.name || "";

  const [item, setItem] = useState(firstItem);
  const [cost, setCost] = useState(items[0]?.cost ?? "");
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (!open) return;
    setItem(firstItem);
    setCost(items.find((x) => x.name === firstItem)?.cost ?? "");
    setQty(1);
  }, [open, firstItem, items]);

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
    setItem(v);
    const found = items.find((x) => x.name === v);
    if (found) setCost(found.cost);
  };

  const submit = (e) => {
    e.preventDefault();
    const c = Number(cost || 0);
    const q = Number(qty || 0);
    if (!transId || !guestName || !item || q <= 0 || c < 0) return;

    onSave?.({
      trans_id: transId,
      guest: guestName,
      item,
      qty: q,
      cost: Number(c.toFixed(2)),
      subtotal: Number((c * q).toFixed(2)),
      date: new Date().toISOString(),
    });

    onClose?.();
  };

  return (
    <div className="sales-overlay show" role="presentation" onMouseDown={(e) => {
      if (e.target === e.currentTarget) onClose?.();
    }}>
      <div className="sales-card" role="dialog" aria-modal="true" aria-label="Sales modal">
        <button className="sales-close" type="button" onClick={onClose} aria-label="Close">✕</button>

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
            <select value={item} onChange={onItemChange} required>
              {items.map((x) => (
                <option key={x.name} value={x.name}>{x.name}</option>
              ))}
            </select>
          </label>

          <label className="sfield">
            <span>Quantity</span>
            <input type="number" min="1" step="1" value={qty} onChange={(e) => setQty(e.target.value)} />
          </label>

          <label className="sfield">
            <span>Cost</span>
            <input type="number" min="0" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} />
          </label>

          <label className="sfield">
            <span>Subtotal</span>
            <input value={subtotal} readOnly />
          </label>

          <div className="sales-actions" style={{ gridColumn: "1 / -1" }}>
            <button type="button" className="sbtn ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="sbtn primary">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
}
