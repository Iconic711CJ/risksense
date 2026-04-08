import { cn } from "../lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export default function StatCard({ title, value, subtitle, icon: Icon, trend, trendValue, color = "primary", className }) {
  const colorMap = {
    primary: "text-primary bg-primary/5 border-primary/20",
    green: "text-emerald-700 bg-emerald-50 border-emerald-100",
    yellow: "text-yellow-700 bg-yellow-50 border-yellow-100",
    orange: "text-orange-700 bg-orange-50 border-orange-100",
    red: "text-red-700 bg-red-50 border-red-100",
    purple: "text-indigo-700 bg-indigo-50 border-indigo-100",
  };

  return (
    <div className={cn("minimal-card p-5 flex flex-col gap-3", className)}>
      <div className="flex items-start justify-between">
        <div className={cn("w-10 h-10 rounded-xl border flex items-center justify-center", colorMap[color])}>
          {Icon && <Icon className="w-5 h-5" />}
        </div>
        {trend !== undefined && (
          <span className={cn(
            "flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md",
            trend > 0 ? "text-red-700 bg-red-50" : trend < 0 ? "text-emerald-700 bg-emerald-50" : "text-muted-foreground bg-slate-50"
          )}>
            {trend > 0 ? <TrendingUp className="w-3 h-3" /> : trend < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
            {trendValue}
          </span>
        )}
      </div>
      <div>
        <p className="text-3xl font-display font-black text-slate-900 tracking-tight">{value}</p>
        <p className="text-sm font-bold text-slate-600 mt-1">{title}</p>
        {subtitle && <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}
