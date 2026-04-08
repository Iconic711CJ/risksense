import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { addRiskItem, updateRiskItem } from "../services/api";
import { scoreToRating, getRiskClass } from "../lib/utils";
import { Loader2, Zap } from "lucide-react";
import { cn } from "../lib/utils";

const CATEGORIES = [
  "Political","Economic","Societal","Technological","Environmental",
  "Legal & Regulatory","Asset & Inventory Management","Financial Management",
  "Fraud and Corruption","Operational","Strategic","Other",
];
const RATINGS = [1,2,3,4,5];
const L_LABELS = {1:"Rare",2:"Unlikely",3:"Moderate",4:"Likely",5:"Common"};
const I_LABELS = {1:"Insignificant",2:"Minor",3:"Moderate",4:"Major",5:"Critical"};
const TREATMENT_OPTIONS = ["Treat","Tolerate","Transfer","Terminate"];
const CONTROL_RATINGS = ["Effective","Partially Effective","Ineffective","Not Assessed"];
const TIMEFRAMES = ["Immediate","Short-term (1-3 months)","Medium-term (3-6 months)","Long-term (6-12 months)","Ongoing"];

const empty = {
  risk_id:"", item:"", key_business_process:"", risk_description:"", category:"",
  causes:"", consequence:"", inherent_likelihood:null, inherent_impact:null,
  controls:"", control_rating:"", residual_likelihood:null, residual_impact:null,
  treatment_option:"", treatment_actions:"", timeframe:"", risk_owner:"", status:"",
};

function RatingSelector({ value, onChange, labels, label }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-foreground">{label}</Label>
      <div className="flex gap-1">
        {RATINGS.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => onChange(value === r ? null : r)}
            className={cn(
              "flex-1 h-9 rounded-lg border text-xs font-semibold transition-all duration-150",
              value === r
                ? "bg-primary/20 border-primary/50 text-primary"
                : "border-border bg-secondary/30 text-muted-foreground hover:border-border/80 hover:text-foreground"
            )}
            title={labels[r]}
          >
            {r}
          </button>
        ))}
      </div>
      {value && <p className="text-[10px] text-muted-foreground">{labels[value]}</p>}
    </div>
  );
}

function RiskScoreDisplay({ likelihood, impact, label }) {
  if (!likelihood || !impact) return null;
  const score = likelihood * impact;
  const rating = scoreToRating(score);
  return (
    <div className={cn("rounded-lg border px-3 py-2 flex items-center justify-between", getRiskClass(rating))}>
      <div className="flex items-center gap-1.5">
        <Zap className="w-3.5 h-3.5" />
        <span className="text-xs font-semibold">{label}</span>
      </div>
      <span className="text-sm font-bold">{score} — {rating}</span>
    </div>
  );
}

export default function RiskItemModal({ open, onClose, analysisId, item, onSaved }) {
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isEdit = !!item;

  useEffect(() => {
    if (item) setForm({ ...empty, ...item });
    else setForm({ ...empty });
  }, [item, open]);

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const setInput = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.risk_id.trim()) { setError("Risk ID is required"); return; }
    if (!form.category) { setError("Category is required"); return; }
    setLoading(true); setError("");
    try {
      const payload = { ...form, analysis_id: analysisId };
      const saved = isEdit ? await updateRiskItem(item.id, payload) : await addRiskItem(payload);
      onSaved(saved);
      onClose();
    } catch (e) {
      setError(e.response?.data?.detail || "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Risk Item" : "Add Risk Item"}</DialogTitle>
        </DialogHeader>

        <div className="px-6 space-y-5">
          {/* Section: Identification */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Identification</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground">Risk ID *</Label>
                <Input placeholder="e.g. OPR-001" value={form.risk_id} onChange={setInput("risk_id")} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground">Category *</Label>
                <Select value={form.category} onValueChange={set("category")}>
                  <SelectTrigger><SelectValue placeholder="Select category..." /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs font-medium text-foreground">Key Business Process / Objective</Label>
                <Input placeholder="e.g. Procurement, Financial Reporting..." value={form.key_business_process} onChange={setInput("key_business_process")} />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs font-medium text-foreground">Risk Description</Label>
                <Textarea placeholder="Describe the risk..." value={form.risk_description} onChange={setInput("risk_description")} rows={2} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground">Causes</Label>
                <Textarea placeholder="Root causes..." value={form.causes} onChange={setInput("causes")} rows={2} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground">Consequence</Label>
                <Textarea placeholder="Potential consequences..." value={form.consequence} onChange={setInput("consequence")} rows={2} />
              </div>
            </div>
          </div>

          {/* Section: Inherent Risk */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Inherent Risk Assessment</p>
            <div className="space-y-3">
              <RatingSelector value={form.inherent_likelihood} onChange={set("inherent_likelihood")} labels={L_LABELS} label="Likelihood (1=Rare → 5=Common)" />
              <RatingSelector value={form.inherent_impact} onChange={set("inherent_impact")} labels={I_LABELS} label="Impact (1=Insignificant → 5=Critical)" />
              <RiskScoreDisplay likelihood={form.inherent_likelihood} impact={form.inherent_impact} label="Inherent Risk Score" />
            </div>
          </div>

          {/* Section: Controls */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Controls</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs font-medium text-foreground">Existing Controls</Label>
                <Textarea placeholder="Describe existing controls..." value={form.controls} onChange={setInput("controls")} rows={2} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground">Control Rating</Label>
                <Select value={form.control_rating} onValueChange={set("control_rating")}>
                  <SelectTrigger><SelectValue placeholder="Rate controls..." /></SelectTrigger>
                  <SelectContent>
                    {CONTROL_RATINGS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Section: Residual Risk */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Residual Risk (After Controls)</p>
            <div className="space-y-3">
              <RatingSelector value={form.residual_likelihood} onChange={set("residual_likelihood")} labels={L_LABELS} label="Residual Likelihood" />
              <RatingSelector value={form.residual_impact} onChange={set("residual_impact")} labels={I_LABELS} label="Residual Impact" />
              <RiskScoreDisplay likelihood={form.residual_likelihood} impact={form.residual_impact} label="Residual Risk Score" />
            </div>
          </div>

          {/* Section: Treatment */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Treatment Plan</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground">Treatment Option</Label>
                <Select value={form.treatment_option} onValueChange={set("treatment_option")}>
                  <SelectTrigger><SelectValue placeholder="Select option..." /></SelectTrigger>
                  <SelectContent>
                    {TREATMENT_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground">Timeframe</Label>
                <Select value={form.timeframe} onValueChange={set("timeframe")}>
                  <SelectTrigger><SelectValue placeholder="Select timeframe..." /></SelectTrigger>
                  <SelectContent>
                    {TIMEFRAMES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs font-medium text-foreground">Treatment Actions (SMART)</Label>
                <Textarea placeholder="Specific actions to address the risk..." value={form.treatment_actions} onChange={setInput("treatment_actions")} rows={2} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground">Risk Owner</Label>
                <Input placeholder="Assigned person..." value={form.risk_owner} onChange={setInput("risk_owner")} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground">Status</Label>
                <Select value={form.status} onValueChange={set("status")}>
                  <SelectTrigger><SelectValue placeholder="Select status..." /></SelectTrigger>
                  <SelectContent>
                    {["Open","In Progress","Mitigated","Closed","Monitoring"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {error && <p className="text-xs text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isEdit ? "Save Changes" : "Add Risk Item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
