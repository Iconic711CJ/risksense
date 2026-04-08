import { useEffect, useState, useRef } from "react";
import { getAnalyses, getAnalysis } from "../services/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import RiskMatrix from "../components/RiskMatrix";
import RiskBadge from "../components/RiskBadge";
import { Loader2, Download, FileText, ChevronRight } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { RATING_COLORS } from "../lib/utils"; // assumed or define inline

export default function ReportsPage({ onNavigate }) {
  const [analyses, setAnalyses] = useState([]);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const reportRef = useRef(null);

  useEffect(() => {
    getAnalyses().then(setAnalyses).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedAnalysisId) {
      getAnalysis(selectedAnalysisId).then(setAnalysis);
    } else {
      setAnalysis(null);
    }
  }, [selectedAnalysisId]);

  const generatePDF = async () => {
    if (!reportRef.current || !analysis) return;
    setGenerating(true);
    const toastId = toast.loading("Generating PDF report...");
    
    try {
      // Create a temporary clone for print ensuring it's fully visible and not hidden with overflow
      const element = reportRef.current;
      element.style.display = "block"; // override any print-only hiding if necessary

      const canvas = await html2canvas(element, { 
        scale: 2, 
        useCORS: true,
        backgroundColor: "#0f172a" // ensuring dark theme bg matches
      });
      
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${analysis.name}_Risk_Report.pdf`);
      toast.success("Report downloaded!", { id: toastId });
    } catch (err) {
      toast.error("Failed to generate PDF", { id: toastId });
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Sidebar selection */}
      <div className="w-1/3 border-r border-border bg-secondary/10 flex flex-col">
        <div className="p-4 border-b border-border">
          <h2 className="font-display font-bold text-lg text-foreground">Generated Reports</h2>
          <p className="text-xs text-muted-foreground">Select an analysis to generate a report</p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin">
          {analyses.map(a => (
            <div 
              key={a.id} 
              onClick={() => setSelectedAnalysisId(a.id)}
              className={`p-3 rounded-xl border transition-all cursor-pointer ${
                selectedAnalysisId === a.id 
                ? "bg-primary/10 border-primary shadow-sm" 
                : "bg-card border-border hover:border-primary/50"
              }`}
            >
              <h3 className="font-semibold text-sm text-foreground truncate">{a.name}</h3>
              <p className="text-xs text-muted-foreground mt-1">{a.type} • {a.item_count} Risks</p>
            </div>
          ))}
          {analyses.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">No analyses available</p>
          )}
        </div>
      </div>

      {/* Main Preview Area */}
      <div className="flex-1 flex flex-col bg-background overflow-y-auto relative scrollbar-thin">
        {!analysis ? (
          <div className="flex-1 flex flex-col items-center justify-center opacity-50">
            <FileText className="w-16 h-16 mb-4 text-muted-foreground" />
            <p>Select an analysis from the left to preview</p>
          </div>
        ) : (
          <div className="p-8 max-w-4xl mx-auto w-full">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold font-display text-foreground">Report Preview</h1>
              <Button onClick={generatePDF} disabled={generating}>
                {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                Download PDF
              </Button>
            </div>

            {/* This is the printable area */}
            <div 
              ref={reportRef} 
              className="bg-card text-card-foreground border border-border shadow-xl rounded-xl p-10 space-y-10"
              style={{ minHeight: "297mm" }} // Roughly A4 size
            >
              <div className="border-b border-border pb-6">
                <h1 className="text-3xl font-bold text-foreground mb-2">{analysis.name}</h1>
                <p className="text-muted-foreground text-sm uppercase tracking-widest">{analysis.type} Risk Report</p>
                <div className="flex gap-8 mt-6">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Author</p>
                    <p className="text-sm font-semibold">{analysis.contact_person || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Generated On</p>
                    <p className="text-sm font-semibold">{new Date().toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Total Risks</p>
                    <p className="text-sm font-semibold">{analysis.stats?.total || 0}</p>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-bold mb-4 border-b border-border pb-2">Executive Summary</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {analysis.description || "No description provided for this analysis."}
                  </p>
                  <div className="mt-6 space-y-3">
                    <div className="flex justify-between items-center p-3 bg-secondary/20 rounded-lg">
                      <span className="text-sm font-semibold">Average Inherent Risk</span>
                      <span className="text-sm font-bold text-orange-400">{analysis.stats?.avg_inherent || 0}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-secondary/20 rounded-lg">
                      <span className="text-sm font-semibold">Average Residual Risk</span>
                      <span className="text-sm font-bold text-emerald-400">{analysis.stats?.avg_residual || 0}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-secondary/20 rounded-lg border border-primary/20">
                      <span className="text-sm font-semibold text-primary">Risk Reduction</span>
                      <span className="text-sm font-bold text-primary">{analysis.stats?.risk_reduction || 0}%</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-4 border-b border-border pb-2">Risk Matrix</h3>
                  {/* Reuse matrix component */}
                  <div className="bg-background/50 p-4 rounded-xl border border-border">
                    <RiskMatrix items={analysis.items || []} />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold mb-4 border-b border-border pb-2">Top 5 Critical Risks</h3>
                <div className="space-y-3">
                  {(analysis.items || [])
                    .sort((a,b) => (b.inherent_risk_score || 0) - (a.inherent_risk_score || 0))
                    .slice(0, 5)
                    .map(item => (
                      <div key={item.id} className="flex items-center justify-between p-4 bg-secondary/10 border border-border rounded-lg">
                        <div className="flex-1">
                          <p className="font-bold text-foreground">{item.risk_id}</p>
                          <p className="text-xs text-muted-foreground mt-1 max-w-md truncate">{item.risk_description || item.category}</p>
                        </div>
                        <div className="text-right flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-[10px] text-muted-foreground uppercase">Score</p>
                            <p className="font-bold text-lg">{item.inherent_risk_score}</p>
                          </div>
                          <RiskBadge rating={item.inherent_risk_rating} score={item.inherent_risk_score} />
                        </div>
                      </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
