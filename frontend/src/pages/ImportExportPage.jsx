import { useEffect, useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { getAnalyses, uploadFile, exportAnalysis, importRisksDirect, downloadTemplate, getDepartments } from "../services/api";
import useAppStore from "../store/useAppStore";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Upload, Download, FileText, CheckCircle2, AlertCircle, Loader2, FileUp, X, FileSpreadsheet, Building2 } from "lucide-react";
import ImportMappingModal from "../components/ImportMappingModal";
import { cn } from "../lib/utils";

export default function ImportExportPage() {
  const user = useAppStore((s) => s.user);
  const isAdmin = ["admin", "super_admin"].includes(user?.role);

  const [analyses, setAnalyses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [targetType, setTargetType] = useState("direct"); // "direct" or "analysis"
  const [selectedAnalysisId, setSelectedAnalysisId] = useState("");
  const [selectedDeptId, setSelectedDeptId] = useState(user?.department_id || "");
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState("");
  const [mappingOpen, setMappingOpen] = useState(false);
  const [rawColumns, setRawColumns] = useState([]);
  const [pendingUploadFile, setPendingUploadFile] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    getAnalyses().then(setAnalyses).catch(() => {});
    if (isAdmin) {
      getDepartments().then(setDepartments).catch(() => {});
    }
  }, [isAdmin]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) {
      setFile(f);
      setPendingUploadFile(f);
    }
  }, []);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setPendingUploadFile(f);
    }
  };

  const processUpload = async (fileToUpload, mapping) => {
    setUploading(true);
    setResult(null);
    let toastId;
    if (!mapping) toastId = toast.loading("Analyzing and importing template file...");
    else toastId = toast.loading("Applying column mapping and importing...");

    try {
      let res;
      if (targetType === "direct") {
        res = await importRisksDirect(selectedDeptId, fileToUpload, mapping);
        toast.success(`Successfully imported ${res.imported} risks into Risk Register`, { id: toastId });
        setResult({ type: "success", message: `Successfully imported ${res.imported} risks into the Department Risk Register.` });
      } else {
        if (!selectedAnalysisId) {
          toast.error("Please select a target Analysis project", { id: toastId });
          setUploading(false);
          return;
        }
        res = await uploadFile(selectedAnalysisId, fileToUpload, mapping);
        toast.success(`Successfully imported ${res.imported} risk items into Analysis`, { id: toastId });
        setResult({ type: "success", message: `Successfully imported ${res.imported} risk items into Analysis.` });
      }

      setFile(null);
      setPendingUploadFile(null);
      setMappingOpen(false);
    } catch (err) {
      if (err.response?.status === 400 && err.response?.data?.detail === "MappingRequired") {
        toast.dismiss(toastId);
        setRawColumns(err.response.data.columns || []);
        setMappingOpen(true);
        toast.error("Header auto-mapping required. Please map manually.");
        setResult({ type: "error", message: "Header auto-mapping required. Please map manually below." });
      } else {
        const msg = err.response?.data?.detail || "Failed to upload file. Please check format.";
        toast.error(msg, { id: toastId });
        setResult({ type: "error", message: msg });
      }
    } finally {
      setUploading(false);
    }
  };

  const handleImport = async () => {
    if (!file) return;
    await processUpload(file, null);
  };

  const handleMapped = (mapping) => {
    if (!pendingUploadFile) return;
    processUpload(pendingUploadFile, mapping);
  };

  const handleExport = async () => {
    if (!selectedAnalysisId) return;
    setExporting(true);
    const a = analyses.find((x) => x.id === selectedAnalysisId);
    try {
      await exportAnalysis(selectedAnalysisId, a?.name || "export");
    } finally {
      setExporting(false);
    }
  };

  const handleTemplateDownload = async (templateKey) => {
    setDownloadingTemplate(templateKey);
    try {
      await downloadTemplate(templateKey);
      toast.success("Template file downloaded");
    } catch (err) {
      toast.error("Failed to download template file");
    } finally {
      setDownloadingTemplate("");
    }
  };

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto scrollbar-thin animate-fade-in">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Import & Export Center</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Download official ERIMP templates or upload populated Excel/CSV risk registers
        </p>
      </div>

      {/* Official Templates Section */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileSpreadsheet className="w-5 h-5 text-primary" /> Official Risk Register Templates
          </CardTitle>
          <CardDescription>
            Download pre-formatted templates designed for direct import into ERIMP.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              {
                key: "operational",
                title: "Operational Risk Register (.xlsx)",
                desc: "Complete 21-column template with cover sheet, likelihood/impact matrix, and pre-formatted headers.",
                badge: "Excel",
              },
              {
                key: "strategic",
                title: "Strategic Risk Register (.xlsx)",
                desc: "Executive strategic risk template with strategic objectives, causes, and consequences.",
                badge: "Excel",
              },
              {
                key: "csv",
                title: "Standard Risk Import (.csv)",
                desc: "Lightweight CSV template ideal for quick data migration and bulk risk uploads.",
                badge: "CSV",
              },
            ].map((tpl) => (
              <div key={tpl.key} className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between hover:border-primary/50 transition-all">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-primary font-mono">{tpl.badge}</span>
                    <Download className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <h4 className="text-xs font-bold text-foreground">{tpl.title}</h4>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{tpl.desc}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 w-full text-xs font-semibold gap-1.5"
                  onClick={() => handleTemplateDownload(tpl.key)}
                  disabled={downloadingTemplate === tpl.key}
                >
                  {downloadingTemplate === tpl.key ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5 text-primary" />
                  )}
                  Download Template
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Import card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileUp className="w-4 h-4 text-primary" /> Import Risk Register
            </CardTitle>
            <CardDescription>
              Upload Excel (.xlsx) or CSV (.csv) files. Auto-detects headers and risk scores.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Target Destination Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Import Destination</label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-secondary rounded-xl">
                <button
                  type="button"
                  onClick={() => setTargetType("direct")}
                  className={cn(
                    "py-1.5 text-xs font-bold rounded-lg transition-all",
                    targetType === "direct"
                      ? "bg-card text-primary shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Main Risk Register
                </button>
                <button
                  type="button"
                  onClick={() => setTargetType("analysis")}
                  className={cn(
                    "py-1.5 text-xs font-bold rounded-lg transition-all",
                    targetType === "analysis"
                      ? "bg-card text-primary shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Analysis Project
                </button>
              </div>
            </div>

            {targetType === "direct" && isAdmin && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-muted-foreground" /> Target Department
                </label>
                <select
                  value={selectedDeptId}
                  onChange={(e) => setSelectedDeptId(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="">All Departments / Select Department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </div>
            )}

            {targetType === "analysis" && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Target Analysis Project</label>
                <Select value={selectedAnalysisId} onValueChange={setSelectedAnalysisId}>
                  <SelectTrigger><SelectValue placeholder="Select an analysis project..." /></SelectTrigger>
                  <SelectContent>
                    {analyses.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => document.getElementById("import-file").click()}
              className={cn(
                "border-2 border-dashed rounded-xl p-7 text-center cursor-pointer transition-all duration-200",
                dragOver ? "border-primary bg-primary/10" :
                file ? "border-emerald-500/50 bg-emerald-500/5" : "border-border hover:border-primary/40 hover:bg-accent"
              )}
            >
              <input
                id="import-file"
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
              />
              {file ? (
                <div className="flex items-center gap-2 justify-center">
                  <FileText className="w-5 h-5 text-emerald-400" />
                  <div className="text-left">
                    <p className="text-sm font-semibold text-emerald-400">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                    className="ml-2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-medium text-foreground">Drop template file here or click to browse</p>
                  <p className="text-xs text-muted-foreground mt-1">Supports .xlsx, .xls, .csv</p>
                </>
              )}
            </div>

            {result && (
              <div
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold",
                  result.type === "success" ? "bg-emerald-500/10 text-emerald-500" : "bg-red-400/10 text-red-400"
                )}
              >
                {result.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                {result.message}
              </div>
            )}

            <Button
              onClick={handleImport}
              disabled={!file || (targetType === "analysis" && !selectedAnalysisId) || uploading}
              className="w-full font-bold"
            >
              {uploading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Importing Template…</>
              ) : (
                <><Upload className="w-4 h-4" /> Import & Place Risks</>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Export card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-4 h-4 text-primary" /> Export Analysis to Excel
            </CardTitle>
            <CardDescription>
              Export an analysis project into a clean Excel spreadsheet.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Select Analysis</label>
              <Select value={selectedAnalysisId} onValueChange={setSelectedAnalysisId}>
                <SelectTrigger><SelectValue placeholder="Select an analysis..." /></SelectTrigger>
                <SelectContent>
                  {analyses.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="glass rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-foreground">Export includes:</p>
              {[
                "All risk items with full descriptions & categories",
                "Inherent & residual risk scores and ratings",
                "Existing controls & control ratings",
                "Treatment strategies and action plans",
                "Assigned risk owners & statuses",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="text-xs text-muted-foreground">{item}</span>
                </div>
              ))}
            </div>

            <Button
              onClick={handleExport}
              disabled={!selectedAnalysisId || exporting}
              variant="outline"
              className="w-full font-bold"
            >
              {exporting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Exporting…</>
              ) : (
                <><Download className="w-4 h-4" /> Export to Excel (.xlsx)</>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Column mapping guide */}
      <Card>
        <CardHeader><CardTitle>Template Column Header Reference</CardTitle></CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">
            Our intelligent parser auto-detects these standard column names from your template:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              ["Risk ID", "Unique identifier (e.g. OPR-001)"],
              ["Risk Description", "Full risk details & description"],
              ["Category", "Operational, Strategic, Financial, etc."],
              ["Key Business Process", "Affected objective or process"],
              ["Causes", "Root cause factors"],
              ["Consequence", "Potential impact & effects"],
              ["Likelihood (1–5)", "Inherent likelihood rating"],
              ["Impact (1–5)", "Inherent impact rating"],
              ["Controls", "Existing control measures"],
              ["Control Rating", "Effective / Partial / Strong"],
              ["Residual Likelihood", "Likelihood after controls"],
              ["Residual Impact", "Impact after controls"],
              ["Treatment Option", "Treat / Tolerate / Transfer / Terminate"],
              ["Treatment Actions", "SMART mitigation action plan"],
              ["Timeframe", "Target completion date"],
              ["Risk Owner", "Responsible person / owner"],
              ["Status", "Identified / Under Mitigation / Resolved"],
            ].map(([col, desc]) => (
              <div key={col} className="glass rounded-lg p-2">
                <p className="text-xs font-semibold text-primary font-mono">{col}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <ImportMappingModal
        open={mappingOpen}
        onClose={() => setMappingOpen(false)}
        columns={rawColumns}
        onMapped={handleMapped}
      />
    </div>
  );
}
