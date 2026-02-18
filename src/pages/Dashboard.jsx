import { useEffect, useMemo, useRef, useState } from "react";
import Chart from "chart.js/auto";

const API_BASE = "http://localhost:5000/api";

export default function Dashboard() {
  const [dash, setDash] = useState({
    totalRooms: 0,
    statusCounts: [],
    roomList: [],
  });

  const chartRef = useRef(null);

  useEffect(() => {
    (async () => {
      const res = await fetch(`${API_BASE}/dashboard/rooms`);
      const data = await res.json();

      setDash({
        totalRooms: data.totalRooms || 0,
        statusCounts: Array.isArray(data.statusCounts) ? data.statusCounts : [],
        roomList: Array.isArray(data.roomList) ? data.roomList : [],
      });
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

  // chart inputs
  const labels = dash.statusCounts.map((s) => s.status_name);
  const values = dash.statusCounts.map((s) => Number(s.count) || 0);

  // Build / update chart when labels/values change
  useEffect(() => {
    const canvas = document.getElementById("roomStatusChart");
    if (!canvas) return;

    // destroy old chart if exists
    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    const ctx = canvas.getContext("2d");
    chartRef.current = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels,
        datasets: [{ data: values, borderWidth: 1 }],
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
  }, [labels.join("|"), values.join("|")]);

  // helper for dots: match your CSS dot colors
  function statusToDotClass(statusName) {
    const s = String(statusName || "").toLowerCase();
    if (s === "available") return "green";
    if (s === "cleaning") return "yellow";
    // Not available (or anything else) goes red
    return "red";
  }

  return (
    <>
      {/* Summary Cards */}
      <section className="summary-cards">
        <a href="/room" className="card">
          <p>Total Rooms</p>
          <h3>{dash.totalRooms}</h3>
        </a>

        <a href="/room" className="card">
          <p>Available</p>
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
      </section>

      {/* Main Dashboard */}
      <section className="dashboard-main">
        <a href="/room" className="chart-link">
          <div className="chart-section">
            <h3>Room Status</h3>

            <div className="room-top">
              {/* Legend follows DB status */}
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
                  <li key={r.room_id} data-status={String(r.status_name || "").toLowerCase()}>
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
          {/* keep these for now (next we can connect inventory + damages too) */}
          <a href="/inventory" className="card-link">
            <div className="table-card">
              <h3>Low Stock Items</h3>
              <table>
                <thead>
                  <tr>
                    <th>Item Name</th>
                    <th>Quantity</th>
                    <th>Category</th>
                    <th>Cost</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Soap</td>
                    <td>3</td>
                    <td>Toiletries</td>
                    <td>70</td>
                  </tr>
                  <tr>
                    <td>Bottled Water</td>
                    <td>4</td>
                    <td>Amenities</td>
                    <td>150</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </a>

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
                <tr>
                  <td>Bed</td>
                  <td>Furniture</td>
                  <td>Pending</td>
                  <td>
                    <button>guest</button>
                  </td>
                </tr>
                <tr>
                  <td>Shoes</td>
                  <td>Booking</td>
                  <td>Pending</td>
                  <td>
                    <button>guest</button>
                  </td>
                </tr>
                <tr>
                  <td>Mug</td>
                  <td>Supplies</td>
                  <td>Pending</td>
                  <td>
                    <button>employee</button>
                  </td>
                </tr>
                <tr>
                  <td>Matt</td>
                  <td>Furniture</td>
                  <td>Resolved</td>
                  <td>
                    <button>employee</button>
                  </td>
                </tr>
                <tr>
                  <td>Bed</td>
                  <td>Furniture</td>
                  <td>Resolved</td>
                  <td>
                    <button>employee</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
}
