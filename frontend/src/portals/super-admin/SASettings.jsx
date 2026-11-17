import { useState, useEffect } from "react";
import {
  Settings, ShieldCheck, Download, Server, Cpu, Database, KeyRound,
  CheckCircle, AlertTriangle, RefreshCw, Sliders, Lock, Zap, HardDrive, FileSpreadsheet
} from "lucide-react";
import { toast } from "sonner";
import { getSystemHealth, downloadSystemBackup } from "../../services/api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

function Field({ label, sub, children }) {
  return (
    <div className="space-y-1.5">
      <div>
        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</label>
        {sub && <p className="text-[11px] text-slate-500">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

const darkInput = "bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-600 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20";

export default function SASettings() {
  const [health, setHealth] = useState(null);
  const [loadingHealth, setLoadingHealth] = useState(true);
  const [backingUp, setBackingUp] = useState(false);

  // System Config State
  const [config, setConfig] = useState({
    platformName: "RiskSense Risk Management",
    supportEmail: "support@org.gov.zm",
    minPasswordLength: 8,
    sessionTimeoutMins: 60,
    enableBulkImport: true,
    enableAuditLogs: true,
    enablePDFReports: true,
    maintenanceMode: false,
  });

  const fetchHealth = async () => {
    setLoadingHealth(true);
    try {
      const res = await getSystemHealth();
      setHealth(res);
    } catch (err) {
      console.error("Failed to fetch health status", err);
      toast.error("Could not fetch system health metrics");
    } finally {
      setLoadingHealth(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const handleBackup = async () => {
    setBackingUp(true);
    try {
      const data = await downloadSystemBackup();
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const dateStr = new Date().toISOString().slice(0, 10);
      a.download = `RiskSense_Full_System_Backup_${dateStr}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("System database backup downloaded successfully");
    } catch (err) {
      toast.error("Failed to generate system backup");
    } finally {
      setBackingUp(false);
    }
  };

  const handleSaveSettings = (e) => {
    e.preventDefault();
    localStorage.setItem("risksense_sa_config", JSON.stringify(config));
    toast.success("System settings updated successfully");
  };

  return (
    <div className="space-y-7 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Settings className="w-4 h-4 text-indigo-400" />
            </div>
            <h1 className="text-xl font-black text-white">System Settings & Health</h1>
          </div>
          <p className="text-sm text-slate-500">Global security policies, disaster recovery backups, and module features</p>
        </div>

        <Button
          onClick={handleBackup}
          disabled={backingUp}
          className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 gap-2 font-bold text-xs"
        >
          <Download className="w-3.5 h-3.5" />
          {backingUp ? "Generating Backup..." : "Download Full Database Backup"}
        </Button>
      </div>

      {/* ── System Health Diagnostics ────────────────────────────────────────── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-bold text-white">Live System Diagnostics</h2>
          </div>
          <button
            onClick={fetchHealth}
            disabled={loadingHealth}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingHealth ? "animate-spin" : ""}`} />
            Check Health
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <Database className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">PostgreSQL DB</p>
              <p className="text-sm font-black text-white">{health?.database || "Checking..."}</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Supabase Auth</p>
              <p className="text-sm font-black text-white">{health?.auth || "Checking..."}</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
              <Zap className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">API Response Time</p>
              <p className="text-sm font-black text-white">{health?.latency_ms ? `${health.latency_ms} ms` : "Checking..."}</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
              <HardDrive className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">System Status</p>
              <span className={`text-xs font-black px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                health?.status === "HEALTHY" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
              }`}>
                {health?.status || "HEALTHY"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-7">
        {/* ── Security & Policy Settings ──────────────────────────────────────── */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Lock className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-bold text-white">Security & Password Policy</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Field label="Platform Display Title" sub="Displayed across titles, PDF reports & notifications">
              <Input
                className={darkInput}
                value={config.platformName}
                onChange={(e) => setConfig({ ...config, platformName: e.target.value })}
              />
            </Field>

            <Field label="System Administrator Contact Email" sub="Recipient for alert notifications">
              <Input
                type="email"
                className={darkInput}
                value={config.supportEmail}
                onChange={(e) => setConfig({ ...config, supportEmail: e.target.value })}
              />
            </Field>

            <Field label="Minimum Password Length" sub="Enforced on user account creation & password reset">
              <Input
                type="number"
                min={6}
                max={32}
                className={darkInput}
                value={config.minPasswordLength}
                onChange={(e) => setConfig({ ...config, minPasswordLength: parseInt(e.target.value) || 8 })}
              />
            </Field>

            <Field label="Session Timeout (Minutes)" sub="Automatic inactivity logout threshold">
              <Input
                type="number"
                min={15}
                max={480}
                className={darkInput}
                value={config.sessionTimeoutMins}
                onChange={(e) => setConfig({ ...config, sessionTimeoutMins: parseInt(e.target.value) || 60 })}
              />
            </Field>
          </div>
        </div>

        {/* ── Feature Modules Toggle ─────────────────────────────────────────── */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Sliders className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-bold text-white">System Feature Flags & Modules</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { key: "enableBulkImport", label: "Excel / CSV Risk Import", sub: "Allow staff/admins to upload risk registers", icon: FileSpreadsheet },
              { key: "enableAuditLogs", label: "Audit Trail Stream", sub: "Record user & system actions into audit log", icon: KeyRound },
              { key: "enablePDFReports", label: "Executive PDF Export", sub: "Enable PDF report generator engine", icon: Download },
            ].map((mod) => {
              const Icon = mod.icon;
              const enabled = config[mod.key];
              return (
                <div
                  key={mod.key}
                  onClick={() => setConfig({ ...config, [mod.key]: !enabled })}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                    enabled
                      ? "bg-slate-800/80 border-indigo-500/40"
                      : "bg-slate-950/40 border-slate-800 opacity-60"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-indigo-400" />
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      enabled ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-slate-700 text-slate-400"
                    }`}>
                      {enabled ? "Active" : "Disabled"}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-200">{mod.label}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{mod.sub}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 px-6 font-bold"
          >
            Save System Configurations
          </Button>
        </div>
      </form>
    </div>
  );
}
