import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Edit2, Trash2, ChevronUp, ChevronDown, ChevronsUpDown,
  Tag, User, Calendar
} from "lucide-react";
import { cn, getRiskClass, formatDate } from "../../lib/utils";

const STATUS_STYLES = {
  "Identified": "bg-sky-500/10 text-sky-400 border-sky-500/20",
  "Under Mitigation": "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  "Resolved": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

function SortIcon({ field, sortField, sortDir }) {
  if (sortField !== field) return <ChevronsUpDown className="w-3 h-3 opacity-40" />;
  return sortDir === "asc"
    ? <ChevronUp className="w-3 h-3 text-primary" />
    : <ChevronDown className="w-3 h-3 text-primary" />;
}

export default function RiskTable({ risks = [], onDelete, loading, showDept = false }) {
  const navigate = useNavigate();
  const [sortField, setSortField] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");
  const [expanded, setExpanded] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  function handleSort(field) {
    if (sortField === field) {
      setSortDir((d) => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  }

  const sorted = [...risks].sort((a, b) => {
    let av = a[sortField], bv = b[sortField];
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === "string") av = av.toLowerCase();
    if (typeof bv === "string") bv = bv.toLowerCase();
    return sortDir === "asc" ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
  });

  const COL_CLASS = "px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors";

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 rounded-xl bg-secondary animate-pulse" />
        ))}
      </div>
    );
  }

  if (!risks.length) {
    return (
      <div className="text-center py-16">
        <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-3">
          <span className="text-2xl">🛡️</span>
        </div>
        <p className="text-sm font-semibold text-foreground">No risks logged yet</p>
        <p className="text-xs text-muted-foreground mt-1">Click "Log New Risk" to get started</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[700px]">
        <thead className="bg-secondary/50 border-b border-border">
          <tr>
            <th className={COL_CLASS} onClick={() => handleSort("risk_code")}>
              <span className="flex items-center gap-1">Code <SortIcon field="risk_code" sortField={sortField} sortDir={sortDir} /></span>
            </th>
            <th className={cn(COL_CLASS, "min-w-[200px]")} onClick={() => handleSort("description")}>
              <span className="flex items-center gap-1">Description <SortIcon field="description" sortField={sortField} sortDir={sortDir} /></span>
            </th>
            {showDept && <th className={COL_CLASS}>Department</th>}
            <th className={COL_CLASS} onClick={() => handleSort("category")}>Category</th>
            <th className={COL_CLASS} onClick={() => handleSort("likelihood")}>L</th>
            <th className={COL_CLASS} onClick={() => handleSort("impact")}>I</th>
            <th className={COL_CLASS} onClick={() => handleSort("risk_score")}>Score</th>
            <th className={COL_CLASS} onClick={() => handleSort("risk_rating")}>
              <span className="flex items-center gap-1">Rating <SortIcon field="risk_rating" sortField={sortField} sortDir={sortDir} /></span>
            </th>
            <th className={COL_CLASS} onClick={() => handleSort("status")}>
              <span className="flex items-center gap-1">Status <SortIcon field="status" sortField={sortField} sortDir={sortDir} /></span>
            </th>
            <th className={COL_CLASS} onClick={() => handleSort("updated_at")}>
              <span className="flex items-center gap-1">Updated <SortIcon field="updated_at" sortField={sortField} sortDir={sortDir} /></span>
            </th>
            <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-16">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sorted.map((risk) => {
            const isExpanded = expanded === risk.id;
            return (
              <>
                <tr
                  key={risk.id}
                  onClick={() => setExpanded(isExpanded ? null : risk.id)}
                  className="hover:bg-secondary/30 transition-colors cursor-pointer group"
                >
                  <td className="px-3 py-3">
                    <span className="text-xs font-mono font-semibold text-primary">{risk.risk_code}</span>
                  </td>
                  <td className="px-3 py-3">
                    <p className="text-xs font-medium text-foreground line-clamp-2 max-w-[280px]">
                      {risk.description}
                    </p>
                    {risk.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {risk.tags.slice(0, 3).map((t) => (
                          <span key={t} className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[9px] font-semibold">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  {showDept && (
                    <td className="px-3 py-3">
                      <span className="text-[10px] font-semibold text-muted-foreground">
                        {risk.departments?.name || "—"}
                      </span>
                    </td>
                  )}
                  <td className="px-3 py-3">
                    <span className="text-[10px] text-muted-foreground">{risk.category}</span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className="text-xs font-bold text-foreground">{risk.likelihood}</span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className="text-xs font-bold text-foreground">{risk.impact}</span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className="text-xs font-black text-foreground">
                      {risk.risk_score ?? risk.likelihood * risk.impact}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className={cn("px-2 py-0.5 rounded-lg text-[10px] font-bold border", getRiskClass(risk.risk_rating))}>
                      {risk.risk_rating}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className={cn("px-2 py-0.5 rounded-lg text-[10px] font-semibold border", STATUS_STYLES[risk.status] || "border-border text-muted-foreground")}>
                      {risk.status}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-[10px] text-muted-foreground">{formatDate(risk.updated_at)}</span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/risks/${risk.id}/edit`); }}
                        className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDelete(risk); }}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
                {isExpanded && (
                  <tr key={`${risk.id}-expanded`} className="bg-secondary/20">
                    <td colSpan={showDept ? 11 : 10} className="px-4 py-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                        {risk.mitigation_plan && (
                          <div>
                            <p className="font-bold text-muted-foreground uppercase tracking-wider text-[9px] mb-1">Mitigation Plan</p>
                            <p className="text-foreground/80">{risk.mitigation_plan}</p>
                          </div>
                        )}
                        {risk.owner_name && (
                          <div>
                            <p className="font-bold text-muted-foreground uppercase tracking-wider text-[9px] mb-1">Risk Owner</p>
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3 text-primary" />
                              <span className="text-foreground/80">{risk.owner_name}</span>
                            </div>
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-muted-foreground uppercase tracking-wider text-[9px] mb-1">Created</p>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-primary" />
                            <span className="text-foreground/80">{formatDate(risk.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>

      {/* Delete confirm modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setConfirmDelete(null)}>
          <div
            className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-display font-bold text-foreground">Delete Risk?</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Are you sure you want to delete <strong className="text-foreground">{confirmDelete.risk_code}</strong>?
              This action cannot be undone.
            </p>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => { onDelete(confirmDelete.id); setConfirmDelete(null); }}
                className="flex-1 py-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-sm font-bold text-red-400 hover:bg-red-500/25 transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
