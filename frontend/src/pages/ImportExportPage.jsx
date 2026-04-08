import { useEffect, useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { getAnalyses, uploadFile, exportAnalysis } from "../services/api";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Label } from "../components/ui/progress";
import { Upload, Download, FileText, CheckCircle2, AlertCircle, Loader2, FileUp, X, Info } from "lucide-react";
import ImportMappingModal from "../components/ImportMappingModal";
import { cn } from "../lib/utils";

export default function ImportExportPage() {
  const [analyses, setAnalyses] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [mappingOpen, setMappingOpen] = useState(false);
  const [rawColumns, setRawColumns] = useState([]);
  const [pendingUploadFile, setPendingUploadFile] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => { getAnalyses().then(setAnalyses); }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragOver(false);
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

  const processUpload = async (analysisId, fileToUpload, mapping) => {
    setUploading(true);
    setResult(null);
    let toastId;
    if (!mapping) toastId = toast.loading("Analyzing and uploading file...");
    else toastId = toast.loading("Applying mapping and uploading...");

    try {
      const res = await uploadFile(analysisId, fileToUpload, mapping);
      toast.success(`Successfully explicitly mapped & imported ${res.imported} risk items`, { id: toastId });
      setResult({ type: "success", message: `Successfully imported ${res.imported} risk items.` });
      setFile(null);
      setPendingUploadFile(null);
      setMappingOpen(false);
    } catch (err) {
      if (err.response?.status === 400 && err.response?.data?.detail === "MappingRequired") {
        toast.dismiss(toastId);
        setRawColumns(err.response.data.columns || []);
        setMappingOpen(true);
        toast.error("Auto-mapping failed. Please map manually.");
        setResult({ type: "error", message: "Auto-mapping failed. Manual mapping required." });
      } else {
        toast.error("Failed to upload file. Please check format.", { id: toastId });
        setResult({ type: "error", message: "Failed to upload file. Please check the format." });
      }
    } finally {
      setUploading(false);
    }
  };

  const handleImport = async () => {
    if (!file || !selectedId) return;
    await processUpload(selectedId, file, null);
  };

  const handleMapped = (mapping) => {
    if (!pendingUploadFile || !selectedId) return;
    processUpload(selectedId, pendingUploadFile, mapping);
  };

  const handleExport = async () => {
    if (!selectedId) return;
    setExporting(true);
    const a = analyses.find((x) => x.id === selectedId);
    try { await exportAnalysis(selectedId, a?.name || "export"); }
    finally { setExporting(false); }
  };

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto scrollbar-thin animate-fade-in">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Import / Export</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Upload spreadsheets or download risk registers</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Import card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileUp className="w-4 h-4 text-primary" /> Import File
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">Target Analysis</Label>
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger><SelectValue placeholder="Select an analysis..." /></SelectTrigger>
                <SelectContent>
                  {analyses.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => document.getElementById("import-file").click()}
              className={cn(
                "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200",
                dragOver ? "border-primary bg-primary/10" :
                file ? "border-emerald-500/50 bg-emerald-500/5" : "border-border hover:border-primary/40 hover:bg-accent"
              )}
            >
              <input id="import-file" type="file" accept=".csv,.xlsx,.xls" className="hidden"
                ref={fileInputRef} onChange={handleFileChange} />
              {file ? (
                <div className="flex items-center gap-2 justify-center">
                  <FileText className="w-5 h-5 text-emerald-400" />
                  <div className="text-left">
                    <p className="text-sm font-semibold text-emerald-400">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size/1024).toFixed(1)} KB</p>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setFile(null); }}
                    className="ml-2 text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-medium text-foreground">Drop your file here</p>
                  <p className="text-xs text-muted-foreground mt-1">CSV, XLSX, XLS supported</p>
                </>
              )}
            </div>

            {result && (
              <div className={cn("flex items-center gap-2 rounded-lg px-3 py-2 text-sm", result.type === "success" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-400/10 text-red-400")}>
                {result.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                {result.message}
              </div>
            )}

            <Button onClick={handleImport} disabled={!file || !selectedId || uploading} className="w-full">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploading ? "Importing…" : "Import File"}
            </Button>
          </CardContent>
        </Card>

        {/* Export card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-4 h-4 text-primary" /> Export Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">Select Analysis</Label>
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger><SelectValue placeholder="Select an analysis..." /></SelectTrigger>
                <SelectContent>
                  {analyses.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="glass rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-foreground">Export includes:</p>
              {[
                "All risk items with full details",
                "Inherent & residual risk scores",
                "Controls and treatment plans",
                "Risk ownership and status",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="text-xs text-muted-foreground">{item}</span>
                </div>
              ))}
            </div>

            <div className="glass rounded-xl p-3 flex items-center gap-2">
              <FileText className="w-8 h-8 text-primary/60" />
              <div>
                <p className="text-xs font-semibold text-foreground">Excel Format (.xlsx)</p>
                <p className="text-[10px] text-muted-foreground">Formatted spreadsheet, ready to share</p>
              </div>
            </div>

            <Button onClick={handleExport} disabled={!selectedId || exporting} variant="outline" className="w-full">
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {exporting ? "Exporting…" : "Export to Excel"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Column mapping guide */}
      <Card>
        <CardHeader><CardTitle>File Format Guide</CardTitle></CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">For best auto-detection, include these column headers in your file:</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              ["Risk ID", "Unique identifier"],
              ["Risk Description", "Describe the risk"],
              ["Category", "Risk category"],
              ["Key Business Process", "Affected process"],
              ["Causes", "Root causes"],
              ["Consequence", "Potential impact"],
              ["Likelihood (1–5)", "Inherent likelihood"],
              ["Impact (1–5)", "Inherent impact"],
              ["Controls", "Existing controls"],
              ["Control Rating", "Control effectiveness"],
              ["Residual Likelihood", "After controls"],
              ["Residual Impact", "After controls"],
              ["Treatment Option", "Treat/Tolerate/Transfer"],
              ["Treatment Actions", "SMART actions"],
              ["Risk Owner", "Responsible person"],
              ["Status", "Open/Mitigated/etc"],
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
