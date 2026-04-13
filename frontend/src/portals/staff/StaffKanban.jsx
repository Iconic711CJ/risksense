import { useEffect, useState } from "react";
import { KanbanSquare, Loader2 } from "lucide-react";
import { getRisks, updateRiskStatus } from "../../services/api";
import useAppStore from "../../store/useAppStore";
import { toast } from "sonner";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import StatusChanger from "../../components/risks/StatusChanger";
import { Badge } from "../../components/ui/badge";

const COLUMNS = [
  { id: "Identified", label: "Identified", color: "border-t-slate-400", dot: "bg-slate-400" },
  { id: "Under Mitigation", label: "Under Mitigation", color: "border-t-blue-400", dot: "bg-blue-400" },
  { id: "Resolved", label: "Resolved", color: "border-t-emerald-500", dot: "bg-emerald-500" },
];

const RATING_VARIANT = {
  Critical: "critical",
  High: "high",
  Tolerable: "tolerable",
  Low: "low",
};

export default function StaffKanban() {
  const user = useAppStore((s) => s.user);
  const [risks, setRisks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = { page_size: 200 };
    if (user?.department_id) params.dept_id = user.department_id;
    getRisks(params).then((r) => setRisks(r.risks ?? [])).finally(() => setLoading(false));
  }, [user?.department_id]);

  async function onDragEnd(result) {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    const newStatus = destination.droppableId;
    const risk = risks.find((r) => r.id === draggableId);
    if (!risk || risk.status === newStatus) return;

    setRisks((prev) => prev.map((r) => r.id === draggableId ? { ...r, status: newStatus } : r));
    try {
      await updateRiskStatus(draggableId, newStatus);
      toast.success(`Moved to ${newStatus}`);
    } catch {
      setRisks((prev) => prev.map((r) => r.id === draggableId ? { ...r, status: risk.status } : r));
      toast.error("Failed to update status");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-[#064E3B] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 h-full flex flex-col animate-fade-in">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <KanbanSquare className="w-5 h-5 text-[#064E3B]" />
          <h1 className="text-xl font-black text-slate-900">Kanban Board</h1>
        </div>
        <p className="text-sm text-slate-400">{user?.department_name} · Drag cards to update status</p>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
          {COLUMNS.map((col) => {
            const colRisks = risks.filter((r) => r.status === col.id);
            return (
              <div key={col.id} className={`flex-shrink-0 w-72 bg-slate-50 rounded-2xl border-t-4 ${col.color} border border-slate-200 flex flex-col`}>
                <div className="px-4 py-3 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${col.dot}`} />
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">{col.label}</span>
                    <span className="ml-auto text-xs font-bold text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                      {colRisks.length}
                    </span>
                  </div>
                </div>
                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 overflow-y-auto p-3 space-y-2 min-h-[200px] transition-colors ${snapshot.isDraggingOver ? "bg-emerald-50" : ""}`}
                    >
                      {colRisks.map((r, index) => (
                        <Draggable key={r.id} draggableId={r.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`bg-white rounded-xl border p-3 shadow-sm transition-shadow ${snapshot.isDragging ? "shadow-md border-[#064E3B]/30 rotate-1" : "border-slate-200 hover:border-slate-300 hover:shadow"}`}
                            >
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <span className="font-mono text-[10px] font-bold text-slate-400">{r.risk_code}</span>
                                <Badge variant={RATING_VARIANT[r.risk_rating] ?? "secondary"} className="text-[10px]">
                                  {r.risk_rating}
                                </Badge>
                              </div>
                              <p className="text-xs text-slate-700 leading-relaxed">{r.description}</p>
                              {r.category && (
                                <p className="text-[10px] text-slate-400 mt-1.5 font-medium">{r.category}</p>
                              )}
                              <div className="mt-2.5 pt-2 border-t border-slate-100">
                                <StatusChanger
                                  riskId={r.id}
                                  status={r.status}
                                  onChange={(newStatus) =>
                                    setRisks((prev) => prev.map((x) => x.id === r.id ? { ...x, status: newStatus } : x))
                                  }
                                />
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {colRisks.length === 0 && !snapshot.isDraggingOver && (
                        <p className="text-xs text-slate-400 text-center pt-6">Drop risks here</p>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}
