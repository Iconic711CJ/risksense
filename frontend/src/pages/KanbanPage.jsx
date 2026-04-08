import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { List, RefreshCw, Plus } from "lucide-react";
import { toast } from "sonner";
import { getRisks } from "../services/api";
import KanbanBoard from "../components/risks/KanbanBoard";
import useAppStore from "../store/useAppStore";

export default function KanbanPage() {
  const { deptId } = useParams();
  const navigate = useNavigate();
  const user = useAppStore((s) => s.user);
  const isAdmin = user?.role === "admin";
  const effectiveDeptId = deptId || (!isAdmin ? user?.department_id : null);

  const [risks, setRisks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRisks = useCallback(async () => {
    try {
      const params = {
        page_size: 200,
        ...(effectiveDeptId ? { dept_id: effectiveDeptId } : {}),
      };
      const res = await getRisks(params);
      setRisks(res.risks || []);
    } catch {
      toast.error("Failed to load risks");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [effectiveDeptId]);

  useEffect(() => { fetchRisks(); }, [fetchRisks]);

  function handleRefresh() {
    setRefreshing(true);
    fetchRisks();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground tracking-tight">Kanban Board</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Drag cards to update risk status
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(deptId ? `/departments/${deptId}` : "/department/register")}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
          >
            <List className="w-3.5 h-3.5" />
            Table View
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => navigate("/risks/new")}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
          >
            <Plus className="w-3.5 h-3.5" />
            Log Risk
          </button>
        </div>
      </div>

      {/* Kanban board */}
      <div className="flex-1 min-h-0">
        <KanbanBoard risks={risks} onRefresh={fetchRisks} />
      </div>
    </div>
  );
}
