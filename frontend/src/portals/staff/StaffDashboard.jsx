import { useEffect, useState } from "react";
import {
  ShieldAlert, TrendingUp, CheckCircle, AlertTriangle,
  LayoutDashboard, Plus, ArrowRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import {
  getDashboardSummary, getDashboardTrend,
  getDashboardByCategory, getDashboardHeatmap, getRisks,
} from "../../services/api";
import useAppStore from "../../store/useAppStore";
import RiskHeatmap from "../../components/dashboard/RiskHeatmap";

// ── palette ───────────────────────────────────────────────────────────────────
const P = {
  bg:     "#DEDCDC",
  card:   "#ffffff",
  dark:   "#191D23",
  accent: "#57707A",
  mid:    "#7E919F",
  light:  "#979DAB",
  border: "#C5BAC4",
};

const STATUS_PIE = [
  { key: "Identified",       fill: "#64748b" },
  { key: "Under Mitigation", fill: "#1d4ed8" },
  { key: "Resolved",         fill: "#059669" },
];
const RATING_BARS = [
  { key: "Critical",  fill: "#dc2626" },
  { key: "High",      fill: "#ea580c" },
  { key: "Tolerable", fill: "#ca8a04" },
  { key: "Low",       fill: "#16a34a" },
];

// ── sub-components ────────────────────────────────────────────────────────────
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

function Card({ title, children, className = "" }) {
  return (
    <div style={{ background: P.card, border: `1px solid ${P.border}` }} className={className}>
      <div className="px-4 py-2.5 border-b" style={{ borderColor: P.border }}>
        <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: P.light }}>{title}</span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 text-xs font-semibold shadow-xl"
      style={{ background: P.dark, color: "#fff", border: "1px solid #2a333d" }}>
      {label && <p className="font-black mb-1" style={{ color: P.light }}>{label}</p>}
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.fill || p.color }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

const RATING_BADGE_STYLE = {
  Critical:  { background: "#fee2e2", color: "#991b1b" },
  High:      { background: "#ffedd5", color: "#9a3412" },
  Tolerable: { background: "#fef9c3", color: "#854d0e" },
  Low:       { background: "#dcfce7", color: "#166534" },
};
const STATUS_STYLE = {
  Identified:       { borderLeft: "3px solid #64748b", background: "#f8fafc" },
  "Under Mitigation": { borderLeft: "3px solid #1d4ed8", background: "#eff6ff" },
  Resolved:         { borderLeft: "3px solid #059669", background: "#f0fdf4" },
};

// ── main ──────────────────────────────────────────────────────────────────────
export default function StaffDashboard() {
  const user   = useAppStore((s) => s.user);
  const deptId = user?.department_id;
  const p      = deptId ? { dept_id: deptId } : {};

  const [summary,      setSummary]      = useState(null);
  const [trend,        setTrend]        = useState([]);
  const [cats,         setCats]         = useState([]);
  const [heatmap,      setHeatmap]      = useState([]);
  const [statuses,     setStatuses]     = useState([]);
  const [ratings,      setRatings]      = useState([]);
  const [recentRisks,  setRecentRisks]  = useState([]);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    Promise.all([
      getDashboardSummary(p),
      getDashboardTrend(p),
      getDashboardByCategory(p),
      getDashboardHeatmap(p),
      getRisks({ ...p, page_size: 500, page: 1 }),
    ]).then(([s, tr, cat, hm, riskResp]) => {
      setSummary(s);

      setTrend(
        (tr?.trend ?? tr ?? []).map((t) => ({
          month: t.month ?? t.period ?? t.label ?? "",
          count: t.count ?? 0,
        }))
      );

      setCats(
        (cat?.by_category ?? cat ?? [])
          .map((c) => ({ name: c.category ?? c.name ?? "Other", count: c.count ?? 0 }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 6)
      );

      setHeatmap(hm?.cells ?? hm ?? []);

      const risks = riskResp?.risks ?? [];
      setRecentRisks(risks.slice(0, 5));

      const statusMap = {};
      const ratingMap = {};
      for (const r of risks) {
        statusMap[r.status]      = (statusMap[r.status]      ?? 0) + 1;
        ratingMap[r.risk_rating] = (ratingMap[r.risk_rating] ?? 0) + 1;
      }
      setStatuses(STATUS_PIE.map((x)  => ({ name: x.key, value: statusMap[x.key]  ?? 0, fill: x.fill })));
      setRatings(RATING_BARS.map((x)  => ({ name: x.key, value: ratingMap[x.key]  ?? 0, fill: x.fill })));
    }).finally(() => setLoading(false));
  }, [deptId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-7 h-7 border-2 border-t-transparent animate-spin"
          style={{ borderColor: P.accent, borderTopColor: "transparent" }} />
      </div>
    );
  }

  const ratingTotal = ratings.reduce((a, r) => a + r.value, 0);

  return (
    <div className="space-y-5">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 flex items-center justify-center" style={{ background: P.accent }}>
            <LayoutDashboard className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight" style={{ color: P.dark }}>My Dashboard</h1>
            <p className="text-[11px] font-medium" style={{ color: P.mid }}>
              {user?.department_name ?? "Department"} · Risk Overview
            </p>
          </div>
        </div>
        <Link
          to="/staff/risks/new"
          className="flex items-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-widest transition-colors"
          style={{ background: P.accent, color: "#DEDCDC" }}
        >
          <Plus className="w-3.5 h-3.5" />
          Report Risk
        </Link>
      </div>

      {/* ── KPI cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={ShieldAlert}   label="Total Risks"      value={summary?.total_risks      ?? 0} accent={P.accent}  />
        <StatCard icon={AlertTriangle} label="Critical"         value={summary?.critical_count   ?? 0} accent="#dc2626"   />
        <StatCard icon={TrendingUp}    label="Under Mitigation" value={summary?.mitigation_count ?? 0} accent="#1d4ed8"   />
        <StatCard icon={CheckCircle}   label="Resolved"         value={summary?.resolved_count   ?? 0} accent="#059669"   />
      </div>

      {/* ── Row 2: Trend + Status ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* 1. Trend chart */}
        <Card title="Risk Reports Over Time" className="lg:col-span-2">
          {trend.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={trend} barSize={18}>
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: P.light }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: P.light }} axisLine={false} tickLine={false} width={24} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: P.accent + "15" }} />
                <Bar dataKey="count" name="Risks" fill={P.accent} />
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty />}
        </Card>

        {/* 2. Status pie */}
        <Card title="Status Breakdown">
          {statuses.some((s) => s.value > 0) ? (
            <>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={statuses} dataKey="value" nameKey="name" cx="50%" cy="50%"
                    innerRadius={45} outerRadius={68} stroke="none">
                    {statuses.map((s) => <Cell key={s.name} fill={s.fill} />)}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-1">
                {statuses.map((s) => (
                  <div key={s.name} className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2" style={{ background: s.fill }} />
                      <span style={{ color: P.mid }}>{s.name}</span>
                    </div>
                    <span className="font-black" style={{ color: P.dark }}>{s.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : <Empty />}
        </Card>
      </div>

      {/* ── Row 3: Rating + Category ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* 3. Rating distribution */}
        <Card title="Risk Rating Distribution">
          {ratingTotal > 0 ? (
            <div className="space-y-3 pt-1">
              {ratings.map((r) => {
                const pct = ratingTotal ? Math.round((r.value / ratingTotal) * 100) : 0;
                return (
                  <div key={r.name}>
                    <div className="flex justify-between mb-1">
                      <span className="text-[11px] font-bold" style={{ color: P.mid }}>{r.name}</span>
                      <span className="text-[11px] font-black" style={{ color: r.fill }}>
                        {r.value} <span style={{ color: P.light }}>({pct}%)</span>
                      </span>
                    </div>
                    <div className="h-2 w-full" style={{ background: P.bg }}>
                      <div className="h-2 transition-all duration-500"
                        style={{ width: `${pct}%`, background: r.fill }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <Empty />}
        </Card>

        {/* 4. Category breakdown */}
        <Card title="Risks by Category">
          {cats.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={cats} layout="vertical" barSize={12}>
                <XAxis type="number" allowDecimals={false}
                  tick={{ fontSize: 10, fill: P.light }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={90}
                  tick={{ fontSize: 10, fill: P.mid }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: P.accent + "15" }} />
                <Bar dataKey="count" name="Risks" fill={P.accent} />
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty />}
        </Card>
      </div>

      {/* ── Row 4: Heatmap ──────────────────────────────────────────────────── */}
      <Card title="Risk Heatmap  ·  Likelihood × Impact">
        <RiskHeatmap cells={heatmap} />
      </Card>

      {/* ── Row 5: Recent risks ─────────────────────────────────────────────── */}
      <div style={{ background: P.card, border: `1px solid ${P.border}` }}>
        <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: P.border }}>
          <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: P.light }}>Recent Risks</span>
          <Link to="/staff/risks"
            className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest"
            style={{ color: P.accent }}>
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {recentRisks.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <ShieldAlert className="w-8 h-8 mx-auto mb-2" style={{ color: P.border }} />
            <p className="text-sm" style={{ color: P.mid }}>No risks logged yet</p>
            <Link to="/staff/risks/new"
              className="text-xs font-bold mt-2 block" style={{ color: P.accent }}>
              Log your first risk →
            </Link>
          </div>
        ) : (
          <div>
            {recentRisks.map((r) => (
              <div key={r.id}
                className="px-4 py-3 flex items-start gap-3 border-b last:border-0"
                style={{ ...(STATUS_STYLE[r.status] ?? {}), borderColor: P.border }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono text-[10px] font-bold" style={{ color: P.light }}>
                      {r.risk_code}
                    </span>
                    <span className="inline-flex px-1.5 py-0.5 text-[10px] font-bold"
                      style={RATING_BADGE_STYLE[r.risk_rating] ?? {}}>
                      {r.risk_rating}
                    </span>
                  </div>
                  <p className="text-sm truncate" style={{ color: P.dark }}>{r.description}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: P.mid }}>{r.status}</p>
                </div>
                <Link to={`/staff/risks/${r.id}`}
                  className="text-[10px] font-bold uppercase tracking-widest shrink-0 mt-1"
                  style={{ color: P.accent }}>
                  View
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Empty() {
  return (
    <div className="h-32 flex items-center justify-center">
      <p className="text-xs font-semibold" style={{ color: "#C5BAC4" }}>No data yet</p>
    </div>
  );
}
