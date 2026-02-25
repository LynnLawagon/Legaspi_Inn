import { useEffect, useMemo, useState } from "react";
import SalesModal from "../components/SalesModal";
import ReceiptModal from "../components/ReceiptModal";
import { apiFetch } from "../lib/api";

/** expects ISO string or mysql datetime; returns { date:"YYYY/MM/DD", time:"HH:mm:ss" } */
function splitToDisplayParts(dt) {
  if (!dt) return { date: "—", time: "" };

  // handle mysql datetime "YYYY-MM-DD HH:mm:ss"
  const normalized = String(dt).includes(" ")
    ? String(dt).replace(" ", "T")
    : String(dt);

  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) {
    const [date, time] = String(dt).split("T");
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

function nowLocalIsoForInput() {
  // datetime-local expects "YYYY-MM-DDTHH:mm"
  const d = new Date();
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 16);
}

function toMysqlDatetimeFromInput(dtLocal) {
  // from "YYYY-MM-DDTHH:mm" -> "YYYY-MM-DD HH:mm:00"
  if (!dtLocal) return "";
  return dtLocal.replace("T", " ") + ":00";
}

function fromMysqlDatetimeToInput(dt) {
  // from "YYYY-MM-DD HH:mm:ss" -> "YYYY-MM-DDTHH:mm"
  if (!dt) return "";
  return String(dt).replace(" ", "T").slice(0, 16);
}

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [lookups, setLookups] = useState({ guests: [], users: [], rooms: [] });
  const [search, setSearch] = useState("");

  // actions menu
  const [openMenuId, setOpenMenuId] = useState(null);

  // modal state
  const [txOpen, setTxOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null); // null=create, object=edit

  const [txForm, setTxForm] = useState({
    guest_id: "",
    user_id: "",
    room_id: "",
    checkin: "",
    checkout: "",
    actual_rate_charged: "",
    date_created: "",
  });

  // Receipt modal
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptTarget, setReceiptTarget] = useState(null);

  // Sales modal
  const [salesOpen, setSalesOpen] = useState(false);
  const [salesTarget, setSalesTarget] = useState({ transId: "", guest: "" });

  const salesItems = useMemo(
    () => [
      { name: "Nature’s Spring", cost: 20 },
      { name: "Safeguard", cost: 15 },
      { name: "Towel", cost: 50 },
    ],
    []
  );

    async function loadAll() {
    try {
      const [tRes, lRes] = await Promise.all([
        apiFetch("/transactions"),
        apiFetch("/transactions/lookups"),
      ]);

      if (!tRes.ok) {
        const err = await tRes.json().catch(() => ({}));
        throw new Error(err.message || "Failed /transactions");
      }

      if (!lRes.ok) {
        const err = await lRes.json().catch(() => ({}));
        throw new Error(err.message || "Failed /transactions/lookups");
      }

      const tJson = await tRes.json();
      const lJson = await lRes.json();

      setTransactions(Array.isArray(tJson) ? tJson : []);
      setLookups({
        guests: Array.isArray(lJson.guests) ? lJson.guests : [],
        users: Array.isArray(lJson.users) ? lJson.users : [],
        rooms: Array.isArray(lJson.rooms) ? lJson.rooms : [],
      });
    } catch (e) {
      console.error("Transactions loadAll error:", e);
      alert(e.message);
      setTransactions([]);
      setLookups({ guests: [], users: [], rooms: [] });
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return transactions;
    return transactions.filter((t) =>
      String(t.guest_name || "").toLowerCase().includes(q)
    );
  }, [search, transactions]);

  function openCreateModal() {
    setEditTarget(null);
    setTxForm({
      guest_id: "",
      user_id: "",
      room_id: "",
      checkin: nowLocalIsoForInput(),
      checkout: nowLocalIsoForInput(),
      actual_rate_charged: "",
      date_created: nowLocalIsoForInput(),
    });
    setTxOpen(true);
  }

  function openEditModal(t) {
    setEditTarget(t);
    setTxForm({
      guest_id: String(t.guest_id),
      user_id: String(t.user_id),
      room_id: String(t.room_id),
      checkin: fromMysqlDatetimeToInput(t.checkin),
      checkout: fromMysqlDatetimeToInput(t.checkout),
      actual_rate_charged: String(t.actual_rate_charged ?? ""),
      date_created: fromMysqlDatetimeToInput(t.date_created),
    });
    setTxOpen(true);
  }

  function closeTxModal() {
    setTxOpen(false);
    setEditTarget(null);
  }

  async function handleTxSubmit(e) {
    e.preventDefault();

    // validate checkin < checkout
    const ci = new Date(txForm.checkin);
    const co = new Date(txForm.checkout);
    if (!Number.isNaN(ci.getTime()) && !Number.isNaN(co.getTime()) && co <= ci) {
      alert("Check-out must be after Check-in.");
      return;
    }

    const payload = {
      guest_id: Number(txForm.guest_id),
      user_id: Number(txForm.user_id),
      room_id: Number(txForm.room_id),
      checkin: toMysqlDatetimeFromInput(txForm.checkin),
      checkout: toMysqlDatetimeFromInput(txForm.checkout),
      actual_rate_charged: Number(txForm.actual_rate_charged),
      date_created: toMysqlDatetimeFromInput(txForm.date_created),
    };

    const path = editTarget
    ? `/transactions/${editTarget.trans_id}`
    : `/transactions`;

    const res = await apiFetch(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.message || "Failed to save transaction");
      return;
    }

    closeTxModal();
    await loadAll();
  }

  async function deleteTransaction(t) {
    const ok = window.confirm(`Delete transaction #${t.trans_id}?`);
    if (!ok) return;

    const res = await apiFetch(`/transactions/${t.trans_id}`, {
    method: "DELETE",
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.message || "Failed to delete transaction");
      return;
    }

    await loadAll();
  }

  // Receipt open
  function openReceiptModal(transId) {
    const tx = transactions.find((t) => t.trans_id === transId) || null;
    setReceiptTarget(tx);
    setReceiptOpen(true);
  }
  function closeReceiptModal() {
    setReceiptOpen(false);
    setReceiptTarget(null);
  }

  // Sales modal
  function openSalesModal(transId, guestName) {
    setSalesTarget({ transId, guest: guestName || "" });
    setSalesOpen(true);
  }
  function closeSalesModal() {
    setSalesOpen(false);
  }

  function saveSale() {
    alert("Sales saved (connect this to your real sales table if you have one).");
  }

  return (
    <>
      {/* top bar */}
      <header className="top-bar tx-topbar">
        <h1 className="page-title">Transactions</h1>

        <div className="tx-actions">
          <div className="search-wrap">
            <img src="/assets/images/search.png" alt="search" />
            <input
              type="text"
              placeholder="Search by Guest Name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </header>

      {/* table card */}
      <section className="tx-card">
        <div className="tx-table-wrap">
          <table className="tx-table">
            <colgroup>
              <col style={{ width: "55px" }} />
              <col style={{ width: "100px" }} />
              <col style={{ width: "160px" }} />
              <col style={{ width: "120px" }} />
              <col style={{ width: "70px" }} />
              <col style={{ width: "160px" }} />
              <col style={{ width: "160px" }} />
              <col style={{ width: "100px" }} />
              <col style={{ width: "170px" }} />
              <col style={{ width: "52px" }} />
              <col style={{ width: "70px" }} /> {/* ... menu */}
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
                <th className="col-action"></th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((t) => {
                const ci = splitToDisplayParts(t.checkin);
                const co = splitToDisplayParts(t.checkout);
                const dc = splitToDisplayParts(t.date_created);

                // status is not stored in DB table -> display "unpaid" default
                const status = (t.status || "unpaid").toLowerCase();

                return (
                  <tr key={t.trans_id} className={`tx-row ${status}`}>
                    {/* receipt icon */}
                    <td className="col-icon">
                      <button
                        className="icon-btn receipt-btn"
                        type="button"
                        onClick={() => openReceiptModal(t.trans_id)}
                        title="Receipt"
                      >
                        <img className="row-icon" src="/assets/images/receipt.png" alt="receipt" />
                      </button>
                    </td>

                    {/* status pill (display only) */}
                    <td className="col-status">
                      <span className={`status-pill ${status === "paid" ? "paid" : "unpaid"}`}>
                        {status}
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

                    <td>{Number(t.actual_rate_charged || 0).toFixed(2)}</td>

                    <td className="td-center">
                      {dc.date}
                      <br />
                      <span className="muted">{dc.time}</span>
                    </td>

                    {/* cart icon -> sales */}
                    <td className="col-action">
                      <button
                        className="cart-btn"
                        type="button"
                        onClick={() => openSalesModal(t.trans_id, t.guest_name)}
                        title="Sales"
                      >
                        <img className="row-icon" src="/assets/images/sales.png" alt="cart" />
                      </button>
                    </td>

                    {/* ... actions */}
                    <td className="col-action" style={{ position: "relative" }}>
                      <img
                        src="/assets/images/more.png"
                        alt="more"
                        style={{ cursor: "pointer" }}
                        onClick={() =>
                          setOpenMenuId((prev) => (prev === t.trans_id ? null : t.trans_id))
                        }
                      />

                      {openMenuId === t.trans_id && (
                        <div
                          style={{
                            position: "absolute",
                            right: 10,
                            top: 30,
                            background: "#fff",
                            borderRadius: 10,
                            boxShadow: "0 10px 22px rgba(0,0,0,0.12)",
                            overflow: "hidden",
                            minWidth: 120,
                            zIndex: 9999,
                          }}
                          onMouseLeave={() => setOpenMenuId(null)}
                        >
                          <button
                            onClick={() => {
                              setOpenMenuId(null);
                              openEditModal(t);
                            }}
                            style={{
                              width: "100%",
                              padding: "10px 12px",
                              border: "none",
                              background: "transparent",
                              textAlign: "left",
                              cursor: "pointer",
                            }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              setOpenMenuId(null);
                              deleteTransaction(t);
                            }}
                            style={{
                              width: "100%",
                              padding: "10px 12px",
                              border: "none",
                              background: "transparent",
                              textAlign: "left",
                              cursor: "pointer",
                              color: "#b00020",
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={11} className="td-center" style={{ padding: 18, opacity: 0.7 }}>
                    No results
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* floating button */}
      <button className="new-tx-btn" type="button" onClick={openCreateModal}>
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

          <h2 className="tx-title">{editTarget ? "Edit Transaction" : "New Transaction"}</h2>

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
                <span>User</span>
                <select
                  value={txForm.user_id}
                  onChange={(e) => setTxForm((p) => ({ ...p, user_id: e.target.value }))}
                  required
                >
                  <option value="">Select user</option>
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
                  onChange={(e) => setTxForm((p) => ({ ...p, room_id: e.target.value }))}
                  required
                >
                  <option value="">Select room</option>
                  {lookups.rooms.map((r) => (
                    <option key={r.room_id} value={r.room_id}>
                      {r.room_number}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Check-in</span>
                <input
                  id="checkin"
                  type="datetime-local"
                  value={txForm.checkin}
                  onChange={(e) => setTxForm((p) => ({ ...p, checkin: e.target.value }))}
                  required
                />
              </label>

              <label className="field">
                <span>Check-out</span>
                <input
                  id="checkout"
                  type="datetime-local"
                  value={txForm.checkout}
                  onChange={(e) => setTxForm((p) => ({ ...p, checkout: e.target.value }))}
                  required
                />
              </label>

              <label className="field">
                <span>Amount</span>
                <input
                  id="actual_rate_charged"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={txForm.actual_rate_charged}
                  onChange={(e) =>
                    setTxForm((p) => ({ ...p, actual_rate_charged: e.target.value }))
                  }
                  required
                />
              </label>

              <label className="field">
                <span>Date Created</span>
                <input
                  id="date_created"
                  type="datetime-local"
                  value={txForm.date_created}
                  onChange={(e) => setTxForm((p) => ({ ...p, date_created: e.target.value }))}
                  required
                  disabled={!!editTarget} // keep original date on edit
                />
              </label>
            </div>

            <div className="modal-actions tx-actions">
              <button className="btn secondary" type="button" onClick={closeTxModal}>
                Cancel
              </button>
              <button className="btn primary" type="submit">
                {editTarget ? "Save" : "Add"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* RECEIPT MODAL */}
      <ReceiptModal
        open={receiptOpen}
        onClose={closeReceiptModal}
        tx={receiptTarget}
        processedBy={receiptTarget?.username || ""}
      />

      {/* SALES MODAL */}
      <SalesModal
        open={salesOpen}
        onClose={closeSalesModal}
        transId={salesTarget.transId}
        guestName={salesTarget.guest}
        items={salesItems}
        onSave={saveSale}
      />
    </>
  );
}