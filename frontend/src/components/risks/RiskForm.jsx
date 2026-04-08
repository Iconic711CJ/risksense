import { useState, useEffect, useCallback } from "react";
import { Loader2, Tag, X, Sparkles } from "lucide-react";
import { cn, scoreToRating, getRiskClass } from "../../lib/utils";
import { suggestTags } from "../../services/api";
import useAppStore from "../../store/useAppStore";

const CATEGORIES = [
  "Operational", "Strategic", "Financial", "Compliance",
  "Reputational", "Environmental", "Technological", "Other",
];
const STATUSES = ["Identified", "Under Mitigation", "Resolved"];

const LIKELIHOOD_OPTS = [
  { value: 1, label: "Rare", sub: "< 10%" },
  { value: 2, label: "Unlikely", sub: "10-30%" },
  { value: 3, label: "Possible", sub: "30-50%" },
  { value: 4, label: "Likely", sub: "50-80%" },
  { value: 5, label: "Certain", sub: "> 80%" },
];
const IMPACT_OPTS = [
  { value: 1, label: "Negligible", sub: "Minimal effect" },
  { value: 2, label: "Minor", sub: "Small disruption" },
  { value: 3, label: "Moderate", sub: "Significant impact" },
  { value: 4, label: "High", sub: "Major disruption" },
  { value: 5, label: "Critical", sub: "Catastrophic" },
];

const RATING_STYLES = {
  Low: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
  Tolerable: "border-yellow-500/40 bg-yellow-500/10 text-yellow-400",
  High: "border-orange-500/40 bg-orange-500/10 text-orange-400",
  Critical: "border-red-500/40 bg-red-500/10 text-red-400",
};

function RatingSelector({ options, value, onChange, label }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-foreground/80">{label}</label>
      <div className="grid grid-cols-5 gap-1.5">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex flex-col items-center gap-0.5 px-1 py-2 rounded-xl border text-center transition-all",
              "hover:border-primary/50 hover:bg-primary/5",
              value === opt.value
                ? "border-primary bg-primary/10 text-primary shadow-md shadow-primary/10"
                : "border-border text-muted-foreground"
            )}
          >
            <span className={cn(
              "text-base font-black",
              value === opt.value ? "text-primary" : "text-foreground/60"
            )}>
              {opt.value}
            </span>
            <span className="text-[9px] font-semibold leading-tight">{opt.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function RiskForm({ initial = null, departments = [], onSubmit, loading }) {
  const user = useAppStore((s) => s.user);
  const isAdmin = user?.role === "admin";

  const [description, setDescription] = useState(initial?.description || "");
  const [category, setCategory] = useState(initial?.category || "Operational");
  const [likelihood, setLikelihood] = useState(initial?.likelihood || null);
  const [impact, setImpact] = useState(initial?.impact || null);
  const [ownerName, setOwnerName] = useState(initial?.owner_name || "");
  const [mitigationPlan, setMitigationPlan] = useState(initial?.mitigation_plan || "");
  const [status, setStatus] = useState(initial?.status || "Identified");
  const [tags, setTags] = useState(initial?.tags || []);
  const [suggestedTags, setSuggestedTags] = useState([]);
  const [tagLoading, setTagLoading] = useState(false);
  const [deptId, setDeptId] = useState(initial?.department_id || "");

  const score = likelihood && impact ? likelihood * impact : null;
  const rating = score ? scoreToRating(score) : null;

  // Auto-suggest tags as user types description
  const fetchTags = useCallback(async (text) => {
    if (text.length < 10) { setSuggestedTags([]); return; }
    setTagLoading(true);
    try {
      const res = await suggestTags(text);
      // Filter out already-added tags
      setSuggestedTags((res.tags || []).filter((t) => !tags.includes(t)));
    } catch {
      // non-fatal
    } finally {
      setTagLoading(false);
    }
  }, [tags]);

  useEffect(() => {
    const t = setTimeout(() => fetchTags(description), 600);
    return () => clearTimeout(t);
  }, [description, fetchTags]);

  function addTag(tag) {
    if (!tags.includes(tag)) setTags([...tags, tag]);
    setSuggestedTags((s) => s.filter((t) => t !== tag));
  }

  function removeTag(tag) {
    setTags(tags.filter((t) => t !== tag));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!description.trim()) return;
    if (!likelihood || !impact) return;
    const payload = {
      description: description.trim(),
      category,
      likelihood,
      impact,
      owner_name: ownerName.trim(),
      mitigation_plan: mitigationPlan.trim(),
      status,
      tags,
      ...(isAdmin && deptId ? { department_id: deptId } : {}),
    };
    onSubmit(payload);
  }

  const isEdit = !!initial;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Department selector — admin only */}
      {isAdmin && !isEdit && (
        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground/80">Department <span className="text-red-400">*</span></label>
          <select
            value={deptId}
            onChange={(e) => setDeptId(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="">Select department...</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Description */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-foreground/80">
          Risk Description <span className="text-red-400">*</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the risk clearly — what could happen, where, and why..."
          rows={4}
          required
          className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none transition-all"
        />
        {/* Tag suggestions */}
        {(suggestedTags.length > 0 || tagLoading) && (
          <div className="flex items-center gap-2 flex-wrap mt-1">
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Sparkles className="w-3 h-3 text-primary" />
              {tagLoading ? "Suggesting tags..." : "Suggested:"}
            </div>
            {suggestedTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => addTag(tag)}
                className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[10px] text-primary font-semibold hover:bg-primary/20 transition-colors"
              >
                + {tag}
              </button>
            ))}
          </div>
        )}
        {/* Added tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary border border-border text-[11px] text-foreground font-medium"
              >
                <Tag className="w-2.5 h-2.5 text-primary" />
                {tag}
                <button type="button" onClick={() => removeTag(tag)}>
                  <X className="w-2.5 h-2.5 text-muted-foreground hover:text-foreground" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Category */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-foreground/80">Category</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={cn(
                "px-3 py-2 rounded-xl border text-xs font-semibold transition-all",
                category === cat
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Likelihood + Impact + Live score */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <RatingSelector options={LIKELIHOOD_OPTS} value={likelihood} onChange={setLikelihood} label="Likelihood *" />
        <RatingSelector options={IMPACT_OPTS} value={impact} onChange={setImpact} label="Impact *" />
      </div>

      {/* Live risk score display */}
      {score !== null && (
        <div className={cn(
          "flex items-center justify-between px-5 py-4 rounded-2xl border",
          RATING_STYLES[rating]
        )}>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest opacity-70">Live Risk Score</p>
            <p className="text-3xl font-display font-black mt-1">{score}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold uppercase tracking-widest opacity-70">Rating</p>
            <p className="text-2xl font-display font-black mt-1">{rating}</p>
          </div>
        </div>
      )}
      {(likelihood === null || impact === null) && (
        <div className="text-center py-2 text-xs text-muted-foreground">
          Select both Likelihood and Impact to see your risk score
        </div>
      )}

      {/* Mitigation Plan */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-foreground/80">Mitigation Plan</label>
        <textarea
          value={mitigationPlan}
          onChange={(e) => setMitigationPlan(e.target.value)}
          placeholder="Describe the steps to mitigate or control this risk..."
          rows={3}
          className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
        />
      </div>

      {/* Risk Owner + Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground/80">Risk Owner</label>
          <input
            type="text"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            placeholder="Name of the responsible person"
            className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground/80">Status</label>
          <div className="flex gap-2">
            {STATUSES.map((s) => {
              const colors = {
                "Identified": "border-sky-500/40 bg-sky-500/10 text-sky-400",
                "Under Mitigation": "border-yellow-500/40 bg-yellow-500/10 text-yellow-400",
                "Resolved": "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
              };
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={cn(
                    "flex-1 px-2 py-2 rounded-xl border text-[10px] font-bold transition-all leading-tight",
                    status === s ? colors[s] : "border-border text-muted-foreground hover:border-border/80"
                  )}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading || !description.trim() || !likelihood || !impact || (isAdmin && !isEdit && !deptId)}
        className={cn(
          "w-full py-3.5 rounded-xl font-bold text-sm",
          "bg-primary text-primary-foreground hover:bg-primary/90",
          "shadow-lg shadow-primary/20 transition-all active:scale-[0.99]",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "flex items-center justify-center gap-2"
        )}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Saving...
          </>
        ) : (
          isEdit ? "Update Risk" : "Log Risk"
        )}
      </button>
    </form>
  );
}
