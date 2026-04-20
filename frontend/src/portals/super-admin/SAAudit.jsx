import { useEffect, useState } from "react";
import { ClipboardList, ChevronLeft, ChevronRight, RefreshCw, Calendar, Globe } from "lucide-react";
import { getAuditLog } from "../../services/api";

const ACTION_STYLE = {
  LOGIN:               { background: "#1e2a35", color: "#94a3b8", border: "1px solid #334155" },
  CREATE_RISK:         { background: "#064e3b", color: "#6ee7b7", border: "1px solid #047857" },
  UPDATE_RISK:         { background: "#1e3a5f", color: "#93c5fd", border: "1px solid #1d4ed8" },
  UPDATE_STATUS:       { background: "#2e1065", color: "#c4b5fd", border: "1px solid #7c3aed" },
  DELETE_RISK:         { background: "#450a0a", color: "#fca5a5", border: "1px solid #991b1b" },
  CREATE_USER:         { background: "#1e1b4b", color: "#a5b4fc", border: "1px solid #4338ca" },
  UPDATE_USER:         { background: "#083344", color: "#67e8f9", border: "1px solid #0e7490" },
  DELETE_USER:         { background: "#4c0519", color: "#fda4af", border: "1px solid #be123c" },
  CREATE_DEPARTMENT:   { background: "#134e4a", color: "#5eead4", border: "1px solid #0f766e" },
  UPDATE_DEPARTMENT:   { background: "#0c4a6e", color: "#7dd3fc", border: "1px solid #0369a1" },
  DELETE_DEPARTMENT:   { background: "#431407", color: "#fdba74", border: "1px solid #c2410c" },
};

const ACTION_GROUPS = {
  "Risk Events":       ["CREATE_RISK", "UPDATE_RISK", "UPDATE_STATUS", "DELETE_RISK"],
  "User Events":       ["CREATE_USER", "UPDATE_USER", "DELETE_USER", "LOGIN"],
  "Department Events": ["CREATE_DEPARTMENT", "UPDATE_DEPARTMENT", "DELETE_DEPARTMENT"],
};

const PAGE_SIZE = 25;

export default function SAAudit() {
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
          <div className="w-8 h-8 flex items-center justify-center" style={{ background: "#57707A" }}>
            <ClipboardList className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight" style={{ color: "#DEDCDC" }}>Audit Trail</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Globe className="w-3 h-3" style={{ color: "#57707A" }} />
              <p className="text-[11px] font-medium" style={{ color: "#7E919F" }}>
                Full platform history · all departments
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-semibold" style={{ color: "#57707A" }}>
            {total.toLocaleString()} events
          </span>
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 text-xs font-bold transition-colors disabled:opacity-50"
            style={{ background: "#1e2530", border: "1px solid #2a333d", color: "#7E919F" }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <select
          className="px-3 py-2 text-sm focus:outline-none"
          style={{ background: "#1e2530", border: "1px solid #2a333d", color: "#DEDCDC" }}
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
          <Calendar className="w-3.5 h-3.5" style={{ color: "#57707A" }} />
          <input type="date"
            className="px-3 py-2 text-sm focus:outline-none"
            style={{ background: "#1e2530", border: "1px solid #2a333d", color: "#DEDCDC" }}
            value={fromDate}
            onChange={(e) => resetPage(setFromDate)(e.target.value)}
          />
          <span className="text-xs" style={{ color: "#57707A" }}>to</span>
          <input type="date"
            className="px-3 py-2 text-sm focus:outline-none"
            style={{ background: "#1e2530", border: "1px solid #2a333d", color: "#DEDCDC" }}
            value={toDate}
            onChange={(e) => resetPage(setToDate)(e.target.value)}
          />
        </div>

        {(actionFilter || fromDate || toDate) && (
          <button
            onClick={() => { setActionFilter(""); setFromDate(""); setToDate(""); setPage(1); }}
            className="text-xs font-semibold underline"
            style={{ color: "#7E919F" }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden" style={{ background: "#1a2027", border: "1px solid #2a333d" }}>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-7 h-7 border-2 border-t-transparent animate-spin"
              style={{ borderColor: "#57707A", borderTopColor: "transparent" }} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid #2a333d", background: "#191D23" }}>
                  {["Timestamp", "User", "Action", "Target", "Changes"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest"
                      style={{ color: "#57707A" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-14 text-center">
                      <ClipboardList className="w-8 h-8 mx-auto mb-2" style={{ color: "#2a333d" }} />
                      <p className="text-xs" style={{ color: "#57707A" }}>No audit entries found</p>
                    </td>
                  </tr>
                ) : entries.map((e) => {
                  const isExp = expanded === e.id;
                  const hasChanges = e.old_value || e.new_value;
                  const aStyle = ACTION_STYLE[e.action] ?? { background: "#1e2530", color: "#7E919F", border: "1px solid #2a333d" };
                  return (
                    <>
                      <tr key={e.id}
                        onClick={() => hasChanges && setExpanded(isExp ? null : e.id)}
                        className="transition-colors border-b"
                        style={{
                          borderColor: "#2a333d",
                          cursor: hasChanges ? "pointer" : "default",
                          background: isExp ? "#57707A10" : "transparent",
                        }}
                        onMouseEnter={(ev) => { ev.currentTarget.style.background = "#57707A10"; }}
                        onMouseLeave={(ev) => { ev.currentTarget.style.background = isExp ? "#57707A10" : "transparent"; }}
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <p className="font-mono text-xs" style={{ color: "#DEDCDC" }}>
                            {new Date(e.created_at).toLocaleDateString()}
                          </p>
                          <p className="font-mono text-[10px]" style={{ color: "#57707A" }}>
                            {new Date(e.created_at).toLocaleTimeString()}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 flex items-center justify-center shrink-0"
                              style={{ background: "#57707A22" }}>
                              <span className="text-[9px] font-black" style={{ color: "#57707A" }}>
                                {(e.user_name || "?").charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="text-xs font-medium whitespace-nowrap" style={{ color: "#DEDCDC" }}>
                              {e.user_name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex px-2 py-0.5 text-[10px] font-bold" style={aStyle}>
                            {e.action.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-mono text-[10px]" style={{ color: "#7E919F" }}>{e.table_name}</p>
                          {e.record_id && (
                            <p className="font-mono text-[9px] truncate max-w-[100px]" style={{ color: "#2a333d" }}>
                              {e.record_id}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {hasChanges ? (
                            <span className="text-[10px] font-bold" style={{ color: "#57707A" }}>
                              {isExp ? "▲ Hide" : "▼ Show"}
                            </span>
                          ) : (
                            <span className="text-[10px]" style={{ color: "#2a333d" }}>—</span>
                          )}
                        </td>
                      </tr>

                      {isExp && (
                        <tr key={`${e.id}-exp`}
                          style={{ background: "#57707A08", borderBottom: "1px solid #2a333d" }}>
                          <td colSpan={5} className="px-4 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {e.old_value && (
                                <div>
                                  <p className="text-[10px] font-black uppercase tracking-widest mb-2"
                                    style={{ color: "#7E919F" }}>Before</p>
                                  <pre className="text-[11px] p-3 overflow-auto max-h-40 font-mono leading-relaxed"
                                    style={{ background: "#191D23", border: "1px solid #2a333d", color: "#7E919F" }}>
                                    {JSON.stringify(e.old_value, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {e.new_value && (
                                <div>
                                  <p className="text-[10px] font-black uppercase tracking-widest mb-2"
                                    style={{ color: "#57707A" }}>After</p>
                                  <pre className="text-[11px] p-3 overflow-auto max-h-40 font-mono leading-relaxed"
                                    style={{ background: "#57707A15", border: "1px solid #57707A33", color: "#57707A" }}>
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
        <p className="text-xs" style={{ color: "#57707A" }}>
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
                style={{ background: "#1e2530", border: "1px solid #2a333d", color: "#7E919F" }}>
                {btn.label}
              </button>
            ))}
            <span className="text-xs font-mono px-2" style={{ color: "#57707A" }}>{page} / {totalPages}</span>
          </div>
        )}
      </div>
    </div>
  );
}
