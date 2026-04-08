import { cn, getRiskClass } from "../lib/utils";

export default function RiskBadge({ rating, score, className }) {
  if (!rating) return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border",
      getRiskClass(rating),
      className
    )}>
      {score !== undefined && (
        <span className="w-4 h-4 rounded-full bg-current/20 flex items-center justify-center text-[10px] font-bold">{score}</span>
      )}
      {rating}
    </span>
  );
}
