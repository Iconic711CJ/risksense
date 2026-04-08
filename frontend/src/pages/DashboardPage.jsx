import { useEffect, useState } from "react";
import { getAnalyses } from "../services/api";
import StatCard from "../components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import RiskBadge from "../components/RiskBadge";
import { formatDate, CHART_COLORS } from "../lib/utils";
import { ShieldAlert, TrendingDown, AlertTriangle, CheckCircle2, BarChart3, Plus, ArrowRight, Activity } from "lucide-react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line, Legend,
} from "recharts";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-xl text-xs">
      {label && <p className="text-muted-foreground mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: <strong>{p.value}</strong></p>
      ))}
    </div>
  );
};

export default function DashboardPage({ onNavigate, onOpenCreate }) {
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAnalyses().then(setAnalyses).finally(() => setLoading(false));
  }, []);

  // Aggregate stats
  const totalItems = analyses.reduce((s, a) => s + (a.item_count || 0), 0);
  const criticalCount = analyses.reduce((s, a) => s + (a.critical_count || 0), 0);
  const avgRisk = analyses.length
    ? (analyses.reduce((s, a) => s + (a.avg_risk_score || 0), 0) / analyses.filter(a => a.avg_risk_score).length || 0).toFixed(1)
    : 0;

  // Type distribution for bar chart
  const typeMap = {};
  analyses.forEach((a) => { typeMap[a.type] = (typeMap[a.type] || 0) + (a.item_count || 0); });
  const typeData = Object.entries(typeMap).map(([name, count]) => ({ name: name.replace(" Risk",""), count }));

  // Risk rating distribution
  const ratingData = [
    { name: "Low", value: 0, color: "#4ade80" },
    { name: "Tolerable", value: 0, color: "#facc15" },
    { name: "High", value: 0, color: "#fb923c" },
    { name: "Critical", value: 0, color: "#f87171" },
  ];

  // Timeline data (by month created_at)
  const monthMap = {};
  analyses.forEach((a) => {
    const m = new Date(a.created_at).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    monthMap[m] = (monthMap[m] || 0) + 1;
  });
  const timelineData = Object.entries(monthMap).map(([month, count]) => ({ month, analyses: count }));

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Activity className="w-8 h-8 text-primary animate-pulse" />
        <p className="text-sm text-muted-foreground">Loading dashboard…</p>
      </div>
    </div>
  );

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto scrollbar-thin animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Risk Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Overview of all risk analyses and key indicators</p>
        </div>
        <Button onClick={onOpenCreate} size="sm">
          <Plus className="w-4 h-4" /> New Analysis
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Analyses" value={analyses.length} subtitle="All time" icon={BarChart3} color="primary" />
        <StatCard title="Risk Items" value={totalItems} subtitle="Across all analyses" icon={ShieldAlert} color="purple" />
        <StatCard title="Critical Risks" value={criticalCount} subtitle="Require immediate action" icon={AlertTriangle} color="red" />
        <StatCard title="Avg Risk Score" value={avgRisk || "—"} subtitle="Inherent risk average" icon={TrendingDown} color="orange" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Analysis by type */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Risk Items by Analysis Type</CardTitle></CardHeader>
          <CardContent>
            {typeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={typeData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Items" radius={[4,4,0,0]}>
                    {typeData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center">
                <p className="text-sm text-muted-foreground">No data yet. Create an analysis to begin.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent analyses */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Analyses</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => onNavigate("analyses")} className="text-xs text-primary">
              View all <ArrowRight className="w-3 h-3" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {analyses.length === 0 && (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground">No analyses yet</p>
                <Button variant="outline" size="sm" onClick={onOpenCreate} className="mt-2">
                  <Plus className="w-3.5 h-3.5" /> Create first
                </Button>
              </div>
            )}
            {analyses.slice(0, 5).map((a) => (
              <button
                key={a.id}
                onClick={() => onNavigate("analyses", a.id)}
                className="w-full text-left glass rounded-lg p-3 hover:border-border/60 transition-all group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">{a.name}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{a.type}</p>
                  </div>
                  <Badge variant="secondary" className="text-[10px] shrink-0">{a.item_count || 0}</Badge>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Timeline */}
      {timelineData.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Analyses Created Over Time</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#6b7280" }} />
                <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="analyses" name="Analyses" stroke="#38bdf8" strokeWidth={2} dot={{ fill: "#38bdf8", r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Empty state call to action */}
      {analyses.length === 0 && (
        <div className="glass rounded-2xl p-10 text-center border-dashed">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-7 h-7 text-primary" />
          </div>
          <h3 className="font-display text-lg font-semibold text-foreground mb-2">Start Your First Analysis</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-5">
            Upload a risk register spreadsheet or manually enter risk items to begin tracking and analyzing your organization's risks.
          </p>
          <Button onClick={onOpenCreate}>
            <Plus className="w-4 h-4" /> Create Analysis
          </Button>
        </div>
      )}
    </div>
  );
}
