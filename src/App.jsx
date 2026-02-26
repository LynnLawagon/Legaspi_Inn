// src/App.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./Layout";

import Login from "./pages/Login";
import Signup from "./pages/Signup";

import Dashboard from "./pages/Dashboard";
import Room from "./pages/Room";
import Inventory from "./pages/Inventory";
import Transactions from "./pages/Transactions";
import Guest from "./pages/Guest";

import { getToken } from "./utils/auth";

function RequireAuth({ children }) {
  const token = getToken();
  return token ? children : <Navigate to="/login" replace />;
}

function HomeRedirect() {
  const token = getToken();
  return <Navigate to={token ? "/dashboard" : "/login"} replace />;
}

export default function App() {
  return (
    <Routes>
      {/* default */}
      <Route path="/" element={<HomeRedirect />} />

      {/* public */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* protected */}
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/rooms" element={<Room />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/guests" element={<Guest />} />
      </Route>

      {/* fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}