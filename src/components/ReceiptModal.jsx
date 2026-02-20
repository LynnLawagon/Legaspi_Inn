import { useMemo } from "react";

const SALES_KEY = "purchased_by_trans"; // same key nimo

function money(n) {
  const num = Number(n || 0);
  return num.toFixed(2);
}

function splitToDisplayParts(dtLocal) {
  if (!dtLocal) return { date: "—", time: "" };
  const d = new Date(dtLocal);
  if (Number.isNaN(d.getTime())) {
    const [date, time] = String(dtLocal).split("T");
    return { date: (date || "—").replaceAll("-", "/"), time: (time || "").slice(0, 8) };
  }
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return { date: `${yyyy}/${mm}/${dd}`, time: `${hh}:${mi}:${ss}` };
}

export default function ReceiptModal({
  open,
  onClose,
  tx, // receiptTarget object
  processedBy = "",
}) {
  const sales = useMemo(() => {
    if (!tx?.trans_id) return [];
    try {
      const data = JSON.parse(localStorage.getItem(SALES_KEY) || "{}");
      const list = Array.isArray(data[tx.trans_id]) ? data[tx.trans_id] : [];
      // normalize: { name, quantity, unit_cost } or { itemName, qty, unitCost }
      return list.map((s) => ({
        name: s.name || s.itemName || "Item",
        qty: Number(s.qty ?? s.quantity ?? 1),
        unit: Number(s.unit_cost ?? s.unitCost ?? s.cost ?? 0),
      }));
    } catch {
      return [];
    }
  }, [tx?.trans_id]);

  const checkIn = splitToDisplayParts(tx?.checkin);
  const checkOut = splitToDisplayParts(tx?.checkout);

  const roomCharge = Number(tx?.amount || 0); // for now: imong amount = room charge
  const salesTotal = sales.reduce((sum, it) => sum + it.qty * it.unit, 0);
  const damageTotal = 0; // placeholder (pwede nato i-connect later sa guest_damage)
  const grandTotal = roomCharge + salesTotal + damageTotal;

  if (!open) return null;

  return (
    <div
      className="receipt-overlay show"
      onClick={(e) => {
        if (e.target.classList.contains("receipt-overlay")) onClose?.();
      }}
      aria-hidden="false"
    >
      <div className="receipt-card" role="dialog" aria-modal="true" aria-label="Receipt">
  <div className="receipt-shell">
    <button className="receipt-close" type="button" onClick={onClose}>
      ✕
    </button>
          <h1 className="receipt-title">RECEIPT</h1>

          {/* top info row */}
          <div className="receipt-top">
            <div>
              <div className="r-label">Guest Name</div>
              <div className="r-value">{tx?.guest_name || "—"}</div>
            </div>

          </div>

          <div className="r-divider" />

          {/* checkin/out */}
          <div className="receipt-block">
            <div className="r-label">Check-in</div>
            <div className="r-value">{checkIn.date} {checkIn.time ? checkIn.time : ""}</div>

            <div style={{ height: 12 }} />

            <div className="r-label">Check-out</div>
            <div className="r-value">{checkOut.date} {checkOut.time ? checkOut.time : ""}</div>
          </div>

          <div className="r-divider" />

          {/* charges */}
          <div className="receipt-block">
            <div className="r-section">Room Charge</div>

            <div className="r-row">
              <div className="r-item">
                {tx?.room_type ? `${tx.room_type} – R${tx.room_num}` : `Room – R${tx?.room_num || "—"}`}
              </div>
              <div className="r-amt">{money(roomCharge)}</div>
            </div>

            <div style={{ height: 14 }} />

            <div className="r-section">Additional Sales</div>

            {sales.length === 0 ? (
              <div className="r-row">
                <div className="r-item muted">None</div>
                <div className="r-amt">{money(0)}</div>
              </div>
            ) : (
              <>
                {sales.map((it, idx) => (
                  <div className="r-row" key={idx}>
                    <div className="r-item">{it.qty} {it.name}</div>
                    <div className="r-amt">{money(it.qty * it.unit)}</div>
                  </div>
                ))}
              </>
            )}

            <div style={{ height: 14 }} />

            <div className="r-section">Damage Fees</div>
            <div className="r-row">
              <div className="r-item">{damageTotal > 0 ? "Reported Damages" : "None"}</div>
              <div className="r-amt">{money(damageTotal)}</div>
            </div>

            <div className="r-divider" style={{ marginTop: 16 }} />

            <div className="r-row total">
              <div className="r-item">Total</div>
              <div className="r-amt">{money(grandTotal)}</div>
            </div>

            <div className="r-footer">
              <div>
                <div className="r-label">Processed By:</div>
              </div>
              <div className="r-right">
                <div className="r-value">{processedBy || tx?.username || "—"}</div>
              </div>
            </div>
          </div>

          {/* actions */}
          <div className="receipt-actions">
            <button className="rbtn ghost" type="button" onClick={onClose}>
              Back
            </button>
            <button
              className="rbtn primary"
              type="button"
              onClick={() => {
                // pwede ka mag add logic diri (ex: mark paid, print, etc.)
                onClose?.();
              }}
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}