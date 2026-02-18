import { useEffect, useMemo, useState } from "react";

const API_BASE = "http://localhost:5000/api";

export default function Room() {
  const [rooms, setRooms] = useState([]);
  const [lookups, setLookups] = useState({ roomTypes: [], roomStatuses: [] });
  const [q, setQ] = useState("");

  // for the "..." actions menu
  const [openMenuId, setOpenMenuId] = useState(null);

  async function loadAll() {
    const [roomsRes, lookupsRes] = await Promise.all([
      fetch(`${API_BASE}/rooms`),
      fetch(`${API_BASE}/rooms/lookups`),
    ]);

    const roomsJson = await roomsRes.json();
    const lookupsJson = await lookupsRes.json();

    setRooms(roomsJson);
    setLookups(lookupsJson);
  }

  useEffect(() => {
    loadAll();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rooms;

    return rooms.filter((r) => {
      return (
        String(r.room_number).toLowerCase().includes(s) ||
        String(r.type_name).toLowerCase().includes(s)
      );
    });
  }, [rooms, q]);

  async function createRoom() {
    // prompt-based so we don't alter your UI/CSS
    const room_number = window.prompt("Enter Room Number (e.g. R16):");
    if (!room_number) return;

    const typeLabel = lookups.roomTypes
      .map((t) => `${t.room_type_id}: ${t.type_name} (rate ${t.base_rate}, cap ${t.capacity})`)
      .join("\n");
    const room_type_id = window.prompt(`Enter room_type_id:\n${typeLabel}`);
    if (!room_type_id) return;

    const statusLabel = lookups.roomStatuses
      .map((s) => `${s.status_id}: ${s.status_name}`)
      .join("\n");
    const status_id = window.prompt(`Enter status_id:\n${statusLabel}`);
    if (!status_id) return;

    const res = await fetch(`${API_BASE}/rooms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        room_number: room_number.trim(),
        room_type_id: Number(room_type_id),
        status_id: Number(status_id),
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.message || "Failed to create room");
      return;
    }

    await loadAll();
  }

  async function editRoom(r) {
    const room_number = window.prompt("Room Number:", r.room_number);
    if (!room_number) return;

    const typeLabel = lookups.roomTypes
      .map((t) => `${t.room_type_id}: ${t.type_name} (rate ${t.base_rate}, cap ${t.capacity})`)
      .join("\n");
    const room_type_id = window.prompt(
      `room_type_id (current: ${r.room_type_id})\n${typeLabel}`,
      String(r.room_type_id)
    );
    if (!room_type_id) return;

    const statusLabel = lookups.roomStatuses
      .map((s) => `${s.status_id}: ${s.status_name}`)
      .join("\n");
    const status_id = window.prompt(
      `status_id (current: ${r.status_id})\n${statusLabel}`,
      String(r.status_id)
    );
    if (!status_id) return;

    const res = await fetch(`${API_BASE}/rooms/${r.room_id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        room_number: room_number.trim(),
        room_type_id: Number(room_type_id),
        status_id: Number(status_id),
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.message || "Failed to update room");
      return;
    }

    await loadAll();
  }

  async function deleteRoom(r) {
    const ok = window.confirm(`Delete room ${r.room_number}?`);
    if (!ok) return;

    const res = await fetch(`${API_BASE}/rooms/${r.room_id}`, { method: "DELETE" });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.message || "Failed to delete room");
      return;
    }

    await loadAll();
  }

  return (
    <>
      {/* top bar */}
      <header className="top-bar room-topbar">
        <h1 className="page-title">Room</h1>

        <div className="room-actions">
          <div className="search-wrap">
            <img src="/assets/images/search.png" alt="search" />
            <input
              type="text"
              placeholder="Search by Room # or Type"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          {/* Optional: add button without changing CSS much */}
          <button
            type="button"
            onClick={createRoom}
            style={{
              border: "none",
              borderRadius: 999,
              padding: "10px 14px",
              cursor: "pointer",
              background: "rgba(217,217,217,0.9)",
              color: "#2C0735",
              fontWeight: 700,
              boxShadow: "0 8px 18px rgba(0,0,0,0.10)",
            }}
            title="Add Room"
          >
            + New
          </button>
        </div>
      </header>

      {/* table card */}
      <section className="room-card">
        <div className="room-table-wrap">
          <table className="room-table">
            <colgroup>
              <col style={{ width: "140px" }} />
              <col style={{ width: "160px" }} />
              <col style={{ width: "140px" }} />
              <col style={{ width: "160px" }} />
              <col style={{ width: "180px" }} />
              <col style={{ width: "70px" }} />
            </colgroup>

            <thead>
              <tr>
                <th>Room #</th>
                <th>Type</th>
                <th>Rate</th>
                <th>Capacity</th>
                <th>Status</th>
                <th className="th-more">...</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((r) => (
                <tr key={r.room_id}>
                  <td>{r.room_number}</td>
                  <td>{r.type_name}</td>
                  <td>{Number(r.base_rate).toFixed(2)}</td>
                  <td>{r.capacity}</td>
                  <td>{r.status_name}</td>

                  <td className="td-more" style={{ position: "relative" }}>
                    <img
                      src="/assets/images/more.png"
                      alt="more"
                      onClick={() => setOpenMenuId((prev) => (prev === r.room_id ? null : r.room_id))}
                      style={{ cursor: "pointer" }}
                    />

                    {openMenuId === r.room_id && (
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
                            editRoom(r);
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
                            deleteRoom(r);
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
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: 18, opacity: 0.7 }}>
                    No rooms found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
