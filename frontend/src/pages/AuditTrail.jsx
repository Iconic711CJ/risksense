import { useState, useEffect, useCallback } from "react";
import { Search, X, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { getAuditLog } from "../services/api";
import AuditTable from "../components/audit/AuditTable";
import { cn } from "../lib/utils";

const ACTIONS = [
  "All", "CREATE_RISK", "UPDATE_RISK", "UPDATE_STATUS",
  "DELETE_RISK", "CREATE_USER", "DELETE_USER", "LOGIN",
];

export default function AuditTrail() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const PAGE_SIZE = 25;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAuditLog({
        page,
        page_size: PAGE_SIZE,
        ...(actionFilter !== "All" ? { action: actionFilter } : {}),
        ...(fromDate ? { from_date: fromDate } : {}),
        ...(toDate ? { to_date: toDate + "T23:59:59" } : {}),
      });
      setLogs(res.logs || []);
      setTotal(res.total || 0);
    } catch {
      toast.error("Failed to load audit log");
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter, fromDate, toDate]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [actionFilter, fromDate, toDate]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground tracking-tight">Audit Trail</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Complete record of all system actions · {total} entries
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Action filter */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-secondary border border-border overflow-x-auto">
          {ACTIONS.map((a) => (
            <button
              key={a}
              onClick={() => setActionFilter(a)}
              className={cn(
                "px-2.5 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all",
                actionFilter === a
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {a === "All" ? "All Actions" : a.replace("_", " ")}
            </button>
          ))}
        </div>

        {/* Date range */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="px-3 py-2 rounded-xl bg-secondary border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="px-3 py-2 rounded-xl bg-secondary border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          {(fromDate || toDate) && (
            <button
              onClick={() => { setFromDate(""); setToDate(""); }}
              className="p-2 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <AuditTable logs={logs} loading={loading} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1.5 rounded-lg bg-secondary text-xs font-semibold text-foreground">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
