import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";
import EmployeeDamageModal from "../components/EmployeeDamageModal";

export default function Employee() {
  const [employees, setEmployees] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  const [damageOpen, setDamageOpen] = useState(false);
  const [damageUser, setDamageUser] = useState(null);
  const [damageRows, setDamageRows] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [damageLoading, setDamageLoading] = useState(false);

  async function loadEmployees() {
    setLoading(true);
    try {
      const users = await apiFetch("/users");
      setEmployees(Array.isArray(users) ? users : []);
    } catch (e) {
      console.error(e);
      alert(e.message || "Failed to load employees");
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadInventory() {
    try {
      const rows = await apiFetch("/inventory");
      setInventoryItems(Array.isArray(rows) ? rows : []);
    } catch {
      setInventoryItems([]);
    }
  }

  async function loadEmployeeDamages(userId) {
    setDamageLoading(true);
    try {
      const rows = await apiFetch(`/employee-damage?user_id=${userId}&limit=100`);
      setDamageRows(Array.isArray(rows) ? rows : []);
    } catch (e) {
      console.error(e);
      alert(e.message || "Failed to load employee damages");
      setDamageRows([]);
    } finally {
      setDamageLoading(false);
    }
  }

  useEffect(() => {
    loadEmployees();
    loadInventory();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return employees;

    return employees.filter((u) =>
      `${u.username || ""} ${u.role_name || ""} ${u.user_id || ""}`
        .toLowerCase()
        .includes(s)
    );
  }, [employees, q]);

  async function openDamageModal(user) {
    setDamageUser(user);
    setDamageOpen(true);
    await loadEmployeeDamages(user.user_id);
  }

  function closeDamageModal() {
    setDamageOpen(false);
    setDamageUser(null);
    setDamageRows([]);
  }

  async function reloadDamageData() {
    if (!damageUser?.user_id) return;
    await loadInventory();
    await loadEmployeeDamages(damageUser.user_id);
  }

  return (
    <>
      <header className="page-header">
        <h1 className="page-title">Employee</h1>

        <div className="page-actions">
          <div className="search-wrap">
            <img src="/assets/images/search.png" alt="search" />
            <input
              type="text"
              placeholder="Search employee..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>
      </header>

      <section className="g-card">
        <div className="g-table-wrap">
          <table className="g-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Username</th>
                <th>Role</th>
                <th>Shift</th>
                <th>Damage</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: 18, opacity: 0.7 }}>
                    Loading...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: 18, opacity: 0.7 }}>
                    No employees found
                  </td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr key={u.user_id}>
                    <td>{u.user_id}</td>
                    <td>{u.username}</td>
                    <td>{u.role_name || "—"}</td>
                    <td>
                      {u.shift_start || "—"} - {u.shift_end || "—"}
                    </td>
                    <td className="td-center">
                      <button
                        className="btn small"
                        type="button"
                        onClick={() => openDamageModal(u)}
                      >
                        View / Add
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <EmployeeDamageModal
        open={damageOpen}
        onClose={closeDamageModal}
        user={damageUser}
        damageRows={damageRows}
        items={inventoryItems}
        onAdded={reloadDamageData}
        locked={damageLoading}
      />
    </>
  );
}