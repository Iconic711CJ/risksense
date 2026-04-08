import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, Search, KanbanSquare, Filter, X, RefreshCw, FileText } from "lucide-react";
import { toast } from "sonner";
import { cn } from "../lib/utils";
import { getRisks, deleteRisk, getDepartments } from "../services/api";
import useAppStore from "../store/useAppStore";
import RiskTable from "../components/risks/RiskTable";
import ReportGenerator from "../components/reports/ReportGenerator";

const RATING_FILTERS = ["All", "Critical", "High", "Tolerable", "Low"];
const STATUS_FILTERS = ["All", "Identified", "Under Mitigation", "Resolved"];

const RATING_BADGE = {
  Critical: "bg-red-500/15 text-red-400 border-red-500/30",
  High: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  Tolerable: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  Low: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
};

export default function DeptRegister() {
  const { deptId } = useParams();
  const navigate = useNavigate();
  const user = useAppStore((s) => s.user);
  const isAdmin = user?.role === "admin";

  const [risks, setRisks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [reportOpen, setReportOpen] = useState(false);
  const [deptInfo, setDeptInfo] = useState(null);
  const [total, setTotal] = useState(0);

  const effectiveDeptId = deptId || (isAdmin ? null : user?.department_id);

  const fetchRisks = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page_size: 200,
        ...(effectiveDeptId ? { dept_id: effectiveDeptId } : {}),
        ...(statusFilter !== "All" ? { status: statusFilter } : {}),
        ...(ratingFilter !== "All" ? { rating: ratingFilter } : {}),
        ...(search ? { search } : {}),
      };
      const res = await getRisks(params);
      setRisks(res.risks || []);
      setTotal(res.total || 0);
    } catch {
      toast.error("Failed to load risks");
    } finally {
      setLoading(false);
    }
  }, [effectiveDeptId, statusFilter, ratingFilter, search]);

  useEffect(() => {
    fetchRisks();
  }, [fetchRisks]);

  // Load dept info for title
  useEffect(() => {
    if (effectiveDeptId && isAdmin) {
      getDepartments().then((depts) => {
        const d = depts.find((d) => d.id === effectiveDeptId);
        if (d) setDeptInfo(d);
      }).catch(() => {});
    }
  }, [effectiveDeptId, isAdmin]);

  async function handleDelete(id) {
    try {
      await deleteRisk(id);
      toast.success("Risk deleted");
      fetchRisks();
    } catch {
      toast.error("Failed to delete risk");
    }
  }

  function clearFilters() {
    setSearch("");
    setRatingFilter("All");
    setStatusFilter("All");
  }

  const hasFilters = search || ratingFilter !== "All" || statusFilter !== "All";

  const deptTitle = deptInfo?.name
    || (!isAdmin ? user?.department_name : "All Departments");

  // Summary stats
  const stats = {
    critical: risks.filter((r) => r.risk_rating === "Critical").length,
    high: risks.filter((r) => r.risk_rating === "High").length,
    mitigating: risks.filter((r) => r.status === "Under Mitigation").length,
    resolved: risks.filter((r) => r.status === "Resolved").length,
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground tracking-tight">
            {deptTitle} Risk Register
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {total} risk{total !== 1 ? "s" : ""} logged
            {hasFilters && " (filtered)"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => navigate("/department/kanban" + (deptId ? `/../${deptId}/kanban` : ""))}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
          >
            <KanbanSquare className="w-3.5 h-3.5" />
            Kanban View
          </button>
          <button
            onClick={() => setReportOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary border border-border text-sm font-medium text-muted-foreground hover:text-foreground transition-all"
          >
            <FileText className="w-3.5 h-3.5" />
            Export PDF
          </button>
          <button
            onClick={() => navigate("/risks/new")}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
          >
            <Plus className="w-3.5 h-3.5" />
            Log New Risk
          </button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(stats).map(([key, val]) => {
          const label = { critical: "Critical", high: "High", mitigating: "Mitigating", resolved: "Resolved" }[key];
          const style = {
            critical: "border-red-500/20 bg-red-500/5 text-red-400",
            high: "border-orange-500/20 bg-orange-500/5 text-orange-400",
            mitigating: "border-yellow-500/20 bg-yellow-500/5 text-yellow-400",
            resolved: "border-emerald-500/20 bg-emerald-500/5 text-emerald-400",
          }[key];
          return (
            <div key={key} className={cn("rounded-xl px-4 py-3 border text-center", style)}>
              <p className="text-xl font-display font-black">{val}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80 mt-0.5">{label}</p>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search risks by description, code, or owner..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex gap-2 flex-wrap">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-secondary border border-border">
            {RATING_FILTERS.map((r) => (
              <button
                key={r}
                onClick={() => setRatingFilter(r)}
                className={cn(
                  "px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all",
                  ratingFilter === r
                    ? r === "All" ? "bg-primary/20 text-primary" : cn("border", RATING_BADGE[r])
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {r}
              </button>
            ))}
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-secondary border border-border text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            {STATUS_FILTERS.map((s) => (
              <option key={s} value={s}>{s === "All" ? "All Statuses" : s}</option>
            ))}
          </select>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          )}

          <button
            onClick={fetchRisks}
            className="p-2 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Table */}
      <RiskTable
        risks={risks}
        onDelete={handleDelete}
        loading={loading}
        showDept={isAdmin && !deptId}
      />

      {/* PDF Report */}
      <ReportGenerator
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        risks={risks}
        deptTitle={deptTitle}
      />
    </div>
  );
}
