import { useEffect, useMemo, useState } from "react";
import SalesModal from "../components/SalesModal";

const STORAGE_KEY = "transactions";
const SALES_KEY = "purchased_by_trans";

function pad(num) {
  return String(num).padStart(4, "0");
}
function getIdNumber(id) {
  const n = parseInt(String(id || "").replace(/^T/i, ""), 10);
  return Number.isNaN(n) ? null : n;
}
function formatDateTimeParts(dtLocal) {
  if (!dtLocal) return { date: "", time: "" };
  const [date, time] = dtLocal.split("T");
  return { date: date || "", time: time || "" };
}

export default function Transactions() {
  // ----- table data -----
  const initialRows = [
    {
      trans_id: "T0001",
      guest_name: "Jill Santiago",
      username: "Jeson",
      room_num: "101",
      checkin: "2025-01-25T12:25:03",
      checkout: "2025-01-25T03:25:03",
      amount: "80",
      date_created: "2025-01-25",
    },
    {
      trans_id: "T0002",
      guest_name: "Mart Santiago",
      username: "Jeson",
      room_num: "101",
      checkin: "2025-01-25T12:25:03",
      checkout: "2025-01-25T03:25:03",
      amount: "80",
      date_created: "2025-01-25",
    },
    {
      trans_id: "T0003",
      guest_name: "Ann Flores",
      username: "Jeson",
      room_num: "107",
      checkin: "2025-01-25T07:40:56",
      checkout: "2025-01-25T03:40:56",
      amount: "200",
      date_created: "2025-01-25",
    },
  ];

  const [transactions, setTransactions] = useState(initialRows);
  const [search, setSearch] = useState("");

  // ----- New Transaction modal -----
  const [txOpen, setTxOpen] = useState(false);
  const [txForm, setTxForm] = useState({
    trans_id: "",
    guest_name: "",
    username: "",
    room_num: "",
    checkin: "",
    checkout: "",
    amount: "",
    date_created: "",
  });

  // ----- Sales modal (React component) -----
  const [salesOpen, setSalesOpen] = useState(false);
  const [salesTarget, setSalesTarget] = useState({
    transId: "",
    guest: "",
  });

  // Items shown in SalesModal dropdown
  const salesItems = useMemo(
    () => [
      { name: "Nature’s Spring", cost: 20 },
      { name: "Safeguard", cost: 15 },
      { name: "Towel", cost: 50 },
    ],
    []
  );

  // Load from localStorage on mount
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (Array.isArray(saved) && saved.length) {
      const map = new Map();
      [...initialRows, ...saved].forEach((t) => map.set(t.trans_id, t));
      setTransactions(Array.from(map.values()));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Generate next ID based on existing + saved
  const nextId = useMemo(() => {
    let max = 3;
    transactions.forEach((t) => {
      const n = getIdNumber(t.trans_id);
      if (n !== null) max = Math.max(max, n);
    });
    return `T${pad(max + 1)}`;
  }, [transactions]);

  // When opening New Tx modal, prefill ID + date
  useEffect(() => {
    if (txOpen) {
      setTxForm((prev) => ({
        ...prev,
        trans_id: prev.trans_id || nextId,
        date_created: prev.date_created || new Date().toISOString().slice(0, 10),
      }));
    }
  }, [txOpen, nextId]);

  // Search filter
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return transactions;
    return transactions.filter((t) =>
      (t.guest_name || "").toLowerCase().includes(q)
    );
  }, [search, transactions]);

  function openTxModal() {
    setTxOpen(true);
  }
  function closeTxModal() {
    setTxOpen(false);
  }

  function saveTransactionsToStorage(list) {
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
      if (outDate <= inDate) {
        alert("Check-out must be after Check-in.");
        return;
      }
    }

    const newTx = {
      ...txForm,
      trans_id: (txForm.trans_id || "").trim() || nextId,
      guest_name: (txForm.guest_name || "").trim(),
      username: (txForm.username || "").trim(),
      room_num: (txForm.room_num || "").trim(),
      amount: txForm.amount,
      date_created: txForm.date_created,
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
      guest_name: "",
      username: "",
      room_num: "",
      checkin: "",
      checkout: "",
      amount: "",
      date_created: "",
    });
    closeTxModal();
  }

  // ✅ OPEN SalesModal with row info
  function openSalesModal(transId, guestName) {
    setSalesTarget({ transId, guest: guestName || "" });
    setSalesOpen(true);
  }

  function closeSalesModal() {
    setSalesOpen(false);
  }

  // ✅ Save sale from SalesModal -> localStorage
  function saveSale(sale) {
    // sale = { trans_id, guest, item, qty, cost, subtotal, date }
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
        </div>
      </header>

      {/* table card */}
      <section className="tx-card">
        <div className="tx-table-wrap">
          <table className="tx-table">
            <colgroup>
              <col style={{ width: "55px" }} />
              <col style={{ width: "140px" }} />
              <col style={{ width: "190px" }} />
              <col style={{ width: "120px" }} />
              <col style={{ width: "90px" }} />
              <col style={{ width: "160px" }} />
              <col style={{ width: "160px" }} />
              <col style={{ width: "90px" }} />
              <col style={{ width: "140px" }} />
            </colgroup>

            <thead>
              <tr>
                <th className="col-icon"></th>
                <th>Transaction ID</th>
                <th>Guest Name</th>
                <th>Username</th>
                <th>Room #</th>
                <th>Check-in</th>
                <th>Check-out</th>
                <th>Amount</th>
                <th>Date Created</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((t) => {
                const ci = formatDateTimeParts(t.checkin);
                const co = formatDateTimeParts(t.checkout);

                return (
                  <tr key={t.trans_id}>
                    <td className="col-icon">
                      <button
                        className="sales-btn"
                        type="button"
                        onClick={() => openSalesModal(t.trans_id, t.guest_name)}
                        title="Sales"
                      >
                        <img
                          className="row-icon"
                          src="/assets/images/sales.png"
                          alt="sales"
                        />
                      </button>
                    </td>

                    <td>{t.trans_id}</td>
                    <td>{t.guest_name}</td>
                    <td>{t.username}</td>
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

                    <td className="td-center">{t.amount}</td>
                    <td className="td-center">{t.date_created}</td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="td-center">
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

      {/* NEW TRANSACTION MODAL */}
      <div
        className={`tx-overlay ${txOpen ? "show" : ""}`}
        aria-hidden={txOpen ? "false" : "true"}
        onClick={(e) => {
          if (e.target.classList.contains("tx-overlay")) closeTxModal();
        }}
      >
        <div className="tx-modal" role="dialog" aria-modal="true">
          <button className="tx-close" type="button" onClick={closeTxModal}>
            ✕
          </button>

          <h2 className="tx-title">New Transaction</h2>

          <form id="txForm" onSubmit={handleTxSubmit}>
            <label className="field">
              <span>Transaction ID</span>
              <input
                id="trans_id"
                type="text"
                placeholder={nextId}
                value={txForm.trans_id}
                onChange={(e) =>
                  setTxForm((p) => ({ ...p, trans_id: e.target.value }))
                }
                required
              />
            </label>

            <label className="field">
              <span>Guest Name</span>
              <input
                id="guest_name"
                type="text"
                placeholder="Juan Dela Cruz"
                value={txForm.guest_name}
                onChange={(e) =>
                  setTxForm((p) => ({ ...p, guest_name: e.target.value }))
                }
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
                onChange={(e) =>
                  setTxForm((p) => ({ ...p, username: e.target.value }))
                }
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
                onChange={(e) =>
                  setTxForm((p) => ({ ...p, room_num: e.target.value }))
                }
                required
              />
            </label>

            <label className="field">
              <span>Check-in</span>
              <input
                id="checkin"
                type="datetime-local"
                value={txForm.checkin}
                onChange={(e) =>
                  setTxForm((p) => ({ ...p, checkin: e.target.value }))
                }
                required
              />
            </label>

            <label className="field">
              <span>Check-out</span>
              <input
                id="checkout"
                type="datetime-local"
                value={txForm.checkout}
                onChange={(e) =>
                  setTxForm((p) => ({ ...p, checkout: e.target.value }))
                }
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
                onChange={(e) =>
                  setTxForm((p) => ({ ...p, amount: e.target.value }))
                }
                required
              />
            </label>

            <label className="field">
              <span>Date Created</span>
              <input
                id="date_created"
                type="date"
                value={txForm.date_created}
                onChange={(e) =>
                  setTxForm((p) => ({ ...p, date_created: e.target.value }))
                }
                required
              />
            </label>

            <div className="modal-actions">
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

      {/* ✅ SALES MODAL COMPONENT (REACT) */}
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
