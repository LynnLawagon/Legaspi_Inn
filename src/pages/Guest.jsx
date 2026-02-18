import { useEffect, useMemo, useRef, useState } from "react";

const API_BASE = "http://localhost:5000/api";

export default function Guest() {
  const [guests, setGuests] = useState([]);
  const [lookups, setLookups] = useState({ genders: [] });
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  const [menu, setMenu] = useState({ open: false, guest_id: null, top: 0, left: 0 });
  const selectedRef = useRef(null);

  async function loadAll() {
    setLoading(true);
    try {
      const [gRes, lRes] = await Promise.all([
        fetch(`${API_BASE}/guests`),
        fetch(`${API_BASE}/guests/lookups`),
      ]);

      if (!gRes.ok) throw new Error("Failed to load guests");
      if (!lRes.ok) throw new Error("Failed to load guest lookups");

      const g = await gRes.json();
      const l = await lRes.json();

      setGuests(Array.isArray(g) ? g : []);
      setLookups({ genders: Array.isArray(l.genders) ? l.genders : [] });
    } catch (e) {
      console.error(e);
      alert(e.message || "Failed to load guest data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return guests;
    return guests.filter((x) =>
      `${x.name} ${x.contact} ${x.gender_name} ${x.dob}`.toLowerCase().includes(s)
    );
  }, [guests, q]);

  function pickGender(defaultValue) {
    const txt = lookups.genders.map((x) => `${x.gender_id}: ${x.gender_name}`).join("\n");
    return window.prompt(`Choose gender_id:\n${txt}`, defaultValue ?? "");
  }

  function closeMenu() {
    setMenu({ open: false, guest_id: null, top: 0, left: 0 });
    selectedRef.current = null;
  }

  function openMenuForGuest(e, g) {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    selectedRef.current = g;
    setMenu({ open: true, guest_id: g.guest_id, top: rect.bottom + 8, left: rect.right - 160 });
  }

  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") closeMenu(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function createGuest() {
    const name = window.prompt("Guest Name:");
    if (!name?.trim()) return;

    const contact = window.prompt("Contact (e.g. 09xx...):");
    if (!contact?.trim()) return;

    const gender_id = pickGender();
    if (!gender_id) return;

    const dob = window.prompt("Date of Birth (YYYY-MM-DD):", "2000-01-01");
    if (!dob) return;

    const res = await fetch(`${API_BASE}/guests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        contact: contact.trim(),
        gender_id: Number(gender_id),
        dob,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.message || "Failed to create guest");
      return;
    }
    await loadAll();
  }

  async function editGuest(g) {
    const name = window.prompt("Guest Name:", g.name);
    if (!name?.trim()) return;

    const contact = window.prompt("Contact:", g.contact);
    if (!contact?.trim()) return;

    const gender_id = pickGender(String(g.gender_id));
    if (!gender_id) return;

    const dob = window.prompt("Date of Birth (YYYY-MM-DD):", g.dob);
    if (!dob) return;

    const res = await fetch(`${API_BASE}/guests/${g.guest_id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        contact: contact.trim(),
        gender_id: Number(gender_id),
        dob,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.message || "Failed to update guest");
      return;
    }
    await loadAll();
  }

  async function deleteGuest(g) {
    if (!window.confirm(`Delete "${g.name}"?`)) return;

    const res = await fetch(`${API_BASE}/guests/${g.guest_id}`, { method: "DELETE" });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.message || "Failed to delete guest");
      return;
    }
    await loadAll();
  }

  return (
    <>
      {menu.open && (
        <div onClick={closeMenu} style={{ position: "fixed", inset: 0, background: "transparent", zIndex: 99998 }} />
      )}

      {menu.open && (
        <div style={{
          position: "fixed", top: menu.top, left: menu.left, background: "#fff",
          borderRadius: 16, boxShadow: "0 18px 40px rgba(0,0,0,0.18)", padding: 8,
          zIndex: 99999, minWidth: 160,
        }}>
          <button onClick={() => { const g = selectedRef.current; closeMenu(); if (g) editGuest(g); }}
            style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", border: "none", background: "transparent", cursor: "pointer", borderRadius: 12 }}>
            Edit
          </button>
          <button onClick={() => { const g = selectedRef.current; closeMenu(); if (g) deleteGuest(g); }}
            style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", border: "none", background: "transparent", cursor: "pointer", borderRadius: 12, color: "#c0392b" }}>
            Delete
          </button>
        </div>
      )}

      <header className="top-bar g-topbar">
        <h1 className="page-title">Guest</h1>

        <div className="g-actions">
          <div className="search-wrap">
            <img src="/assets/images/search.png" alt="search" />
            <input
              type="text"
              placeholder="Search guest..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>
      </header>

      <section className="g-card">
        <div className="g-table-wrap">
          <table className="g-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Contact</th>
                <th>Gender</th>
                <th>Date of Birth</th>
                <th className="col-actions">...</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: 18, opacity: 0.7 }}>Loading...</td>
                </tr>
              ) : (
                <>
                  {filtered.map((g) => (
                    <tr key={g.guest_id}>
                      <td>{g.name}</td>
                      <td>{g.contact}</td>
                      <td>{g.gender_name}</td>
                      <td>{g.dob}</td>
                      <td className="td-action">
                        <button
                          onClick={(e) => openMenuForGuest(e, g)}
                          style={{
                            background: "transparent", border: "none", fontSize: "22px",
                            cursor: "pointer", fontWeight: "900", lineHeight: "1",
                            padding: "4px 10px", borderRadius: 10, color: "#2C0735",
                          }}
                          title="More"
                        >
                          ...
                        </button>
                      </td>
                    </tr>
                  ))}

                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", padding: 18, opacity: 0.7 }}>
                        No guests found
                      </td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <button className="inv-new-btn" onClick={createGuest} type="button">
        + New Guest
      </button>
    </>
  );
}
