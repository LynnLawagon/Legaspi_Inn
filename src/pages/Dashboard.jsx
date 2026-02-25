// src/pages/Dashboard.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import Chart from "chart.js/auto";
import { apiFetch } from "../lib/api";

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");

  const [damages, setDamages] = useState([]);

  const [dash, setDash] = useState({
    totalRooms: 0,
    statusCounts: [], // [{status_name, count}]
    roomList: [], // [{room_id, room_number, status_name, type_name, base_rate}]
  });

  const [inv, setInv] = useState({
    summary: {
      totalItems: 0,
      lowStockCount: 0,
      outOfStockCount: 0,
      availableCount: 0,
      threshold: 100,
    },
    lowStockItems: [], // [{inv_id, name, quantity, category_name}]
  });

  const chartRef = useRef(null);

  async function apiJsonOrThrow(path) {
  const res = await apiFetch(path);

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const msg =
      (data && (data.message || data.error)) ||
      `${res.status} ${res.statusText}` ||
      "Request failed";
    throw new Error(`${path} -> ${msg}`);
  }

  return data;
  }

  async function loadDamages() {
    try {
      const data = await apiJsonOrThrow(`/damages?limit=10`);
      setDamages(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to load damages:", e);
      setDamages([]);
    }
  }

  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      setErrMsg("");

      try {
        // Load everything needed for dashboard
        const [roomsData, invSummary, lowStockItems] = await Promise.all([
          apiJsonOrThrow("/dashboard/rooms"),
          apiJsonOrThrow("/inventory/summary"),
          apiJsonOrThrow("/inventory/low-stock?limit=10"),
        ]);

        if (!mounted) return;

        setDash({
          totalRooms: Number(roomsData?.totalRooms || 0),
          statusCounts: Array.isArray(roomsData?.statusCounts) ? roomsData.statusCounts : [],
          roomList: Array.isArray(roomsData?.roomList) ? roomsData.roomList : [],
        });

        setInv({
          summary: {
            totalItems: Number(invSummary?.totalItems || 0),
            availableCount: Number(invSummary?.availableCount || 0),
            lowStockCount: Number(invSummary?.lowStockCount || 0),
            outOfStockCount: Number(invSummary?.outOfStockCount || 0),
            threshold: invSummary?.threshold ?? 100,
          },
          lowStockItems: Array.isArray(lowStockItems) ? lowStockItems : [],
        });

        // load damages after the main info (or include in Promise.all if you want)
        loadDamages();
      } catch (e) {
        console.error("Dashboard load failed:", e);
        if (!mounted) return;

        setErrMsg(e.message || "Dashboard failed to load.");

        // keep UI stable if one API fails
        setDash({ totalRooms: 0, statusCounts: [], roomList: [] });
        setInv({
          summary: {
            totalItems: 0,
            availableCount: 0,
            lowStockCount: 0,
            outOfStockCount: 0,
            threshold: 100,
          },
          lowStockItems: [],
        });
        setDamages([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // Build map {status_name -> count}
  const countsMap = useMemo(() => {
    const m = new Map();
    (dash.statusCounts || []).forEach((s) => {
      const key = String(s?.status_name || "");
      m.set(key, Number(s?.count) || 0);
    });
    return m;
  }, [dash.statusCounts]);

  // Accept common variations coming from DB
  const roomAvailable =
    countsMap.get("Available") ||
    countsMap.get("available") ||
    countsMap.get("Room Available") ||
    0;

  const roomCleaning =
    countsMap.get("Cleaning") ||
    countsMap.get("cleaning") ||
    0;

  const roomNotAvailable =
    countsMap.get("Not available") ||
    countsMap.get("Not Available") ||
    countsMap.get("not available") ||
    countsMap.get("Unavailable") ||
    countsMap.get("unavailable") ||
    0;

  const labels = useMemo(
    () => (dash.statusCounts || []).map((s) => String(s?.status_name || "Unknown")),
    [dash.statusCounts]
  );

  const values = useMemo(
    () => (dash.statusCounts || []).map((s) => Number(s?.count) || 0),
    [dash.statusCounts]
  );

  // Create/destroy chart safely
  useEffect(() => {
    const canvas = document.getElementById("roomStatusChart");
    if (!canvas) return;

    // destroy existing
    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    // if no data, don't create chart
    const total = values.reduce((a, b) => a + b, 0);
    if (!total) return;

    const ctx = canvas.getContext("2d");

    chartRef.current = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels,
        datasets: [
          {
            data: values,
            borderWidth: 0,
            backgroundColor: labels.map((name) => {
              const s = String(name || "").toLowerCase();
              if (s.includes("not")) return "#e74c3c";
              if (s.includes("clean")) return "#f1c40f";
              if (s.includes("avail")) return "#2ecc71";
              return "#211817";
            }),
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        cutout: "70%",
      },
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [labels, values]);

  function statusToDotClass(statusName) {
    const s = String(statusName || "").toLowerCase();
    if (s.includes("not")) return "red";
    if (s.includes("clean")) return "yellow";
    if (s.includes("avail")) return "green";

    return "gray";
  }

  return (
    <>
      {/* Optional: show API error instead of silent zeros */}
      {errMsg && (
        <div
          style={{
            margin: "10px 0 16px",
            padding: "12px 14px",
            borderRadius: 12,
            background: "rgba(192,57,43,0.10)",
            color: "##ab1100",
            fontWeight: 600,
          }}
        >
          {errMsg}
        </div>
      )}

      {/* Summary Cards */}
      <section className="summary-cards">
        <div className="cards-row">
          <a href="/room" className="card">
            <p>Room Available</p>
            <h3>{loading ? "…" : roomAvailable}</h3>
          </a>

          <a href="/room" className="card">
            <p>Cleaning</p>
            <h3>{loading ? "…" : roomCleaning}</h3>
          </a>

          <a href="/room" className="card">
            <p>Not available</p>
            <h3>{loading ? "…" : roomNotAvailable}</h3>
          </a>
        </div>

        <div className="cards-divider" />

        <div className="cards-row">
          <a href="/inventory" className="card">
            <p>Inventory Available</p>
            <h3>{loading ? "…" : inv.summary.availableCount}</h3>
          </a>

          <a href="/inventory" className="card">
            <p>Low Stock</p>
            <h3>{loading ? "…" : inv.summary.lowStockCount}</h3>
          </a>

          <a href="/inventory" className="card">
            <p>Out of Stock</p>
            <h3>{loading ? "…" : inv.summary.outOfStockCount}</h3>
          </a>
        </div>
      </section>

      {/* Main Dashboard */}
      <section className="dashboard-main">
        <a href="/room" className="chart-link">
          <div className="chart-section">
            <h3>Room Status</h3>

            <div className="room-top">
              <ul className="status-legend">
                <li>
                  <span className="legend-dot green"></span>Available
                </li>
                <li>
                  <span className="legend-dot yellow"></span>Cleaning
                </li>
                <li>
                  <span className="legend-dot red"></span>Not available
                </li>
              </ul>

              <div className="chart-placeholder">
                {/* If there’s no data, chart will not render (effect exits early) */}
                <canvas id="roomStatusChart"></canvas>
              </div>
            </div>

            <div className="room-bottom">
              <ul className="room-list">
                {dash.roomList.map((r) => (
                  <li
                    key={r.room_id}
                    data-status={String(r.status_name || "").toLowerCase()}
                  >
                    <span className={`dot ${statusToDotClass(r.status_name)}`} />
                    {r.room_number}{" "}
                    <small>
                      {r.type_name} - ₱{Number(r.base_rate || 0)}
                    </small>
                  </li>
                ))}

                {!loading && dash.roomList.length === 0 && (
                  <li style={{ opacity: 0.7 }}>No rooms found.</li>
                )}
              </ul>
            </div>
          </div>
        </a>

        <div className="tables-section">
          {/* Low Stock Items */}
          <a href="/inventory" className="card-link">
            <div className="table-card">
              <h3>Low Stock Item</h3>

              <table>
                <thead>
                  <tr>
                    <th>Item Name</th>
                    <th>Quantity</th>
                    <th>Category</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={3} style={{ opacity: 0.7 }}>
                        Loading...
                      </td>
                    </tr>
                  ) : inv.lowStockItems.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ opacity: 0.7 }}>
                        No low stock items
                      </td>
                    </tr>
                  ) : (
                    inv.lowStockItems.map((it) => (
                      <tr key={it.inv_id}>
                        <td>{it.name}</td>
                        <td>{it.quantity}</td>
                        <td>{it.category_name}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </a>

          {/* Damages */}
          <div className="table-card">
            <h3>Damages</h3>

            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Status</th>
                  <th>Charge</th>
                  <th>Guest / Room</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} style={{ opacity: 0.7, textAlign: "center" }}>
                      Loading...
                    </td>
                  </tr>
                ) : damages.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ opacity: 0.7, textAlign: "center" }}>
                      No damage records
                    </td>
                  </tr>
                ) : (
                  damages.map((d) => (
                    <tr key={d.gdam_id}>
                      <td>{d.item_name}</td>
                      <td>{d.damage_status}</td>
                      <td>₱{Number(d.charge_amount || 0).toFixed(2)}</td>
                      <td>
                        {d.guest_name} / {d.room_number}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <button
              type="button"
              onClick={loadDamages}
              style={{ marginTop: 10, border: "none", cursor: "pointer", opacity: 0.8 }}
            >
              Refresh
            </button>
          </div>
        </div>
      </section>
    </>
  );
}