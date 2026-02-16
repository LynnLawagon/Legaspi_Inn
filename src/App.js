import { BrowserRouter, Routes, Route } from "react-router-dom";
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
          <Route path="/" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/room" element={<Room />} />
          <Route path="/guest" element={<Guest />} />
          <Route path="/inventory" element={<Inventory />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
