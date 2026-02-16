import { useEffect, useMemo, useState } from "react";
import ItemModal from "../components/ItemModal";

const STORAGE_KEY = "inventory_items";

function pad(num) {
  return String(num).padStart(4, "0");
}
function getIdNumber(id) {
  const n = parseInt(String(id || "").replace(/^I/i, ""), 10);
  return Number.isNaN(n) ? null : n;
}

export default function Inventory() {
  const initialRows = [
    {
      inv_id: "I0001",
      name: "Safeguard",
      category: "Toiletries",
      type: "Soap",
      quantity: 3,
      standard_cost: 70,
    },
    {
      inv_id: "I0002",
      name: "Nature’s Spring",
      category: "Amenities",
      type: "Bottled Water",
      quantity: 4,
      standard_cost: 150,
    },
  ];

  const [rows, setRows] = useState(initialRows);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  // load saved items once
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (Array.isArray(saved) && saved.length) {
      const map = new Map();
      [...initialRows, ...saved].forEach((r) => map.set(r.inv_id, r));
      setRows(Array.from(map.values()));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // next Inventory ID
  const nextId = useMemo(() => {
    let max = 2;
    rows.forEach((r) => {
      const n = getIdNumber(r.inv_id);
      if (n !== null) max = Math.max(max, n);
    });
    return `I${pad(max + 1)}`;
  }, [rows]);

  // save only user-added (I0003+)
  function saveRowsToStorage(list) {
    const onlyUserAdded = list.filter((r) => {
      const n = getIdNumber(r.inv_id);
      return n !== null && n > 2;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(onlyUserAdded));
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const name = (r.name || "").toLowerCase();
      const cat = (r.category || "").toLowerCase();
      return name.includes(q) || cat.includes(q);
    });
  }, [rows, search]);

  function handleSave(newItem) {
    // ensure id exists
    const inv_id = (newItem.inv_id || "").trim() || nextId;

    const item = {
      ...newItem,
      inv_id,
      quantity: Number(newItem.quantity || 0),
      standard_cost: Number(newItem.standard_cost || 0),
    };

    setRows((prev) => {
      const map = new Map(prev.map((r) => [r.inv_id, r]));
      map.set(item.inv_id, item);
      const updated = Array.from(map.values());
      saveRowsToStorage(updated);
      return updated;
    });

    setOpen(false);
  }

  return (
    <>
      {/* top bar */}
      <header className="top-bar inv-topbar">
        <h1 className="page-title">Inventory</h1>

        <div className="inv-actions">
          <div className="search-wrap">
            <img src="/assets/images/search.png" alt="search" />
            <input
              type="text"
              placeholder="Search for Item Name or Category"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </header>

      {/* table card */}
      <section className="inv-card">
        <div className="inv-table-wrap">
          <table className="inv-table">
            <colgroup>
              <col style={{ width: "170px" }} />
              <col style={{ width: "230px" }} />
              <col style={{ width: "200px" }} />
              <col style={{ width: "220px" }} />
              <col style={{ width: "140px" }} />
              <col style={{ width: "190px" }} />
              <col style={{ width: "80px" }} />
            </colgroup>

            <thead>
              <tr>
                <th>Inventory ID</th>
                <th>Name</th>
                <th>Category</th>
                <th>Type</th>
                <th>Quantity</th>
                <th>Standard Cost</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((r) => (
                <tr key={r.inv_id}>
                  <td>{r.inv_id}</td>
                  <td>{r.name}</td>
                  <td>{r.category}</td>
                  <td>{r.type}</td>
                  <td>{r.quantity}</td>
                  <td>{r.standard_cost}</td>
                  <td className="td-action">
                    <img
                      src="/assets/images/stock.png"
                      alt="stock"
                      className="row-icon"
                    />
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="td-center">
                    No results
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* floating button */}
      <button
        className="btn primary new-item-btn"
        type="button"
        onClick={() => setOpen(true)}
      >
        + New Item
      </button>

      {/* modal */}
      <ItemModal
        open={open}
        onClose={() => setOpen(false)}
        nextId={nextId}
        existingIds={rows.map((r) => r.inv_id)}
        onSave={handleSave}
      />
    </>
  );
}
