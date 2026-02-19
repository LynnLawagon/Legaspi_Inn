import { NavLink, Outlet } from "react-router-dom";
import { useState } from "react";
import "./App.css";
import UserModal from "./components/UserModal";
import CalculatorModal from "./components/CalculatorModal";

export default function Layout() {
  const [userOpen, setUserOpen] = useState(false);
  const [calcOpen, setCalcOpen] = useState(false);

  return (
    <div className="container">
      <aside className="sidebar">
  <div className="logo">
    <img src="/assets/images/logo.png" alt="Legaspi Inn Logo" />
  </div>

  <nav className="menu">
    <ul>
      <li>
        <NavLink to="/" end>
          <img src="/assets/images/sidebar/dashboard.png" alt="dashboard" />
          Dashboard
        </NavLink>
      </li>

      <li>
        <NavLink to="/transactions">
          <img src="/assets/images/sidebar/transaction.png" alt="transaction" />
          Transactions
        </NavLink>
      </li>

      <li>
        <NavLink to="/room">
          <img src="/assets/images/sidebar/room.png" alt="room" />
          Room
        </NavLink>
      </li>

      <li>
        <NavLink to="/guest">
          <img src="/assets/images/sidebar/guest.png" alt="guest" />
          Guest
        </NavLink>
      </li>

      <li>
        <NavLink to="/inventory">
          <img src="/assets/images/sidebar/inventory.png" alt="inventory" />
          Inventory
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
    Employee
  </div>
</aside>

      {/* ✅ ONLY ONE MAIN */}
      <main className="content">
        {/* ✅ GLOBAL TOP BAR */}
        <header className="top-bar">
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

        {/* ✅ PAGE CONTENT */}
        <Outlet />
      </main>

      {/* ✅ MODALS OUTSIDE */}
      <UserModal open={userOpen} onClose={() => setUserOpen(false)} />
      <CalculatorModal open={calcOpen} onClose={() => setCalcOpen(false)} />
    </div>
  );
}
