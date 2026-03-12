import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";
import SalesModal from "../components/SalesModal";
import ReceiptModal from "../components/ReceiptModal";
import GuestDamageModal from "../components/GuestDamageModal";

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
  return local.toISOString().slice(0, 16);
}

function computeRoomHours(checkin, checkout) {
  if (!checkin || !checkout) return 0;
  const ms = new Date(checkout) - new Date(checkin);
  if (!Number.isFinite(ms) || ms <= 0) return 0;
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60)));
}

function calculateRoomRate(hours) {
  if (!hours || hours <= 0) return 0;
  if (hours <= 3) return 80;
  if (hours <= 8) return 150;
  if (hours <= 12) return 200;
  if (hours <= 24) return 200;
  return 200 + (hours - 24) * 20;
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
  const [lookups, setLookups] = useState({ guests: [], users: [], rooms: [], inventory: [] });
  const [inventoryItems, setInventoryItems] = useState([]);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [txOpen, setTxOpen] = useState(false);
  const [txForm, setTxForm] = useState(emptyForm);
  const [txSubmitting, setTxSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptTarget, setReceiptTarget] = useState(null);

  const [salesOpen, setSalesOpen] = useState(false);
  const [salesTarget, setSalesTarget] = useState({
    transId: "",
    guest: "",
    userId: null,
    room: "",
  });

  const [damageOpen, setDamageOpen] = useState(false);
  const [damageTarget, setDamageTarget] = useState({
    transId: "",
    guest: "",
    room: "",
    userId: null,
  });

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
        rooms: Array.isArray(lookupData.rooms) ? lookupData.rooms : [],
        inventory: Array.isArray(lookupData.inventory) ? lookupData.inventory : [],
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
      const list = Array.isArray(rows) ? rows.filter((x) => Number(x.quantity || 0) > 0) : [];
      setInventoryItems(list);
    } catch {
      setInventoryItems([]);
    }
  }

  useEffect(() => {
    loadAll();
    loadInventory();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return transactions;
    return transactions.filter(
      (t) =>
        (t.guest_name || "").toLowerCase().includes(q) ||
        (t.username || "").toLowerCase().includes(q) ||
        (t.room_number || "").toLowerCase().includes(q)
    );
  }, [search, transactions]);

  const computedHours = useMemo(
    () => computeRoomHours(txForm.checkin, txForm.checkout),
    [txForm.checkin, txForm.checkout]
  );

  const computedRate = useMemo(
    () => calculateRoomRate(computedHours),
    [computedHours]
  );

  function openTxModal(tx = null) {
    if (!tx) {
      setEditingId(null);
      const checkin = nowLocalIso();
      const checkout = nowLocalIso();
      setTxForm({
        ...emptyForm,
        checkin,
        checkout,
        actual_rate_charged: String(calculateRoomRate(computeRoomHours(checkin, checkout))),
      });
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
      await loadInventory();
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
      await loadInventory();
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
      userId: tx.user_id || null,
      room: tx.room_number || "",
    });
    setSalesOpen(true);
  }

  function closeSalesModal() {
    setSalesOpen(false);
  }

  function openDamageModal(tx) {
    setDamageTarget({
      transId: tx.trans_id,
      guest: tx.guest_name || "",
      room: tx.room_number || "",
      userId: tx.user_id || null,
    });
    setDamageOpen(true);
  }

  function closeDamageModal() {
    setDamageOpen(false);
  }

  function handleRoomChange(room_id) {
    setTxForm((p) => ({
      ...p,
      room_id,
      actual_rate_charged: String(calculateRoomRate(computeRoomHours(p.checkin, p.checkout))),
    }));
  }

  async function handleSaveDamage(payload) {
    try {
      await apiFetch("/damages", {
        method: "POST",
        body: JSON.stringify({
          trans_id: Number(payload.trans_id),
          inv_id: Number(payload.inv_id),
          damage_status_id: Number(payload.damage_status_id),
          date_reported: new Date().toISOString().slice(0, 19).replace("T", " "),
        }),
      });

      await loadInventory();
      await loadAll();
    } catch (e) {
      alert(e.message || "Failed to save damage");
      throw e;
    }
  }

  return (
    <>
      <header className="page-header">
        <h1 className="page-title">Transactions</h1>

        <div className="page-actions">
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
              <col style={{ width: "140px" }} />
              <col style={{ width: "120px" }} />
              <col style={{ width: "70px" }} />
              <col style={{ width: "140px" }} />
              <col style={{ width: "140px" }} />
              <col style={{ width: "95px" }} />
              <col style={{ width: "110px" }} />
              <col style={{ width: "100px" }} />
              <col style={{ width: "100px" }} />
              <col style={{ width: "110px" }} />
              <col style={{ width: "160px" }} />
              <col style={{ width: "260px" }} />
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
                <th>Hours</th>
                <th>Room Cost</th>
                <th>Damage</th>
                <th>Sales</th>
                <th>Total Bill</th>
                <th>Date Created</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={14} className="td-center" style={{ opacity: 0.7 }}>
                    Loading...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={14} className="td-center">
                    No results
                  </td>
                </tr>
              ) : (
                filtered.map((t) => {
                  const ci = splitToDisplayParts(t.checkin);
                  const co = splitToDisplayParts(t.checkout);
                  const dc = splitToDisplayParts(t.date_created);
                  const statusText = String(t.transaction_status || "").toLowerCase();
                  const isPaid = statusText === "paid" || Number(t.trans_status_id) === 1;
                  const statusName = t.transaction_status || "Unknown";

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

                      <td>{Number(t.room_hours || 0)}</td>
                      <td>₱{Number(t.actual_rate_charged || 0).toFixed(2)}</td>
                      <td>₱{Number(t.total_damage || 0).toFixed(2)}</td>
                      <td>₱{Number(t.sales_total || 0).toFixed(2)}</td>
                      <td>₱{Number(t.total_bill || 0).toFixed(2)}</td>

                      <td className="td-center">
                        {dc.date}
                        <br />
                        <span className="muted">{dc.time}</span>
                      </td>

                      <td className="td-center">
                        <div
                          style={{
                            display: "flex",
                            gap: "8px",
                            justifyContent: "center",
                            alignItems: "center",
                            flexWrap: "wrap",
                          }}
                        >
                          <button
                            className="btn small"
                            type="button"
                            onClick={() => openSalesModal(t)}
                            title="Purchased Items"
                          >
                            Sales
                          </button>

                          <button
                            className="btn small"
                            type="button"
                            onClick={() => openDamageModal(t)}
                            title="Report Damage"
                          >
                            Damage
                          </button>

                          <button
                            className="btn small"
                            type="button"
                            onClick={() => openTxModal(t)}
                          >
                            Edit
                          </button>

                          <button
                            className="btn small danger"
                            type="button"
                            onClick={() => deleteTransaction(t.trans_id)}
                          >
                            Delete
                          </button>
                        </div>
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

              <label className="field">
                <span>Room</span>
                <select
                  value={txForm.room_id}
                  onChange={(e) => handleRoomChange(e.target.value)}
                  required
                >
                  <option value="">Select room</option>
                  {lookups.rooms.map((r) => (
                    <option key={r.room_id} value={r.room_id}>
                      {r.room_number} — {r.type_name}
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
                  <option value="1">Paid</option>
                  <option value="2">Pending</option>
                  <option value="3">Not paid</option>
                </select>
              </label>

              <label className="field">
                <span>Check-in</span>
                <input
                  type="datetime-local"
                  value={txForm.checkin}
                  onChange={(e) =>
                    setTxForm((p) => {
                      const next = { ...p, checkin: e.target.value };
                      return {
                        ...next,
                        actual_rate_charged: String(
                          calculateRoomRate(computeRoomHours(next.checkin, next.checkout))
                        ),
                      };
                    })
                  }
                  required
                />
              </label>

              <label className="field">
                <span>Check-out</span>
                <input
                  type="datetime-local"
                  value={txForm.checkout}
                  onChange={(e) =>
                    setTxForm((p) => {
                      const next = { ...p, checkout: e.target.value };
                      return {
                        ...next,
                        actual_rate_charged: String(
                          calculateRoomRate(computeRoomHours(next.checkin, next.checkout))
                        ),
                      };
                    })
                  }
                  required
                />
              </label>

              <label className="field">
                <span>Hours</span>
                <input type="text" value={computedHours ? `${computedHours} hour(s)` : ""} readOnly />
              </label>

              <label className="field">
                <span>Amount (₱)</span>
                <input
                  type="text"
                  value={computedRate ? `₱${Number(computedRate).toFixed(2)}` : ""}
                  readOnly
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
        onSave={async () => {
          await loadInventory();
          await loadAll();
        }}
      />

      <GuestDamageModal
        open={damageOpen}
        onClose={closeDamageModal}
        transId={damageTarget.transId}
        guestName={damageTarget.guest}
        roomNumber={damageTarget.room}
        items={inventoryItems}
        onSave={handleSaveDamage}
      />
    </>
  );
}