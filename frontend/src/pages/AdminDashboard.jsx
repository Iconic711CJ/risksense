import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw, FileText, Plus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "../lib/utils";
import {
  getDashboardSummary, getDashboardByDept, getDashboardHeatmap,
  getDashboardTrend, getRisks,
} from "../services/api";
import StatCards from "../components/dashboard/StatCards";
import RiskHeatmap from "../components/dashboard/RiskHeatmap";
import DeptBarChart from "../components/dashboard/DeptBarChart";
import TrendLineChart from "../components/dashboard/TrendLineChart";
import RecentRisksTable from "../components/dashboard/RecentRisksTable";
import ReportGenerator from "../components/reports/ReportGenerator";

function SectionCard({ title, subtitle, children, className, action }) {
  return (
    <div className={cn("minimal-card p-5 flex flex-col gap-4", className)}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">{title}</h3>
          {subtitle && <p className="text-[11px] font-medium text-slate-500 mt-1">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div>
        {children}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const reportRef = useRef(null);

  const [summary, setSummary] = useState(null);
  const [deptData, setDeptData] = useState([]);
  const [heatmap, setHeatmap] = useState([]);
  const [trend, setTrend] = useState([]);
  const [recentRisks, setRecentRisks] = useState([]);
  const [loadingMain, setLoadingMain] = useState(true);
  const [loadingCharts, setLoadingCharts] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const fetchMain = useCallback(async () => {
    try {
      const [sumData, recentData] = await Promise.all([
        getDashboardSummary(),
        getRisks({ page_size: 10 }),
      ]);
      setSummary(sumData);
      setRecentRisks(recentData.risks || []);
    } catch {
      toast.error("Failed to load dashboard data");
    } finally {
      setLoadingMain(false);
    }
  }, []);

  const fetchCharts = useCallback(async () => {
    try {
      const [depts, heatData, trendData] = await Promise.all([
        getDashboardByDept(),
        getDashboardHeatmap(),
        getDashboardTrend(),
      ]);
      setDeptData(depts || []);
      setHeatmap(heatData || []);
      setTrend(trendData || []);
    } catch {
      // Charts are non-critical, fail silently
    } finally {
      setLoadingCharts(false);
    }
  }, []);

  useEffect(() => {
    fetchMain();
    fetchCharts();
  }, [fetchMain, fetchCharts]);

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([fetchMain(), fetchCharts()]);
    setRefreshing(false);
    toast.success("Dashboard refreshed");
  }

  return (
    <div className="space-y-5 animate-fade-in" ref={reportRef}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-black text-slate-900 tracking-tight">
            Risk Intelligence
          </h1>
          <p className="text-sm font-medium text-primary mt-1">
            Global Enterprise Overview · NIPA Zambia
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all shrink-0"
          >
            <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
            Refresh
          </button>
          <button
            onClick={() => setReportOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-accent text-white text-sm font-bold hover:opacity-90 transition-all shadow-sm shrink-0"
          >
            <FileText className="w-4 h-4" />
            Report
          </button>
          <button
            onClick={() => navigate("/risks/new")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-bold hover:opacity-90 transition-all shadow-sm shrink-0"
          >
            <Plus className="w-4 h-4" />
            Log Risk
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <StatCards summary={summary} loading={loadingMain} />

      {/* Row 2: Bar chart + Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SectionCard
          title="Risks by Department"
          subtitle="Stacked by rating"
          className="lg:col-span-2"
        >
          <DeptBarChart data={deptData} loading={loadingCharts} />
        </SectionCard>

        <SectionCard title="Risk Heat Map" subtitle="Likelihood × Impact distribution">
          <RiskHeatmap cells={heatmap} loading={loadingCharts} />
        </SectionCard>
      </div>

      {/* Row 3: Trend + Recent risks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SectionCard
          title="Risk Trend"
          subtitle="Risks logged — last 30 days"
          className="lg:col-span-2"
        >
          <TrendLineChart data={trend} loading={loadingCharts} />
        </SectionCard>

        <SectionCard
          title="Recent Risks"
          subtitle="Latest across all departments"
          action={
            <button
              onClick={() => navigate("/department/register")}
              className="text-xs text-primary hover:underline font-semibold"
            >
              View all
            </button>
          }
        >
          <RecentRisksTable risks={recentRisks} loading={loadingMain} />
        </SectionCard>
      </div>

      {/* PDF Report Generator */}
      <ReportGenerator
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        summary={summary}
        deptData={deptData}
        heatmap={heatmap}
        recentRisks={recentRisks}
        dashboardRef={reportRef}
      />
    </div>
  );
}
