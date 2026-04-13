import { useEffect, useState } from "react";
import {
  ClipboardList, ChevronLeft, ChevronRight,
  RefreshCw, Search, Calendar
} from "lucide-react";
import { getAuditLog } from "../../services/api";

const ACTION_COLORS = {
  LOGIN:               "bg-slate-700/80 text-slate-300 border border-slate-600",
  CREATE_RISK:         "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
  UPDATE_RISK:         "bg-blue-500/20 text-blue-300 border border-blue-500/30",
  UPDATE_STATUS:       "bg-violet-500/20 text-violet-300 border border-violet-500/30",
  DELETE_RISK:         "bg-rose-500/20 text-rose-300 border border-rose-500/30",
  CREATE_USER:         "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30",
  UPDATE_USER:         "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30",
  DELETE_USER:         "bg-red-500/20 text-red-300 border border-red-500/30",
  CREATE_DEPARTMENT:   "bg-teal-500/20 text-teal-300 border border-teal-500/30",
  UPDATE_DEPARTMENT:   "bg-sky-500/20 text-sky-300 border border-sky-500/30",
  DELETE_DEPARTMENT:   "bg-orange-500/20 text-orange-300 border border-orange-500/30",
};

const ALL_ACTIONS = [
  "LOGIN",
  "CREATE_RISK","UPDATE_RISK","UPDATE_STATUS","DELETE_RISK",
  "CREATE_USER","UPDATE_USER","DELETE_USER",
  "CREATE_DEPARTMENT","UPDATE_DEPARTMENT","DELETE_DEPARTMENT",
];

const ACTION_GROUPS = {
  "Risk Events":       ["CREATE_RISK","UPDATE_RISK","UPDATE_STATUS","DELETE_RISK"],
  "User Events":       ["CREATE_USER","UPDATE_USER","DELETE_USER","LOGIN"],
  "Department Events": ["CREATE_DEPARTMENT","UPDATE_DEPARTMENT","DELETE_DEPARTMENT"],
};

function ActionDot({ action }) {
  const cls = ACTION_COLORS[action] ?? "bg-slate-700 text-slate-400 border border-slate-600";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide ${cls}`}>
      {action.replace(/_/g, " ")}
    </span>
  );
}

export default function SAAudit() {
  const [entries, setEntries] = useState([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [loading, setLoading] = useState(true);
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
      // backend returns { logs, total, … }
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
            <ClipboardList className="w-5 h-5 text-indigo-400" />
            <h1 className="text-xl font-black text-white">Audit Trail</h1>
          </div>
          <p className="text-sm text-slate-500">
            {total.toLocaleString()} events · full platform history
          </p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:border-indigo-500 transition-all text-xs font-bold disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Action filter */}
        <select
          className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
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

        {/* Date range */}
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-slate-600" />
          <input
            type="date"
            className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-sm focus:outline-none focus:border-indigo-500"
            value={fromDate}
            onChange={(e) => handleFilterChange(setFromDate)(e.target.value)}
          />
          <span className="text-slate-600 text-xs">to</span>
          <input
            type="date"
            className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-sm focus:outline-none focus:border-indigo-500"
            value={toDate}
            onChange={(e) => handleFilterChange(setToDate)(e.target.value)}
          />
        </div>

        {/* Clear */}
        {(actionFilter || fromDate || toDate) && (
          <button
            onClick={() => { setActionFilter(""); setFromDate(""); setToDate(""); setPage(1); }}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-7 h-7 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-800/40">
                  <th className="text-left px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Timestamp</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">User</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Action</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Target</th>
                  <th className="text-left px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Changes</th>
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-14 text-center">
                      <ClipboardList className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                      <p className="text-slate-600 text-xs">No audit entries found</p>
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
                        className={`border-b border-slate-800/50 transition-colors
                          ${hasChanges ? "cursor-pointer hover:bg-slate-800/40" : "hover:bg-slate-800/20"}`}
                      >
                        <td className="px-5 py-3 whitespace-nowrap">
                          <p className="text-slate-300 text-xs font-mono">
                            {new Date(e.created_at).toLocaleDateString()}
                          </p>
                          <p className="text-slate-600 text-[10px] font-mono">
                            {new Date(e.created_at).toLocaleTimeString()}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                              <span className="text-[9px] font-black text-indigo-400">
                                {(e.user_name || "?").charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="text-slate-200 text-xs font-medium whitespace-nowrap">{e.user_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <ActionDot action={e.action} />
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-slate-400 font-mono text-[10px]">{e.table_name}</p>
                          {e.record_id && (
                            <p className="text-slate-700 font-mono text-[9px] truncate max-w-[100px]">{e.record_id}</p>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          {hasChanges ? (
                            <span className="text-[10px] text-indigo-400 font-medium">
                              {isExpanded ? "▲ Hide" : "▼ Show"}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-700">—</span>
                          )}
                        </td>
                      </tr>

                      {/* Expanded changes row */}
                      {isExpanded && (
                        <tr key={`${e.id}-exp`} className="bg-slate-800/30 border-b border-slate-800/50">
                          <td colSpan={5} className="px-5 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {e.old_value && (
                                <div>
                                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Before</p>
                                  <pre className="text-[11px] text-slate-400 bg-slate-900 rounded-xl p-3 overflow-auto max-h-40 font-mono leading-relaxed">
                                    {JSON.stringify(e.old_value, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {e.new_value && (
                                <div>
                                  <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-2">After</p>
                                  <pre className="text-[11px] text-indigo-300 bg-indigo-950/40 rounded-xl p-3 overflow-auto max-h-40 font-mono leading-relaxed border border-indigo-500/20">
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
        <p className="text-xs text-slate-600">
          {entries.length === 0 ? "No results" : (
            <>Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} of {total.toLocaleString()}</>
          )}
        </p>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(1)}
              disabled={page === 1}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white disabled:opacity-30 transition-colors text-xs font-bold"
            >
              First
            </button>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-slate-400 px-2 font-mono">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white disabled:opacity-30 transition-colors text-xs font-bold"
            >
              Last
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
