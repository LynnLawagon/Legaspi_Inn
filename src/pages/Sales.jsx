import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";
import "./Sales.css";

function fmtMoney(n) {
  const v = Number(n || 0);
  return `₱${v.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function toISODate(d) {
  if (!d) return "";
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return "";
  const yyyy = x.getFullYear();
  const mm = String(x.getMonth() + 1).padStart(2, "0");
  const dd = String(x.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function todayISO() {
  return toISODate(new Date());
}

export default function Sales() {
  const [q, setQ] = useState("");
  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState(todayISO());

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);

  const [selected, setSelected] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsRows, setDetailsRows] = useState([]);

  async function loadSales() {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (from) qs.set("from", from);
      if (to) qs.set("to", to);

      const data = await apiFetch(`/sales?${qs.toString()}`);
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setRows([]);
      alert(e.message || "Failed to load sales");
    } finally {
      setLoading(false);
    }
  }

  async function loadDetails(transId) {
    setDetailsLoading(true);
    try {
      const data = await apiFetch(`/sales/transaction/${transId}/details`);
      setDetailsRows(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setDetailsRows([]);
      alert(e.message || "Failed to load sales details");
    } finally {
      setDetailsLoading(false);
    }
  }

  useEffect(() => {
    loadSales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;

    return rows.filter((r) =>
      `${r.guest_name || ""} ${r.room_number || ""} ${r.username || ""} ${r.trans_id || ""}`
        .toLowerCase()
        .includes(s)
    );
  }, [rows, q]);

  const totals = useMemo(() => {
    const count = filtered.length;
    const items = filtered.reduce((sum, r) => sum + Number(r.items_count || 0), 0);
    const amount = filtered.reduce((sum, r) => sum + Number(r.total_amount || 0), 0);
    return { count, items, amount };
  }, [filtered]);

  function openDetails(row) {
    setSelected(row);
    setDetailsOpen(true);
    loadDetails(row.trans_id);
  }

  function closeDetails() {
    setDetailsOpen(false);
    setSelected(null);
    setDetailsRows([]);
  }

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape" && detailsOpen) closeDetails();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [detailsOpen]);

  return (
    <div className="sales-page">
      <div className="sales-header">
        <div className="page-header">
          <h1 className="page-title">Sales</h1>

          <div className="page-actions">
            <label className="page-date page-search">
              <span>&nbsp;</span>
              <div className="search-wrap">
                <img src="/assets/images/search.png" alt="search" />
                <input
                  type="text"
                  placeholder="Search guest / room / employee / transaction..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
            </label>

            <div className="page-filters">
              <label className="page-date">
                <span>From</span>
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              </label>

              <label className="page-date">
                <span>To</span>
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </label>

              <button className="page-apply" type="button" onClick={loadSales} disabled={loading}>
                Apply
              </button>
            </div>
          </div>
        </div>

        <div className="sales-kpis">
          <span className="sales-chip">Total Revenue: {fmtMoney(totals.amount)}</span>
          <span className="sales-chip ghost">Records: {totals.count}</span>
          <span className="sales-chip ghost">Purchased Items: {totals.items}</span>
        </div>
      </div>

      <section className="sales-card">
        <div className="sales-table-wrap">
          <table className="sales-table">
            <thead>
              <tr>
                <th>Transaction</th>
                <th className="th-left">Guest</th>
                <th>Room</th>
                <th>Employee</th>
                <th>Date</th>
                <th className="th-right">Items</th>
                <th className="th-right">Room</th>
                <th className="th-right">Damage</th>
                <th className="th-right">Purchased</th>
                <th className="th-right">Total</th>
                <th>View</th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td colSpan={11} className="sales-empty">
                    Loading...
                  </td>
                </tr>
              )}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={11} className="sales-empty">
                    No sales found.
                  </td>
                </tr>
              )}

              {!loading &&
                filtered.map((r) => (
                  <tr key={r.trans_id}>
                    <td className="td-mono">T{r.trans_id}</td>
                    <td className="td-left" title={r.guest_name || ""}>
                      {r.guest_name || "—"}
                    </td>
                    <td>{r.room_number || "—"}</td>
                    <td>{r.username || "—"}</td>
                    <td className="td-mono">{r.sale_date ? String(r.sale_date).slice(0, 10) : "—"}</td>
                    <td className="td-right">{Number(r.items_count || 0).toLocaleString()}</td>
                    <td className="td-right">{fmtMoney(r.room_amount || 0)}</td>
                    <td className="td-right">{fmtMoney(r.damage_amount || 0)}</td>
                    <td className="td-right">{fmtMoney(r.purchased_amount || 0)}</td>
                    <td className="td-right">{fmtMoney(r.total_amount || 0)}</td>
                    <td className="td-center">
                      <button className="sales-view" type="button" onClick={() => openDetails(r)}>
                        View
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>

      {detailsOpen ? (
        <div className="sd-overlay show" onClick={(e) => e.target.classList.contains("sd-overlay") && closeDetails()}>
          <div className="sd-card" role="dialog" aria-modal="true" aria-label="Sales Details">
            <button className="sd-close" type="button" onClick={closeDetails} aria-label="Close">
              ✕
            </button>

            <div className="sd-head">
              <div>
                <h2>Purchased Item Details</h2>
                <p className="sd-sub">
                  Transaction <b className="td-mono">T{selected?.trans_id ?? "—"}</b>
                  {selected?.guest_name ? (
                    <>
                      <span className="sd-dot">•</span> Guest <b>{selected.guest_name}</b>
                    </>
                  ) : null}
                </p>
              </div>

              <div className="sd-kpis">
                <span className="sd-chip">Purchased: {fmtMoney(selected?.purchased_amount || 0)}</span>
                <span className="sd-chip">Items: {Number(selected?.items_count || 0)}</span>
              </div>
            </div>

            <div className="sd-divider" />

            <div className="sd-table-wrap">
              <table className="sd-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th className="t-center">Qty</th>
                    <th className="t-right">Unit Price</th>
                    <th className="t-right">Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {detailsLoading ? (
                    <tr>
                      <td colSpan={4} className="sd-loading">
                        Loading...
                      </td>
                    </tr>
                  ) : detailsRows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="sd-empty">
                        No purchased items found for this transaction.
                      </td>
                    </tr>
                  ) : (
                    detailsRows.map((d) => (
                      <tr key={d.sd_id ?? `${d.inv_id}-${d.unit_price_sold}-${d.quantity}`}>
                        <td className="t-left" title={d.item_name || ""}>
                          {d.item_name || `INV-${d.inv_id}`}
                        </td>
                        <td className="t-center">{Number(d.quantity || 0)}</td>
                        <td className="t-right">{fmtMoney(d.unit_price_sold || 0)}</td>
                        <td className="t-right">
                          {fmtMoney(Number(d.quantity || 0) * Number(d.unit_price_sold || 0))}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="sd-actions">
              <button className="sd-btn" type="button" onClick={closeDetails}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}