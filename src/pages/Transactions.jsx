import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";
import SalesModal from "../components/SalesModal";
import ReceiptModal from "../components/ReceiptModal";

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

function nowLocalIso() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 16); // datetime-local expects YYYY-MM-DDTHH:mm
}

const emptyForm = {
  guest_id: "",
  user_id: "",
  room_id: "",
  trans_status_id: "1",
  checkin: "",
  checkout: "",
  actual_rate_charged: "",
};

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [lookups, setLookups] = useState({ guests: [], users: [], rooms: [] });

  const [inventoryItems, setInventoryItems] = useState([]);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // New/Edit Transaction modal
  const [txOpen, setTxOpen] = useState(false);
  const [txForm, setTxForm] = useState(emptyForm);
  const [txSubmitting, setTxSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Receipt modal
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptTarget, setReceiptTarget] = useState(null);

  // Sales modal
  const [salesOpen, setSalesOpen] = useState(false);
  const [salesTarget, setSalesTarget] = useState({ transId: "", guest: "", userId: null });

  async function loadAll() {
    setLoading(true);
    try {
      const [txData, lookupData] = await Promise.all([
        apiFetch("/transactions"),
        apiFetch("/transactions/lookups"),
      ]);

      setTransactions(Array.isArray(txData) ? txData : []);
      setLookups({
        guests: Array.isArray(lookupData.guests) ? lookupData.guests : [],
        users: Array.isArray(lookupData.users) ? lookupData.users : [],
        rooms: Array.isArray(lookupData.rooms) ? lookupData.rooms : [], // backend filtered to Available
      });
    } catch (e) {
      console.error("Transactions load failed:", e);
      alert(e.message || "Failed to load transactions");
    } finally {
      setLoading(false);
    }
  }

  async function loadInventory() {
    try {
      const rows = await apiFetch("/inventory");
      const list = Array.isArray(rows)
        ? rows.filter((x) => Number(x.quantity || 0) > 0)
        : [];
      setInventoryItems(list);
    } catch {
      setInventoryItems([]);
    }
  }

  useEffect(() => {
    loadAll();
    loadInventory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return transactions;
    return transactions.filter((t) =>
      (t.guest_name || "").toLowerCase().includes(q) ||
      (t.username || "").toLowerCase().includes(q) ||
      (t.room_number || "").toLowerCase().includes(q)
    );
  }, [search, transactions]);

  function openTxModal(tx = null) {
    if (!tx) {
      setEditingId(null);
      setTxForm({ ...emptyForm, checkin: nowLocalIso(), checkout: nowLocalIso() });
    } else {
      setEditingId(tx.trans_id);
      setTxForm({
        guest_id: String(tx.guest_id || ""),
        user_id: String(tx.user_id || ""),
        room_id: String(tx.room_id || ""),
        trans_status_id: String(tx.trans_status_id || "1"),
        checkin: tx.checkin ? String(tx.checkin).slice(0, 16) : "",
        checkout: tx.checkout ? String(tx.checkout).slice(0, 16) : "",
        actual_rate_charged: tx.actual_rate_charged ? String(tx.actual_rate_charged) : "",
      });
    }
    setTxOpen(true);
  }

  function closeTxModal() {
    setTxOpen(false);
    setEditingId(null);
  }

  async function deleteTransaction(id) {
    if (!window.confirm("Delete this transaction?")) return;
    try {
      await apiFetch(`/transactions/${id}`, { method: "DELETE" });
      await loadAll();
    } catch (e) {
      alert(e.message || "Failed to delete transaction");
    }
  }

  async function handleTxSubmit(e) {
    e.preventDefault();

    if (txForm.checkin && txForm.checkout) {
      if (new Date(txForm.checkout) <= new Date(txForm.checkin)) {
        alert("Check-out must be after Check-in.");
        return;
      }
    }

    setTxSubmitting(true);
    try {
      const payload = {
        guest_id: Number(txForm.guest_id),
        user_id: Number(txForm.user_id),
        room_id: Number(txForm.room_id),
        trans_status_id: Number(txForm.trans_status_id) || 1,
        checkin: txForm.checkin || null,
        checkout: txForm.checkout || null,
        actual_rate_charged: txForm.actual_rate_charged
          ? Number(txForm.actual_rate_charged)
          : null,
      };

      if (editingId) {
        await apiFetch(`/transactions/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch("/transactions", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      closeTxModal();
      await loadAll();
    } catch (e) {
      alert(e.message || "Failed to save transaction");
    } finally {
      setTxSubmitting(false);
    }
  }

  function openReceiptModal(tx) {
    setReceiptTarget(tx);
    setReceiptOpen(true);
  }

  function closeReceiptModal() {
    setReceiptOpen(false);
    setReceiptTarget(null);
  }

  function openSalesModal(tx) {
    setSalesTarget({
      transId: tx.trans_id,
      guest: tx.guest_name || "",
      userId: tx.user_id || null, // uses staff on transaction as user_id
    });
    setSalesOpen(true);
  }

  function closeSalesModal() {
    setSalesOpen(false);
  }

  // auto-fill amount from selected room base_rate
  function handleRoomChange(room_id) {
    const room = lookups.rooms.find((r) => String(r.room_id) === String(room_id));
    setTxForm((p) => ({
      ...p,
      room_id,
      actual_rate_charged: room?.base_rate ? String(room.base_rate) : p.actual_rate_charged,
    }));
  }

  return (
    <>
      <header className="top-bar tx-topbar">
        <h1 className="page-title">Transactions</h1>
        <div className="tx-actions">
          <div className="search-wrap">
            <img src="/assets/images/search.png" alt="search" />
            <input
              type="text"
              placeholder="Search by Guest Name / Room"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </header>

      <section className="tx-card">
        <div className="tx-table-wrap">
          <table className="tx-table">
            <colgroup>
              <col style={{ width: "55px" }} />
              <col style={{ width: "100px" }} />
              <col style={{ width: "130px" }} />
              <col style={{ width: "110px" }} />
              <col style={{ width: "60px" }} />
              <col style={{ width: "140px" }} />
              <col style={{ width: "160px" }} />
              <col style={{ width: "90px" }} />
              <col style={{ width: "160px" }} />
              <col style={{ width: "52px" }} />
              <col style={{ width: "130px" }} />
            </colgroup>

            <thead>
              <tr>
                <th className="col-icon"></th>
                <th className="col-status"></th>
                <th>Guest Name</th>
                <th>Username</th>
                <th>Room #</th>
                <th>Check-in</th>
                <th>Check-out</th>
                <th>Amount</th>
                <th>Date Created</th>
                <th className="col-action"></th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} className="td-center" style={{ opacity: 0.7 }}>
                    Loading...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="td-center">
                    No results
                  </td>
                </tr>
              ) : (
                filtered.map((t) => {
                  const ci = splitToDisplayParts(t.checkin);
                  const co = splitToDisplayParts(t.checkout);
                  const dc = splitToDisplayParts(t.date_created);
                  const statusName = (t.trans_status_name || "unpaid").toLowerCase();
                  const isPaid = statusName === "paid";

                  return (
                    <tr key={t.trans_id} className={`tx-row ${isPaid ? "paid" : "unpaid"}`}>
                      <td className="col-icon">
                        <button
                          className="icon-btn receipt-btn"
                          type="button"
                          onClick={() => openReceiptModal(t)}
                          title="Receipt"
                        >
                          <img className="row-icon" src="/assets/images/receipt.png" alt="receipt" />
                        </button>
                      </td>

                      <td className="col-status">
                        <span className={`status-pill ${isPaid ? "paid" : "unpaid"}`}>
                          {statusName}
                        </span>
                      </td>

                      <td className="td-left">{t.guest_name}</td>
                      <td className="td-left">{t.username}</td>
                      <td>{t.room_number}</td>

                      <td className="td-center">
                        {ci.date}
                        <br />
                        <span className="muted">{ci.time}</span>
                      </td>

                      <td className="td-center">
                        {co.date}
                        <br />
                        <span className="muted">{co.time}</span>
                      </td>

                      <td>₱{Number(t.actual_rate_charged || 0).toFixed(2)}</td>

                      <td className="td-center">
                        {dc.date}
                        <br />
                        <span className="muted">{dc.time}</span>
                      </td>

                      <td className="col-action">
                        <button
                          className="cart-btn"
                          type="button"
                          onClick={() => openSalesModal(t)}
                          title="Purchased Items"
                        >
                          <img className="row-icon" src="/assets/images/sales.png" alt="cart" />
                        </button>
                      </td>

                      <td className="td-center">
                        <button className="btn small" type="button" onClick={() => openTxModal(t)}>
                          Edit
                        </button>
                        <button
                          className="btn small danger"
                          type="button"
                          onClick={() => deleteTransaction(t.trans_id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <button className="new-tx-btn" type="button" onClick={() => openTxModal(null)}>
        <span className="plus">＋</span>
        New Transaction
      </button>

      {/* NEW/EDIT TRANSACTION MODAL */}
      <div
        className={`tx-overlay ${txOpen ? "show" : ""}`}
        aria-hidden={txOpen ? "false" : "true"}
        onClick={(e) => {
          if (e.target.classList.contains("tx-overlay")) closeTxModal();
        }}
      >
        <div className="tx-modal" role="dialog" aria-modal="true" aria-label="Transaction">
          <button className="tx-close" type="button" onClick={closeTxModal}>
            ✕
          </button>
          <h2 className="tx-title">{editingId ? "Edit Transaction" : "New Transaction"}</h2>

          <form id="txForm" onSubmit={handleTxSubmit}>
            <div className="tx-grid">
              <label className="field">
                <span>Guest</span>
                <select
                  value={txForm.guest_id}
                  onChange={(e) => setTxForm((p) => ({ ...p, guest_id: e.target.value }))}
                  required
                >
                  <option value="">Select guest</option>
                  {lookups.guests.map((g) => (
                    <option key={g.guest_id} value={g.guest_id}>
                      {g.guest_name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Staff</span>
                <select
                  value={txForm.user_id}
                  onChange={(e) => setTxForm((p) => ({ ...p, user_id: e.target.value }))}
                  required
                >
                  <option value="">Select staff</option>
                  {lookups.users.map((u) => (
                    <option key={u.user_id} value={u.user_id}>
                      {u.username}
                    </option>
                  ))}
                </select>
              </label>

              {/* rooms already filtered to Available by backend */}
              <label className="field">
                <span>Room</span>
                <select value={txForm.room_id} onChange={(e) => handleRoomChange(e.target.value)} required>
                  <option value="">Select room</option>
                  {lookups.rooms.map((r) => (
                    <option key={r.room_id} value={r.room_id}>
                      {r.room_number} — {r.type_name} (₱{r.base_rate})
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Status</span>
                <select
                  value={txForm.trans_status_id}
                  onChange={(e) => setTxForm((p) => ({ ...p, trans_status_id: e.target.value }))}
                  required
                >
                  <option value="1">Unpaid</option>
                  <option value="2">Paid</option>
                </select>
              </label>

              <label className="field">
                <span>Check-in</span>
                <input
                  type="datetime-local"
                  value={txForm.checkin}
                  onChange={(e) => setTxForm((p) => ({ ...p, checkin: e.target.value }))}
                  required
                />
              </label>

              <label className="field">
                <span>Check-out</span>
                <input
                  type="datetime-local"
                  value={txForm.checkout}
                  onChange={(e) => setTxForm((p) => ({ ...p, checkout: e.target.value }))}
                  required
                />
              </label>

              <label className="field">
                <span>Amount (₱)</span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={txForm.actual_rate_charged}
                  onChange={(e) => setTxForm((p) => ({ ...p, actual_rate_charged: e.target.value }))}
                  required
                />
              </label>
            </div>

            <div className="modal-actions tx-actions">
              <button className="btn secondary" type="button" onClick={closeTxModal}>
                Cancel
              </button>
              <button className="btn primary" type="submit" disabled={txSubmitting}>
                {txSubmitting ? "Saving..." : editingId ? "Update" : "Add"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <ReceiptModal
        open={receiptOpen}
        onClose={closeReceiptModal}
        tx={receiptTarget}
        processedBy={receiptTarget?.username || ""}
      />

      <SalesModal
        open={salesOpen}
        onClose={closeSalesModal}
        transId={salesTarget.transId}
        guestName={salesTarget.guest}
        userId={salesTarget.userId}
        items={inventoryItems}
        onSaved={() => {
          loadInventory(); // refresh stock
        }}
      />
    </>
  );
}