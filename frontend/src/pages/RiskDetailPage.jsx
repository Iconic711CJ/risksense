import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getRisk, deleteRisk, updateRiskStatus } from "../services/api";
import { toast } from "sonner";
import {
  ArrowLeft, Edit2, Trash2, Loader2, ShieldAlert, Tag,
  User, Building2, Calendar, Clock, TrendingUp, AlertTriangle,
  CheckCircle, Activity, Zap, Target,
} from "lucide-react";
import { cn } from "../lib/utils";
import useAppStore from "../store/useAppStore";

// ── constants ────────────────────────────────────────────────────────────────
const LIKELIHOOD_LABELS = { 1: "Rare", 2: "Unlikely", 3: "Possible", 4: "Likely", 5: "Certain" };
const LIKELIHOOD_SUBS   = { 1: "< 10%", 2: "10–30%", 3: "30–50%", 4: "50–80%", 5: "> 80%" };
const IMPACT_LABELS     = { 1: "Negligible", 2: "Minor", 3: "Moderate", 4: "Major", 5: "Critical" };
const IMPACT_SUBS       = { 1: "Minimal effect", 2: "Small disruption", 3: "Significant impact", 4: "Major disruption", 5: "Catastrophic" };
const RATING_GRADIENT   = { 1: "#16a34a", 2: "#84cc16", 3: "#ca8a04", 4: "#ea580c", 5: "#dc2626" };

const RATING_STYLE = {
  Critical: { bg: "#dc2626", light: "#fef2f2", border: "#fca5a5", text: "#991b1b" },
  High:     { bg: "#ea580c", light: "#fff7ed", border: "#fdba74", text: "#9a3412" },
  Tolerable:{ bg: "#ca8a04", light: "#fefce8", border: "#fde047", text: "#854d0e" },
  Low:      { bg: "#16a34a", light: "#f0fdf4", border: "#86efac", text: "#14532d" },
};

const STATUS_STYLE = {
  "Identified":       { bg: "bg-sky-50",     border: "border-sky-200",     text: "text-sky-700",     icon: Activity },
  "Under Mitigation": { bg: "bg-amber-50",   border: "border-amber-200",   text: "text-amber-700",   icon: TrendingUp },
  "Resolved":         { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", icon: CheckCircle },
};

const STATUSES = ["Identified", "Under Mitigation", "Resolved"];

function mixHex(h1, h2) {
  const p = (h) => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
  const [r1,g1,b1] = p(h1), [r2,g2,b2] = p(h2);
  return `#${[Math.round((r1+r2)/2),Math.round((g1+g2)/2),Math.round((b1+b2)/2)].map(v=>v.toString(16).padStart(2,'0')).join('')}`;
}

// ── sub-components ───────────────────────────────────────────────────────────
function Section({ title, icon: Icon, children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
          <Icon className="w-3.5 h-3.5 text-slate-500" />
        </div>
        <h2 className="text-sm font-bold text-slate-800">{title}</h2>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

function Field({ label, value, mono }) {
  if (!value && value !== 0) return null;
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{label}</p>
      <p className={cn("text-sm text-slate-800", mono && "font-mono")}>{value}</p>
    </div>
  );
}

function RatingPip({ value, labels, subs, active }) {
  const color = RATING_GRADIENT[value];
  const isActive = active === value;
  return (
    <div
      className="flex-1 flex flex-col items-center gap-1 px-1 py-2.5 rounded-xl border text-center transition-all"
      style={{
        background: isActive ? color : `${color}15`,
        borderColor: isActive ? color : `${color}40`,
        boxShadow: isActive ? `0 2px 12px ${color}60` : "none",
      }}
    >
      <span className="text-lg font-black" style={{ color: isActive ? "#fff" : color }}>{value}</span>
      <span className="text-[9px] font-bold leading-tight" style={{ color: isActive ? "#ffffffcc" : color }}>
        {labels[value]}
      </span>
      {isActive && (
        <span className="text-[8px] leading-tight" style={{ color: "#ffffffaa" }}>{subs[value]}</span>
      )}
    </div>
  );
}

function HeatmapCell({ l, i, score, isActive }) {
  const stops = [
    { s: 1,  rgb: [22,163,74] }, { s: 6,  rgb: [132,204,22] },
    { s: 9,  rgb: [202,138,4] }, { s: 16, rgb: [234,88,12] }, { s: 25, rgb: [220,38,38] },
  ];
  let lo = stops[0], hi = stops[stops.length-1];
  for (let k = 0; k < stops.length-1; k++) {
    if (score >= stops[k].s && score <= stops[k+1].s) { lo = stops[k]; hi = stops[k+1]; break; }
  }
  const t = hi.s === lo.s ? 0 : (score - lo.s) / (hi.s - lo.s);
  const r = Math.round(lo.rgb[0] + t*(hi.rgb[0]-lo.rgb[0]));
  const g = Math.round(lo.rgb[1] + t*(hi.rgb[1]-lo.rgb[1]));
  const b = Math.round(lo.rgb[2] + t*(hi.rgb[2]-lo.rgb[2]));
  const bg = `rgb(${r},${g},${b})`;

  return (
    <div
      className={cn(
        "aspect-square rounded-md flex items-center justify-center transition-all",
        isActive ? "ring-2 ring-white ring-offset-1 scale-110 z-10 relative" : ""
      )}
      style={{ background: bg, opacity: isActive ? 1 : 0.2 }}
      title={`L${l}×I${i}=${score}`}
    >
      {isActive && <span className="text-white font-black text-xs drop-shadow">{score}</span>}
    </div>
  );
}

// ── main page ────────────────────────────────────────────────────────────────
export default function RiskDetailPage({ backPath, editPath }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAppStore((s) => s.user);
  const isAdmin = ["admin", "super_admin"].includes(user?.role);

  const [risk, setRisk] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    setLoading(true);
    getRisk(id)
      .then(setRisk)
      .catch(() => toast.error("Risk not found"))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleDelete() {
    if (!confirm("Delete this risk permanently?")) return;
    setDeleting(true);
    try {
      await deleteRisk(id);
      toast.success("Risk deleted");
      navigate(backPath || -1);
    } catch {
      toast.error("Failed to delete");
      setDeleting(false);
    }
  }

  async function handleStatusChange(status) {
    setUpdatingStatus(true);
    try {
      const updated = await updateRiskStatus(id, status);
      setRisk((r) => ({ ...r, status: updated.status ?? status }));
      toast.success(`Status updated to ${status}`);
    } catch {
      toast.error("Failed to update status");
    } finally {
      setUpdatingStatus(false);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-7 h-7 text-[#064E3B] animate-spin" />
    </div>
  );

  if (!risk) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-slate-400">Risk not found.</p>
    </div>
  );

  const score = (risk.likelihood && risk.impact) ? risk.likelihood * risk.impact : risk.risk_score ?? 0;
  const rating = risk.risk_rating ?? "Low";
  const rStyle = RATING_STYLE[rating] ?? RATING_STYLE.Low;
  const sStyle = STATUS_STYLE[risk.status] ?? STATUS_STYLE["Identified"];
  const StatusIcon = sStyle.icon;
  const scoreBg = (risk.likelihood && risk.impact)
    ? mixHex(RATING_GRADIENT[risk.likelihood], RATING_GRADIENT[risk.impact])
    : rStyle.bg;

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-fade-in pb-10">

      {/* Back bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(backPath || -1)}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-700 transition-colors font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <Link
              to={editPath ? `${editPath}/${id}/edit` : `edit`}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-[#064E3B] hover:border-[#064E3B] text-sm font-semibold transition-all shadow-sm"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Edit
            </Link>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-red-200 text-red-500 hover:bg-red-50 text-sm font-semibold transition-all shadow-sm disabled:opacity-50"
            >
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Hero card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Colored top bar */}
        <div className="h-1.5" style={{ background: `linear-gradient(to right, ${rStyle.bg}, ${scoreBg})` }} />

        <div className="px-6 py-6 flex items-start gap-5">
          {/* Score circle */}
          <div
            className="w-20 h-20 rounded-2xl flex flex-col items-center justify-center shrink-0 shadow-lg"
            style={{ background: scoreBg, boxShadow: `0 8px 24px ${scoreBg}55` }}
          >
            <span className="text-3xl font-black text-white leading-none">{score || "—"}</span>
            <span className="text-[10px] text-white/70 font-bold uppercase tracking-widest mt-0.5">Score</span>
          </div>

          {/* Title block */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="font-mono text-xs font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg">
                {risk.risk_code}
              </span>
              {/* Rating badge */}
              <span
                className="text-xs font-black px-3 py-0.5 rounded-full border"
                style={{ background: rStyle.light, borderColor: rStyle.border, color: rStyle.text }}
              >
                {rating}
              </span>
              {/* Status badge */}
              <span className={cn("text-xs font-bold px-3 py-0.5 rounded-full border flex items-center gap-1", sStyle.bg, sStyle.border, sStyle.text)}>
                <StatusIcon className="w-3 h-3" />
                {risk.status}
              </span>
            </div>
            <h1 className="text-xl font-black text-slate-900 leading-snug">{risk.description}</h1>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {risk.category && (
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" /> {risk.category}
                </span>
              )}
              {risk.departments?.name && (
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Building2 className="w-3 h-3" /> {risk.departments.name}
                </span>
              )}
              {risk.owner_name && (
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <User className="w-3 h-3" /> {risk.owner_name}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tags */}
        {risk.tags?.length > 0 && (
          <div className="px-6 pb-5 flex flex-wrap gap-1.5">
            {risk.tags.map((tag) => (
              <span key={tag} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs text-slate-600 font-medium">
                <Tag className="w-2.5 h-2.5 text-slate-400" />
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left col: risk assessment */}
        <div className="lg:col-span-2 space-y-5">

          {/* Risk Assessment */}
          <Section title="Risk Assessment" icon={Zap}>
            {(risk.likelihood && risk.impact) ? (
              <div className="space-y-5">
                {/* Score display */}
                <div
                  className="rounded-xl px-5 py-4 flex items-center justify-between"
                  style={{ background: scoreBg, boxShadow: `0 4px 20px ${scoreBg}55` }}
                >
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-white/70">Risk Score</p>
                    <p className="text-4xl font-black text-white mt-0.5">{score}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold uppercase tracking-widest text-white/70">Rating</p>
                    <p className="text-3xl font-black text-white mt-0.5">{rating}</p>
                  </div>
                </div>

                {/* Likelihood */}
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Likelihood</p>
                  <div className="flex gap-1.5">
                    {[1,2,3,4,5].map((v) => (
                      <RatingPip key={v} value={v} labels={LIKELIHOOD_LABELS} subs={LIKELIHOOD_SUBS} active={risk.likelihood} />
                    ))}
                  </div>
                </div>

                {/* Impact */}
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Impact</p>
                  <div className="flex gap-1.5">
                    {[1,2,3,4,5].map((v) => (
                      <RatingPip key={v} value={v} labels={IMPACT_LABELS} subs={IMPACT_SUBS} active={risk.impact} />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400">No likelihood/impact data recorded.</p>
            )}
          </Section>

          {/* Mitigation */}
          {risk.mitigation_plan && (
            <Section title="Mitigation Plan" icon={Target}>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{risk.mitigation_plan}</p>
            </Section>
          )}

          {/* Status Changer */}
          <Section title="Update Status" icon={Activity}>
            <div className="flex gap-2">
              {STATUSES.map((s) => {
                const st = STATUS_STYLE[s];
                const Icon = st.icon;
                const isActive = risk.status === s;
                return (
                  <button
                    key={s}
                    disabled={updatingStatus || isActive}
                    onClick={() => handleStatusChange(s)}
                    className={cn(
                      "flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-bold transition-all",
                      isActive
                        ? cn(st.bg, st.border, st.text, "shadow-sm")
                        : "border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600 disabled:opacity-50"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {s}
                  </button>
                );
              })}
            </div>
          </Section>
        </div>

        {/* Right col */}
        <div className="space-y-5">

          {/* Risk Matrix position */}
          {(risk.likelihood && risk.impact) && (
            <Section title="Matrix Position" icon={AlertTriangle}>
              <div className="space-y-1">
                {[5,4,3,2,1].map((l) => (
                  <div key={l} className="flex gap-1">
                    {[1,2,3,4,5].map((i) => (
                      <HeatmapCell
                        key={i}
                        l={l} i={i}
                        score={l * i}
                        isActive={l === risk.likelihood && i === risk.impact}
                      />
                    ))}
                  </div>
                ))}
                <div className="flex gap-1 mt-1">
                  {["Negl.","Minor","Mod.","Major","Crit."].map((lbl) => (
                    <div key={lbl} className="flex-1 text-center text-[9px] text-slate-400">{lbl}</div>
                  ))}
                </div>
                <p className="text-[9px] text-slate-400 text-center uppercase tracking-widest mt-0.5">Impact →</p>
              </div>
            </Section>
          )}

          {/* Details */}
          <Section title="Details" icon={ShieldAlert}>
            <div className="space-y-4">
              <Field label="Risk Code" value={risk.risk_code} mono />
              <Field label="Category" value={risk.category} />
              <Field label="Department" value={risk.departments?.name} />
              <Field label="Owner" value={risk.owner_name} />
            </div>
          </Section>

          {/* Timestamps */}
          <Section title="Timeline" icon={Calendar}>
            <div className="space-y-3">
              {risk.created_at && (
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                    <Calendar className="w-3 h-3 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Logged</p>
                    <p className="text-xs text-slate-700">
                      {new Date(risk.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {new Date(risk.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              )}
              {risk.updated_at && risk.updated_at !== risk.created_at && (
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                    <Clock className="w-3 h-3 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Last Updated</p>
                    <p className="text-xs text-slate-700">
                      {new Date(risk.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {new Date(risk.updated_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
