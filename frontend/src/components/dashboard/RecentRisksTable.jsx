import { useNavigate } from "react-router-dom";
import { formatDate, getRiskClass } from "../../lib/utils";
import { cn } from "../../lib/utils";

function StatusDot({ status }) {
  const map = {
    "Identified": "bg-slate-300",
    "Under Mitigation": "bg-orange-400",
    "Resolved": "bg-emerald-500",
  };
  return (
    <span className={cn("inline-block w-2 h-2 rounded-full shrink-0 shadow-sm", map[status] || "bg-slate-200")} />
  );
}

export default function RecentRisksTable({ risks = [], loading }) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 rounded-xl bg-slate-50 animate-pulse border border-slate-100" />
        ))}
      </div>
    );
  }

  if (!risks.length) {
    return (
      <div className="text-center py-10 text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
        No active risks found
      </div>
    );
  }

  const recent = risks.slice(0, 10);

  return (
    <div className="space-y-2">
      {recent.map((risk) => {
        const deptName = risk.departments?.name || "—";
        return (
          <div
            key={risk.id}
            onClick={() => navigate(`/risks/${risk.id}/edit`)}
            className="flex items-center gap-4 px-4 py-3 rounded-xl border border-transparent hover:border-slate-100 hover:bg-slate-50 transition-all cursor-pointer group"
          >
            <StatusDot status={risk.status} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate group-hover:text-primary transition-colors">
                {risk.description}
              </p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mt-0.5">
                {risk.risk_code} · <span className="text-primary/70">{deptName}</span>
              </p>
            </div>
            <div className={cn(
              "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border shadow-sm shrink-0",
              getRiskClass(risk.risk_rating)
            )}>
              {risk.risk_rating}
            </div>
          </div>
        );
      })}
    </div>
  );
}
