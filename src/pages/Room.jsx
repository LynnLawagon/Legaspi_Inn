import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";

export default function Room() {
  const [rooms, setRooms] = useState([]);
  const [lookups, setLookups] = useState({ types: [], statuses: [] });
  const [q, setQ] = useState("");
  const [openMenuId, setOpenMenuId] = useState(null);

  async function loadAll() {
    try {
      const [roomsJson, lookupsJson] = await Promise.all([
        apiFetch("/rooms"),
        apiFetch("/rooms/lookups"),
      ]);

      setRooms(Array.isArray(roomsJson) ? roomsJson : []);
      setLookups({
        types: Array.isArray(lookupsJson?.types) ? lookupsJson.types : [],
        statuses: Array.isArray(lookupsJson?.statuses) ? lookupsJson.statuses : [],
      });
    } catch (e) {
      console.error(e);
      alert(e.message || "Failed to load rooms");
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rooms;
    return rooms.filter(
      (r) =>
        String(r.room_number || "").toLowerCase().includes(s) ||
        String(r.type_name || "").toLowerCase().includes(s) ||
        String(r.status_name || "").toLowerCase().includes(s)
    );
  }, [rooms, q]);

  async function createRoom() {
    const room_number = window.prompt("Enter Room Number (e.g. R16):");
    if (!room_number) return;

    const typeLabel = (lookups.types || [])
      .map(
        (t) =>
          `${t.room_type_id}: ${t.type_name} (rate ${t.base_rate}, cap ${t.capacity})`
      )
      .join("\n");
    const room_type_id = window.prompt(`Enter room_type_id:\n${typeLabel}`);
    if (!room_type_id) return;

    const statusLabel = (lookups.statuses || [])
      .map((s) => `${s.room_status_id}: ${s.status_name}`)
      .join("\n");
    const room_status_id = window.prompt(`Enter room_status_id:\n${statusLabel}`);
    if (!room_status_id) return;

    try {
      await apiFetch("/rooms", {
        method: "POST",
        body: JSON.stringify({
          room_number: room_number.trim(),
          room_type_id: Number(room_type_id),
          room_status_id: Number(room_status_id),
        }),
      });
      await loadAll();
    } catch (e) {
      alert(e.message || "Failed to create room");
    }
  }

  async function editRoom(r) {
    const room_number = window.prompt("Room Number:", r.room_number);
    if (!room_number) return;

    const typeLabel = (lookups.types || [])
      .map(
        (t) =>
          `${t.room_type_id}: ${t.type_name} (rate ${t.base_rate}, cap ${t.capacity})`
      )
      .join("\n");
    const room_type_id = window.prompt(
      `room_type_id (current: ${r.room_type_id})\n${typeLabel}`,
      String(r.room_type_id)
    );
    if (!room_type_id) return;

    const statusLabel = (lookups.statuses || [])
      .map((s) => `${s.room_status_id}: ${s.status_name}`)
      .join("\n");
    const room_status_id = window.prompt(
      `room_status_id (current: ${r.room_status_id})\n${statusLabel}`,
      String(r.room_status_id)
    );
    if (!room_status_id) return;

    try {
      await apiFetch(`/rooms/${r.room_id}`, {
        method: "PUT",
        body: JSON.stringify({
          room_number: room_number.trim(),
          room_type_id: Number(room_type_id),
          room_status_id: Number(room_status_id),
        }),
      });
      await loadAll();
    } catch (e) {
      alert(e.message || "Failed to update room");
    }
  }

  async function deleteRoom(r) {
    if (!window.confirm(`Delete room ${r.room_number}?`)) return;

    try {
      await apiFetch(`/rooms/${r.room_id}`, { method: "DELETE" });
      await loadAll();
    } catch (e) {
      alert(e.message || "Failed to delete room");
    }
  }

  return (
    <div className="room-page">
      <header className="page-header">
        <h1 className="page-title">Room</h1>

        <div className="page-actions">
          <div className="search-wrap">
            <img src="/assets/images/search.png" alt="search" />
            <input
              type="text"
              placeholder="Search by Room # or Type"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <button type="button" onClick={createRoom} className="room-new-btn">
            + New
          </button>
        </div>
      </header>

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
                      onClick={() =>
                        setOpenMenuId((prev) => (prev === r.room_id ? null : r.room_id))
                      }
                      style={{ cursor: "pointer" }}
                    />

                    {openMenuId === r.room_id && (
                      <div className="room-menu" onMouseLeave={() => setOpenMenuId(null)}>
                        <button
                          onClick={() => {
                            setOpenMenuId(null);
                            editRoom(r);
                          }}
                        >
                          Edit
                        </button>

                        <button
                          className="danger"
                          onClick={() => {
                            setOpenMenuId(null);
                            deleteRoom(r);
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
    </div>
  );
}