import { useNavigate } from "react-router-dom";
import { Building2, ChevronRight, ShieldX, AlertTriangle, CheckCircle } from "lucide-react";
import { cn } from "../../lib/utils";

const DEPT_COLORS = {
  PROC: { bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-400", dot: "bg-blue-400" },
  DL: { bg: "bg-violet-500/10", border: "border-violet-500/20", text: "text-violet-400", dot: "bg-violet-400" },
  MKT: { bg: "bg-pink-500/10", border: "border-pink-500/20", text: "text-pink-400", dot: "bg-pink-400" },
  ADMIN: { bg: "bg-indigo-500/10", border: "border-indigo-500/20", text: "text-indigo-400", dot: "bg-indigo-400" },
  FIN: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400", dot: "bg-emerald-400" },
  IT: { bg: "bg-cyan-500/10", border: "border-cyan-500/20", text: "text-cyan-400", dot: "bg-cyan-400" },
  HR: { bg: "bg-orange-500/10", border: "border-orange-500/20", text: "text-orange-400", dot: "bg-orange-400" },
  LEGAL: { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-400", dot: "bg-amber-400" },
  FAC: { bg: "bg-teal-500/10", border: "border-teal-500/20", text: "text-teal-400", dot: "bg-teal-400" },
};

export default function DeptCard({ dept }) {
  const navigate = useNavigate();
  const style = DEPT_COLORS[dept.code] || DEPT_COLORS.ADMIN;
  const riskReduction = dept.total_risks > 0
    ? Math.round((dept.resolved_count / dept.total_risks) * 100)
    : 0;

  return (
    <div
      onClick={() => navigate(`/departments/${dept.id}`)}
      className={cn(
        "relative rounded-2xl border glass p-5 cursor-pointer",
        "transition-all duration-200 hover:translate-y-[-2px] hover:shadow-xl hover:shadow-black/20",
        "group",
        style.border
      )}
    >
      {/* Dept code badge + title */}
      <div className="flex items-start justify-between mb-4">
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center",
          style.bg, `border ${style.border}`
        )}>
          <Building2 className={cn("w-5 h-5", style.text)} />
        </div>
        <div className={cn(
          "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest",
          style.bg, `border ${style.border}`, style.text
        )}>
          {dept.code}
        </div>
      </div>

      <h3 className="font-display font-bold text-foreground text-sm mb-1">{dept.name}</h3>

      {/* Risk counts */}
      <div className="flex items-center gap-3 mt-3">
        <div className="flex items-center gap-1">
          <span className="text-xl font-display font-black text-foreground">{dept.total_risks}</span>
          <span className="text-[10px] text-muted-foreground font-medium">risks</span>
        </div>
        <div className="h-4 w-px bg-border" />
        {dept.critical_count > 0 && (
          <div className="flex items-center gap-1 text-red-400">
            <ShieldX className="w-3 h-3" />
            <span className="text-xs font-bold">{dept.critical_count}</span>
          </div>
        )}
        {dept.high_count > 0 && (
          <div className="flex items-center gap-1 text-orange-400">
            <AlertTriangle className="w-3 h-3" />
            <span className="text-xs font-bold">{dept.high_count}</span>
          </div>
        )}
        {riskReduction > 0 && (
          <div className="flex items-center gap-1 text-emerald-400">
            <CheckCircle className="w-3 h-3" />
            <span className="text-xs font-bold">{riskReduction}%</span>
          </div>
        )}
      </div>

      {/* Progress bar (resolved / total) */}
      {dept.total_risks > 0 && (
        <div className="mt-3">
          <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500/70 transition-all duration-500"
              style={{ width: `${riskReduction}%` }}
            />
          </div>
          <p className="text-[9px] text-muted-foreground mt-1">{riskReduction}% resolved</p>
        </div>
      )}

      {/* Arrow */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </div>
    </div>
  );
}
