import { useEffect, useMemo } from "react";

export default function EmployeeDamageModal({
  open,
  onClose,
  user,
  damageRows = [],
}) {
  // ERD: damage_status(status_id, status_name)
  const damageStatuses = useMemo(
    () => [
      { status_id: 1, status_name: "Reported" },
      { status_id: 2, status_name: "Under Review" },
      { status_id: 3, status_name: "Resolved" },
      { status_id: 4, status_name: "Charged" },
    ],
    []
  );

  function statusName(status_id) {
    return (
      damageStatuses.find((s) => s.status_id === Number(status_id))
        ?.status_name ?? "—"
    );
  }

  const totalDamages = useMemo(() => {
    return (damageRows || []).reduce(
      (sum, r) => sum + Number(r.cost_to_hotel || 0),
      0
    );
  }, [damageRows]);

  // ESC close
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape" && open) onClose?.();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  // ✅ LOCK BG scroll (MUST be inside component)
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="edm-overlay show"
      id="employeeDamageModal"
      aria-hidden={!open}
      onClick={(e) => {
        if (e.target.id === "employeeDamageModal") onClose?.();
      }}
    >
      <div
        className="edm-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edmTitle"
      >
        <button
          className="edm-close"
          type="button"
          aria-label="Close"
          onClick={onClose}
        >
          ✕
        </button>

        <div className="edm-head">
          <div>
            <h2 id="edmTitle">Employee Damage</h2>
            <p className="edm-sub">
              {user?.name ?? "Employee"} <span className="edm-dot">•</span>{" "}
              {user?.user_id ?? "U0001"}
            </p>
          </div>

          <div className="edm-kpis">
            <span className="edm-chip">
              Total: ₱{totalDamages.toLocaleString()}
            </span>
            <span className="edm-chip ghost">
              Count: {(damageRows || []).length}
            </span>
          </div>
        </div>

        <div className="edm-divider" />

        <div className="edm-table-wrap">
          <table className="edm-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Inventory</th>
                <th>Date Reported</th>
                <th>Status</th>
                <th>Cost</th>
              </tr>
            </thead>

            <tbody>
              {!damageRows || damageRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="edm-empty">
                    No employee damages found.
                  </td>
                </tr>
              ) : (
                damageRows.map((r) => (
                  <tr key={r.edam_id}>
                    <td className="edm-mono">ED{r.edam_id}</td>
                    <td title={r.inventory_name || ""}>
                      {r.inventory_name ?? `INV-${r.inventory_id}`}
                    </td>
                    <td className="edm-mono">{r.date_reported}</td>
                    <td>
                      <span className={`edm-status s-${String(r.status_id)}`}>
                        {statusName(r.status_id)}
                      </span>
                    </td>
                    <td>₱{Number(r.cost_to_hotel || 0).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="edm-actions">
          <button className="edm-btn" type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}