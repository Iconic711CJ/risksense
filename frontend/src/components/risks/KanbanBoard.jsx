import { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useNavigate } from "react-router-dom";
import { Edit2, User, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { cn, getRiskClass } from "../../lib/utils";
import { updateRiskStatus } from "../../services/api";

const COLUMNS = [
  {
    id: "Identified",
    label: "Identified",
    color: "border-sky-500/30",
    headerColor: "text-sky-400 bg-sky-400/10 border-sky-400/20",
    dot: "bg-sky-400",
  },
  {
    id: "Under Mitigation",
    label: "Under Mitigation",
    color: "border-yellow-500/30",
    headerColor: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
    dot: "bg-yellow-400",
  },
  {
    id: "Resolved",
    label: "Resolved",
    color: "border-emerald-500/30",
    headerColor: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    dot: "bg-emerald-400",
  },
];

const RATING_BORDER = {
  Critical: "border-l-red-500",
  High: "border-l-orange-500",
  Tolerable: "border-l-yellow-500",
  Low: "border-l-emerald-500",
};

function RiskCard({ risk, index }) {
  const navigate = useNavigate();
  return (
    <Draggable draggableId={risk.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={cn(
            "bg-card border border-border rounded-xl p-3 mb-2 cursor-grab active:cursor-grabbing",
            "border-l-4 transition-all duration-150",
            RATING_BORDER[risk.risk_rating] || "border-l-border",
            snapshot.isDragging && "shadow-2xl shadow-black/40 rotate-1 scale-105 ring-1 ring-primary/30"
          )}
        >
          {/* Code + rating */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono font-bold text-primary">{risk.risk_code}</span>
            <span className={cn("px-1.5 py-0.5 rounded-md text-[9px] font-bold border", getRiskClass(risk.risk_rating))}>
              {risk.risk_rating}
            </span>
          </div>

          {/* Description */}
          <p className="text-xs text-foreground font-medium line-clamp-2 leading-relaxed mb-2">
            {risk.description}
          </p>

          {/* Footer */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              {risk.owner_name && (
                <>
                  <User className="w-2.5 h-2.5" />
                  <span className="truncate max-w-[80px]">{risk.owner_name}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-1">
              <span className={cn(
                "flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md",
                "bg-foreground/5 text-muted-foreground"
              )}>
                {risk.risk_score ?? risk.likelihood * risk.impact}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); navigate(`/risks/${risk.id}/edit`); }}
                className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary transition-colors"
              >
                <Edit2 className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}

export default function KanbanBoard({ risks: initialRisks = [], onRefresh }) {
  const [risks, setRisks] = useState(initialRisks);

  // Sync when prop changes
  if (JSON.stringify(initialRisks.map(r => r.id + r.status)) !== JSON.stringify(risks.map(r => r.id + r.status))) {
    setRisks(initialRisks);
  }

  async function handleDragEnd(result) {
    const { source, destination, draggableId } = result;
    if (!destination || destination.droppableId === source.droppableId) return;

    const newStatus = destination.droppableId;
    // Optimistic update
    const prev = [...risks];
    setRisks((rs) => rs.map((r) => r.id === draggableId ? { ...r, status: newStatus } : r));

    try {
      await updateRiskStatus(draggableId, newStatus);
      toast.success(`Moved to ${newStatus}`);
      if (onRefresh) onRefresh();
    } catch {
      // Rollback
      setRisks(prev);
      toast.error("Failed to update status. Please try again.");
    }
  }

  const byStatus = (status) => risks.filter((r) => r.status === status);

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
        {COLUMNS.map((col) => {
          const colRisks = byStatus(col.id);
          const totalScore = colRisks.reduce((s, r) => s + (r.risk_score ?? r.likelihood * r.impact ?? 0), 0);
          return (
            <div key={col.id} className={cn("flex flex-col rounded-2xl border glass", col.color)}>
              {/* Column header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <span className={cn("w-2 h-2 rounded-full", col.dot)} />
                  <h3 className="text-sm font-display font-bold text-foreground">{col.label}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground font-medium">
                    Score: {totalScore}
                  </span>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-bold border",
                    col.headerColor
                  )}>
                    {colRisks.length}
                  </span>
                </div>
              </div>

              {/* Droppable area */}
              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "flex-1 p-3 min-h-[300px] overflow-y-auto scrollbar-thin transition-colors",
                      snapshot.isDraggingOver && "bg-primary/3"
                    )}
                  >
                    {colRisks.length === 0 && !snapshot.isDraggingOver && (
                      <div className="flex items-center justify-center h-24 rounded-xl border border-dashed border-border">
                        <p className="text-[11px] text-muted-foreground text-center px-4">
                          Drop risks here
                        </p>
                      </div>
                    )}
                    {colRisks.map((risk, i) => (
                      <RiskCard key={risk.id} risk={risk} index={i} />
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
