import { useEffect, useState } from "react";
import useAppStore from "../../store/useAppStore";
import {
  getDashboardSummary,
  getDashboardTrend,
  getDashboardByCategory,
  getRisks,
} from "../../services/api";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  ShieldAlert, TrendingUp, CheckCircle, AlertTriangle, BarChart2,
} from "lucide-react";

// ── palette ───────────────────────────────────────────────────────────────────
const P = {
  bg:       "#DEDCDC",
  card:     "#ffffff",
  dark:     "#191D23",
  accent:   "#57707A",
  mid:      "#7E919F",
  light:    "#979DAB",
  border:   "#C5BAC4",
  divider:  "#2a333d",
};

const RATING_COLOR  = { Critical: "#dc2626", High: "#ea580c", Tolerable: "#ca8a04", Low: "#16a34a" };
const STATUS_COLOR  = { Identified: "#64748b", "Under Mitigation": "#1d4ed8", Resolved: "#065f46" };
const STATUS_PIE    = [
  { key: "Identified",       fill: "#64748b" },
  { key: "Under Mitigation", fill: "#1d4ed8" },
  { key: "Resolved",         fill: "#059669" },
];
const RATING_PIE    = [
  { key: "Critical",  fill: "#dc2626" },
  { key: "High",      fill: "#ea580c" },
  { key: "Tolerable", fill: "#ca8a04" },
  { key: "Low",       fill: "#16a34a" },
];

// ── helpers ───────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div style={{ background: P.card, border: `1px solid ${P.border}` }} className="p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: P.light }}>{label}</span>
        <div className="w-7 h-7 flex items-center justify-center" style={{ background: accent + "22" }}>
          <Icon className="w-3.5 h-3.5" style={{ color: accent }} />
        </div>
      </div>
      <p className="text-3xl font-black" style={{ color: P.dark }}>{value ?? 0}</p>
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <h2
      className="text-[10px] font-black uppercase tracking-widest px-4 py-2.5 border-b"
      style={{ color: P.light, borderColor: P.border, background: P.bg }}
    >
      {children}
    </h2>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 text-xs font-semibold shadow-xl"
      style={{ background: P.dark, color: "#fff", border: `1px solid ${P.divider}` }}>
      <p className="font-black mb-1" style={{ color: P.light }}>{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.fill || p.color }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

// ── main component ────────────────────────────────────────────────────────────
export default function StaffAnalytics() {
  const user = useAppStore((s) => s.user);
  const deptId = user?.department_id;

  const [summary,  setSummary]  = useState(null);
  const [trend,    setTrend]    = useState([]);
  const [cats,     setCats]     = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [ratings,  setRatings]  = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const p = deptId ? { dept_id: deptId } : {};
    Promise.all([
      getDashboardSummary(p),
      getDashboardTrend(p),
      getDashboardByCategory(p),
      getRisks({ ...p, page_size: 500, page: 1 }),
    ]).then(([s, tr, cat, riskResp]) => {
      setSummary(s);

      // trend: normalise to [{month, count}]
      setTrend(
        (tr?.trend ?? tr ?? []).map((t) => ({
          month: t.month ?? t.period ?? t.label ?? "",
          count: t.count ?? 0,
        }))
      );

      // categories: [{name, count}]
      setCats(
        (cat?.by_category ?? cat ?? []).map((c) => ({
          name: c.category ?? c.name ?? "Other",
          count: c.count ?? 0,
        })).sort((a, b) => b.count - a.count)
      );

      // derive status + rating distributions from risks list
      const risks = riskResp?.risks ?? [];

      const statusMap = {};
      const ratingMap = {};
      for (const r of risks) {
        statusMap[r.status]      = (statusMap[r.status]      ?? 0) + 1;
        ratingMap[r.risk_rating] = (ratingMap[r.risk_rating] ?? 0) + 1;
      }

      setStatuses(
        STATUS_PIE.map((p) => ({ name: p.key, value: statusMap[p.key] ?? 0, fill: p.fill }))
      );
      setRatings(
        RATING_PIE.map((p) => ({ name: p.key, value: ratingMap[p.key] ?? 0, fill: p.fill }))
      );
    }).finally(() => setLoading(false));
  }, [deptId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-7 h-7 border-2 border-t-transparent animate-spin" style={{ borderColor: P.accent, borderTopColor: "transparent" }} />
      </div>
    );
  }

  const hasTrend = trend.length > 0;
  const hasCats  = cats.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 flex items-center justify-center" style={{ background: P.accent }}>
          <BarChart2 className="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-black tracking-tight" style={{ color: P.dark }}>Analytics</h1>
          <p className="text-[11px] font-medium" style={{ color: P.mid }}>
            {user?.department_name} · Department risk insights
          </p>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={ShieldAlert}   label="Total Risks"      value={summary?.total_risks    ?? 0} accent={P.accent}  />
        <StatCard icon={AlertTriangle} label="Critical"         value={summary?.critical_count ?? 0} accent="#dc2626"   />
        <StatCard icon={TrendingUp}    label="Under Mitigation" value={summary?.mitigation_count ?? 0} accent="#1d4ed8" />
        <StatCard icon={CheckCircle}   label="Resolved"         value={summary?.resolved_count ?? 0} accent="#059669"  />
      </div>

      {/* Trend + Category row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Trend */}
        <div style={{ background: P.card, border: `1px solid ${P.border}` }}>
          <SectionTitle>Risk Reports Over Time</SectionTitle>
          <div className="p-4">
            {hasTrend ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={trend} barSize={20}>
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: P.light }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: P.light }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: P.accent + "15" }} />
                  <Bar dataKey="count" name="Risks" fill={P.accent} radius={[0, 0, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState label="No trend data yet" />
            )}
          </div>
        </div>

        {/* Categories */}
        <div style={{ background: P.card, border: `1px solid ${P.border}` }}>
          <SectionTitle>Risks by Category</SectionTitle>
          <div className="p-4">
            {hasCats ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={cats} layout="vertical" barSize={14}>
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: P.light }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10, fill: P.mid }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: P.accent + "15" }} />
                  <Bar dataKey="count" name="Risks" fill={P.accent} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState label="No category data yet" />
            )}
          </div>
        </div>
      </div>

      {/* Status + Rating row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Status */}
        <div style={{ background: P.card, border: `1px solid ${P.border}` }}>
          <SectionTitle>Status Breakdown</SectionTitle>
          <div className="p-4 flex flex-col items-center">
            {statuses.some((s) => s.value > 0) ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={statuses} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} stroke="none">
                      {statuses.map((s) => <Cell key={s.name} fill={s.fill} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-3 mt-2">
                  {statuses.map((s) => (
                    <div key={s.name} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5" style={{ background: s.fill }} />
                      <span className="text-[11px] font-semibold" style={{ color: P.mid }}>{s.name}</span>
                      <span className="text-[11px] font-black" style={{ color: P.dark }}>{s.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <EmptyState label="No status data yet" />
            )}
          </div>
        </div>

        {/* Rating */}
        <div style={{ background: P.card, border: `1px solid ${P.border}` }}>
          <SectionTitle>Risk Rating Distribution</SectionTitle>
          <div className="p-4">
            {ratings.some((r) => r.value > 0) ? (
              <>
                <div className="space-y-3 mt-2">
                  {ratings.map((r) => {
                    const total  = ratings.reduce((acc, x) => acc + x.value, 0);
                    const pct    = total ? Math.round((r.value / total) * 100) : 0;
                    return (
                      <div key={r.name}>
                        <div className="flex justify-between mb-1">
                          <span className="text-[11px] font-bold" style={{ color: P.mid }}>{r.name}</span>
                          <span className="text-[11px] font-black" style={{ color: r.fill }}>{r.value} <span style={{ color: P.light }}>({pct}%)</span></span>
                        </div>
                        <div className="h-2 w-full" style={{ background: P.bg }}>
                          <div className="h-2 transition-all duration-500" style={{ width: `${pct}%`, background: r.fill }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <EmptyState label="No rating data yet" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ label }) {
  return (
    <div className="h-40 flex items-center justify-center">
      <p className="text-xs font-semibold" style={{ color: P.light }}>{label}</p>
    </div>
  );
}
