import { useEffect, useMemo, useState } from "react";
import SalesModal from "../components/SalesModal";
import ReceiptModal from "../components/ReceiptModal";

const STORAGE_KEY = "transactions";
const SALES_KEY = "purchased_by_trans";

function pad(num) {
  return String(num).padStart(4, "0");
}
function getIdNumber(id) {
  const n = parseInt(String(id || "").replace(/^T/i, ""), 10);
  return Number.isNaN(n) ? null : n;
}

/** expects ISO string "YYYY-MM-DDTHH:mm" or "YYYY-MM-DDTHH:mm:ss"
 * returns { date:"YYYY/MM/DD", time:"HH:mm:ss" }
 */
function splitToDisplayParts(dtLocal) {
  if (!dtLocal) return { date: "—", time: "" };
  const d = new Date(dtLocal);
  if (Number.isNaN(d.getTime())) {
    // fallback if already "2025/01/25" etc.
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
  return local.toISOString().slice(0, 19); // YYYY-MM-DDTHH:mm:ss
}

export default function Transactions() {
  // ---- seed rows (same as your HTML) ----
  const initialRows = [
    {
      trans_id: "T0001",
      status: "paid",
      guest_name: "Jill Santiago",
      username: "Jeson",
      room_num: "101",
      checkin: "2025-01-25T12:25:03",
      checkout: "2025-01-25T03:25:03",
      amount: "80",
      date_created_dt: "2025-01-25T03:25:03",
    },
    {
      trans_id: "T0002",
      status: "paid",
      guest_name: "Mart Santiago",
      username: "Jeson",
      room_num: "101",
      checkin: "2025-01-25T12:25:03",
      checkout: "2025-01-25T03:25:03",
      amount: "80",
      date_created_dt: "2025-01-25T03:25:03",
    },
    {
      trans_id: "T0003",
      status: "unpaid",
      guest_name: "Ann Flores",
      username: "Jeson",
      room_num: "107",
      checkin: "2025-01-25T07:40:56",
      checkout: "2025-01-25T03:40:56",
      amount: "200",
      date_created_dt: "2025-01-25T03:25:03",
    },
  ];

  const [transactions, setTransactions] = useState(initialRows);
  const [search, setSearch] = useState("");

  // ---- New Transaction modal state ----
  const [txOpen, setTxOpen] = useState(false);
  const [txForm, setTxForm] = useState({
    trans_id: "",
    status: "unpaid",
    guest_name: "",
    username: "",
    room_num: "",
    checkin: "",
    checkout: "",
    amount: "",
    date_created_dt: "",
  });

  // ---- Receipt modal state (stub: ikaw na connect sa receipt modal UI if naa ka component) ----
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptTarget, setReceiptTarget] = useState(null);

  // ---- Sales modal state ----
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

  // Load saved user-added transactions
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (Array.isArray(saved) && saved.length) {
      const map = new Map();
      [...initialRows, ...saved].forEach((t) => map.set(t.trans_id, t));
      setTransactions(Array.from(map.values()));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Next ID
  const nextId = useMemo(() => {
    let max = 3;
    transactions.forEach((t) => {
      const n = getIdNumber(t.trans_id);
      if (n !== null) max = Math.max(max, n);
    });
    return `T${pad(max + 1)}`;
  }, [transactions]);

  // When opening modal, prefill ID + date_created_dt
  useEffect(() => {
    if (!txOpen) return;
    setTxForm((p) => ({
      ...p,
      trans_id: p.trans_id || nextId,
      date_created_dt: p.date_created_dt || nowLocalIso(),
      status: p.status || "unpaid",
    }));
  }, [txOpen, nextId]);

  // Search filter
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return transactions;
    return transactions.filter((t) => (t.guest_name || "").toLowerCase().includes(q));
  }, [search, transactions]);

  function openTxModal() {
    setTxOpen(true);
  }
  function closeTxModal() {
    setTxOpen(false);
  }

  function saveTransactionsToStorage(list) {
    // store only user-added (T0004+)
    const onlyUserAdded = list.filter((t) => {
      const n = getIdNumber(t.trans_id);
      return n !== null && n > 3;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(onlyUserAdded));
  }

  function handleTxSubmit(e) {
    e.preventDefault();

    const inVal = txForm.checkin;
    const outVal = txForm.checkout;

    if (inVal && outVal) {
      const inDate = new Date(inVal);
      const outDate = new Date(outVal);
      if (!Number.isNaN(inDate.getTime()) && !Number.isNaN(outDate.getTime())) {
        if (outDate <= inDate) {
          alert("Check-out must be after Check-in.");
          return;
        }
      }
    }

    const newTx = {
      ...txForm,
      trans_id: (txForm.trans_id || "").trim() || nextId,
      status: (txForm.status || "unpaid").toLowerCase(),
      guest_name: (txForm.guest_name || "").trim(),
      username: (txForm.username || "").trim(),
      room_num: (txForm.room_num || "").trim(),
      amount: String(txForm.amount ?? "").trim(),
      date_created_dt: txForm.date_created_dt || nowLocalIso(),
    };

    setTransactions((prev) => {
      const map = new Map(prev.map((t) => [t.trans_id, t]));
      map.set(newTx.trans_id, newTx);
      const updated = Array.from(map.values());
      saveTransactionsToStorage(updated);
      return updated;
    });

    setTxForm({
      trans_id: "",
      status: "unpaid",
      guest_name: "",
      username: "",
      room_num: "",
      checkin: "",
      checkout: "",
      amount: "",
      date_created_dt: "",
    });
    closeTxModal();
  }

  // Receipt open (ikaw na connect actual receipt modal content)
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

  function saveSale(sale) {
    const trans_id = sale.trans_id;
    const data = JSON.parse(localStorage.getItem(SALES_KEY) || "{}");
    const list = Array.isArray(data[trans_id]) ? data[trans_id] : [];
    list.push(sale);
    data[trans_id] = list;
    localStorage.setItem(SALES_KEY, JSON.stringify(data));
    alert(`Saved sale for ${trans_id}!`);
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

          {/* optional: icons on right (calculator + notif) if you want */}
          {/* <div className="top-icons">
            <img src="/assets/images/calculator.png" alt="calculator" className="calculator" />
            <img src="/assets/images/notification.png" alt="notification" />
          </div> */}
        </div>
      </header>

      {/* table card */}
      <section className="tx-card">
        <div className="tx-table-wrap">
          <table className="tx-table">
            <colgroup>
              <col style={{ width: "55px" }} />   {/* receipt icon */}
              <col style={{ width: "100px" }} />  {/* status */}
              <col style={{ width: "130px" }} />  {/* guest */}
              <col style={{ width: "110px" }} />  {/* username */}
              <col style={{ width: "60px" }} />   {/* room */}
              <col style={{ width: "140px" }} />  {/* checkin */}
              <col style={{ width: "160px" }} />  {/* checkout */}
              <col style={{ width: "90px" }} />   {/* amount */}
              <col style={{ width: "160px" }} />  {/* date created */}
              <col style={{ width: "52px" }} />   {/* cart */}
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
              </tr>
            </thead>

            <tbody>
              {filtered.map((t) => {
                const ci = splitToDisplayParts(t.checkin);
                const co = splitToDisplayParts(t.checkout);
                const dc = splitToDisplayParts(t.date_created_dt);
                const status = (t.status || "unpaid").toLowerCase();

                return (
                        <tr key={t.trans_id} className={`tx-row ${status}`}>

                    {/* receipt icon */}
                    <td className="col-icon">
                      <button
                        className="icon-btn receipt-btn"
                        type="button"
                        data-trans-id={t.trans_id}
                        onClick={() => openReceiptModal(t.trans_id)}
                        title="Receipt"
                      >
                        <img
                          className="row-icon"
                          src="/assets/images/receipt.png"
                          alt="receipt"
                        />
                      </button>
                    </td>

                    {/* status pill */}
                    <td className="col-status">
                      <span className={`status-pill ${status === "paid" ? "paid" : "unpaid"}`}>
                        {status}
                      </span>
                    </td>

                    <td className="td-left">{t.guest_name}</td>
                    <td className="td-left">{t.username}</td>
                    <td>{t.room_num}</td>

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

                    <td>{t.amount}</td>

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
                        data-trans-id={t.trans_id}
                        onClick={() => openSalesModal(t.trans_id, t.guest_name)}
                        title="Sales"
                      >
                        <img
                          className="row-icon"
                          src="/assets/images/sales.png"
                          alt="cart"
                        />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="td-center">
                    No results
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* floating button */}
      <button className="new-tx-btn" type="button" onClick={openTxModal}>
        <span className="plus">＋</span>
        New Transaction
      </button>

 
       {/* floating button */}
      <button className="new-tx-btn" type="button" onClick={openTxModal}>
        <span className="plus">＋</span>
        New Transaction
      </button>

      {/* NEW TRANSACTION MODAL */}
      <div
        className={`tx-overlay ${txOpen ? "show" : ""}`}
        aria-hidden={txOpen ? "false" : "true"}
        onClick={(e) => {
          if (e.target.classList.contains("tx-overlay")) closeTxModal();
        }}
      >
        <div className="tx-modal" role="dialog" aria-modal="true" aria-label="New Transaction">
          <button className="tx-close" type="button" onClick={closeTxModal}>
            ✕
          </button>

          <h2 className="tx-title">New Transaction</h2>

          <form id="txForm" onSubmit={handleTxSubmit}>
            <div className="tx-grid">
              <label className="field">
                <span>Transaction ID</span>
                <input
                  id="trans_id"
                  type="text"
                  placeholder={nextId}
                  value={txForm.trans_id}
                  onChange={(e) => setTxForm((p) => ({ ...p, trans_id: e.target.value }))}
                  required
                />
              </label>

              <label className="field">
                <span>Status</span>
                <select
                  value={txForm.status}
                  onChange={(e) => setTxForm((p) => ({ ...p, status: e.target.value }))}
                  required
                >
                  <option value="paid">paid</option>
                  <option value="unpaid">unpaid</option>
                </select>
              </label>

              <label className="field">
                <span>Guest Name</span>
                <input
                  id="guest_name"
                  type="text"
                  placeholder="Juan Dela Cruz"
                  value={txForm.guest_name}
                  onChange={(e) => setTxForm((p) => ({ ...p, guest_name: e.target.value }))}
                  required
                />
              </label>

              <label className="field">
                <span>Username</span>
                <input
                  id="username"
                  type="text"
                  placeholder="Jason"
                  value={txForm.username}
                  onChange={(e) => setTxForm((p) => ({ ...p, username: e.target.value }))}
                  required
                />
              </label>

              <label className="field">
                <span>Room #</span>
                <input
                  id="room_num"
                  type="text"
                  placeholder="101"
                  value={txForm.room_num}
                  onChange={(e) => setTxForm((p) => ({ ...p, room_num: e.target.value }))}
                  required
                />
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
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="80"
                  value={txForm.amount}
                  onChange={(e) => setTxForm((p) => ({ ...p, amount: e.target.value }))}
                  required
                />
              </label>

              <label className="field">
                <span>Date Created</span>
                <input
                  id="date_created_dt"
                  type="datetime-local"
                  value={(txForm.date_created_dt || "").slice(0, 16)}
                  onChange={(e) =>
                    setTxForm((p) => ({
                      ...p,
                      date_created_dt: e.target.value ? `${e.target.value}:00` : "",
                    }))
                  }
                  required
                />
              </label>
            </div>

            <div className="modal-actions tx-actions">
              <button className="btn secondary" type="button" onClick={closeTxModal}>
                Cancel
              </button>
              <button className="btn primary" type="submit">
                Add
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