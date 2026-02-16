import { useEffect, useMemo, useState } from "react";
import "./ItemModal.css";

function nextId(existingIds = []) {
  // existingIds like ["I0001","I0002"]
  let max = 0;
  for (const id of existingIds) {
    const n = parseInt(String(id).replace(/^I/i, ""), 10);
    if (!Number.isNaN(n)) max = Math.max(max, n);
  }
  return `I${String(max + 1).padStart(4, "0")}`;
}

export default function ItemModal({ open, onClose, existingIds = [], onSave }) {
  const invId = useMemo(() => nextId(existingIds), [existingIds]);

  const [form, setForm] = useState({
    inv_id: invId,
    quantity: "",
    name: "",
    category: "",
    type: "",
    standard_cost: "",
  });

  // update inv_id when modal opens / ids change
  useEffect(() => {
    if (!open) return;
    setForm((prev) => ({ ...prev, inv_id: invId }));
  }, [open, invId]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    onSave?.({
      ...form,
      quantity: Number(form.quantity),
      standard_cost: Number(form.standard_cost),
    });
    onClose?.();
    setForm({
      inv_id: invId,
      quantity: "",
      name: "",
      category: "",
      type: "",
      standard_cost: "",
    });
  };

  return (
    <div className="imodal-overlay show" role="presentation" onMouseDown={(e) => {
      if (e.target === e.currentTarget) onClose?.();
    }}>
      <div className="imodal-card" role="dialog" aria-modal="true" aria-labelledby="itemModalTitle">
        <button className="imodal-close" type="button" onClick={onClose} aria-label="Close">✕</button>

        <div className="imodal-head">
          <h2 id="itemModalTitle">New Inventory Item</h2>
          <p className="imodal-sub">Add a new stock item</p>
        </div>

        <form className="imodal-form" onSubmit={submit}>
          <div className="igrid-2">
            <label className="ifield">
              <span>Inventory ID</span>
              <input value={form.inv_id} readOnly />
            </label>

            <label className="ifield">
              <span>Quantity</span>
              <input type="number" min="0" step="1" value={form.quantity} onChange={set("quantity")} required />
            </label>
          </div>

          <label className="ifield">
            <span>Name</span>
            <input value={form.name} onChange={set("name")} required />
          </label>

          <div className="igrid-2">
            <label className="ifield">
              <span>Category</span>
              <input value={form.category} onChange={set("category")} required />
            </label>

            <label className="ifield">
              <span>Type</span>
              <input value={form.type} onChange={set("type")} required />
            </label>
          </div>

          <label className="ifield">
            <span>Standard Cost</span>
            <input type="number" min="0" step="0.01" value={form.standard_cost} onChange={set("standard_cost")} required />
          </label>

          <div className="imodal-actions">
            <button className="ibtn ghost" type="button" onClick={onClose}>Cancel</button>
            <button className="ibtn primary" type="submit">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
}
