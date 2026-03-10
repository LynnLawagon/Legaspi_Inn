// src/pages/Inventory.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "../lib/api";

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [lookups, setLookups] = useState({ categories: [], types: [], statuses: [] });
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  const [menu, setMenu] = useState({ open: false, inv_id: null, top: 0, left: 0 });
  const selectedRef = useRef(null);

  const menuBtnStyle = {
    display: "block",
    width: "100%",
    textAlign: "left",
    padding: "10px 14px",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    borderRadius: 12,
    fontSize: 14,
  };

  async function loadAll() {
    setLoading(true);
    try {
      const [itemsJson, lookupsJson] = await Promise.all([
        apiFetch("/inventory"),
        apiFetch("/inventory/lookups"),
      ]);

      setItems(Array.isArray(itemsJson) ? itemsJson : []);
      setLookups({
        categories: Array.isArray(lookupsJson.categories) ? lookupsJson.categories : [],
        types: Array.isArray(lookupsJson.types) ? lookupsJson.types : [],
        statuses: Array.isArray(lookupsJson.statuses) ? lookupsJson.statuses : [],
      });
    } catch (e) {
      console.error(e);
      alert(e.message || "Failed to load inventory data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  // backend returns: name, category_name, type_name, invstat_name
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((x) =>
      `${x.name} ${x.category_name} ${x.type_name} ${x.invstat_name}`
        .toLowerCase()
        .includes(s)
    );
  }, [items, q]);

  function pickFromList(title, list, idKey, nameKey, defaultValue) {
    const text = list.map((x) => `${x[idKey]}: ${x[nameKey]}`).join("\n");
    return window.prompt(`${title}\n${text}`, defaultValue ?? "");
  }

  function closeMenu() {
    setMenu({ open: false, inv_id: null, top: 0, left: 0 });
    selectedRef.current = null;
  }

  function openMenuForItem(e, it) {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    selectedRef.current = it;
    setMenu({ open: true, inv_id: it.inv_id, top: rect.bottom + 8, left: rect.right - 160 });
  }

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") closeMenu();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function createItem() {
    const name = window.prompt("Item Name:");
    if (!name?.trim()) return;

    const category_id = pickFromList(
      "Choose category_id:",
      lookups.categories,
      "category_id",
      "category_name"
    );
    if (!category_id) return;

    const inv_type_id = pickFromList(
      "Choose inv_type_id:",
      lookups.types,
      "inv_type_id",
      "type_name"
    );
    if (!inv_type_id) return;

    const invstat_id = pickFromList(
      "Choose invstat_id:",
      lookups.statuses,
      "invstat_id",
      "invstat_name",
      lookups.statuses?.[0]?.invstat_id ? String(lookups.statuses[0].invstat_id) : "1"
    );
    if (!invstat_id) return;

    const qtyStr = window.prompt("Quantity:", "0");
    if (qtyStr == null) return;
    const quantity = Number(qtyStr);

    if (!Number.isFinite(quantity) || quantity < 0) {
      alert("Quantity must be a valid number (0 or higher).");
      return;
    }

    try {
      await apiFetch("/inventory", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          category_id: Number(category_id),
          inv_type_id: Number(inv_type_id),
          quantity,
          invstat_id: Number(invstat_id),
        }),
      });
      await loadAll();
    } catch (e) {
      alert(e.message || "Failed to create item");
    }
  }

  async function editItem(it) {
    const name = window.prompt("Item Name:", it.name);
    if (!name?.trim()) return;

    const category_id = pickFromList(
      `Choose category_id (current: ${it.category_id}):`,
      lookups.categories,
      "category_id",
      "category_name",
      String(it.category_id)
    );
    if (!category_id) return;

    const inv_type_id = pickFromList(
      `Choose inv_type_id (current: ${it.inv_type_id}):`,
      lookups.types,
      "inv_type_id",
      "type_name",
      String(it.inv_type_id)
    );
    if (!inv_type_id) return;

    const invstat_id = pickFromList(
      `Choose invstat_id (current: ${it.invstat_id}):`,
      lookups.statuses,
      "invstat_id",
      "invstat_name",
      String(it.invstat_id ?? 1)
    );
    if (!invstat_id) return;

    const qtyStr = window.prompt("Quantity:", String(it.quantity));
    if (qtyStr == null) return;
    const quantity = Number(qtyStr);

    if (!Number.isFinite(quantity) || quantity < 0) {
      alert("Quantity must be a valid number (0 or higher).");
      return;
    }

    try {
      await apiFetch(`/inventory/${it.inv_id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: name.trim(),
          category_id: Number(category_id),
          inv_type_id: Number(inv_type_id),
          quantity,
          invstat_id: Number(invstat_id),
        }),
      });
      await loadAll();
    } catch (e) {
      alert(e.message || "Failed to update item");
    }
  }

  async function deleteItem(it) {
    if (!window.confirm(`Delete "${it.name}"?`)) return;

    try {
      await apiFetch(`/inventory/${it.inv_id}`, { method: "DELETE" });
      await loadAll();
    } catch (e) {
      alert(e.message || "Failed to delete item (maybe referenced by other tables).");
    }
  }

  return (
    <>
      {menu.open && (
        <div
          onClick={closeMenu}
          style={{ position: "fixed", inset: 0, background: "transparent", zIndex: 99998 }}
        />
      )}

      {menu.open && (
        <div
          style={{
            position: "fixed",
            top: menu.top,
            left: menu.left,
            background: "#fff",
            borderRadius: 16,
            boxShadow: "0 18px 40px rgba(0,0,0,0.18)",
            padding: 8,
            zIndex: 99999,
            minWidth: 160,
          }}
        >
          <button
            onClick={() => {
              const it = selectedRef.current;
              closeMenu();
              if (it) editItem(it);
            }}
            style={menuBtnStyle}
          >
            Edit
          </button>
          <button
            onClick={() => {
              const it = selectedRef.current;
              closeMenu();
              if (it) deleteItem(it);
            }}
            style={{ ...menuBtnStyle, color: "#c0392b" }}
          >
            Delete
          </button>
        </div>
      )}

<header className="page-header">
  <h1 className="page-title">Inventory</h1>

  <div className="page-actions">
    <div className="search-wrap">
      <img src="/assets/images/search.png" alt="search" />
      <input
        type="text"
        placeholder="Search item, category, type, status..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
    </div>
  </div>
</header>

      <section className="inv-card">
        <div className="inv-table-wrap">
          <table className="inv-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Category</th>
                <th>Type</th>
                <th>Qty</th>
                <th>Status</th>
                <th>...</th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: 18, opacity: 0.7 }}>
                    Loading...
                  </td>
                </tr>
              )}

              {!loading &&
                filtered.map((it) => (
                  <tr key={it.inv_id}>
                    <td>{it.name}</td>
                    <td>{it.category_name}</td>
                    <td>{it.type_name}</td>
                    <td>{it.quantity}</td>
                    <td>{it.invstat_name || "—"}</td>
                    <td className="td-action">
                      <button
                        onClick={(e) => openMenuForItem(e, it)}
                        style={{
                          background: "transparent",
                          border: "none",
                          fontSize: "22px",
                          cursor: "pointer",
                          fontWeight: "900",
                          lineHeight: "1",
                          padding: "4px 10px",
                          borderRadius: 10,
                          color: "#2C0735",
                        }}
                        title="More"
                      >
                        …
                      </button>
                    </td>
                  </tr>
                ))}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: 18, opacity: 0.7 }}>
                    No items found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <button className="inv-new-btn" onClick={createItem} type="button">
        + New Item
      </button>
    </>
  );
}