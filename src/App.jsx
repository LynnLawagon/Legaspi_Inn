import { Routes, Route } from "react-router-dom";
import Layout from "./Layout";
import Dashboard from "./pages/Dashboard";
import Room from "./pages/Room";
import Inventory from "./pages/Inventory";
import Transactions from "./pages/Transactions";
import Guest from "./pages/Guest";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/rooms" element={<Room />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/guests" element={<Guest />} />
      </Route>
    </Routes>
  );
}