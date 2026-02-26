import { useEffect, useMemo, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { apiFetch } from "../lib/api";

function money(n) {
  return Number(n || 0).toFixed(2);
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

export default function ReceiptModal({ open, onClose, tx, processedBy = "" }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!open || !tx?.trans_id) return;
    apiFetch(`/purchased/by-transaction/${tx.trans_id}`)
      .then(setItems)
      .catch(() => setItems([]));
  }, [open, tx?.trans_id]);

  const checkIn = splitToDisplayParts(tx?.checkin);
  const checkOut = splitToDisplayParts(tx?.checkout);

  const roomCharge = Number(tx?.actual_rate_charged || 0);
  const salesTotal = useMemo(
    () => items.reduce((s, it) => s + Number(it.quantity) * Number(it.unit_cost), 0),
    [items]
  );
  const damageTotal = 0;
  const grandTotal = roomCharge + salesTotal + damageTotal;

  if (!open) return null;

  async function exportPdf() {
    const el = document.getElementById("receipt-area");
    if (!el) return;

    const canvas = await html2canvas(el, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");
    const w = pdf.internal.pageSize.getWidth();
    const h = pdf.internal.pageSize.getHeight();
    const imgW = w;
    const imgH = (canvas.height * imgW) / canvas.width;

    let y = 0;
    let remaining = imgH;

    while (remaining > 0) {
      pdf.addImage(imgData, "PNG", 0, y, imgW, imgH);
      remaining -= h;
      y -= h;
      if (remaining > 0) pdf.addPage();
    }

    pdf.save(`receipt-${tx?.trans_id || Date.now()}.pdf`);
  }

  return (
    <div className="receipt-overlay show" onClick={(e) => e.target.classList.contains("receipt-overlay") && onClose?.()}>
      <div className="receipt-card" role="dialog" aria-modal="true">
        <div className="receipt-shell" id="receipt-area">
          <button className="receipt-close" type="button" onClick={onClose}>✕</button>

          <h1 className="receipt-title">RECEIPT</h1>

          <div className="receipt-top">
            <div>
              <div className="r-label">Guest Name</div>
              <div className="r-value">{tx?.guest_name || "—"}</div>
            </div>
          </div>

          <div className="r-divider" />

          <div className="receipt-block">
            <div className="r-label">Check-in</div>
            <div className="r-value">{checkIn.date} {checkIn.time}</div>

            <div style={{ height: 12 }} />

            <div className="r-label">Check-out</div>
            <div className="r-value">{checkOut.date} {checkOut.time}</div>
          </div>

          <div className="r-divider" />

          <div className="receipt-block">
            <div className="r-section">Room Charge</div>
            <div className="r-row">
              <div className="r-item">Room {tx?.room_number || "—"}</div>
              <div className="r-amt">{money(roomCharge)}</div>
            </div>

            <div style={{ height: 14 }} />

            <div className="r-section">Additional Sales</div>

            {items.length === 0 ? (
              <div className="r-row">
                <div className="r-item muted">None</div>
                <div className="r-amt">{money(0)}</div>
              </div>
            ) : (
              items.map((it) => (
                <div className="r-row" key={it.pd_id}>
                  <div className="r-item">{it.quantity} {it.item_name}</div>
                  <div className="r-amt">{money(Number(it.quantity) * Number(it.unit_cost))}</div>
                </div>
              ))
            )}

            <div style={{ height: 14 }} />

            <div className="r-section">Damage Fees</div>
            <div className="r-row">
              <div className="r-item">None</div>
              <div className="r-amt">{money(damageTotal)}</div>
            </div>

            <div className="r-divider" style={{ marginTop: 16 }} />

            <div className="r-row total">
              <div className="r-item">Total</div>
              <div className="r-amt">{money(grandTotal)}</div>
            </div>

            <div className="r-footer">
              <div className="r-label">Processed By:</div>
              <div className="r-value">{processedBy || tx?.username || "—"}</div>
            </div>
          </div>
        </div>

        <div className="receipt-actions">
          <button className="rbtn ghost" type="button" onClick={onClose}>Back</button>
          <button className="rbtn primary" type="button" onClick={exportPdf}>Export PDF</button>
        </div>
      </div>
    </div>
  );
}