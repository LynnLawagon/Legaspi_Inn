import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";

import Auth from "./pages/AuthPage";
import Transactions from "./pages/Transactions";
import Dashboard from "./pages/Dashboard";
import Room from "./pages/Room";
import Guest from "./pages/Guest";
import Inventory from "./pages/Inventory";

export default function App() {
  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />

      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/transactions" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
      <Route path="/rooms" element={<ProtectedRoute><Room /></ProtectedRoute>} />
      <Route path="/guests" element={<ProtectedRoute><Guest /></ProtectedRoute>} />
      <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />

      <Route path="*" element={<Auth />} />
    </Routes>
  );
}