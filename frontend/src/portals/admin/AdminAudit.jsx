import { useEffect, useState } from "react";
import { ClipboardList, ChevronLeft, ChevronRight, RefreshCw, Calendar, Building2 } from "lucide-react";
import { getAuditLog } from "../../services/api";
import useAppStore from "../../store/useAppStore";

// ── palette ───────────────────────────────────────────────────────────────────
const P = {
  bg:     "#DEDCDC",
  card:   "#ffffff",
  dark:   "#191D23",
  accent: "#57707A",
  mid:    "#7E919F",
  light:  "#979DAB",
  border: "#C5BAC4",
};

const ACTION_STYLE = {
  LOGIN:         { background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1" },
  CREATE_RISK:   { background: "#dcfce7", color: "#166534", border: "1px solid #86efac" },
  UPDATE_RISK:   { background: "#dbeafe", color: "#1e40af", border: "1px solid #93c5fd" },
  UPDATE_STATUS: { background: "#ede9fe", color: "#5b21b6", border: "1px solid #c4b5fd" },
  DELETE_RISK:   { background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5" },
  CREATE_USER:   { background: "#e0e7ff", color: "#3730a3", border: "1px solid #a5b4fc" },
  UPDATE_USER:   { background: "#cffafe", color: "#155e75", border: "1px solid #67e8f9" },
  DELETE_USER:   { background: "#ffe4e6", color: "#9f1239", border: "1px solid #fda4af" },
};

const ACTION_GROUPS = {
  "Risk Events": ["CREATE_RISK", "UPDATE_RISK", "UPDATE_STATUS", "DELETE_RISK"],
  "User Events": ["CREATE_USER", "UPDATE_USER", "DELETE_USER", "LOGIN"],
};

const PAGE_SIZE = 25;

export default function AdminAudit() {
  const user = useAppStore((s) => s.user);

  const [entries,      setEntries]      = useState([]);
  const [total,        setTotal]        = useState(0);
  const [page,         setPage]         = useState(1);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [actionFilter, setActionFilter] = useState("");
  const [fromDate,     setFromDate]     = useState("");
  const [toDate,       setToDate]       = useState("");
  const [expanded,     setExpanded]     = useState(null);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  async function load(silent = false) {
    if (silent) setRefreshing(true); else setLoading(true);
    try {
      const params = { page, page_size: PAGE_SIZE };
      if (actionFilter) params.action    = actionFilter;
      if (fromDate)     params.from_date = fromDate;
      if (toDate)       params.to_date   = toDate;
      const data = await getAuditLog(params);
      setEntries(data.logs ?? data.entries ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, [page, actionFilter, fromDate, toDate]); // eslint-disable-line

  function resetPage(setter) {
    return (val) => { setter(val); setPage(1); };
  }

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 flex items-center justify-center" style={{ background: P.accent }}>
            <ClipboardList className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight" style={{ color: P.dark }}>Audit Trail</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Building2 className="w-3 h-3" style={{ color: P.light }} />
              <p className="text-[11px] font-medium" style={{ color: P.mid }}>
                {user?.department_name} · department activity only
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-semibold" style={{ color: P.light }}>
            {total.toLocaleString()} events
          </span>
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 text-xs font-bold transition-colors disabled:opacity-50"
            style={{ background: P.card, border: `1px solid ${P.border}`, color: P.mid }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Scope notice */}
      <div className="flex items-center gap-2 px-3 py-2.5"
        style={{ background: P.accent + "15", border: `1px solid ${P.accent}33` }}>
        <Building2 className="w-3.5 h-3.5 shrink-0" style={{ color: P.accent }} />
        <p className="text-[11px] font-semibold" style={{ color: P.accent }}>
          Showing activity from users in <strong>{user?.department_name}</strong> only.
          Super Admins can view the full platform audit trail.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <select
          className="px-3 py-2 text-sm focus:outline-none"
          style={{ background: P.card, border: `1px solid ${P.border}`, color: P.dark }}
          value={actionFilter}
          onChange={(e) => resetPage(setActionFilter)(e.target.value)}
        >
          <option value="">All Actions</option>
          {Object.entries(ACTION_GROUPS).map(([group, actions]) => (
            <optgroup key={group} label={group}>
              {actions.map((a) => (
                <option key={a} value={a}>{a.replace(/_/g, " ")}</option>
              ))}
            </optgroup>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5" style={{ color: P.light }} />
          <input type="date"
            className="px-3 py-2 text-sm focus:outline-none"
            style={{ background: P.card, border: `1px solid ${P.border}`, color: P.dark }}
            value={fromDate}
            onChange={(e) => resetPage(setFromDate)(e.target.value)}
          />
          <span className="text-xs" style={{ color: P.light }}>to</span>
          <input type="date"
            className="px-3 py-2 text-sm focus:outline-none"
            style={{ background: P.card, border: `1px solid ${P.border}`, color: P.dark }}
            value={toDate}
            onChange={(e) => resetPage(setToDate)(e.target.value)}
          />
        </div>

        {(actionFilter || fromDate || toDate) && (
          <button
            onClick={() => { setActionFilter(""); setFromDate(""); setToDate(""); setPage(1); }}
            className="text-xs font-semibold underline"
            style={{ color: P.mid }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ background: P.card, border: `1px solid ${P.border}` }} className="overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-7 h-7 border-2 border-t-transparent animate-spin"
              style={{ borderColor: P.accent, borderTopColor: "transparent" }} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: `1px solid ${P.border}`, background: P.bg }}>
                  {["Timestamp", "User", "Action", "Target", "Changes"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest"
                      style={{ color: P.light }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-14 text-center">
                      <ClipboardList className="w-8 h-8 mx-auto mb-2" style={{ color: P.border }} />
                      <p className="text-xs" style={{ color: P.mid }}>No audit entries found</p>
                    </td>
                  </tr>
                ) : entries.map((e) => {
                  const isExp = expanded === e.id;
                  const hasChanges = e.old_value || e.new_value;
                  const actionStyle = ACTION_STYLE[e.action] ?? { background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0" };
                  return (
                    <>
                      <tr key={e.id}
                        onClick={() => hasChanges && setExpanded(isExp ? null : e.id)}
                        className="transition-colors border-b"
                        style={{
                          borderColor: P.border,
                          cursor: hasChanges ? "pointer" : "default",
                          background: isExp ? P.accent + "08" : "transparent",
                        }}
                        onMouseEnter={(ev) => { ev.currentTarget.style.background = P.accent + "08"; }}
                        onMouseLeave={(ev) => { ev.currentTarget.style.background = isExp ? P.accent + "08" : "transparent"; }}
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <p className="font-mono text-xs" style={{ color: P.dark }}>
                            {new Date(e.created_at).toLocaleDateString()}
                          </p>
                          <p className="font-mono text-[10px]" style={{ color: P.light }}>
                            {new Date(e.created_at).toLocaleTimeString()}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 flex items-center justify-center shrink-0"
                              style={{ background: P.accent + "22" }}>
                              <span className="text-[9px] font-black" style={{ color: P.accent }}>
                                {(e.user_name || "?").charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="text-xs font-medium whitespace-nowrap" style={{ color: P.dark }}>
                              {e.user_name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex px-2 py-0.5 text-[10px] font-bold" style={actionStyle}>
                            {e.action.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-mono text-[10px]" style={{ color: P.mid }}>{e.table_name}</p>
                          {e.record_id && (
                            <p className="font-mono text-[9px] truncate max-w-[100px]" style={{ color: P.border }}>
                              {e.record_id}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {hasChanges ? (
                            <span className="text-[10px] font-bold" style={{ color: P.accent }}>
                              {isExp ? "▲ Hide" : "▼ Show"}
                            </span>
                          ) : (
                            <span className="text-[10px]" style={{ color: P.border }}>—</span>
                          )}
                        </td>
                      </tr>

                      {isExp && (
                        <tr key={`${e.id}-exp`} style={{ background: P.accent + "08", borderBottom: `1px solid ${P.border}` }}>
                          <td colSpan={5} className="px-4 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {e.old_value && (
                                <div>
                                  <p className="text-[10px] font-black uppercase tracking-widest mb-2"
                                    style={{ color: P.light }}>Before</p>
                                  <pre className="text-[11px] p-3 overflow-auto max-h-40 font-mono leading-relaxed"
                                    style={{ background: P.bg, border: `1px solid ${P.border}`, color: P.mid }}>
                                    {JSON.stringify(e.old_value, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {e.new_value && (
                                <div>
                                  <p className="text-[10px] font-black uppercase tracking-widest mb-2"
                                    style={{ color: P.accent }}>After</p>
                                  <pre className="text-[11px] p-3 overflow-auto max-h-40 font-mono leading-relaxed"
                                    style={{ background: P.accent + "10", border: `1px solid ${P.accent}33`, color: P.accent }}>
                                    {JSON.stringify(e.new_value, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-xs" style={{ color: P.light }}>
          {entries.length === 0 ? "No results" : (
            <>Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} of {total.toLocaleString()}</>
          )}
        </p>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            {[
              { label: "First", action: () => setPage(1), disabled: page === 1 },
              { label: <ChevronLeft className="w-4 h-4" />, action: () => setPage((p) => p - 1), disabled: page === 1 },
              { label: <ChevronRight className="w-4 h-4" />, action: () => setPage((p) => p + 1), disabled: page === totalPages },
              { label: "Last", action: () => setPage(totalPages), disabled: page === totalPages },
            ].map((btn, i) => (
              <button key={i} onClick={btn.action} disabled={btn.disabled}
                className="px-2.5 py-1.5 text-xs font-bold transition-colors disabled:opacity-30"
                style={{ background: P.card, border: `1px solid ${P.border}`, color: P.mid }}>
                {btn.label}
              </button>
            ))}
            <span className="text-xs font-mono px-2" style={{ color: P.light }}>{page} / {totalPages}</span>
          </div>
        )}
      </div>
    </div>
  );
}
