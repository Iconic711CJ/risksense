import { useEffect, useState } from "react";
import { ShieldAlert, TrendingUp, CheckCircle, AlertTriangle, LayoutDashboard } from "lucide-react";
import {
  getDashboardSummary, getDashboardByDept, getDashboardTrend, getDashboardByCategory
} from "../../services/api";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, PieChart, Pie, Cell, Legend
} from "recharts";

const RATING_COLORS = { Critical: "#ef4444", High: "#f97316", Tolerable: "#eab308", Low: "#22c55e" };
const CAT_COLORS = ["#6366f1", "#f97316", "#22c55e", "#eab308", "#ec4899", "#14b8a6", "#8b5cf6", "#64748b"];

function StatCard({ icon: Icon, label, value, sub, color, textColor }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <p className={`text-2xl font-black ${textColor ?? "text-slate-900"}`}>{value}</p>
      <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">{label}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function AdminDashboard() {
  const [summary, setSummary] = useState(null);
  const [deptData, setDeptData] = useState([]);
  const [trend, setTrend] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getDashboardSummary(),
      getDashboardByDept(),
      getDashboardTrend(),
      getDashboardByCategory(),
    ]).then(([s, d, t, c]) => {
      setSummary(s);
      setDeptData(d);
      setTrend(t);
      setCategories(c);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-[#064E3B] border-t-transparent animate-spin" />
      </div>
    );
  }

  const deptChartData = deptData.map((d) => ({
    name: (d.dept_name ?? d.department_name ?? "").split(" ")[0],
    Critical: d.critical ?? 0,
    High: d.high ?? 0,
    Tolerable: d.tolerable ?? 0,
    Low: d.low ?? 0,
  }));

  return (
    <div className="space-y-7">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <LayoutDashboard className="w-5 h-5 text-[#064E3B]" />
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Risk Dashboard</h1>
        </div>
        <p className="text-sm text-slate-400">Organisation-wide risk intelligence</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={ShieldAlert} label="Total Risks" value={summary?.total_risks ?? 0}
          color="bg-slate-700" />
        <StatCard icon={AlertTriangle} label="Critical" value={summary?.critical_count ?? 0}
          color="bg-red-500" textColor="text-red-600" />
        <StatCard icon={TrendingUp} label="Under Mitigation" value={summary?.under_mitigation_count ?? 0}
          color="bg-orange-500" textColor="text-orange-600" />
        <StatCard icon={CheckCircle} label="Resolved" value={summary?.resolved_count ?? 0}
          color="bg-emerald-600" textColor="text-emerald-600" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dept bar chart */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-700 mb-5">Risks by Department</h2>
          {deptChartData.length === 0 ? (
            <p className="text-slate-400 text-xs text-center py-10">No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={deptChartData} margin={{ left: -20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                {Object.entries(RATING_COLORS).map(([key, color]) => (
                  <Bar key={key} dataKey={key} stackId="a" fill={color} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Trend */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-700 mb-5">30-Day Trend</h2>
          {trend.length === 0 ? (
            <p className="text-slate-400 text-xs text-center py-10">No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trend} margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#064E3B" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Category pie */}
      {categories.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-700 mb-5">Risk Categories</h2>
          <div className="flex flex-col md:flex-row items-center gap-6">
            <PieChart width={200} height={200}>
              <Pie data={categories} dataKey="count" nameKey="category" cx="50%" cy="50%" outerRadius={80}>
                {categories.map((_, i) => (
                  <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
            <div className="flex flex-wrap gap-2">
              {categories.map((c, i) => (
                <div key={c.category} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: CAT_COLORS[i % CAT_COLORS.length] }} />
                  <span className="text-xs text-slate-600">{c.category}</span>
                  <span className="text-xs font-bold text-slate-800">{c.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
