import { useEffect, useMemo, useRef, useState } from "react";
import Chart from "chart.js/auto";
import { apiFetch } from "../lib/api";

function fmtMoney(v) {
  const n = Number(v || 0);
  return `₱${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function Dashboard() {
  const ROOM_TARGET = "/rooms";
  const GUEST_TARGET = "/transactions";
  const SALES_TARGET = "/sales";

  const LOWSTOCK_VISIBLE_ROWS = 8;
  const DAMAGES_VISIBLE_ROWS = 8;
  const INV_THRESHOLD = 50;

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
      threshold: INV_THRESHOLD,
    },
    lowStockItems: [],
  });

  const [damages, setDamages] = useState([]);

  const [sales, setSales] = useState({
    summary: { todayTotal: 0, todayCount: 0 },
    recent: [],
  });

  const roomChartRef = useRef(null);
  const salesChartRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const [roomsData, invSummary, lowStockItems, damagesData] = await Promise.all([
          apiFetch("/dashboard/rooms"),
          apiFetch(`/inventory/summary?threshold=${INV_THRESHOLD}`),
          apiFetch(`/inventory/low-stock?limit=50&threshold=${INV_THRESHOLD}`),
          apiFetch("/damages?limit=50"),
        ]);

        setDash({
          totalRooms: roomsData?.totalRooms || 0,
          statusCounts: Array.isArray(roomsData?.statusCounts) ? roomsData.statusCounts : [],
          roomList: Array.isArray(roomsData?.roomList) ? roomsData.roomList : [],
        });

        setInv({
          summary: {
            totalItems: Number(invSummary?.totalItems || 0),
            availableCount: Number(invSummary?.availableCount || 0),
            lowStockCount: Number(invSummary?.lowStockCount || 0),
            outOfStockCount: Number(invSummary?.outOfStockCount || 0),
            threshold: Number(invSummary?.threshold ?? INV_THRESHOLD),
          },
          lowStockItems: Array.isArray(lowStockItems) ? lowStockItems : [],
        });

        setDamages(Array.isArray(damagesData) ? damagesData : []);
      } catch (e) {
        console.error("Dashboard load failed:", e);
      }

      try {
        const [salesSummary, recentSales] = await Promise.all([
          apiFetch("/sales/summary"),
          apiFetch("/sales?limit=50"),
        ]);

        setSales({
          summary: {
            todayTotal: Number(salesSummary?.todayTotal || 0),
            todayCount: Number(salesSummary?.todayCount || 0),
          },
          recent: Array.isArray(recentSales) ? recentSales : [],
        });
      } catch (e) {
        setSales({ summary: { todayTotal: 0, todayCount: 0 }, recent: [] });
      }
    })();
  }, []);

  const countsMap = useMemo(() => {
    const m = new Map();
    (dash.statusCounts || []).forEach((s) => m.set(s.status_name, Number(s.count) || 0));
    return m;
  }, [dash.statusCounts]);

  const available = countsMap.get("Available") || 0;
  const cleaning = countsMap.get("Cleaning") || 0;
  const notAvailable = countsMap.get("Not available") || 0;

  const labels = useMemo(
    () => (dash.statusCounts || []).map((s) => s.status_name),
    [dash.statusCounts]
  );

  const values = useMemo(
    () => (dash.statusCounts || []).map((s) => Number(s.count) || 0),
    [dash.statusCounts]
  );

  useEffect(() => {
    const canvas = document.getElementById("roomStatusChart");
    if (!canvas) return;

    if (roomChartRef.current) {
      roomChartRef.current.destroy();
      roomChartRef.current = null;
    }

    const ctx = canvas.getContext("2d");

    roomChartRef.current = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels,
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
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        cutout: "70%",
      },
    });

    return () => {
      if (roomChartRef.current) {
        roomChartRef.current.destroy();
        roomChartRef.current = null;
      }
    };
  }, [labels, values]);

  const totalRevenue = useMemo(() => {
    return (sales.recent || []).reduce((sum, r) => {
      return sum + (Number(r.total_amount || 0) || 0);
    }, 0);
  }, [sales.recent]);

  const salesTrend = useMemo(() => {
    const year = new Date().getFullYear();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const totals = Array(12).fill(0);

    for (const r of sales.recent || []) {
      const raw = r.sale_date || r.date_created || r.created_at;
      if (!raw) continue;

      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) continue;
      if (d.getFullYear() !== year) continue;

      const m = d.getMonth();
      const amt = Number(r.total_amount || 0) || 0;
      totals[m] += amt;
    }

    return { labels: months, values: totals };
  }, [sales.recent]);

  useEffect(() => {
    const canvas = document.getElementById("salesLineChart");
    if (!canvas) return;

    if (salesChartRef.current) {
      salesChartRef.current.destroy();
      salesChartRef.current = null;
    }

    const ctx = canvas.getContext("2d");

    const gradient = ctx.createLinearGradient(0, 0, 0, 220);
    gradient.addColorStop(0, "rgba(99,102,241,0.28)");
    gradient.addColorStop(1, "rgba(99,102,241,0.02)");

    salesChartRef.current = new Chart(ctx, {
      type: "line",
      data: {
        labels: salesTrend.labels,
        datasets: [
          {
            data: salesTrend.values,
            borderColor: "#6366F1",
            backgroundColor: gradient,
            borderWidth: 3,
            tension: 0.45,
            pointRadius: 4,
            pointHoverRadius: 7,
            pointBackgroundColor: "#ffffff",
            pointBorderColor: "#6366F1",
            pointBorderWidth: 3,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#111827",
            padding: 12,
            displayColors: false,
            callbacks: {
              label: (c) => fmtMoney(Number(c.raw || 0)),
            },
          },
        },
        scales: {
          x: {
            grid: { color: "rgba(0,0,0,0.06)" },
            ticks: { color: "#6b7280" },
          },
          y: {
            beginAtZero: true,
            max: 10000,
            ticks: {
              stepSize: 2000,
              color: "#6b7280",
              callback: (val) => {
                const n = Number(val || 0);
                if (n === 0) return "₱0";
                return `₱${(n / 1000).toFixed(0)}k`;
              },
            },
            grid: { color: "rgba(0,0,0,0.06)" },
          },
        },
      },
    });

    return () => {
      if (salesChartRef.current) {
        salesChartRef.current.destroy();
        salesChartRef.current = null;
      }
    };
  }, [salesTrend.labels, salesTrend.values]);

  useEffect(() => {
    const onResize = () => {
      roomChartRef.current?.resize();
      salesChartRef.current?.resize();
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  function statusToDotClass(statusName) {
    const s = String(statusName || "").toLowerCase();
    if (s === "available") return "green";
    if (s === "cleaning") return "yellow";
    return "red";
  }

  return (
    <div className="dashboard-page">
      <div className="summary-scroll">
        <section className="summary-cards">
          <div className="cards-row">
            <a href={ROOM_TARGET} className="card">
              <p>Room Available</p>
              <h3>{available}</h3>
            </a>
            <a href={ROOM_TARGET} className="card">
              <p>Cleaning</p>
              <h3>{cleaning}</h3>
            </a>
            <a href={ROOM_TARGET} className="card">
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
      </div>

      <section className="dashboard-main">
        <a href={ROOM_TARGET} className="chart-link">
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
                <canvas id="roomStatusChart"></canvas>
              </div>
            </div>

            <div className="room-bottom">
              <ul className="room-list">
                {(dash.roomList || []).map((r) => (
                  <li key={r.room_id} data-status={String(r.status_name || "").toLowerCase()}>
                    <span className={`dot ${statusToDotClass(r.status_name)}`} />
                    {r.room_number} <small>{r.type_name} - ₱{r.base_rate}</small>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </a>

        <div className="tables-section">
          <div
            className="table-card"
            style={{ cursor: "pointer" }}
            onClick={() => (window.location.href = SALES_TARGET)}
            title="View Sales"
          >
            <h3>
              Sales{" "}
              <span style={{ fontSize: 12, opacity: 0.7, fontWeight: 600 }}>
                (Today: ₱{Number(sales.summary.todayTotal || 0).toFixed(2)} • {sales.summary.todayCount} transactions)
              </span>
            </h3>

            <div className="sales-chart-wrap">
              <canvas id="salesLineChart"></canvas>
            </div>
          </div>

          <div className="mini-pair">
            <a href="/inventory" className="card-link">
              <div className="table-card">
                <h3>Low Stock Item</h3>

                <div
                  className="table-scroll"
                  style={{
                    "--trow-h": "44px",
                    maxHeight: `calc(46px + (${LOWSTOCK_VISIBLE_ROWS} * 44px))`,
                  }}
                >
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
                          <td colSpan={3} style={{ opacity: 0.7 }}>
                            No low stock items
                          </td>
                        </tr>
                      ) : (
                        inv.lowStockItems.map((it) => (
                          <tr key={it.inv_id}>
                            <td>{it.item_name}</td>
                            <td>{it.quantity}</td>
                            <td>{it.category_name}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </a>

            <div className="right-stack">
              <div className="table-card">
                <h3>Damages</h3>

                <div
                  className="table-scroll"
                  style={{
                    "--trow-h": "44px",
                    maxHeight: `calc(46px + (${DAMAGES_VISIBLE_ROWS} * 44px))`,
                  }}
                >
                  <table>
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Item</th>
                        <th>Name</th>
                        <th>Charge</th>
                      </tr>
                    </thead>
                    <tbody>
                      {damages.length === 0 ? (
                        <tr>
                          <td colSpan={4} style={{ opacity: 0.7 }}>
                            No damages recorded
                          </td>
                        </tr>
                      ) : (
                        damages.map((d) => (
                          <tr key={d.row_id || `${d.damage_source}-${d.damage_id}`}>
                            <td>{d.damage_source === "employee" ? "Employee" : "Guest"}</td>
                            <td>{d.item_name}</td>
                            <td>{d.person_name || "—"}</td>
                            <td>₱{Number(d.amount || 0).toFixed(2)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div
                className="table-card revenue-card"
                style={{ cursor: "pointer" }}
                onClick={() => (window.location.href = SALES_TARGET)}
                title="View Sales"
              >
                <h3>Total Revenue</h3>

                <div className="revenue-body">
                  <div className="revenue-amt">{fmtMoney(totalRevenue)}</div>
                  <div className="revenue-sub">All recorded transaction revenue</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}