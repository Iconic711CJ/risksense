import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { getAnalysis, deleteRiskItem, deleteRiskItemsBulk, exportAnalysis, uploadFile } from "../services/api";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import RiskBadge from "../components/RiskBadge";
import RiskMatrix from "../components/RiskMatrix";
import RiskItemModal from "../components/RiskItemModal";
import StatCard from "../components/StatCard";
import { getRiskColor, CHART_COLORS, formatDate, scoreToRating } from "../lib/utils";
import {
  ArrowLeft, Plus, Download, Upload, Search, Trash2, Pencil,
  ShieldAlert, TrendingDown, AlertTriangle, BarChart3, Loader2,
  Filter, FileText, RefreshCw, ChevronDown, ChevronUp,
} from "lucide-react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, ScatterChart, Scatter, ZAxis, Legend,
} from "recharts";
import { cn } from "../lib/utils";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-xl text-xs">
      {label && <p className="text-muted-foreground mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || "#38bdf8" }}>{p.name}: <strong>{typeof p.value === "number" ? p.value.toFixed ? p.value.toFixed(1) : p.value : p.value}</strong></p>
      ))}
    </div>
  );
};

const RATING_COLORS = { Low: "#4ade80", Tolerable: "#facc15", High: "#fb923c", Critical: "#f87171" };

export default function AnalysisDetailPage({ analysisId, onBack }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("All");
  const [filterRating, setFilterRating] = useState("All");
  const [sortBy, setSortBy] = useState("inherent_risk_score");
  const [sortDir, setSortDir] = useState("desc");
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;
  const [selectedIds, setSelectedIds] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    getAnalysis(analysisId).then(setAnalysis).finally(() => setLoading(false));
  }, [analysisId]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    if (!confirm("Delete this risk item?")) return;
    try {
      await deleteRiskItem(id);
      toast.success("Risk item deleted");
      load();
    } catch (err) {
      toast.error("Failed to delete risk item");
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.length} risk items?`)) return;
    const loadingToast = toast.loading("Deleting risk items...");
    try {
      await deleteRiskItemsBulk(selectedIds);
      toast.success(`Deleted ${selectedIds.length} risk items`, { id: loadingToast });
      setSelectedIds([]);
      load();
    } catch (err) {
      toast.error("Failed to delete risk items", { id: loadingToast });
    }
  };

  const handleExport = async () => {
    setExporting(true);
    const loadingToast = toast.loading("Exporting analysis...");
    try { 
      await exportAnalysis(analysisId, analysis.name);
      toast.success("Analysis exported successfully", { id: loadingToast });
    } catch (err) {
      toast.error("Export failed", { id: loadingToast });
    } finally { 
      setExporting(false); 
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingFile(true);
    const loadingToast = toast.loading("Importing risk items...");
    try { 
      const res = await uploadFile(analysisId, file); 
      toast.success(`Successfully imported ${res.imported} risk items`, { id: loadingToast });
      load(); 
    } catch (err) {
      toast.error("Failed to import file", { id: loadingToast });
    } finally { 
      setUploadingFile(false); 
      e.target.value = ""; 
    }
  };

  const handleItemSaved = () => { 
    toast.success("Risk item saved");
    load(); 
    setModalOpen(false); 
    setEditItem(null); 
  };

  const handleSort = (col) => {
    if (sortBy === col) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("desc"); }
    setPage(1); // Reset to page 1 on sort
  };

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-7 h-7 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Loading analysis…</p>
      </div>
    </div>
  );

  if (!analysis) return (
    <div className="flex-1 flex items-center justify-center">
      <p className="text-muted-foreground">Analysis not found.</p>
    </div>
  );

  const { stats = {}, items = [] } = analysis;

  // Filter & sort items
  const categories = ["All", ...new Set(items.map((i) => i.category).filter(Boolean))];
  const ratings = ["All", "Low", "Tolerable", "High", "Critical"];

  const filtered = items
    .filter((i) => {
      const matchSearch = !search || [i.risk_id, i.risk_description, i.category, i.risk_owner]
        .some((f) => f?.toLowerCase().includes(search.toLowerCase()));
      const matchCat = filterCat === "All" || i.category === filterCat;
      const matchRating = filterRating === "All" || i.inherent_risk_rating === filterRating;
      return matchSearch && matchCat && matchRating;
    })
    .sort((a, b) => {
      const av = a[sortBy] ?? 0, bv = b[sortBy] ?? 0;
      return sortDir === "asc" ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });

  // Pagination logic
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  // Ensure current page is valid when filtering changes
  if (page > totalPages && totalPages > 0) setPage(totalPages);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Chart Items Date Filtering
  const chartItems = items.filter(i => {
    if (!startDate && !endDate) return true;
    if (!i.date) return false; // Filter out items with no date if a date filter is applied
    const d = new Date(i.date);
    if (startDate && d < new Date(startDate)) return false;
    if (endDate && d > new Date(endDate)) return false;
    return true;
  });

  // Dynamic Chart data
  const catAvg = {};
  chartItems.forEach(i => {
    if (!catAvg[i.category]) catAvg[i.category] = [];
    catAvg[i.category].push(i.inherent_risk_score || 0);
  });
  const categoryData = Object.entries(catAvg).map(([name, scores]) => ({
    name,
    avg: scores.length ? scores.reduce((a,b)=>a+b,0)/scores.length : 0
  }));

  const ratingCounts = { Low: 0, Tolerable: 0, High: 0, Critical: 0 };
  chartItems.forEach(i => {
    if (i.inherent_risk_rating && ratingCounts[i.inherent_risk_rating] !== undefined) {
      ratingCounts[i.inherent_risk_rating]++;
    }
  });
  const ratingData = Object.entries(ratingCounts).map(([name, value]) => ({ name, value, color: RATING_COLORS[name] }));

  const scatterData = chartItems.map((i) => ({
    x: i.inherent_likelihood || 0,
    y: i.inherent_impact || 0,
    z: i.inherent_risk_score || 1,
    name: i.risk_id,
  }));

  const SortIcon = ({ col }) => {
    if (sortBy !== col) return <ChevronDown className="w-3 h-3 opacity-30" />;
    return sortDir === "asc" ? <ChevronUp className="w-3 h-3 text-primary" /> : <ChevronDown className="w-3 h-3 text-primary" />;
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
      {/* Top bar */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="w-4 h-4" /></Button>
          <div className="min-w-0">
            <h1 className="font-display font-bold text-lg text-foreground truncate">{analysis.name}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-muted-foreground">{analysis.type}</span>
              {analysis.contact_person && <>
                <span className="text-muted-foreground/40">•</span>
                <span className="text-xs text-muted-foreground">{analysis.contact_person}</span>
              </>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <label>
            <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileUpload} />
            <Button variant="outline" size="sm" asChild>
              <span className="cursor-pointer">
                {uploadingFile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                Import
              </span>
            </Button>
          </label>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
            {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Export
          </Button>
          <Button size="sm" onClick={() => { setEditItem(null); setModalOpen(true); }}>
            <Plus className="w-3.5 h-3.5" /> Add Risk
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-6 space-y-5">
        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Risks" value={stats.total || 0} icon={ShieldAlert} color="primary" />
          <StatCard title="Avg Inherent Score" value={stats.avg_inherent || 0} icon={BarChart3} color="orange" />
          <StatCard title="Avg Residual Score" value={stats.avg_residual || 0} icon={TrendingDown} color="green" />
          <StatCard title="Risk Reduction" value={`${stats.risk_reduction || 0}%`} icon={AlertTriangle} color="purple" />
        </div>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="matrix">Risk Matrix</TabsTrigger>
            <TabsTrigger value="register">Risk Register</TabsTrigger>
            <TabsTrigger value="charts">Charts</TabsTrigger>
          </TabsList>

          {/* OVERVIEW */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Risk rating pie */}
              <Card>
                <CardHeader><CardTitle>Risk Distribution by Rating</CardTitle></CardHeader>
                <CardContent>
                  {ratingData.some((d) => d.value > 0) ? (
                    <div className="flex items-center gap-4">
                      <ResponsiveContainer width="50%" height={180}>
                        <PieChart>
                          <Pie data={ratingData.filter((d) => d.value > 0)} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                            {ratingData.filter((d) => d.value > 0).map((d, i) => <Cell key={i} fill={d.color} />)}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex-1 space-y-2">
                        {ratingData.map((d) => d.value > 0 && (
                          <div key={d.name} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                              <span className="text-xs text-muted-foreground">{d.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Progress value={(d.value / (stats.total || 1)) * 100} className="w-16 h-1.5"
                                indicatorClassName={d.name === "Low" ? "bg-emerald-400" : d.name === "Tolerable" ? "bg-yellow-400" : d.name === "High" ? "bg-orange-400" : "bg-red-400"}
                              />
                              <span className="text-xs font-semibold text-foreground w-4 text-right">{d.value}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">No risk items yet</p>
                  )}
                </CardContent>
              </Card>

              {/* Category avg bar */}
              <Card>
                <CardHeader><CardTitle>Avg Inherent Risk by Category</CardTitle></CardHeader>
                <CardContent>
                  {categoryData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={categoryData} layout="vertical" margin={{ left: 0, right: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                        <XAxis type="number" domain={[0, 25]} tick={{ fontSize: 10, fill: "#6b7280" }} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#6b7280" }} width={90} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="avg" name="Avg Score" radius={[0,4,4,0]}>
                          {categoryData.map((d, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Top risks */}
            <Card>
              <CardHeader><CardTitle>Top 5 Critical Risks</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {items
                    .sort((a, b) => (b.inherent_risk_score || 0) - (a.inherent_risk_score || 0))
                    .slice(0, 5)
                    .map((item) => (
                      <div key={item.id} className="flex items-center gap-3 p-3 glass rounded-lg">
                        <RiskBadge rating={item.inherent_risk_rating} score={item.inherent_risk_score} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{item.risk_id}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{item.risk_description || item.category}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[10px] text-muted-foreground">{item.category}</p>
                          {item.risk_owner && <p className="text-[10px] text-muted-foreground">{item.risk_owner}</p>}
                        </div>
                      </div>
                    ))}
                  {items.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No risk items yet</p>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* RISK MATRIX */}
          <TabsContent value="matrix">
            <Card>
              <CardHeader><CardTitle>5×5 Risk Matrix</CardTitle></CardHeader>
              <CardContent>
                <RiskMatrix items={items} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* RISK REGISTER */}
          <TabsContent value="register" className="space-y-3">
            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input placeholder="Search items..." className="pl-8 h-8 text-xs" value={search} onChange={(e) => {setSearch(e.target.value); setPage(1);}} />
              </div>
              <select
                value={filterCat}
                onChange={(e) => {setFilterCat(e.target.value); setPage(1);}}
                className="h-8 px-3 rounded-lg border border-border bg-secondary/50 text-xs text-foreground"
              >
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select
                value={filterRating}
                onChange={(e) => {setFilterRating(e.target.value); setPage(1);}}
                className="h-8 px-3 rounded-lg border border-border bg-secondary/50 text-xs text-foreground"
              >
                {ratings.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <span className="text-xs text-muted-foreground">{filtered.length} of {items.length}</span>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="overflow-x-auto scrollbar-thin pb-16">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-secondary/30">
                      <th className="px-3 py-2.5 text-left w-10">
                        <input 
                          type="checkbox" 
                          className="rounded border-border accent-primary w-3.5 h-3.5 cursor-pointer"
                          checked={paginated.length > 0 && selectedIds.length === paginated.length}
                          onChange={(e) => setSelectedIds(e.target.checked ? paginated.map(i => i.id) : [])}
                        />
                      </th>
                      {[
                        { label: "Risk ID", key: "risk_id" },
                        { label: "Category", key: "category" },
                        { label: "Description", key: "risk_description" },
                        { label: "Inh. Score", key: "inherent_risk_score" },
                        { label: "Inh. Rating", key: "inherent_risk_rating" },
                        { label: "Controls", key: "controls" },
                        { label: "Res. Score", key: "residual_risk_score" },
                        { label: "Res. Rating", key: "residual_risk_rating" },
                        { label: "Owner", key: "risk_owner" },
                        { label: "Status", key: "status" },
                        { label: "", key: null },
                      ].map(({ label, key }) => (
                        <th
                          key={label}
                          onClick={() => key && handleSort(key)}
                          className={cn(
                            "text-left px-3 py-2.5 font-semibold text-muted-foreground whitespace-nowrap",
                            key && "cursor-pointer hover:text-foreground transition-colors"
                          )}
                        >
                          <span className="flex items-center gap-1">
                            {label}
                            {key && <SortIcon col={key} />}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((item, idx) => (
                      <div key={item.id} className="contents">
                        <tr
                          key={item.id}
                          className={cn(
                            "border-b border-border/50 hover:bg-accent/50 transition-colors cursor-pointer",
                            idx % 2 === 0 ? "" : "bg-secondary/10",
                            expandedRow === item.id && "bg-primary/5",
                            selectedIds.includes(item.id) && "bg-primary/10"
                          )}
                          onClick={() => setExpandedRow(expandedRow === item.id ? null : item.id)}
                        >
                          <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                            <input 
                              type="checkbox"
                              className="rounded border-border accent-primary w-3.5 h-3.5 cursor-pointer"
                              checked={selectedIds.includes(item.id)}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedIds([...selectedIds, item.id]);
                                else setSelectedIds(selectedIds.filter(id => id !== item.id));
                              }}
                            />
                          </td>
                          <td className="px-3 py-2.5 font-mono font-semibold text-primary whitespace-nowrap">{item.risk_id}</td>
                          <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">{item.category}</td>
                          <td className="px-3 py-2.5 max-w-[200px]">
                            <p className="truncate text-foreground">{item.risk_description || "—"}</p>
                          </td>
                          <td className="px-3 py-2.5 text-center font-bold text-foreground">{item.inherent_risk_score || "—"}</td>
                          <td className="px-3 py-2.5"><RiskBadge rating={item.inherent_risk_rating} /></td>
                          <td className="px-3 py-2.5 max-w-[140px]">
                            <p className="truncate text-muted-foreground">{item.controls || "—"}</p>
                          </td>
                          <td className="px-3 py-2.5 text-center font-bold text-foreground">{item.residual_risk_score || "—"}</td>
                          <td className="px-3 py-2.5"><RiskBadge rating={item.residual_risk_rating} /></td>
                          <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">{item.risk_owner || "—"}</td>
                          <td className="px-3 py-2.5">
                            {item.status && <span className="px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border text-[10px]">{item.status}</span>}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                              <button onClick={(e) => { e.stopPropagation(); setEditItem(item); setModalOpen(true); }}
                                className="w-6 h-6 rounded flex items-center justify-center hover:bg-accent text-muted-foreground hover:text-foreground transition-all">
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                                className="w-6 h-6 rounded flex items-center justify-center hover:bg-red-400/10 text-muted-foreground hover:text-red-400 transition-all">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                        {/* Expanded row */}
                        {expandedRow === item.id && (
                          <tr key={`${item.id}-expanded`} className="bg-primary/3 border-b border-border">
                            <td colSpan={11} className="px-4 py-4">
                              <div className="grid grid-cols-3 gap-4 text-xs">
                                {[
                                  ["Causes", item.causes],
                                  ["Consequence", item.consequence],
                                  ["Treatment Option", item.treatment_option],
                                  ["Treatment Actions", item.treatment_actions],
                                  ["Timeframe", item.timeframe],
                                  ["Control Rating", item.control_rating],
                                ].map(([label, value]) => value && (
                                  <div key={label}>
                                    <p className="text-muted-foreground font-semibold mb-0.5">{label}</p>
                                    <p className="text-foreground">{value}</p>
                                  </div>
                                ))}
                                <div className="flex gap-2 col-span-3 mt-1">
                                  <Button size="sm" variant="outline" onClick={() => { setEditItem(item); setModalOpen(true); }}>
                                    <Pencil className="w-3 h-3" /> Edit Item
                                  </Button>
                                  <Button size="sm" variant="destructive" onClick={() => handleDelete(item.id)}>
                                    <Trash2 className="w-3 h-3" /> Delete
                                  </Button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </div>
                    ))}
                  </tbody>
                </table>
                {filtered.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">No items match your filters</p>
                  </div>
                )}
              </div>
              {filtered.length > 0 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-secondary/10">
                  <span className="text-xs text-muted-foreground">
                    Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} entries
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <span className="h-7 px-3 flex items-center justify-center text-xs text-muted-foreground font-medium">
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Bulk Action Toolbar */}
            {selectedIds.length > 0 && (
              <div className="fixed bottom-6 left-1/2 -translate-x-1/2 shadow-2xl bg-card border border-border rounded-full px-6 py-3 flex items-center gap-4 z-50 animate-slide-up">
                <span className="text-sm font-semibold text-foreground">{selectedIds.length} item{selectedIds.length > 1 && 's'} selected</span>
                <span className="w-px h-4 bg-border" />
                <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                  <Trash2 className="w-4 h-4 mr-2" /> Delete Selected
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])}>
                  Cancel
                </Button>
              </div>
            )}
          </TabsContent>

          {/* CHARTS */}
          <TabsContent value="charts" className="space-y-4">
            {/* Chart Filters */}
            <div className="flex items-center gap-4 bg-secondary/20 p-3 rounded-xl border border-border">
              <span className="text-sm font-semibold text-muted-foreground"><Filter className="w-4 h-4 inline-block mr-1" /> Filters:</span>
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground mt-0.5">Start Date</label>
                <Input type="date" className="h-8 text-xs w-auto" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground mt-0.5">End Date</label>
                <Input type="date" className="h-8 text-xs w-auto" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
              {(startDate || endDate) && (
                <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" onClick={() => { setStartDate(""); setEndDate(""); }}>
                  Clear
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Scatter plot */}
              <Card>
                <CardHeader><CardTitle>Likelihood vs Impact Scatter</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: -10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis type="number" dataKey="x" name="Likelihood" domain={[0,6]} tick={{ fontSize: 10, fill: "#6b7280" }} label={{ value: "Likelihood", position: "bottom", fontSize: 10, fill: "#6b7280" }} />
                      <YAxis type="number" dataKey="y" name="Impact" domain={[0,6]} tick={{ fontSize: 10, fill: "#6b7280" }} label={{ value: "Impact", angle: -90, position: "left", fontSize: 10, fill: "#6b7280" }} />
                      <ZAxis type="number" dataKey="z" range={[40, 200]} />
                      <Tooltip content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0]?.payload;
                        return (
                          <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-xl text-xs">
                            <p className="font-semibold text-foreground">{d?.name}</p>
                            <p className="text-muted-foreground">L: {d?.x} × I: {d?.y} = {d?.z}</p>
                          </div>
                        );
                      }} />
                      <Scatter data={scatterData} fill="#38bdf8" fillOpacity={0.7} />
                    </ScatterChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Inherent vs Residual */}
              <Card>
                <CardHeader><CardTitle>Inherent vs Residual Risk Score</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart
                      data={chartItems.slice(0, 10).map((i) => ({
                        name: i.risk_id?.replace(/^[A-Z]+-/, "") || "?",
                        inherent: i.inherent_risk_score || 0,
                        residual: i.residual_risk_score || 0,
                      }))}
                      margin={{ left: -15, right: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#6b7280" }} />
                      <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} domain={[0, 25]} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="inherent" name="Inherent" fill="#fb923c" radius={[3,3,0,0]} />
                      <Bar dataKey="residual" name="Residual" fill="#4ade80" radius={[3,3,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Category count */}
              <Card>
                <CardHeader><CardTitle>Risks by Category</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart
                      data={Object.entries(
                        chartItems.reduce((acc, i) => { acc[i.category] = (acc[i.category] || 0) + 1; return acc; }, {})
                      ).map(([name, count]) => ({ name: name.split(" ").slice(-1)[0], count }))}
                      margin={{ left: -15 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#6b7280" }} />
                      <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} allowDecimals={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="count" name="Count" radius={[3,3,0,0]}>
                        {items.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Treatment options */}
              <Card>
                <CardHeader><CardTitle>Treatment Options Distribution</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={Object.entries(
                          chartItems.filter((i) => i.treatment_option).reduce((acc, i) => {
                            acc[i.treatment_option] = (acc[i.treatment_option] || 0) + 1;
                            return acc;
                          }, {})
                        ).map(([name, value]) => ({ name, value }))}
                        cx="50%" cy="50%" outerRadius={75} paddingAngle={3} dataKey="value"
                      >
                        {chartItems.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Risk item modal */}
      <RiskItemModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditItem(null); }}
        analysisId={analysisId}
        item={editItem}
        onSaved={handleItemSaved}
      />
    </div>
  );

}
