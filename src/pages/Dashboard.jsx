import { useEffect, useMemo, useRef, useState } from "react";
import Chart from "chart.js/auto";
import { apiFetch } from "../lib/api";

export default function Dashboard() {
  const GUEST_TARGET = "/transactions";

  const [dash, setDash] = useState({
    totalRooms: 0,
    statusCounts: [],
    roomList: [],
  });

  const [inv, setInv] = useState({
    summary: {
      totalItems: 0,
      lowStockCount: 0,
      outOfStockCount: 0,
      availableCount: 0,
      threshold: 100,
    },
    lowStockItems: [],
  });

  const [damages, setDamages] = useState([]);

  const chartRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const [roomsData, invSummary, lowStockItems, damagesData] = await Promise.all([
          apiFetch("/dashboard/rooms"),
          apiFetch("/inventory/summary"),
          apiFetch("/inventory/low-stock?limit=10"),
          apiFetch("/damages?limit=10"),
        ]);

        setDash({
          totalRooms: roomsData.totalRooms || 0,
          statusCounts: Array.isArray(roomsData.statusCounts) ? roomsData.statusCounts : [],
          roomList: Array.isArray(roomsData.roomList) ? roomsData.roomList : [],
        });

        setInv({
          summary: {
            totalItems: invSummary.totalItems || 0,
            availableCount: invSummary.availableCount || 0,
            lowStockCount: invSummary.lowStockCount || 0,
            outOfStockCount: invSummary.outOfStockCount || 0,
            threshold: invSummary.threshold ?? 100,
          },
          lowStockItems: Array.isArray(lowStockItems) ? lowStockItems : [],
        });

        setDamages(Array.isArray(damagesData) ? damagesData : []);
      } catch (e) {
        console.error("Dashboard load failed:", e);
      }
    })();
  }, []);

  const countsMap = useMemo(() => {
    const m = new Map();
    dash.statusCounts.forEach((s) => m.set(s.status_name, Number(s.count) || 0));
    return m;
  }, [dash.statusCounts]);

  const available = countsMap.get("Available") || 0;
  const cleaning = countsMap.get("Cleaning") || 0;
  const notAvailable = countsMap.get("Not available") || 0;

  const labels = useMemo(() => dash.statusCounts.map((s) => s.status_name), [dash.statusCounts]);
  const values = useMemo(() => dash.statusCounts.map((s) => Number(s.count) || 0), [dash.statusCounts]);

  useEffect(() => {
    const canvas = document.getElementById("roomStatusChart");
    if (!canvas) return;

    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    const ctx = canvas.getContext("2d");

    chartRef.current = new Chart(ctx, {
      type: "doughnut",
      data: {
        datasets: [
          {
            data: values,
            borderWidth: 0,
            backgroundColor: labels.map((name) => {
              const s = String(name || "").toLowerCase();
              if (s === "available") return "#2ecc71";
              if (s === "cleaning") return "#f1c40f";
              return "#e74c3c";
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
    if (s === "available") return "green";
    if (s === "cleaning") return "yellow";
    return "red";
  }

  return (
    <>
      {/* Summary Cards */}
      <section className="summary-cards">
        <div className="cards-row">
          <a href="/room" className="card">
            <p>Room Available</p>
            <h3>{available}</h3>
          </a>
          <a href="/room" className="card">
            <p>Cleaning</p>
            <h3>{cleaning}</h3>
          </a>
          <a href="/room" className="card">
            <p>Not available</p>
            <h3>{notAvailable}</h3>
          </a>
        </div>

        <div className="cards-divider" />

        <div className="cards-row">
          <a href="/inventory" className="card">
            <p>Inventory Available</p>
            <h3>{inv.summary.availableCount}</h3>
          </a>
          <a href="/inventory" className="card">
            <p>Low Stock</p>
            <h3>{inv.summary.lowStockCount}</h3>
          </a>
          <a href="/inventory" className="card">
            <p>Out of Stock</p>
            <h3>{inv.summary.outOfStockCount}</h3>
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
                <li><span className="legend-dot green"></span>Available</li>
                <li><span className="legend-dot yellow"></span>Cleaning</li>
                <li><span className="legend-dot red"></span>Not available</li>
              </ul>
              <div className="chart-placeholder">
                <canvas id="roomStatusChart"></canvas>
              </div>
            </div>
            <div className="room-bottom">
              <ul className="room-list">
                {dash.roomList.map((r) => (
                  <li key={r.room_id} data-status={String(r.status_name || "").toLowerCase()}>
                    <span className={`dot ${statusToDotClass(r.status_name)}`} />
                    {r.room_number}{" "}
                    <small>{r.type_name} - ₱{r.base_rate}</small>
                  </li>
                ))}
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
                  {inv.lowStockItems.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ opacity: 0.7 }}>No low stock items</td>
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
                  <th>Guest</th>
                  <th>Status</th>
                  <th>Charge</th>
                </tr>
              </thead>
              <tbody>
                {damages.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ opacity: 0.7 }}>No damages recorded</td>
                  </tr>
                ) : (
                  damages.map((d) => (
                    <tr
                      key={d.gdam_id}
                      className="damage-row"
                      style={{ cursor: "pointer" }}
                      onClick={() => (window.location.href = GUEST_TARGET)}
                    >
                      <td>{d.item_name}</td>
                      <td>{d.guest_name || "—"}</td>
                      <td>{d.damage_status}</td>
                      <td>₱{Number(d.charge_amount || 0).toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
}