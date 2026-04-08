import { ShieldAlert, ShieldX, AlertTriangle, Activity, CheckCircle2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "../../lib/utils";

const CARDS = [
  {
    key: "total_risks",
    label: "Total Risks",
    icon: ShieldAlert,
    color: "text-slate-900",
    bg: "bg-slate-50",
    border: "border-slate-100",
  },
  {
    key: "critical_count",
    label: "Critical",
    icon: ShieldX,
    color: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-100",
  },
  {
    key: "high_count",
    label: "High Risk",
    icon: AlertTriangle,
    color: "text-orange-700",
    bg: "bg-orange-50",
    border: "border-orange-100",
  },
  {
    key: "under_mitigation_count",
    label: "Mitigation",
    icon: Activity,
    color: "text-yellow-700",
    bg: "bg-yellow-50",
    border: "border-yellow-100",
  },
  {
    key: "resolved_count",
    label: "Resolved",
    icon: CheckCircle2,
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-100",
  },
];

function VelocityBadge({ velocity }) {
  if (!velocity) return null;
  const { this_week, last_week } = velocity;
  const diff = this_week - last_week;
  if (diff === 0) return (
    <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-tight">
      <Minus className="w-3 h-3" /> STABLE
    </span>
  );
  const up = diff > 0;
  return (
    <span className={cn("flex items-center gap-1 text-[10px] font-black uppercase tracking-tight", up ? "text-red-600" : "text-emerald-600")}>
      {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {Math.abs(diff)} {up ? "INCR" : "DECR"} THIS WEEK
    </span>
  );
}

export default function StatCards({ summary, loading }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
      {CARDS.map((card) => {
        const Icon = card.icon;
        const value = summary?.[card.key] ?? (loading ? "—" : 0);
        return (
          <div
            key={card.key}
            className={cn(
              "minimal-card relative p-5 border transition-all duration-200",
              card.border
            )}
          >
            <div className="flex items-start justify-between">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border", card.bg, card.border)}>
                <Icon className={cn("w-5 h-5", card.color)} />
              </div>
            </div>
            <div className="mt-4">
              <p className={cn("text-3xl font-display font-black tracking-tight", card.color)}>
                {loading ? (
                  <span className="inline-block w-8 h-8 rounded-lg bg-slate-50 animate-pulse" />
                ) : value}
              </p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{card.label}</p>
            </div>
            {card.key === "total_risks" && summary?.risk_velocity && (
              <div className="mt-3 pt-3 border-t border-slate-50">
                <VelocityBadge velocity={summary.risk_velocity} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
