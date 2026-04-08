import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { createAnalysis, uploadFile } from "../services/api";
import { FileUp, PenLine, ArrowRight, CheckCircle2, Loader2, Upload } from "lucide-react";
import { cn } from "../lib/utils";
import ImportMappingModal from "./ImportMappingModal";

const ANALYSIS_TYPES = [
  "Operational Risk", "Strategic Risk", "Financial Risk", "Compliance Risk",
  "Market Risk", "Technology Risk", "Environmental Risk", "Reputational Risk",
];

export default function CreateAnalysisModal({ open, onClose, onCreated }) {
  const [step, setStep] = useState(1); // 1=choose, 2=name, 3=input
  const [mode, setMode] = useState(null); // "upload" | "manual"
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [createdAnalysis, setCreatedAnalysis] = useState(null);
  const [showMapping, setShowMapping] = useState(false);
  const [mappingColumns, setMappingColumns] = useState([]);

  const reset = () => {
    setStep(1); setMode(null); setName(""); setType(""); setDescription("");
    setContactPerson(""); setLoading(false); setDragOver(false); setFile(null); 
    setError(""); setCreatedAnalysis(null); setShowMapping(false); setMappingColumns([]);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleCreate = async () => {
    if (!name.trim()) { setError("Analysis name is required"); return; }
    if (!type) { setError("Please select a type"); return; }
    setLoading(true); setError("");

    let analysis = createdAnalysis;
    try {
      if (!analysis) {
        analysis = await createAnalysis({ name: name.trim(), type, description, contact_person: contactPerson });
        setCreatedAnalysis(analysis);
      }

      if (mode === "upload" && file) {
        await uploadFile(analysis.id, file); // without mapping initially
      }
      onCreated(analysis, mode);
      reset();
    } catch (e) {
      if (e.response?.data?.detail === "MappingRequired") {
        setMappingColumns(e.response.data.columns || []);
        setShowMapping(true);
      } else {
        setError(e.response?.data?.detail || "Failed to create analysis (or import file)");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApplyMapping = async (mappingData) => {
    setShowMapping(false);
    setLoading(true);
    try {
      await uploadFile(createdAnalysis.id, file, mappingData);
      onCreated(createdAnalysis, mode);
      reset();
    } catch (e) {
      setError(e.response?.data?.detail || "Failed to import file with mapping.");
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  }, []);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Analysis</DialogTitle>
          <DialogDescription>Set up a risk analysis from file or manual entry</DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-5">
          {/* Step indicator */}
          <div className="flex items-center gap-2">
            {[1,2,3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className={cn(
                  "w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold transition-all",
                  step > s ? "bg-primary border-primary text-primary-foreground" :
                  step === s ? "border-primary text-primary" : "border-border text-muted-foreground"
                )}>
                  {step > s ? <CheckCircle2 className="w-3.5 h-3.5" /> : s}
                </div>
                <span className={cn("text-xs", step === s ? "text-foreground" : "text-muted-foreground")}>
                  {s === 1 ? "Choose Mode" : s === 2 ? "Name & Type" : "Input Method"}
                </span>
                {s < 3 && <ArrowRight className="w-3 h-3 text-border" />}
              </div>
            ))}
          </div>

          {/* Step 1: Choose mode */}
          {step === 1 && (
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: "upload", icon: FileUp, title: "Upload File", desc: "Import CSV or Excel, auto-analyzed instantly" },
                { id: "manual", icon: PenLine, title: "Manual Entry", desc: "Enter risk records directly in the editor" },
              ].map(({ id, icon: Icon, title, desc }) => (
                <button
                  key={id}
                  onClick={() => { setMode(id); setStep(2); }}
                  className="glass rounded-xl p-4 text-left hover:border-primary/40 hover:bg-primary/5 transition-all group"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">{title}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{desc}</p>
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Name & Type */}
          {step === 2 && (
            <div className="space-y-4 animate-slide-up">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground">Analysis Name *</Label>
                <Input
                  placeholder="e.g. Q1 2026 Operational Risk Register"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground">Analysis Type *</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                  <SelectContent>
                    {ANALYSIS_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground">Contact Person</Label>
                <Input placeholder="Risk owner or analyst name" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground">Description</Label>
                <Textarea placeholder="Brief description of scope..." value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
              </div>
              {error && <p className="text-xs text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setStep(1)}>Back</Button>
                <Button size="sm" onClick={() => { if (!name.trim() || !type) { setError("Name and type required"); return; } setError(""); setStep(3); }} className="flex-1">
                  Next <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Input */}
          {step === 3 && (
            <div className="space-y-4 animate-slide-up">
              {mode === "upload" ? (
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  className={cn(
                    "border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer",
                    dragOver ? "border-primary bg-primary/10" : file ? "border-emerald-500/50 bg-emerald-500/5" : "border-border hover:border-primary/40 hover:bg-accent"
                  )}
                  onClick={() => document.getElementById("file-input").click()}
                >
                  <input
                    id="file-input" type="file" accept=".csv,.xlsx,.xls" className="hidden"
                    onChange={(e) => setFile(e.target.files[0])}
                  />
                  {file ? (
                    <>
                      <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-emerald-400">{file.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{(file.size / 1024).toFixed(1)} KB — Click to change</p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-50" />
                      <p className="text-sm font-medium text-foreground">Drop file here or click to browse</p>
                      <p className="text-xs text-muted-foreground mt-1">Supports CSV, XLSX, XLS — auto-mapped</p>
                    </>
                  )}
                </div>
              ) : (
                <div className="glass rounded-xl p-4 text-center">
                  <PenLine className="w-8 h-8 text-primary mx-auto mb-2" />
                  <p className="text-sm font-semibold text-foreground">Ready for Manual Entry</p>
                  <p className="text-xs text-muted-foreground mt-1">Create the analysis and add risk items in the editor</p>
                </div>
              )}
              {error && <p className="text-xs text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setStep(2)}>Back</Button>
                <Button size="sm" onClick={handleCreate} disabled={loading} className="flex-1">
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {loading ? "Creating…" : mode === "upload" ? "Create & Import" : "Create Analysis"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
      {showMapping && (
        <ImportMappingModal
          open={showMapping}
          onClose={() => setShowMapping(false)}
          columns={mappingColumns}
          onMapped={handleApplyMapping}
        />
      )}
    </Dialog>
  );
}
