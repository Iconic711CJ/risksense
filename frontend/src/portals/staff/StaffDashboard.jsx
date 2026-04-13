import { useEffect, useState } from "react";
import { ShieldAlert, TrendingUp, CheckCircle, AlertTriangle, LayoutDashboard, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { getDashboardSummary, getRisks } from "../../services/api";
import useAppStore from "../../store/useAppStore";

const RATING_STYLE = {
  Critical: "border-l-4 border-red-500 bg-red-50",
  High: "border-l-4 border-orange-400 bg-orange-50",
  Tolerable: "border-l-4 border-yellow-400 bg-yellow-50",
  Low: "border-l-4 border-emerald-500 bg-emerald-50",
};
const RATING_BADGE = {
  Critical: "bg-red-100 text-red-700",
  High: "bg-orange-100 text-orange-700",
  Tolerable: "bg-yellow-100 text-yellow-700",
  Low: "bg-emerald-100 text-emerald-700",
};

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${color}`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <p className="text-2xl font-black text-slate-800">{value}</p>
      <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">{label}</p>
    </div>
  );
}

export default function StaffDashboard() {
  const user = useAppStore((s) => s.user);
  const [summary, setSummary] = useState(null);
  const [recentRisks, setRecentRisks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const deptParam = user?.department_id ? { dept_id: user.department_id } : {};
    Promise.all([
      getDashboardSummary(deptParam),
      getRisks({ ...deptParam, page_size: 5, page: 1 }),
    ]).then(([s, r]) => {
      setSummary(s);
      setRecentRisks(r.risks ?? []);
    }).finally(() => setLoading(false));
  }, [user?.department_id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-[#064E3B] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <LayoutDashboard className="w-5 h-5 text-[#064E3B]" />
            <h1 className="text-xl font-black text-slate-900 tracking-tight">My Dashboard</h1>
          </div>
          <p className="text-sm text-slate-400">{user?.department_name} · Risk Overview</p>
        </div>
        <Link
          to="/staff/risks/new"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#064E3B] hover:bg-emerald-800 text-white text-sm font-bold transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Report Risk
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={ShieldAlert} label="Total Risks" value={summary?.total_risks ?? 0} color="bg-slate-600" />
        <StatCard icon={AlertTriangle} label="Critical" value={summary?.critical_count ?? 0} color="bg-red-500" />
        <StatCard icon={TrendingUp} label="Mitigating" value={summary?.mitigation_count ?? 0} color="bg-orange-500" />
        <StatCard icon={CheckCircle} label="Resolved" value={summary?.resolved_count ?? 0} color="bg-emerald-600" />
      </div>

      {/* Recent risks */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-700">Recent Risks</h2>
          <Link to="/staff/risks" className="text-xs font-bold text-[#064E3B] hover:underline">View all →</Link>
        </div>
        {recentRisks.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <ShieldAlert className="w-8 h-8 text-slate-200 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">No risks logged yet</p>
            <Link to="/staff/risks/new" className="text-xs font-bold text-[#064E3B] hover:underline mt-2 block">
              Log your first risk →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {recentRisks.map((r) => (
              <div key={r.id} className={`px-6 py-3.5 flex items-start gap-4 ${RATING_STYLE[r.risk_rating] ?? ""}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-[10px] font-bold text-slate-400">{r.risk_code}</span>
                    <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold ${RATING_BADGE[r.risk_rating] ?? ""}`}>
                      {r.risk_rating}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 truncate">{r.description}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{r.status}</p>
                </div>
                <Link to={`/staff/risks/${r.id}/edit`} className="text-xs text-[#064E3B] font-bold hover:underline shrink-0 mt-1">
                  Edit
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
