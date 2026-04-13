import { useEffect, useState } from "react";
import { ShieldAlert, Plus, Trash2, Edit2, Search, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { getRisks, deleteRisk } from "../../services/api";
import useAppStore from "../../store/useAppStore";
import StatusChanger from "../../components/risks/StatusChanger";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

const RATING_VARIANT = {
  Critical: "critical",
  High: "high",
  Tolerable: "tolerable",
  Low: "low",
};

export default function StaffRisks() {
  const user = useAppStore((s) => s.user);
  const [risks, setRisks] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [deleting, setDeleting] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const params = { page_size: 100 };
      if (user?.department_id) params.dept_id = user.department_id;
      if (ratingFilter) params.rating = ratingFilter;
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;
      const r = await getRisks(params);
      setRisks(r.risks ?? []);
      setTotal(r.total ?? 0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [ratingFilter, statusFilter]); // eslint-disable-line

  async function handleSearch(e) {
    e.preventDefault();
    load();
  }

  async function handleDelete(id) {
    if (!confirm("Delete this risk?")) return;
    setDeleting(id);
    try {
      await deleteRisk(id);
      toast.success("Risk deleted");
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to delete");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert className="w-5 h-5 text-[#064E3B]" />
            <h1 className="text-xl font-black text-slate-900">Risk Register</h1>
          </div>
          <p className="text-sm text-slate-400">{total} risks · {user?.department_name}</p>
        </div>
        <Button className="gap-2" asChild>
          <Link to="/staff/risks/new">
            <Plus className="w-4 h-4" />
            Report Risk
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <Input
            className="pl-9 w-52"
            placeholder="Search risks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </form>
        <select
          className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-600 text-sm focus:outline-none focus:border-[#064E3B]"
          value={ratingFilter}
          onChange={(e) => setRatingFilter(e.target.value)}
        >
          <option value="">All Ratings</option>
          {["Critical", "High", "Tolerable", "Low"].map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select
          className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-600 text-sm focus:outline-none focus:border-[#064E3B]"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          {["Identified", "Under Mitigation", "Resolved"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-[#064E3B] animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Code</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Category</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Added By</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rating</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="text-right px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody>
                {risks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <ShieldAlert className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                      <p className="text-slate-400 text-xs">No risks found</p>
                    </td>
                  </tr>
                ) : risks.map((r) => (
                  <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3 font-mono text-xs font-bold text-slate-400">{r.risk_code}</td>
                    <td className="px-4 py-3 text-slate-700 max-w-xs">
                      <p className="truncate">{r.description}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{r.category}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{r.owner_name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant={RATING_VARIANT[r.risk_rating] ?? "secondary"}>
                        {r.risk_rating}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <StatusChanger
                        riskId={r.id}
                        status={r.status}
                        onChange={(newStatus) =>
                          setRisks((prev) => prev.map((x) => x.id === r.id ? { ...x, status: newStatus } : x))
                        }
                      />
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="w-7 h-7 text-slate-400 hover:text-[#064E3B] hover:bg-emerald-50" asChild>
                          <Link to={`/staff/risks/${r.id}/edit`}>
                            <Edit2 className="w-3.5 h-3.5" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(r.id)}
                          disabled={deleting === r.id}
                          className="w-7 h-7 text-slate-400 hover:text-red-500 hover:bg-red-50"
                        >
                          {deleting === r.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Trash2 className="w-3.5 h-3.5" />
                          }
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
