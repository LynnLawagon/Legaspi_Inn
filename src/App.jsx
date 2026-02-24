import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./Layout";

import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import Room from "./pages/Room";
import Guest from "./pages/Guest";
import Inventory from "./pages/Inventory";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/room" element={<Room />} />
          <Route path="/guest" element={<Guest />} />
          <Route path="/inventory" element={<Inventory />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}