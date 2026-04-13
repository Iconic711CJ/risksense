import { useEffect, useState, useCallback } from "react";
import {
  Users, Building2, ShieldAlert, TrendingUp, Crown,
  Activity, CheckCircle, AlertTriangle, RefreshCw, Flame
} from "lucide-react";
import {
  getDashboardSummary, getDashboardByDept, getDashboardTrend,
  getDashboardByCategory, getDashboardHeatmap, getUsers, getDepartments
} from "../../services/api";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid,
  PieChart, Pie, Cell
} from "recharts";

// ── colour tokens ─────────────────────────────────────────────────────────────
const RATING_COLOR = { Critical: "#ef4444", High: "#f97316", Tolerable: "#eab308", Low: "#22c55e" };
const CAT_COLORS   = ["#6366f1","#f97316","#22c55e","#eab308","#ec4899","#14b8a6","#8b5cf6","#64748b"];

const HEATMAP_BG = (count) => {
  if (count === 0) return "bg-slate-800 text-slate-600";
  if (count <= 2)  return "bg-indigo-900/60 text-indigo-300";
  if (count <= 5)  return "bg-orange-900/60 text-orange-300";
  return "bg-rose-900/80 text-rose-300 font-black";
};

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, accent, delta }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-black text-white tabular-nums">{value ?? "—"}</p>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-0.5">{label}</p>
        {sub  && <p className="text-[11px] text-slate-600 mt-0.5">{sub}</p>}
        {delta != null && (
          <p className={`text-[11px] font-bold mt-1 ${delta >= 0 ? "text-rose-400" : "text-emerald-400"}`}>
            {delta >= 0 ? `+${delta}` : delta} vs last week
          </p>
        )}
      </div>
    </div>
  );
}

// ── Custom tooltip ────────────────────────────────────────────────────────────
function DarkTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-slate-300 font-bold mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.fill ?? p.stroke }} className="font-semibold">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SADashboard() {
  const [summary,    setSummary]    = useState(null);
  const [deptData,   setDeptData]   = useState([]);
  const [trend,      setTrend]      = useState([]);
  const [categories, setCategories] = useState([]);
  const [heatmap,    setHeatmap]    = useState([]);
  const [users,      setUsers]      = useState([]);
  const [departments,setDepartments]= useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh,setLastRefresh]= useState(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [s, d, t, c, h, u, depts] = await Promise.all([
        getDashboardSummary(),
        getDashboardByDept(),
        getDashboardTrend(),
        getDashboardByCategory(),
        getDashboardHeatmap(),
        getUsers(),
        getDepartments(),
      ]);
      setSummary(s);
      setDeptData(d);
      setTrend(t);
      setCategories(c);
      setHeatmap(h);
      setUsers(u);
      setDepartments(depts);
      setLastRefresh(new Date());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Derived values
  const adminCount = users.filter((u) => u.role === "admin").length;
  const staffCount = users.filter((u) => u.role === "department_user").length;
  const velocity   = summary?.risk_velocity ?? {};

  // Chart data
  const deptChartData = deptData.map((d) => ({
    name: (d.dept_name ?? "").split(" ")[0],
    Critical: d.critical  ?? 0,
    High:     d.high      ?? 0,
    Tolerable:d.tolerable ?? 0,
    Low:      d.low       ?? 0,
  }));

  const trendData = trend.map((t) => ({ date: t.date?.slice(5), count: t.count }));

  // Heatmap: flatten {likelihood, impact, count}[]
  const heatCells = {};
  (heatmap?.cells ?? heatmap ?? []).forEach((c) => {
    heatCells[`${c.likelihood}-${c.impact}`] = c.count ?? 0;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-7">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Crown className="w-5 h-5 text-indigo-400" />
            <h1 className="text-xl font-black text-white tracking-tight">Platform Overview</h1>
          </div>
          <p className="text-sm text-slate-500">
            ERIMP · NIPA Zambia
            {lastRefresh && (
              <span className="ml-2 text-slate-600">
                · Updated {lastRefresh.toLocaleTimeString()}
              </span>
            )}
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

      {/* ── Stat cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={ShieldAlert}   label="Total Risks"      value={summary?.total_risks ?? 0}
          sub={`${departments.length} departments`} accent="bg-indigo-600"
          delta={(velocity.this_week ?? 0) - (velocity.last_week ?? 0)} />
        <StatCard icon={Flame}         label="Critical"         value={summary?.critical_count ?? 0}
          sub={`${summary?.high_count ?? 0} high`} accent="bg-rose-600" />
        <StatCard icon={TrendingUp}    label="Under Mitigation" value={summary?.under_mitigation_count ?? 0}
          sub="Active response" accent="bg-orange-500" />
        <StatCard icon={CheckCircle}   label="Resolved"         value={summary?.resolved_count ?? 0}
          sub={`${summary?.identified_count ?? 0} identified`} accent="bg-emerald-600" />
      </div>

      {/* Second row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Building2} label="Departments" value={departments.length}
          sub="Operational units" accent="bg-violet-600" />
        <StatCard icon={Users}     label="Admins"      value={adminCount}
          sub="Org administrators" accent="bg-cyan-600" />
        <StatCard icon={Activity}  label="Staff"       value={staffCount}
          sub="Active accounts" accent="bg-slate-600" />
        <StatCard icon={AlertTriangle} label="This Week" value={velocity.this_week ?? 0}
          sub={`${velocity.last_week ?? 0} last week`} accent="bg-yellow-600" />
      </div>

      {/* ── Charts row 1 ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Dept stacked bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h2 className="text-sm font-bold text-white mb-5">Risks by Department</h2>
          {deptChartData.length === 0 ? (
            <p className="text-slate-600 text-xs text-center py-10">No risk data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={deptChartData} margin={{ left: -25 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip content={<DarkTooltip />} />
                {Object.entries(RATING_COLOR).map(([key, color]) => (
                  <Bar key={key} dataKey={key} stackId="a" fill={color} radius={key === "Low" ? [3, 3, 0, 0] : [0,0,0,0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* 30-day trend */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h2 className="text-sm font-bold text-white mb-5">30-Day Risk Trend</h2>
          {trendData.length === 0 ? (
            <p className="text-slate-600 text-xs text-center py-10">No trend data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trendData} margin={{ left: -25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#475569" }} axisLine={false} tickLine={false} interval={6} />
                <YAxis tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip content={<DarkTooltip />} />
                <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: "#6366f1" }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Charts row 2 ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Category pie */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h2 className="text-sm font-bold text-white mb-4">By Category</h2>
          {categories.length === 0 ? (
            <p className="text-slate-600 text-xs text-center py-10">No data</p>
          ) : (
            <>
              <div className="flex justify-center mb-3">
                <PieChart width={160} height={160}>
                  <Pie data={categories} dataKey="count" nameKey="category" cx="50%" cy="50%"
                    outerRadius={70} innerRadius={36} strokeWidth={0}>
                    {categories.map((_, i) => (
                      <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<DarkTooltip />} />
                </PieChart>
              </div>
              <div className="space-y-1.5">
                {categories.slice(0, 6).map((c, i) => (
                  <div key={c.category} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: CAT_COLORS[i % CAT_COLORS.length] }} />
                    <span className="text-xs text-slate-400 flex-1 truncate">{c.category}</span>
                    <span className="text-xs font-bold text-slate-300 tabular-nums">{c.count}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Risk heatmap */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h2 className="text-sm font-bold text-white mb-1">Risk Heatmap</h2>
          <p className="text-[10px] text-slate-600 mb-4">Likelihood × Impact</p>
          <div className="space-y-1.5">
            {[5, 4, 3, 2, 1].map((likelihood) => (
              <div key={likelihood} className="flex items-center gap-1.5">
                <span className="text-[9px] text-slate-600 w-3 text-right flex-shrink-0">{likelihood}</span>
                {[1, 2, 3, 4, 5].map((impact) => {
                  const count = heatCells[`${likelihood}-${impact}`] ?? 0;
                  return (
                    <div
                      key={impact}
                      title={`L${likelihood} × I${impact}: ${count} risks`}
                      className={`flex-1 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-colors ${HEATMAP_BG(count)}`}
                    >
                      {count > 0 ? count : ""}
                    </div>
                  );
                })}
              </div>
            ))}
            <div className="flex items-center gap-1.5 mt-2 pl-5">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex-1 text-center text-[9px] text-slate-600">{i}</div>
              ))}
            </div>
            <p className="text-[9px] text-slate-700 pl-5 text-center">Impact →</p>
          </div>
        </div>

        {/* Status breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h2 className="text-sm font-bold text-white mb-4">Status Breakdown</h2>
          {(() => {
            const total = summary?.total_risks ?? 0;
            const statuses = [
              { label: "Identified",      count: summary?.identified_count ?? 0,        color: "bg-slate-500",   bar: "bg-slate-400" },
              { label: "Under Mitigation",count: summary?.under_mitigation_count ?? 0,  color: "bg-blue-600",    bar: "bg-blue-500" },
              { label: "Resolved",        count: summary?.resolved_count ?? 0,           color: "bg-emerald-600", bar: "bg-emerald-500" },
            ];
            return (
              <div className="space-y-4">
                {statuses.map((s) => {
                  const pct = total > 0 ? Math.round((s.count / total) * 100) : 0;
                  return (
                    <div key={s.label}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${s.color}`} />
                          <span className="text-xs text-slate-400">{s.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-white tabular-nums">{s.count}</span>
                          <span className="text-[10px] text-slate-600 w-8 text-right">{pct}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-700 ${s.bar}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}

                <div className="pt-3 mt-3 border-t border-slate-800">
                  <p className="text-[10px] text-slate-600 mb-2 uppercase tracking-wider font-bold">Rating breakdown</p>
                  {[
                    { label: "Critical", count: summary?.critical_count ?? 0, color: "text-rose-400" },
                    { label: "High",     count: summary?.high_count ?? 0,     color: "text-orange-400" },
                  ].map((r) => (
                    <div key={r.label} className="flex items-center justify-between py-1">
                      <span className="text-xs text-slate-500">{r.label}</span>
                      <span className={`text-sm font-black tabular-nums ${r.color}`}>{r.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* ── Department table ────────────────────────────────────────────────── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">Department Risk Summary</h2>
          <span className="text-xs text-slate-600">{deptData.length} departments</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Department</th>
                <th className="text-right px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total</th>
                <th className="text-right px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Critical</th>
                <th className="text-right px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">High</th>
                <th className="text-right px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Resolved</th>
                <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Progress</th>
              </tr>
            </thead>
            <tbody>
              {deptData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-600 text-xs">No department data</td>
                </tr>
              ) : deptData.map((d, i) => {
                const pct = d.total > 0 ? Math.round((d.resolved / d.total) * 100) : 0;
                return (
                  <tr key={d.dept_code ?? i} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="inline-flex px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-[9px] font-black text-indigo-400 tracking-wider">
                          {d.dept_code}
                        </span>
                        <span className="font-medium text-slate-200">{d.dept_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-300 font-mono font-bold">{d.total}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-sm font-black tabular-nums ${d.critical > 0 ? "text-rose-400" : "text-slate-700"}`}>{d.critical}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-sm font-black tabular-nums ${d.high > 0 ? "text-orange-400" : "text-slate-700"}`}>{d.high}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-black text-emerald-400 tabular-nums">{d.resolved}</span>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[10px] text-slate-600 w-8 text-right tabular-nums">{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
