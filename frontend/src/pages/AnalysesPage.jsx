import { useEffect, useState } from "react";
import { getAnalyses, deleteAnalysis } from "../services/api";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import RiskBadge from "../components/RiskBadge";
import { formatDate, scoreToRating } from "../lib/utils";
import {
  Plus, Search, Trash2, ArrowRight, FileText, BarChart3,
  AlertTriangle, Calendar, User, Loader2, ShieldAlert,
} from "lucide-react";
import { cn } from "../lib/utils";

const TYPE_COLORS = {
  "Operational Risk": "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "Strategic Risk": "bg-purple-500/10 text-purple-400 border-purple-500/20",
  "Financial Risk": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "Compliance Risk": "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  "Market Risk": "bg-orange-500/10 text-orange-400 border-orange-500/20",
  "Technology Risk": "bg-sky-500/10 text-sky-400 border-sky-500/20",
};

export default function AnalysesPage({ onOpenCreate, onSelect, preselected }) {
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (preselected) {
      const a = analyses.find((x) => x.id === preselected);
      if (a) onSelect(a);
    }
  }, [preselected, analyses]);

  const load = () => {
    setLoading(true);
    getAnalyses().then(setAnalyses).finally(() => setLoading(false));
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!confirm("Delete this analysis and all its risk items?")) return;
    setDeleting(id);
    try {
      await deleteAnalysis(id);
      setAnalyses((prev) => prev.filter((a) => a.id !== id));
    } finally {
      setDeleting(null);
    }
  };

  const filtered = analyses.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.type?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 p-6 space-y-5 overflow-y-auto scrollbar-thin animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Risk Analyses</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{analyses.length} analyses total</p>
        </div>
        <Button onClick={onOpenCreate} size="sm">
          <Plus className="w-4 h-4" /> New Analysis
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search analyses by name or type..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div className="glass rounded-2xl p-10 text-center border-dashed">
          <ShieldAlert className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium text-foreground mb-1">{search ? "No results found" : "No analyses yet"}</p>
          <p className="text-xs text-muted-foreground mb-4">{search ? "Try a different search term" : "Create your first analysis to get started"}</p>
          {!search && <Button onClick={onOpenCreate} size="sm"><Plus className="w-3.5 h-3.5" /> Create Analysis</Button>}
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((a) => (
          <button
            key={a.id}
            onClick={() => onSelect(a)}
            className="glass rounded-xl p-5 text-left hover:border-primary/30 hover:bg-primary/3 transition-all duration-200 group relative animate-slide-up"
          >
            {/* Delete button */}
            <button
              onClick={(e) => handleDelete(e, a.id)}
              className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-all"
              disabled={deleting === a.id}
            >
              {deleting === a.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            </button>

            {/* Type badge */}
            <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border", TYPE_COLORS[a.type] || "bg-secondary text-muted-foreground border-border")}>
              {a.type || "Unknown"}
            </span>

            <h3 className="font-display font-semibold text-sm text-foreground mt-2 mb-1 pr-6 group-hover:text-primary transition-colors line-clamp-2">
              {a.name}
            </h3>

            {/* Stats row */}
            <div className="flex items-center gap-3 mt-3">
              <div className="flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{a.item_count || 0} items</span>
              </div>
              {a.critical_count > 0 && (
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                  <span className="text-xs text-red-400">{a.critical_count} critical</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">{formatDate(a.created_at)}</span>
              </div>
              {a.contact_person && (
                <div className="flex items-center gap-1">
                  <User className="w-3 h-3 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">{a.contact_person}</span>
                </div>
              )}
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
