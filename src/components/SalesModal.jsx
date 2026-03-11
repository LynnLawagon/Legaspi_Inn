import { useMemo, useState, useEffect } from "react";
import { apiFetch } from "../lib/api";
import "./SalesModal.css";

export default function SalesModal({
  open,
  onClose,
  transId,
  guestName,
  roomNumber = "",
  items = [],
  locked = false,
  userId = null,
  onSave,
}) {
  const [invId, setInvId] = useState("");
  const [qty, setQty] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [note, setNote] = useState("");
  const [cart, setCart] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setInvId("");
    setQty(1);
    setUnitPrice(0);
    setNote("");
    setCart([]);
    setSaving(false);
  }, [open, transId]);

  const selected = useMemo(
    () => items.find((x) => String(x.inv_id) === String(invId)),
    [items, invId]
  );

  const stock = Number(selected?.quantity || 0);

  useEffect(() => {
    if (!selected) return;
    const p = Number(selected.item_value ?? selected.unit_price ?? selected.price ?? 0);
    setUnitPrice(p);
    setQty(1);
  }, [selected]);

  const subtotal = Number(qty || 0) * Number(unitPrice || 0);

  const salesTotal = useMemo(
    () => cart.reduce((sum, r) => sum + Number(r.qty) * Number(r.unitPrice), 0),
    [cart]
  );

  function clampQty(v) {
    const n = Math.max(1, Math.floor(Number(v || 1)));
    return stock ? Math.min(n, stock) : n;
  }

  function addToCart() {
    if (!selected) return;

    const safeQty = clampQty(qty);
    if (!Number.isFinite(safeQty) || safeQty <= 0) return;
    if (stock && safeQty > stock) return;

    setCart((prev) => {
      const existing = prev.find((x) => Number(x.inv_id) === Number(selected.inv_id));
      if (existing) {
        return prev.map((x) =>
          Number(x.inv_id) === Number(selected.inv_id)
            ? {
                ...x,
                qty: x.qty + safeQty,
              }
            : x
        );
      }

      return [
        ...prev,
        {
          id: crypto.randomUUID(),
          inv_id: selected.inv_id,
          name: selected.item_name,
          qty: safeQty,
          unitPrice: Number(unitPrice || 0),
        },
      ];
    });

    setInvId("");
    setQty(1);
    setUnitPrice(0);
  }

  function removeLine(id) {
    setCart((prev) => prev.filter((x) => x.id !== id));
  }

  async function handleFinalSave() {
    if (!transId || !userId || cart.length === 0) return;

    setSaving(true);
    try {
      await apiFetch("/sales", {
        method: "POST",
        body: JSON.stringify({
          trans_id: Number(transId),
          user_id: Number(userId),
          items: cart.map((r) => ({
            inv_id: Number(r.inv_id),
            quantity: Number(r.qty),
          })),
          note,
        }),
      });

      await onSave?.({
        trans_id: transId,
        cart,
        note,
      });

      onClose?.();
    } catch (e) {
      alert(e.message || "Failed to save sale");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className={`li-overlay ${open ? "show" : ""}`}
      onClick={(e) => e.target.classList.contains("li-overlay") && onClose?.()}
    >
      <div className="li-modal" role="dialog" aria-modal="true" aria-label="Additional Sales">
        <button className="li-x" type="button" onClick={onClose}>
          ✕
        </button>

        <div className="li-head">
          <h2>Additional Sales</h2>
          <p className="li-sub">
            Transaction <b>#{transId || "—"}</b>
            {guestName ? (
              <>
                {" "}
                • Guest: <b>{guestName}</b>
              </>
            ) : null}
            {roomNumber ? (
              <>
                {" "}
                • Room: <b>{roomNumber}</b>
              </>
            ) : null}
          </p>

          {locked ? <div className="li-lock">Locked: This transaction is already paid.</div> : null}
        </div>

        <div className={`li-body ${locked ? "locked" : ""}`}>
          <div className="li-left">
            <label className="li-field">
              <span>Item</span>
              <select value={invId} onChange={(e) => setInvId(e.target.value)} disabled={locked}>
                <option value="">Select item</option>
                {items.map((it) => (
                  <option key={it.inv_id} value={it.inv_id}>
                    {it.item_name} (stock: {it.quantity})
                  </option>
                ))}
              </select>
            </label>

            <div className="li-row2">
              <label className="li-field">
                <span>Quantity</span>
                <div className="li-stepper">
                  <button
                    type="button"
                    onClick={() => setQty((p) => Math.max(1, p - 1))}
                    disabled={locked || !invId}
                  >
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
                {invId ? (
                  <small className="li-hint">Available stock: {stock}</small>
                ) : (
                  <small className="li-hint">Pick an item first</small>
                )}
              </label>

              <label className="li-field">
                <span>Unit Price</span>
                <input
                  type="text"
                  value={unitPrice ? `₱${unitPrice.toFixed(2)}` : "₱0.00"}
                  readOnly
                />
                <small className="li-hint">Auto-filled from inventory</small>
              </label>
            </div>

            <label className="li-field">
              <span>Subtotal</span>
              <input type="text" value={`₱${subtotal.toFixed(2)}`} readOnly />
            </label>

            <label className="li-field">
              <span>Notes (optional)</span>
              <textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g., Late night snacks"
                disabled={locked}
              />
            </label>

            <button
              className="li-btn li-primary"
              type="button"
              onClick={addToCart}
              disabled={locked || !invId || !qty}
            >
              Add item
            </button>
          </div>

          <div className="li-right">
            <div className="li-card">
              <div className="li-card-top">
                <h3>Sales Cart</h3>
                <span className="li-pill">{cart.length} item(s)</span>
              </div>

              <div className="li-table">
                {cart.length === 0 ? (
                  <div className="li-empty">No items added yet.</div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th className="t-center">Qty</th>
                        <th className="t-right">Total</th>
                        <th className="t-center"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {cart.map((r) => (
                        <tr key={r.id}>
                          <td className="t-left">
                            <div className="li-itemname">{r.name}</div>
                            <div className="li-muted">₱{Number(r.unitPrice).toFixed(2)} each</div>
                          </td>
                          <td className="t-center">{r.qty}</td>
                          <td className="t-right">
                            ₱{(Number(r.qty) * Number(r.unitPrice)).toFixed(2)}
                          </td>
                          <td className="t-center">
                            <button
                              className="li-icon"
                              type="button"
                              onClick={() => removeLine(r.id)}
                              disabled={locked || saving}
                              title="Remove"
                            >
                              🗑
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="li-total">
                <span>Total</span>
                <b>₱{salesTotal.toFixed(2)}</b>
              </div>

              <div className="li-actions">
                <button className="li-btn li-secondary" type="button" onClick={onClose}>
                  Cancel
                </button>
                <button
                  className="li-btn li-primary"
                  type="button"
                  onClick={handleFinalSave}
                  disabled={locked || cart.length === 0 || saving}
                >
                  {saving ? "Saving..." : "Save Sale"}
                </button>
              </div>

              <div className="li-footnote">
                Tip: Items added here will reflect in the transaction sales total.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}