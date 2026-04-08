import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn, formatDate } from "../../lib/utils";

const ACTION_STYLES = {
  CREATE_RISK: { color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", label: "CREATE" },
  UPDATE_RISK: { color: "text-sky-400 bg-sky-400/10 border-sky-400/20", label: "UPDATE" },
  UPDATE_STATUS: { color: "text-blue-400 bg-blue-400/10 border-blue-400/20", label: "STATUS" },
  DELETE_RISK: { color: "text-red-400 bg-red-400/10 border-red-400/20", label: "DELETE" },
  CREATE_USER: { color: "text-violet-400 bg-violet-400/10 border-violet-400/20", label: "NEW USER" },
  DELETE_USER: { color: "text-red-400 bg-red-400/10 border-red-400/20", label: "DEL USER" },
  LOGIN: { color: "text-muted-foreground bg-secondary border-border", label: "LOGIN" },
};

function ActionBadge({ action }) {
  const style = ACTION_STYLES[action] || ACTION_STYLES.LOGIN;
  return (
    <span className={cn("px-2 py-0.5 rounded-lg text-[10px] font-black border", style.color)}>
      {style.label}
    </span>
  );
}

function JsonDiff({ oldVal, newVal }) {
  if (!oldVal && !newVal) return <p className="text-xs text-muted-foreground">No details</p>;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {oldVal && (
        <div>
          <p className="text-[10px] font-bold text-red-400 uppercase mb-1">Before</p>
          <pre className="text-[10px] text-foreground/70 bg-red-500/5 border border-red-500/15 rounded-lg p-2 overflow-x-auto">
            {JSON.stringify(oldVal, null, 2)}
          </pre>
        </div>
      )}
      {newVal && (
        <div>
          <p className="text-[10px] font-bold text-emerald-400 uppercase mb-1">After</p>
          <pre className="text-[10px] text-foreground/70 bg-emerald-500/5 border border-emerald-500/15 rounded-lg p-2 overflow-x-auto">
            {JSON.stringify(newVal, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default function AuditTable({ logs = [], loading }) {
  const [expanded, setExpanded] = useState(null);

  const COL = "px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground";

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-10 rounded-xl bg-secondary animate-pulse" />
        ))}
      </div>
    );
  }

  if (!logs.length) {
    return (
      <div className="text-center py-12 text-sm text-muted-foreground">
        No audit entries found
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[600px]">
        <thead className="bg-secondary/50 border-b border-border">
          <tr>
            <th className={COL}>Timestamp</th>
            <th className={COL}>User</th>
            <th className={COL}>Action</th>
            <th className={cn(COL, "min-w-[120px]")}>Record ID</th>
            <th className={COL}>Details</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {logs.map((log) => {
            const isExpanded = expanded === log.id;
            const hasDetails = log.old_value || log.new_value;
            return (
              <>
                <tr
                  key={log.id}
                  onClick={() => hasDetails && setExpanded(isExpanded ? null : log.id)}
                  className={cn(
                    "transition-colors",
                    hasDetails && "cursor-pointer hover:bg-secondary/20"
                  )}
                >
                  <td className="px-3 py-3">
                    <div>
                      <p className="text-xs text-foreground font-mono">
                        {new Date(log.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(log.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                      </p>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <p className="text-xs font-semibold text-foreground">{log.user_name || "System"}</p>
                  </td>
                  <td className="px-3 py-3">
                    <ActionBadge action={log.action} />
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {log.record_id ? log.record_id.slice(0, 8) + "..." : "—"}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    {hasDetails ? (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        <span className="text-[11px]">View diff</span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-muted-foreground/50">—</span>
                    )}
                  </td>
                </tr>
                {isExpanded && (
                  <tr key={`${log.id}-expanded`} className="bg-secondary/10">
                    <td colSpan={5} className="px-4 py-4">
                      <JsonDiff oldVal={log.old_value} newVal={log.new_value} />
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
