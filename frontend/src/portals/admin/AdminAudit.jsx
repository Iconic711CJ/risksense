import { useEffect, useState } from "react";
import { ClipboardList, ChevronLeft, ChevronRight, RefreshCw, Calendar } from "lucide-react";
import { getAuditLog } from "../../services/api";

const ACTION_COLORS = {
  LOGIN:          "bg-slate-100 text-slate-600 border border-slate-200",
  CREATE_RISK:    "bg-emerald-100 text-emerald-700 border border-emerald-200",
  UPDATE_RISK:    "bg-blue-100 text-blue-700 border border-blue-200",
  UPDATE_STATUS:  "bg-violet-100 text-violet-700 border border-violet-200",
  DELETE_RISK:    "bg-red-100 text-red-700 border border-red-200",
  CREATE_USER:    "bg-indigo-100 text-indigo-700 border border-indigo-200",
  UPDATE_USER:    "bg-cyan-100 text-cyan-700 border border-cyan-200",
  DELETE_USER:    "bg-rose-100 text-rose-700 border border-rose-200",
};

const ACTION_GROUPS = {
  "Risk Events": ["CREATE_RISK","UPDATE_RISK","UPDATE_STATUS","DELETE_RISK"],
  "User Events": ["CREATE_USER","UPDATE_USER","DELETE_USER","LOGIN"],
};

export default function AdminAudit() {
  const [entries,    setEntries]    = useState([]);
  const [total,      setTotal]      = useState(0);
  const [page,       setPage]       = useState(1);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionFilter, setActionFilter] = useState("");
  const [fromDate,     setFromDate]     = useState("");
  const [toDate,       setToDate]       = useState("");
  const [expanded,     setExpanded]     = useState(null);

  const PAGE_SIZE  = 25;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  async function load(silent = false) {
    if (silent) setRefreshing(true);
    else setLoading(true);
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

  function handleFilterChange(setter) {
    return (val) => { setter(val); setPage(1); };
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ClipboardList className="w-5 h-5 text-[#064E3B]" />
            <h1 className="text-xl font-black text-slate-900">Audit Trail</h1>
          </div>
          <p className="text-sm text-slate-400">{total.toLocaleString()} events logged</p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-[#064E3B] hover:border-[#064E3B] transition-all text-xs font-bold shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <select
          className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm focus:outline-none focus:border-[#064E3B]"
          value={actionFilter}
          onChange={(e) => handleFilterChange(setActionFilter)(e.target.value)}
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
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <input
            type="date"
            className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm focus:outline-none focus:border-[#064E3B]"
            value={fromDate}
            onChange={(e) => handleFilterChange(setFromDate)(e.target.value)}
          />
          <span className="text-slate-400 text-xs">to</span>
          <input
            type="date"
            className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm focus:outline-none focus:border-[#064E3B]"
            value={toDate}
            onChange={(e) => handleFilterChange(setToDate)(e.target.value)}
          />
        </div>

        {(actionFilter || fromDate || toDate) && (
          <button
            onClick={() => { setActionFilter(""); setFromDate(""); setToDate(""); setPage(1); }}
            className="text-xs text-slate-400 hover:text-slate-700 transition-colors underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-7 h-7 rounded-full border-2 border-[#064E3B] border-t-transparent animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Timestamp</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">User</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Action</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Target</th>
                  <th className="text-left px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Changes</th>
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-14 text-center">
                      <ClipboardList className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                      <p className="text-slate-400 text-xs">No audit entries found</p>
                    </td>
                  </tr>
                ) : entries.map((e) => {
                  const isExpanded = expanded === e.id;
                  const hasChanges = e.old_value || e.new_value;
                  return (
                    <>
                      <tr
                        key={e.id}
                        onClick={() => hasChanges && setExpanded(isExpanded ? null : e.id)}
                        className={`border-b border-slate-50 transition-colors
                          ${hasChanges ? "cursor-pointer hover:bg-slate-50" : "hover:bg-slate-50/50"}`}
                      >
                        <td className="px-5 py-3 whitespace-nowrap">
                          <p className="text-slate-600 text-xs font-mono">
                            {new Date(e.created_at).toLocaleDateString()}
                          </p>
                          <p className="text-slate-400 text-[10px] font-mono">
                            {new Date(e.created_at).toLocaleTimeString()}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0">
                              <span className="text-[9px] font-black text-[#064E3B]">
                                {(e.user_name || "?").charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="text-slate-700 text-xs font-medium whitespace-nowrap">{e.user_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold ${ACTION_COLORS[e.action] ?? "bg-slate-100 text-slate-500 border border-slate-200"}`}>
                            {e.action.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-slate-500 font-mono text-[10px]">{e.table_name}</p>
                          {e.record_id && (
                            <p className="text-slate-300 font-mono text-[9px] truncate max-w-[100px]">{e.record_id}</p>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          {hasChanges ? (
                            <span className="text-[10px] text-[#064E3B] font-medium">
                              {isExpanded ? "▲ Hide" : "▼ Show"}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-300">—</span>
                          )}
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr key={`${e.id}-exp`} className="bg-emerald-50/30 border-b border-slate-100">
                          <td colSpan={5} className="px-5 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {e.old_value && (
                                <div>
                                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Before</p>
                                  <pre className="text-[11px] text-slate-600 bg-white rounded-xl p-3 overflow-auto max-h-40 font-mono leading-relaxed border border-slate-200">
                                    {JSON.stringify(e.old_value, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {e.new_value && (
                                <div>
                                  <p className="text-[10px] font-bold text-[#064E3B] uppercase tracking-wider mb-2">After</p>
                                  <pre className="text-[11px] text-emerald-700 bg-emerald-50 rounded-xl p-3 overflow-auto max-h-40 font-mono leading-relaxed border border-emerald-100">
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
        <p className="text-xs text-slate-400">
          {entries.length === 0 ? "No results" : (
            <>Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} of {total.toLocaleString()}</>
          )}
        </p>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(1)} disabled={page === 1}
              className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-[#064E3B] disabled:opacity-30 transition-colors text-xs font-bold shadow-sm">
              First
            </button>
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-[#064E3B] disabled:opacity-30 transition-colors shadow-sm">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-slate-400 px-2 font-mono">{page} / {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-[#064E3B] disabled:opacity-30 transition-colors shadow-sm">
              <ChevronRight className="w-4 h-4" />
            </button>
            <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
              className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-[#064E3B] disabled:opacity-30 transition-colors text-xs font-bold shadow-sm">
              Last
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
