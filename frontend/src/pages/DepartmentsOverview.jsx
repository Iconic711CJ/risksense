import { useState, useEffect } from "react";
import { RefreshCw, Building2 } from "lucide-react";
import { toast } from "sonner";
import { getDepartments } from "../services/api";
import DeptCard from "../components/departments/DeptCard";

export default function DepartmentsOverview() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchDepts() {
    try {
      const data = await getDepartments();
      setDepartments(data || []);
    } catch {
      toast.error("Failed to load departments");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { fetchDepts(); }, []);

  function handleRefresh() {
    setRefreshing(true);
    fetchDepts();
  }

  const totalRisks = departments.reduce((s, d) => s + (d.total_risks || 0), 0);
  const totalCritical = departments.reduce((s, d) => s + (d.critical_count || 0), 0);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground tracking-tight">
            Departments Overview
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {departments.length} departments · {totalRisks} total risks · {totalCritical} critical
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Summary ribbon */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Risks", value: totalRisks, color: "text-sky-400" },
          { label: "Critical Risks", value: totalCritical, color: "text-red-400" },
          { label: "Departments", value: departments.length, color: "text-violet-400" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border glass px-4 py-3 text-center">
            <p className={`text-2xl font-display font-black ${s.color}`}>{s.value}</p>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="h-40 rounded-2xl bg-secondary animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((dept) => (
            <DeptCard key={dept.id} dept={dept} />
          ))}
        </div>
      )}
    </div>
  );
}
