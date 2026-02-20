import { useEffect, useMemo, useRef, useState } from "react";
import Chart from "chart.js/auto";
import EmployeeDamageModal from "../components/EmployeeDamageModal";

const API_BASE = "http://localhost:5000/api";

export default function Dashboard() {
  const GUEST_TARGET = "/transactions";

  // ✅ Employee Damage Modal state
  const [edmOpen, setEdmOpen] = useState(false);
  const [edmUser, setEdmUser] = useState(null);
  const [edmRows, setEdmRows] = useState([]);

  // ✅ placeholder damages list (add employee_id / employee_name for employee rows)
  const damages = [
    { id: 1, item: "Bed", category: "Furniture", status: "Pending", role: "guest" },
    { id: 2, item: "Sheets", category: "Bedding", status: "Pending", role: "guest" },

    // ✅ employee rows with specific employee
    {
      id: 3,
      item: "Mug",
      category: "Supplies",
      status: "Pending",
      role: "employee",
      employee_id: "U0003",
      employee_name: "Aira Dela Cruz",
    },
    {
      id: 4,
      item: "Walls",
      category: "Structure",
      status: "Resolved",
      role: "employee",
      employee_id: "U0001",
      employee_name: "Employee",
    },
    {
      id: 5,
      item: "Bed",
      category: "Furniture",
      status: "Resolved",
      role: "employee",
      employee_id: "U0002",
      employee_name: "Mark Santos",
    },
  ];

  // ✅ dashboard room state
  const [dash, setDash] = useState({
    totalRooms: 0,
    statusCounts: [],
    roomList: [],
  });

  // ✅ inventory dashboard state
  const [inv, setInv] = useState({
    summary: {
      totalItems: 0,
      lowStockCount: 0,
      outOfStockCount: 0,
      lowStockThreshold: 5,
      availableCount: 0,
      threshold: 100,
    },
    lowStockItems: [],
  });

  const chartRef = useRef(null);

  // ✅ load rooms + inventory dashboard data
  useEffect(() => {
    (async () => {
      try {
        const [roomsRes, invSumRes, lowRes] = await Promise.all([
          fetch(`${API_BASE}/dashboard/rooms`),
          fetch(`${API_BASE}/inventory/summary`),
          fetch(`${API_BASE}/inventory/low-stock?limit=10`),
        ]);

        const roomsData = await roomsRes.json();
        const invSummary = await invSumRes.json();
        const lowStockItems = await lowRes.json();

        setDash({
          totalRooms: roomsData.totalRooms || 0,
          statusCounts: Array.isArray(roomsData.statusCounts)
            ? roomsData.statusCounts
            : [],
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

  const labels = useMemo(
    () => dash.statusCounts.map((s) => s.status_name),
    [dash.statusCounts]
  );

  const values = useMemo(
    () => dash.statusCounts.map((s) => Number(s.count) || 0),
    [dash.statusCounts]
  );

  // ✅ chart effect (no duplicates)
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
            hoverBackgroundColor: labels.map((name) => {
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

  // ✅ OPEN ACTION: guest redirect / employee open modal
  async function handleDamageRowClick(damageRow) {
    const r = String(damageRow?.role || "").toLowerCase();

    if (r === "guest") {
      window.location.href = GUEST_TARGET;
      return;
    }

    if (r === "employee") {
      const user = {
        user_id: damageRow?.employee_id ?? "U0001",
        name: damageRow?.employee_name ?? "Employee",
      };

      setEdmUser(user);

      try {
        // ✅ If naa na kay backend route, use this:
        // const res = await fetch(`${API_BASE}/employee-damages?user_id=${encodeURIComponent(user.user_id)}`);
        // const rows = await res.json();
        // setEdmRows(Array.isArray(rows) ? rows : []);

        // ✅ Placeholder rows (demo)
        setEdmRows([
          {
            edam_id: 1,
            inventory_id: 12,
            inventory_name: damageRow?.item ?? "Inventory",
            date_reported: "2026-02-20",
            status_id: 1,
            cost_to_hotel: 150,
          },
          {
            edam_id: 2,
            inventory_id: 15,
            inventory_name: "Another Item",
            date_reported: "2026-02-19",
            status_id: 2,
            cost_to_hotel: 500,
          },
        ]);
      } catch (e) {
        console.error("Load employee damages failed:", e);
        setEdmRows([]);
      }

      setEdmOpen(true);
    }
  }

  return (
    <>
      {/* Summary Cards */}
      <section className="summary-cards">
        {/* Row 1: ROOM STATUS */}
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

        {/* Row 2: INVENTORY STATUS */}
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
                {dash.roomList.map((r) => (
                  <li
                    key={r.room_id}
                    data-status={String(r.status_name || "").toLowerCase()}
                  >
                    <span className={`dot ${statusToDotClass(r.status_name)}`} />
                    {r.room_number}{" "}
                    <small>
                      {r.type_name} - ₱{r.base_rate}
                    </small>
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

          {/* ✅ Damages (NO <a> wrapper) */}
          <div className="table-card">
            <h3>Damages</h3>

            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {damages.map((d) => (
                  <tr
                    key={d.id}
                    className="damage-row"
                    data-role={d.role}
                    onClick={() => handleDamageRowClick(d)}
                    style={{ cursor: "pointer" }}
                  >
                    <td>{d.item}</td>
                    <td>{d.category}</td>
                    <td>{d.status}</td>
                    <td>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDamageRowClick(d);
                        }}
                      >
                        {d.role}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ✅ Employee Damage Modal */}
      <EmployeeDamageModal
        open={edmOpen}
        onClose={() => setEdmOpen(false)}
        user={edmUser}
        damageRows={edmRows}
      />
    </>
  );
}