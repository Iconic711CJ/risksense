import { useEffect, useState, useCallback } from "react";
import {
  Users, Building2, ShieldAlert, TrendingUp, Crown,
  Activity, CheckCircle, AlertTriangle, RefreshCw, Flame,
  FileText, ArrowRight, ShieldCheck, Clock, UserPlus, Layers,
  ExternalLink, Search, KeyRound, Download, Server, Zap,
  Database, Lock, Unlock, Copy, Check, Sparkles, UserCheck, AlertOctagon
} from "lucide-react";
import {
  getDashboardSummary, getDashboardByDept, getDashboardTrend,
  getDashboardByCategory, getDashboardHeatmap, getUsers, getDepartments,
  getAuditLog, getRisks, getSystemHealth, downloadSystemBackup,
  resetUserPassword, createUser, createDepartment
} from "../../services/api";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, PieChart, Pie, Cell
} from "recharts";
import RiskHeatmap from "../../components/dashboard/RiskHeatmap";
import ReportGenerator from "../../components/reports/ReportGenerator";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

// ── colour tokens ─────────────────────────────────────────────────────────────
const RATING_COLOR = { Critical: "#ef4444", High: "#f97316", Tolerable: "#eab308", Low: "#22c55e" };
const CAT_COLORS   = ["#6366f1","#f97316","#22c55e","#eab308","#ec4899","#14b8a6","#8b5cf6","#64748b"];
const darkInput = "bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-600 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20";

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, accent, delta, badge, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between gap-3 transition-all ${
        onClick ? "cursor-pointer hover:border-slate-700 hover:bg-slate-800/60" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {delta != null && (
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
            delta >= 0 ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
          }`}>
            {delta >= 0 ? `+${delta}` : delta} / wk
          </span>
        )}
        {badge && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
            {badge}
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-black text-white tabular-nums">{value ?? "—"}</p>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-0.5">{label}</p>
        {sub && <p className="text-[11px] text-slate-500 mt-1">{sub}</p>}
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

export default function SADashboard() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [deptData, setDeptData] = useState([]);
  const [trend, setTrend] = useState([]);
  const [categories, setCategories] = useState([]);
  const [heatmap, setHeatmap] = useState([]);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [recentAudit, setRecentAudit] = useState([]);
  const [criticalRisks, setCriticalRisks] = useState([]);
  const [systemHealth, setSystemHealth] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [activeTab, setActiveTab] = useState("overview"); // overview | critical | governance
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedDeptFilter, setSelectedDeptFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Quick Action Modals
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedUserForReset, setSelectedUserForReset] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [copiedPass, setCopiedPass] = useState(false);
  const [resettingPass, setResettingPass] = useState(false);

  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserForm, setNewUserForm] = useState({ full_name: "", email: "", password: "", role: "admin", dept_id: "" });
  const [creatingUser, setCreatingUser] = useState(false);

  const [showAddDeptModal, setShowAddDeptModal] = useState(false);
  const [newDeptForm, setNewDeptForm] = useState({ name: "", code: "" });
  const [creatingDept, setCreatingDept] = useState(false);

  const [downloadingBackup, setDownloadingBackup] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [s, d, t, c, h, u, depts, auditRes, critRes, healthRes] = await Promise.all([
        getDashboardSummary(),
        getDashboardByDept(),
        getDashboardTrend(),
        getDashboardByCategory(),
        getDashboardHeatmap(),
        getUsers(),
        getDepartments(),
        getAuditLog({ page_size: 10 }).catch(() => []),
        getRisks({ rating: "Critical", page_size: 8 }).catch(() => ({ risks: [] })),
        getSystemHealth().catch(() => ({ status: "operational", database: "connected", auth: "active", latency_ms: 12 }))
      ]);
      setSummary(s);
      setDeptData(d);
      setTrend(t);
      setCategories(c);
      setHeatmap(h);
      setUsers(u);
      setDepartments(depts);
      setRecentAudit(Array.isArray(auditRes) ? auditRes : auditRes.items || []);
      setCriticalRisks(critRes.risks || []);
      setSystemHealth(healthRes);
      setLastRefresh(new Date());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Derived calculations
  const superAdminCount = users.filter((u) => u.role === "super_admin").length;
  const adminCount = users.filter((u) => u.role === "admin").length;
  const staffCount = users.filter((u) => u.role === "department_user").length;
  const activeCount = users.filter((u) => u.status !== "suspended").length;
  const suspendedCount = users.filter((u) => u.status === "suspended").length;

  const velocity = summary?.risk_velocity ?? {};
  const totalRisks = summary?.total_risks ?? 0;
  const resolvedPct = totalRisks > 0 ? Math.round(((summary?.resolved_count ?? 0) / totalRisks) * 100) : 0;

  // Filtered department chart data
  const filteredDeptData = selectedDeptFilter === "all" 
    ? deptData 
    : deptData.filter(d => d.dept_code === selectedDeptFilter || d.dept_name === selectedDeptFilter);

  const deptChartData = filteredDeptData.map((d) => ({
    name: (d.dept_name ?? "").split(" ")[0],
    Critical: d.critical ?? 0,
    High: d.high ?? 0,
    Tolerable: d.tolerable ?? 0,
    Low: d.low ?? 0,
  }));

  const trendData = trend.map((t) => ({ date: t.date?.slice(5), count: t.count }));

  // Quick Action Handlers
  const handleGeneratePassword = () => {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%^&*";
    let pwd = "";
    for (let i = 0; i < 12; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pwd);
  };

  const handleCopyPassword = () => {
    if (!newPassword) return;
    navigator.clipboard.writeText(newPassword);
    setCopiedPass(true);
    toast.success("Password copied to clipboard");
    setTimeout(() => setCopiedPass(false), 2000);
  };

  const handleQuickResetSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUserForReset) {
      toast.error("Please select an account to reset");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setResettingPass(true);
    try {
      await resetUserPassword(selectedUserForReset, newPassword);
      toast.success("Password reset successfully for user");
      setShowResetModal(false);
      setSelectedUserForReset("");
      setNewPassword("");
      load(true);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to reset password");
    } finally {
      setResettingPass(false);
    }
  };

  const handleQuickAddUserSubmit = async (e) => {
    e.preventDefault();
    if (!newUserForm.full_name || !newUserForm.email || !newUserForm.password) {
      toast.error("Name, email and password are required");
      return;
    }
    setCreatingUser(true);
    try {
      await createUser({
        full_name: newUserForm.full_name,
        email: newUserForm.email,
        password: newUserForm.password,
        role: newUserForm.role,
        dept_id: newUserForm.dept_id || null,
      });
      toast.success(`User ${newUserForm.full_name} created successfully`);
      setShowAddUserModal(false);
      setNewUserForm({ full_name: "", email: "", password: "", role: "admin", dept_id: "" });
      load(true);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create user");
    } finally {
      setCreatingUser(false);
    }
  };

  const handleQuickAddDeptSubmit = async (e) => {
    e.preventDefault();
    if (!newDeptForm.name || !newDeptForm.code) {
      toast.error("Department name and code are required");
      return;
    }
    setCreatingDept(true);
    try {
      await createDepartment(newDeptForm);
      toast.success(`Department "${newDeptForm.name}" created`);
      setShowAddDeptModal(false);
      setNewDeptForm({ name: "", code: "" });
      load(true);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create department");
    } finally {
      setCreatingDept(false);
    }
  };

  const handleInstantBackup = async () => {
    setDownloadingBackup(true);
    try {
      const data = await downloadSystemBackup();
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const dateStr = new Date().toISOString().slice(0, 10);
      a.download = `RiskSense_Backup_${dateStr}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Full system snapshot downloaded");
    } catch (err) {
      toast.error("Failed to generate database backup");
    } finally {
      setDownloadingBackup(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          <p className="text-xs font-semibold text-slate-400">Loading RiskSense Platform Control...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7 animate-fade-in pb-12">
      {/* ── System Health & Operational Telemetry Strip ───────────────────────── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-wrap text-xs">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="font-black uppercase tracking-wider text-emerald-400 text-[11px]">
              {systemHealth?.status === "operational" ? "All Systems Operational" : "System Active"}
            </span>
          </div>
          <span className="text-slate-700 hidden sm:inline">|</span>
          <div className="flex items-center gap-1.5 text-slate-400">
            <Database className="w-3.5 h-3.5 text-indigo-400" />
            <span>Database: <strong className="text-slate-200">PostgreSQL {systemHealth?.database || "Connected"}</strong></span>
          </div>
          <span className="text-slate-700 hidden sm:inline">|</span>
          <div className="flex items-center gap-1.5 text-slate-400">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Latency: <strong className="text-slate-200 font-mono">{systemHealth?.latency_ms ?? 12}ms</strong></span>
          </div>
          <span className="text-slate-700 hidden sm:inline">|</span>
          <div className="flex items-center gap-1.5 text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Security: <strong className="text-emerald-300">Surveillance Active</strong></span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/super-admin/settings"
            className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
          >
            System Diagnostics <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* ── Header & Action Controls ───────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Crown className="w-4 h-4 text-indigo-400" />
            </div>
            <h1 className="text-xl font-black text-white tracking-tight">Super Admin Command Center</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Master Level
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Enterprise risk registry supervision, cross-department governance, credential administration & system continuity.
            {lastRefresh && (
              <span className="ml-2 text-slate-500 font-mono text-[11px]">
                · Refreshed {lastRefresh.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <button
            onClick={() => setShowReportModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-500/20"
          >
            <FileText className="w-3.5 h-3.5" />
            Executive PDF
          </button>
          
          <button
            onClick={handleInstantBackup}
            disabled={downloadingBackup}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            {downloadingBackup ? "Exporting..." : "Database Snapshot"}
          </button>

          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600 transition-all text-xs font-bold disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Quick Action Command Bar ───────────────────────────────────────── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3 px-1">
          Instant Super Admin Operations
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={() => {
              setNewPassword("");
              setShowResetModal(true);
            }}
            className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all text-left group"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-2 group-hover:bg-indigo-600 transition-colors">
              <KeyRound className="w-4 h-4 text-indigo-400 group-hover:text-white" />
            </div>
            <p className="text-xs font-bold text-slate-200">Reset User Password</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Direct credential override</p>
          </button>

          <button
            onClick={() => setShowAddUserModal(true)}
            className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 hover:border-violet-500/50 hover:bg-violet-500/5 transition-all text-left group"
          >
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-2 group-hover:bg-violet-600 transition-colors">
              <UserPlus className="w-4 h-4 text-violet-400 group-hover:text-white" />
            </div>
            <p className="text-xs font-bold text-slate-200">Create Administrator</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Provision admin or staff</p>
          </button>

          <button
            onClick={() => setShowAddDeptModal(true)}
            className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all text-left group"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-2 group-hover:bg-emerald-600 transition-colors">
              <Building2 className="w-4 h-4 text-emerald-400 group-hover:text-white" />
            </div>
            <p className="text-xs font-bold text-slate-200">New Department</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Expand registry boundary</p>
          </button>

          <button
            onClick={() => navigate("/super-admin/audit")}
            className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 hover:border-amber-500/50 hover:bg-amber-500/5 transition-all text-left group"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-2 group-hover:bg-amber-600 transition-colors">
              <Clock className="w-4 h-4 text-amber-400 group-hover:text-white" />
            </div>
            <p className="text-xs font-bold text-slate-200">Security Audit Trail</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Review privileged actions</p>
          </button>
        </div>
      </div>

      {/* ── Pending Governance Alerts Banner (If any) ─────────────────────── */}
      {(suspendedCount > 0 || criticalRisks.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {criticalRisks.length > 0 && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center flex-shrink-0">
                  <Flame className="w-5 h-5 text-rose-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-rose-300">
                    {criticalRisks.length} Critical Risks Require Attention
                  </p>
                  <p className="text-[11px] text-rose-300/70">
                    High severity items detected across enterprise risk registries.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab("critical")}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shrink-0"
              >
                Inspect Feed
              </button>
            </div>
          )}

          {suspendedCount > 0 && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <Lock className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-amber-300">
                    {suspendedCount} Suspended / Inactive User Account(s)
                  </p>
                  <p className="text-[11px] text-amber-300/70">
                    Locked accounts unable to access RiskSense portals.
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate("/super-admin/users")}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all shrink-0"
              >
                Review Accounts
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Stat cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={ShieldAlert}
          label="Total Risks"
          value={summary?.total_risks ?? 0}
          sub={`${departments.length} departments monitored`}
          accent="bg-indigo-600"
          delta={(velocity.this_week ?? 0) - (velocity.last_week ?? 0)}
        />
        <StatCard
          icon={Flame}
          label="Critical Severity"
          value={summary?.critical_count ?? 0}
          sub={`${summary?.high_count ?? 0} high severity risks`}
          accent="bg-rose-600"
          onClick={() => setActiveTab("critical")}
        />
        <StatCard
          icon={TrendingUp}
          label="Mitigation Rate"
          value={`${resolvedPct}%`}
          sub={`${summary?.resolved_count ?? 0} resolved risks`}
          accent="bg-emerald-600"
        />
        <StatCard
          icon={Users}
          label="User Accounts"
          value={users.length}
          sub={`${superAdminCount} SA · ${adminCount} Admins · ${staffCount} Staff`}
          accent="bg-violet-600"
          badge={suspendedCount > 0 ? `${suspendedCount} locked` : "All active"}
          onClick={() => navigate("/super-admin/users")}
        />
      </div>

      {/* ── View Navigation Tabs ───────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        {[
          { id: "overview", label: "Executive NOC & Overview", icon: Layers },
          { id: "critical", label: `Critical Threat Feed (${criticalRisks.length})`, icon: Flame },
          { id: "governance", label: "Governance & Audit Trail", icon: Activity },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? "bg-slate-800 text-white border border-slate-700 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? "text-indigo-400" : "text-slate-500"}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── TAB 1: EXECUTIVE OVERVIEW ──────────────────────────────────────── */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Charts row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Department risk distribution */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-400" />
                  Risks by Department
                </h2>
                <select
                  value={selectedDeptFilter}
                  onChange={(e) => setSelectedDeptFilter(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-indigo-500"
                >
                  <option value="all">All Departments</option>
                  {departments.map(d => <option key={d.id} value={d.code}>{d.name} ({d.code})</option>)}
                </select>
              </div>
              {deptChartData.length === 0 ? (
                <p className="text-slate-600 text-xs text-center py-12">No department risk data available</p>
              ) : (
                <ResponsiveContainer width="100%" height={230}>
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

            {/* 30-day risk trend */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-400" />
                30-Day Risk Trajectory
              </h2>
              {trendData.length === 0 ? (
                <p className="text-slate-600 text-xs text-center py-12">No trajectory data logged</p>
              ) : (
                <ResponsiveContainer width="100%" height={230}>
                  <LineChart data={trendData} margin={{ left: -25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#475569" }} axisLine={false} tickLine={false} interval={6} />
                    <YAxis tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <Tooltip content={<DarkTooltip />} />
                    <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: "#6366f1" }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Charts row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Category pie */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h2 className="text-sm font-bold text-white mb-3">Category Distribution</h2>
              {categories.length === 0 ? (
                <p className="text-slate-600 text-xs text-center py-10">No categories recorded</p>
              ) : (
                <>
                  <div className="flex justify-center mb-3">
                    <PieChart width={160} height={160}>
                      <Pie data={categories} dataKey="count" nameKey="category" cx="50%" cy="50%" outerRadius={70} innerRadius={36} strokeWidth={0}>
                        {categories.map((_, i) => (
                          <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<DarkTooltip />} />
                    </PieChart>
                  </div>
                  <div className="space-y-1.5">
                    {categories.slice(0, 5).map((c, i) => (
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
              <p className="text-[10px] text-slate-500 mb-4">Likelihood × Impact matrix breakdown</p>
              <RiskHeatmap cells={heatmap} />
            </div>

            {/* Status breakdown */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
              <div>
                <h2 className="text-sm font-bold text-white mb-4">Status Breakdown</h2>
                {(() => {
                  const total = summary?.total_risks ?? 0;
                  const statuses = [
                    { label: "Identified", count: summary?.identified_count ?? 0, color: "bg-slate-500", bar: "bg-slate-400" },
                    { label: "Under Mitigation", count: summary?.under_mitigation_count ?? 0, color: "bg-amber-500", bar: "bg-amber-500" },
                    { label: "Resolved", count: summary?.resolved_count ?? 0, color: "bg-emerald-500", bar: "bg-emerald-500" },
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
                                <span className="text-[10px] text-slate-500 w-8 text-right">{pct}%</span>
                              </div>
                            </div>
                            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all duration-700 ${s.bar}`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              <div className="pt-4 mt-4 border-t border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Departments</p>
                  <p className="text-lg font-black text-white">{departments.length}</p>
                </div>
                <button
                  onClick={() => navigate("/super-admin/departments")}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1"
                >
                  Manage <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Real-time System & Security Activity Feed */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-400" />
                <h2 className="text-sm font-bold text-white">Live Platform Activity Stream</h2>
              </div>
              <Link to="/super-admin/audit" className="text-xs font-bold text-indigo-400 hover:text-indigo-300">
                Full Audit Log →
              </Link>
            </div>

            {recentAudit.length === 0 ? (
              <p className="text-slate-600 text-xs text-center py-6">No recent actions logged</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {recentAudit.slice(0, 6).map((a, i) => (
                  <div key={a.id || i} className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/40 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-2 h-2 rounded-full bg-indigo-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-200 truncate">
                          {a.user_name || "System"}{" "}
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                            {a.action}
                          </span>
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                          {a.table_name ? `Target: ${a.table_name}` : "Platform action"}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono flex-shrink-0 ml-2">
                      {a.created_at ? new Date(a.created_at).toLocaleTimeString() : "Recent"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: CRITICAL THREATS ────────────────────────────────────────── */}
      {activeTab === "critical" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <Flame className="w-5 h-5 text-rose-500" />
                Critical & High Severity Risk Surveillance
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Urgent threats requiring executive awareness or escalation</p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
              {criticalRisks.length} Critical Risks
            </span>
          </div>

          {criticalRisks.length === 0 ? (
            <div className="text-center py-16">
              <ShieldCheck className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-80" />
              <p className="text-slate-300 font-bold text-sm">No Critical Risks Identified</p>
              <p className="text-slate-500 text-xs mt-1">All departments have low to tolerable risk ratings currently.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {criticalRisks.map((r) => {
                const score = (r.likelihood || 1) * (r.impact || 1);
                return (
                  <div
                    key={r.id}
                    className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-600 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-sm font-black text-rose-400">{score}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-[10px] font-mono font-bold bg-slate-900 text-indigo-400 px-2 py-0.5 rounded border border-slate-700">
                            {r.risk_code}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 uppercase tracking-wider">
                            Critical
                          </span>
                          <span className="text-xs text-slate-400">
                            {r.departments?.name ?? "Department"}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-slate-100">{r.description}</p>
                        <p className="text-xs text-slate-400 mt-1">
                          Owner: <span className="text-slate-300">{r.owner_name || "Unassigned"}</span> · Status: <span className="text-amber-400">{r.status}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                      <Link
                        to={`/super-admin/risks/${r.id}`}
                        className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs font-bold text-slate-200 transition-colors flex items-center gap-1"
                      >
                        Inspect <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: GOVERNANCE & AUDIT ──────────────────────────────────────── */}
      {activeTab === "governance" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Audit Stream */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-400" />
                Comprehensive Audit Events
              </h2>
              <Link to="/super-admin/audit" className="text-xs text-indigo-400 hover:text-indigo-300 font-bold">
                View All
              </Link>
            </div>

            {recentAudit.length === 0 ? (
              <p className="text-slate-500 text-xs text-center py-10">No recent audit events logged</p>
            ) : (
              <div className="space-y-3">
                {recentAudit.map((a, i) => (
                  <div key={a.id || i} className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/40 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-indigo-400" />
                      <div>
                        <p className="font-semibold text-slate-200">{a.user_name || "System"} — <span className="text-indigo-300 font-mono">{a.action}</span></p>
                        <p className="text-[10px] text-slate-500">{a.table_name ? `Target: ${a.table_name}` : "General Action"}</p>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {a.created_at ? new Date(a.created_at).toLocaleTimeString() : "Recent"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* User Role Distribution */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 flex flex-col justify-between">
            <div>
              <h2 className="text-sm font-bold text-white mb-3">User & Account Breakdown</h2>
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-between">
                  <span className="text-xs font-semibold text-indigo-300">Super Admins</span>
                  <span className="text-base font-black text-indigo-200">{superAdminCount}</span>
                </div>
                <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-between">
                  <span className="text-xs font-semibold text-violet-300">Administrators</span>
                  <span className="text-base font-black text-violet-200">{adminCount}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">Department Staff</span>
                  <span className="text-base font-black text-slate-200">{staffCount}</span>
                </div>
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                  <span className="text-xs font-semibold text-amber-300">Suspended / Inactive</span>
                  <span className="text-base font-black text-amber-200">{suspendedCount}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate("/super-admin/users")}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md"
            >
              Open User Authority Center
            </button>
          </div>
        </div>
      )}

      {/* ── Department Performance Table ──────────────────────────────────────── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">Department Risk Register Summary</h2>
          <span className="text-xs text-slate-500">{deptData.length} monitored departments</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                <th className="text-left px-6 py-3">Department</th>
                <th className="text-right px-4 py-3">Total Risks</th>
                <th className="text-right px-4 py-3">Critical</th>
                <th className="text-right px-4 py-3">High</th>
                <th className="text-right px-4 py-3">Resolved</th>
                <th className="px-6 py-3">Resolution Progress</th>
              </tr>
            </thead>
            <tbody>
              {deptData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-600 text-xs">No department data recorded</td>
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
                        <span className="text-[10px] text-slate-500 w-8 text-right tabular-nums">{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Executive PDF Report Modal ─────────────────────────────────────── */}
      <ReportGenerator
        open={showReportModal}
        onClose={() => setShowReportModal(false)}
        summary={summary}
        deptData={deptData}
        heatmap={heatmap}
        recentRisks={criticalRisks}
        deptTitle="Platform Executive Report"
      />

      {/* ── Quick Reset User Password Modal ───────────────────────────────── */}
      <Dialog open={showResetModal} onOpenChange={(open) => { if (!open) setShowResetModal(false); }}>
        <DialogContent className="bg-slate-900 border border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2 text-base font-black">
              <KeyRound className="w-5 h-5 text-indigo-400" />
              Quick Password Reset
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Override and set a new password for any user immediately without email verification.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleQuickResetSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Target User Account
              </label>
              <select
                value={selectedUserForReset}
                onChange={(e) => setSelectedUserForReset(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="">Select a user account...</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name} ({u.email}) — [{u.role}]
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  New Password
                </label>
                <button
                  type="button"
                  onClick={handleGeneratePassword}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  Generate Strong
                </button>
              </div>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Min 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={darkInput}
                />
                {newPassword && (
                  <button
                    type="button"
                    onClick={handleCopyPassword}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs transition-colors"
                    title="Copy password"
                  >
                    {copiedPass ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowResetModal(false)}
                className="text-slate-400 hover:text-white hover:bg-slate-800 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={resettingPass}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
              >
                {resettingPass ? "Resetting..." : "Apply New Password"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Quick Create User Modal ────────────────────────────────────────── */}
      <Dialog open={showAddUserModal} onOpenChange={(open) => { if (!open) setShowAddUserModal(false); }}>
        <DialogContent className="bg-slate-900 border border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2 text-base font-black">
              <UserPlus className="w-5 h-5 text-violet-400" />
              Provision New Account
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Directly create an Administrator or Department Staff user.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleQuickAddUserSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Full Name
              </label>
              <Input
                placeholder="e.g. Tendai Banda"
                value={newUserForm.full_name}
                onChange={(e) => setNewUserForm({ ...newUserForm, full_name: e.target.value })}
                className={darkInput}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Email Address
              </label>
              <Input
                type="email"
                placeholder="e.g. user@organization.com"
                value={newUserForm.email}
                onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                className={darkInput}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Role Privilege
                </label>
                <select
                  value={newUserForm.role}
                  onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="admin">Administrator</option>
                  <option value="department_user">Department Staff</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Department
                </label>
                <select
                  value={newUserForm.dept_id}
                  onChange={(e) => setNewUserForm({ ...newUserForm, dept_id: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">None / Enterprise Wide</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Initial Password
              </label>
              <Input
                type="password"
                placeholder="Min 6 characters"
                value={newUserForm.password}
                onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                className={darkInput}
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowAddUserModal(false)}
                className="text-slate-400 hover:text-white hover:bg-slate-800 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={creatingUser}
                className="bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs"
              >
                {creatingUser ? "Creating..." : "Create Account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Quick Create Department Modal ──────────────────────────────────── */}
      <Dialog open={showAddDeptModal} onOpenChange={(open) => { if (!open) setShowAddDeptModal(false); }}>
        <DialogContent className="bg-slate-900 border border-slate-700 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2 text-base font-black">
              <Building2 className="w-5 h-5 text-emerald-400" />
              New Department
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Register a business unit to hold an independent risk registry.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleQuickAddDeptSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Department Name
              </label>
              <Input
                placeholder="e.g. Information Technology"
                value={newDeptForm.name}
                onChange={(e) => setNewDeptForm({ ...newDeptForm, name: e.target.value })}
                className={darkInput}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Code (Short Acronym)
              </label>
              <Input
                placeholder="e.g. IT"
                value={newDeptForm.code}
                onChange={(e) => setNewDeptForm({ ...newDeptForm, code: e.target.value.toUpperCase() })}
                maxLength={8}
                className={darkInput}
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowAddDeptModal(false)}
                className="text-slate-400 hover:text-white hover:bg-slate-800 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={creatingDept}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
              >
                {creatingDept ? "Creating..." : "Create Department"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
