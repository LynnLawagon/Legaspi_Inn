// src/Layout.jsx
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import "./App.css";
import UserModal from "./components/UserModal";
import CalculatorModal from "./components/CalculatorModal";
import { clearSession, getSession } from "./utils/auth";

export default function Layout() {
  const [userOpen, setUserOpen] = useState(false);
  const [calcOpen, setCalcOpen] = useState(false);

  // ✅ responsive sidebar (collapse only on small screens)
  const [isSmall, setIsSmall] = useState(false);
  const [sbOpen, setSbOpen] = useState(true); // desktop default open

  // ✅ badge count (temporary)
  const [salesCount] = useState(0);

  const navigate = useNavigate();

  const session = getSession();
  const user = session?.user || null;

  function handleLogout() {
    clearSession();
    setUserOpen(false);
    navigate("/login", { replace: true });
  }

  useEffect(() => {
    const onResize = () => {
      const small = window.innerWidth <= 720;
      setIsSmall(small);

      // desktop: always open
      if (!small) {
        setSbOpen(true);
      } else {
        // small: default collapsed
        setSbOpen(false);
      }
    };

    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // ✅ sidebar class:
  // desktop => always open
  // small => open/collapsed depends on sbOpen
  const sidebarClass = !isSmall
    ? "sidebar open"
    : sbOpen
    ? "sidebar open"
    : "sidebar collapsed";

  return (
    <div className="container">
      <aside className={sidebarClass}>
        <div className="sb-top">
          <div className="logo">
            <img src="/assets/images/logo.png" alt="Legaspi Inn Logo" />
          </div>

          {/* ✅ ALWAYS render button (CSS will show it only on small screens) */}
          <button
            type="button"
            className="sb-toggle"
            aria-label={sbOpen ? "Close sidebar" : "Open sidebar"}
            onClick={() => setSbOpen((v) => !v)}
          >
            ☰
          </button>
        </div>

        <nav className="menu">
          <ul>
            <li>
              <NavLink to="/dashboard" end>
                <img src="/assets/images/sidebar/dashboard.png" alt="dashboard" />
                <span className="sb-text">Dashboard</span>
              </NavLink>
            </li>

            <li>
              <NavLink to="/transactions">
                <img
                  src="/assets/images/sidebar/transaction.png"
                  alt="transaction"
                />
                <span className="sb-text">Transactions</span>
              </NavLink>
            </li>

            <li>
              <NavLink to="/rooms">
                <img src="/assets/images/sidebar/room.png" alt="room" />
                <span className="sb-text">Room</span>
              </NavLink>
            </li>

            <li>
              <NavLink to="/guests">
                <img src="/assets/images/sidebar/guest.png" alt="guest" />
                <span className="sb-text">Guest</span>
              </NavLink>
            </li>

            <li>
              <NavLink to="/inventory">
                <img src="/assets/images/sidebar/inventory.png" alt="inventory" />
                <span className="sb-text">Inventory</span>
              </NavLink>
            </li>

            <li>
              <NavLink to="/sales">
                <img src="/assets/images/sidebar/sales.png" alt="sales" />
                <span className="sb-text">Sales</span>
                {salesCount > 0 && (
                  <span className="side-badge">{salesCount}</span>
                )}
              </NavLink>
            </li>
          </ul>
        </nav>

        <div
          className="employee"
          role="button"
          tabIndex={0}
          onClick={() => setUserOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setUserOpen(true);
            }
          }}
        >
          <img src="/assets/images/user.png" alt="employee" />
          <span className="sb-text">{user?.username || "Employee"}</span>
        </div>
      </aside>

      <main className="content">
        <header className="top-bar layout-topbar">
          <div className="top-icons">
            <img
              src="/assets/images/calculator.png"
              alt="calculator"
              className="calculator"
              role="button"
              tabIndex={0}
              onClick={() => setCalcOpen(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") setCalcOpen(true);
              }}
            />
          </div>
        </header>

        <div className="page-slot">
          <Outlet />
        </div>
      </main>

      <UserModal
        open={userOpen}
        onClose={() => setUserOpen(false)}
        onLogout={handleLogout}
        user={user}
      />
      <CalculatorModal open={calcOpen} onClose={() => setCalcOpen(false)} />
    </div>
  );
}