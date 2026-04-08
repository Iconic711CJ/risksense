import { useState } from "react";
import { X, FileText, Loader2, Download } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { cn } from "../../lib/utils";
import useAppStore from "../../store/useAppStore";

const RATING_COLORS = { Critical: [248,113,113], High: [251,146,60], Tolerable: [250,204,21], Low: [74,222,128] };

function addPageHeader(doc, title, pageW) {
  doc.setFillColor(14, 165, 233);
  doc.rect(0, 0, pageW, 1.5, "F");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "normal");
  doc.text("ERIMP · Enterprise Risk Intelligence & Mitigation Platform · NIPA Zambia", pageW / 2, 12, { align: "center" });
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.text(title, pageW / 2, 24, { align: "center" });
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(20, 28, pageW - 20, 28);
}

function addPageFooter(doc, pageNum, pageW, pageH) {
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.setFont("helvetica", "normal");
  doc.text(`Page ${pageNum}`, pageW / 2, pageH - 8, { align: "center" });
  doc.text(`Generated: ${new Date().toLocaleString()}`, 20, pageH - 8);
  doc.setFillColor(14, 165, 233);
  doc.rect(0, pageH - 1.5, pageW, 1.5, "F");
}

export default function ReportGenerator({ open, onClose, summary, deptData = [], heatmap = [], recentRisks = [], risks = [], deptTitle = "All Departments" }) {
  const user = useAppStore((s) => s.user);
  const [generating, setGenerating] = useState(false);

  if (!open) return null;

  async function generatePDF() {
    setGenerating(true);
    try {
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      let pageNum = 1;

      // ── PAGE 1: Cover ────────────────────────────────────────────────────────
      // Background
      doc.setFillColor(248, 250, 252);
      doc.rect(0, 0, pageW, pageH, "F");
      doc.setFillColor(14, 165, 233);
      doc.rect(0, 0, pageW, 8, "F");
      doc.setFillColor(14, 165, 233);
      doc.rect(0, pageH - 8, pageW, 8, "F");

      // Logo placeholder
      doc.setFillColor(14, 165, 233, 0.15);
      doc.roundedRect(pageW / 2 - 20, 50, 40, 40, 8, 8, "F");
      doc.setTextColor(14, 165, 233);
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text("ERIMP", pageW / 2, 76, { align: "center" });

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(20);
      doc.text("Enterprise Risk Intelligence", pageW / 2, 110, { align: "center" });
      doc.text("& Mitigation Platform", pageW / 2, 120, { align: "center" });

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(40, 128, pageW - 40, 128);

      doc.setFontSize(12);
      doc.setTextColor(100, 116, 139);
      doc.setFont("helvetica", "normal");
      doc.text("National Institute of Public Administration", pageW / 2, 138, { align: "center" });
      doc.text("Zambia", pageW / 2, 146, { align: "center" });

      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.text(`Risk Management Report — ${deptTitle}`, pageW / 2, 165, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Generated: ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}`, pageW / 2, 175, { align: "center" });
      doc.text(`Prepared by: ${user?.full_name || "System"}`, pageW / 2, 183, { align: "center" });

      addPageFooter(doc, pageNum, pageW, pageH);

      // ── PAGE 2: Executive Summary ─────────────────────────────────────────
      doc.addPage();
      pageNum++;
      doc.setFillColor(248, 250, 252);
      doc.rect(0, 0, pageW, pageH, "F");
      addPageHeader(doc, "Executive Summary", pageW);

      let y = 36;

      if (summary) {
        const kpis = [
          { label: "Total Risks", value: summary.total_risks ?? 0, color: [14, 165, 233] },
          { label: "Critical", value: summary.critical_count ?? 0, color: [248, 113, 113] },
          { label: "High Risk", value: summary.high_count ?? 0, color: [251, 146, 60] },
          { label: "Mitigating", value: summary.under_mitigation_count ?? 0, color: [250, 204, 21] },
          { label: "Resolved", value: summary.resolved_count ?? 0, color: [74, 222, 128] },
        ];

        const boxW = (pageW - 40 - 12) / 5;
        kpis.forEach((k, i) => {
          const x = 20 + i * (boxW + 3);
          doc.setFillColor(k.color[0], k.color[1], k.color[2]);
          doc.setGlobalAlpha?.(0.08);
          doc.roundedRect(x, y, boxW, 28, 3, 3, "F");
          doc.setGlobalAlpha?.(1);
          doc.setTextColor(k.color[0], k.color[1], k.color[2]);
          doc.setFontSize(18);
          doc.setFont("helvetica", "bold");
          doc.text(String(k.value), x + boxW / 2, y + 13, { align: "center" });
          doc.setFontSize(7);
          doc.setFont("helvetica", "normal");
          doc.text(k.label, x + boxW / 2, y + 21, { align: "center" });
        });
        y += 38;
      }

      // Risk velocity
      if (summary?.risk_velocity) {
        const { this_week, last_week } = summary.risk_velocity;
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.setFont("helvetica", "normal");
        doc.text(`Risk Velocity: ${this_week} risks logged this week vs ${last_week} last week`, 20, y);
        y += 12;
      }

      // Heatmap text representation
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.text("Risk Distribution by Rating", 20, y);
      y += 8;

      const risksByRating = { Critical: 0, High: 0, Tolerable: 0, Low: 0 };
      (risks.length ? risks : recentRisks).forEach((r) => {
        if (r.risk_rating in risksByRating) risksByRating[r.risk_rating]++;
      });

      Object.entries(risksByRating).forEach(([rating, count]) => {
        if (count === 0) return;
        const col = RATING_COLORS[rating] || [100, 116, 139];
        doc.setFillColor(col[0], col[1], col[2]);
        const barW = Math.max(2, (count / Math.max(...Object.values(risksByRating))) * 100);
        doc.roundedRect(20, y, barW, 5, 1, 1, "F");
        doc.setTextColor(60, 60, 60);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text(`${rating}: ${count}`, 125, y + 4);
        y += 9;
      });

      addPageFooter(doc, pageNum, pageW, pageH);

      // ── PAGE 3: Department Breakdown (admin only) ─────────────────────────
      if (deptData.length > 0) {
        doc.addPage();
        pageNum++;
        doc.setFillColor(248, 250, 252);
        doc.rect(0, 0, pageW, pageH, "F");
        addPageHeader(doc, "Department Breakdown", pageW);
        y = 36;

        // Table header
        const cols = [{ label: "Department", w: 55 }, { label: "Total", w: 18 }, { label: "Critical", w: 20 }, { label: "High", w: 18 }, { label: "Tolerable", w: 22 }, { label: "Low", w: 16 }, { label: "Resolved", w: 22 }];
        let x = 20;
        doc.setFillColor(241, 245, 249);
        doc.rect(18, y - 4, pageW - 36, 10, "F");
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(71, 85, 105);
        cols.forEach((c) => { doc.text(c.label, x, y + 2); x += c.w; });
        y += 10;

        doc.setFont("helvetica", "normal");
        deptData.forEach((d, i) => {
          if (i % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(18, y - 4, pageW - 36, 9, "F"); }
          x = 20;
          const row = [d.dept_name, d.total, d.critical, d.high, d.tolerable, d.low, d.resolved];
          doc.setFontSize(8);
          doc.setTextColor(30, 41, 59);
          row.forEach((v, vi) => {
            if (vi === 2 && v > 0) { doc.setTextColor(248, 113, 113); }
            else if (vi === 3 && v > 0) { doc.setTextColor(251, 146, 60); }
            else doc.setTextColor(30, 41, 59);
            doc.text(String(v ?? ""), x, y + 2);
            x += cols[vi].w;
          });
          y += 9;
        });
        addPageFooter(doc, pageNum, pageW, pageH);
      }

      // ── PAGE 4: Risk Heat Map ─────────────────────────────────────────────
      if (heatmap.length > 0) {
        doc.addPage();
        pageNum++;
        doc.setFillColor(248, 250, 252);
        doc.rect(0, 0, pageW, pageH, "F");
        addPageHeader(doc, "Risk Heat Map Distribution", pageW);
        y = 40;

        const gridSize = 100;
        const cellSize = gridSize / 5;
        const startX = (pageW - gridSize) / 2;
        const startY = 45;

        // Labels
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.setFont("helvetica", "bold");
        doc.text("IMPACT", pageW / 2, startY + gridSize + 12, { align: "center" });
        
        // Vertical label for Likelihood
        doc.saveGraphicsState();
        doc.rotate(90, startX - 10, startY + gridSize / 2);
        doc.text("LIKELIHOOD", startX - 18, startY + gridSize / 2, { align: "center", angle: 90 });
        doc.restoreGraphicsState();

        // Draw grid
        for (let i = 0; i < 5; i++) {
          for (let j = 0; j < 5; j++) {
            const x = startX + j * cellSize;
            const y_pos = startY + (4 - i) * cellSize;
            
            const score = (i + 1) * (j + 1);
            if (score >= 15) doc.setFillColor(248, 113, 113); // Critical
            else if (score >= 9) doc.setFillColor(251, 146, 60); // High
            else if (score >= 4) doc.setFillColor(250, 204, 21); // Tolerable
            else doc.setFillColor(74, 222, 128); // Low
            
            doc.setGlobalAlpha?.(0.3);
            doc.rect(x, y_pos, cellSize, cellSize, "F");
            doc.setGlobalAlpha?.(1);
            doc.setDrawColor(255, 255, 255);
            doc.rect(x, y_pos, cellSize, cellSize, "S");

            const cellData = heatmap.find(c => c.likelihood === i + 1 && c.impact === j + 1);
            if (cellData && cellData.count > 0) {
              doc.setFontSize(10);
              doc.setTextColor(15, 23, 42);
              doc.setFont("helvetica", "bold");
              doc.text(String(cellData.count), x + cellSize / 2, y_pos + cellSize / 2 + 3, { align: "center" });
            }
          }
        }

        y = startY + gridSize + 30;
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        doc.setFont("helvetica", "normal");
        doc.text("The matrix above displays the distribution of identified risks across the 5x5 Likelihood and Impact grid.", 20, y);
        
        addPageFooter(doc, pageNum, pageW, pageH);
      }

      // ── PAGE 5: Critical & High Risk Register ─────────────────────────────
      const criticalHighRisks = (risks.length ? risks : recentRisks).filter(
        (r) => r.risk_rating === "Critical" || r.risk_rating === "High"
      );
      if (criticalHighRisks.length > 0) {
        doc.addPage();
        pageNum++;
        doc.setFillColor(248, 250, 252);
        doc.rect(0, 0, pageW, pageH, "F");
        addPageHeader(doc, "Critical & High Risk Register", pageW);
        y = 36;

        const rCols = [
          { label: "Code", w: 22 }, { label: "Description", w: 75 }, { label: "Score", w: 16 },
          { label: "Rating", w: 22 }, { label: "Owner", w: 30 }, { label: "Status", w: 30 },
        ];
        x = 20;
        doc.setFillColor(241, 245, 249);
        doc.rect(18, y - 4, pageW - 36, 10, "F");
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(71, 85, 105);
        rCols.forEach((c) => { doc.text(c.label, x, y + 2); x += c.w; });
        y += 10;

        doc.setFont("helvetica", "normal");
        criticalHighRisks.slice(0, 25).forEach((r, i) => {
          if (y > pageH - 20) {
            addPageFooter(doc, pageNum, pageW, pageH);
            doc.addPage(); pageNum++;
            doc.setFillColor(248, 250, 252); doc.rect(0, 0, pageW, pageH, "F");
            addPageHeader(doc, "Critical & High Risk Register (cont.)", pageW);
            y = 36;
          }
          if (i % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(18, y - 4, pageW - 36, 10, "F"); }
          x = 20;
          const col = RATING_COLORS[r.risk_rating] || [100, 116, 139];
          doc.setTextColor(col[0], col[1], col[2]);
          doc.setFontSize(7);
          doc.text(r.risk_code || "—", x, y + 2); x += rCols[0].w;
          doc.setTextColor(30, 41, 59);
          const desc = (r.description || "").slice(0, 55) + ((r.description || "").length > 55 ? "…" : "");
          doc.text(desc, x, y + 2); x += rCols[1].w;
          doc.text(String(r.risk_score ?? (r.likelihood * r.impact)), x, y + 2); x += rCols[2].w;
          doc.setTextColor(col[0], col[1], col[2]);
          doc.text(r.risk_rating || "—", x, y + 2); x += rCols[3].w;
          doc.setTextColor(30, 41, 59);
          doc.text((r.owner_name || "—").slice(0, 18), x, y + 2); x += rCols[4].w;
          doc.text((r.status || "—").slice(0, 20), x, y + 2);
          y += 10;
        });
        addPageFooter(doc, pageNum, pageW, pageH);
      }

      // Save
      const dateStr = new Date().toISOString().slice(0, 10);
      doc.save(`NIPA_ERIMP_Report_${dateStr}.pdf`);
      toast.success("PDF report downloaded successfully");
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF report");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-base font-display font-bold text-foreground">Generate PDF Report</h3>
              <p className="text-xs text-muted-foreground">NIPA ERIMP Risk Management Report</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Report contents preview */}
        <div className="space-y-2 mb-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Report Contents</p>
          {[
            { page: 1, title: "Cover Page", desc: "NIPA branding, report date, prepared by" },
            { page: 2, title: "Executive Summary", desc: "5 KPI metrics, risk distribution" },
            ...(deptData.length > 0 ? [{ page: 3, title: "Department Breakdown", desc: "Risk counts by dept and rating" }] : []),
            { page: deptData.length > 0 ? 4 : 3, title: "Risk Heat Map", desc: "Likelihood vs Impact visual distribution" },
            { page: deptData.length > 0 ? 5 : 4, title: "Critical & High Register", desc: "All critical and high risks tabulated" },
          ].map((p) => (
            <div key={p.page} className="flex items-start gap-3 p-3 rounded-xl bg-secondary/40">
              <span className="w-6 h-6 rounded-lg bg-primary/15 text-primary text-[10px] font-black flex items-center justify-center shrink-0">
                {p.page}
              </span>
              <div>
                <p className="text-xs font-semibold text-foreground">{p.title}</p>
                <p className="text-[10px] text-muted-foreground">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={generatePDF}
          disabled={generating}
          className={cn(
            "w-full py-3 rounded-xl font-bold text-sm",
            "bg-primary text-primary-foreground hover:bg-primary/90",
            "shadow-lg shadow-primary/20 transition-all",
            "disabled:opacity-60 flex items-center justify-center gap-2"
          )}
        >
          {generating ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Generating PDF...</>
          ) : (
            <><Download className="w-4 h-4" /> Download PDF Report</>
          )}
        </button>
      </div>
    </div>
  );
}
