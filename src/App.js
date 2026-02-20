// App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./Layout";

import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import Room from "./pages/Room";
import Guest from "./pages/Guest";
import Inventory from "./pages/Inventory";

import Login from "./pages/Login";
import Signup from "./pages/Signup";

import { getSession } from "./utils/auth";

function ProtectedRoute({ children }) {
  const session = getSession();
  if (!session) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ✅ default: ALWAYS start at login */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* ✅ auth routes (no Layout) */}
        <Route
          path="/login"
          element={getSession() ? <Navigate to="/dashboard" replace /> : <Login />}
        />
        <Route
          path="/signup"
          element={getSession() ? <Navigate to="/dashboard" replace /> : <Signup />}
        />

        {/* ✅ protected routes (with Layout) */}
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/room" element={<Room />} />
          <Route path="/guest" element={<Guest />} />
          <Route path="/inventory" element={<Inventory />} />
        </Route>

        {/* ✅ fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}