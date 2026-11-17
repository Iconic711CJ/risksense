import jsPDF from "jspdf";
import { toast } from "sonner";

const RATING_COLORS = {
  Critical: [220, 38, 38],
  High: [234, 88, 12],
  Tolerable: [202, 138, 4],
  Low: [22, 163, 74],
};

const LIKELIHOOD_LABELS = { 1: "Rare", 2: "Unlikely", 3: "Possible", 4: "Likely", 5: "Certain" };
const IMPACT_LABELS = { 1: "Negligible", 2: "Minor", 3: "Moderate", 4: "Major", 5: "Critical" };

export function exportSingleRiskPDF(risk, user) {
  if (!risk) return;
  const toastId = toast.loading("Generating Risk PDF Report...");

  try {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    // Top branding bar (Dark Green #064E3B)
    doc.setFillColor(6, 78, 59);
    doc.rect(0, 0, pageW, 4, "F");

    // Header Title
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "normal");
    doc.text("NATIONAL INSTITUTE OF PUBLIC ADMINISTRATION (NIPA) ZAMBIA", 20, 14);
    doc.text("RISKSENSE RISK MANAGEMENT PLATFORM", pageW - 20, 14, { align: "right" });

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(20, 17, pageW - 20, 17);

    // Document Title
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.text(`Risk Summary Sheet: ${risk.risk_code || "R-SPEC"}`, 20, 26);

    let y = 32;

    // Score Callout Box
    const rating = risk.risk_rating || "Low";
    const score = (risk.likelihood && risk.impact) ? (risk.likelihood * risk.impact) : (risk.risk_score || 0);
    const color = RATING_COLORS[rating] || [100, 116, 139];

    doc.setFillColor(color[0], color[1], color[2]);
    doc.roundedRect(20, y, pageW - 40, 24, 3, 3, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text(String(score), 32, y + 15);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("RISK SCORE", 32, y + 20);

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(rating.toUpperCase(), 75, y + 14);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("RISK RATING", 75, y + 20);

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(risk.status ? risk.status.toUpperCase() : "IDENTIFIED", pageW - 35, y + 14, { align: "right" });
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("STATUS", pageW - 35, y + 20, { align: "right" });

    y += 32;

    // Section 1: Overview & Metadata
    doc.setFontSize(11);
    doc.setTextColor(6, 78, 59);
    doc.setFont("helvetica", "bold");
    doc.text("1. Risk Overview", 20, y);
    doc.line(20, y + 2, pageW - 20, y + 2);

    y += 8;

    // Metadata Grid
    const metadata = [
      ["Risk Code", risk.risk_code || "N/A"],
      ["Category", risk.category || "General"],
      ["Department", risk.departments?.name || user?.department_name || "N/A"],
      ["Owner / Logged By", risk.owner_name || "N/A"],
      ["Status", risk.status || "Identified"],
      ["Date Logged", risk.created_at ? new Date(risk.created_at).toLocaleDateString() : new Date().toLocaleDateString()],
    ];

    doc.setFontSize(9);
    metadata.forEach(([label, val], idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const posX = col === 0 ? 20 : pageW / 2 + 5;
      const posY = y + row * 9;

      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 116, 139);
      doc.text(`${label}:`, posX, posY);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 41, 59);
      doc.text(String(val), posX + 35, posY);
    });

    y += 30;

    // Section 2: Description
    doc.setFontSize(11);
    doc.setTextColor(6, 78, 59);
    doc.setFont("helvetica", "bold");
    doc.text("2. Risk Description", 20, y);
    doc.line(20, y + 2, pageW - 20, y + 2);

    y += 8;
    doc.setFontSize(9.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 41, 59);

    const splitDesc = doc.splitTextToSize(risk.description || "No description provided.", pageW - 40);
    doc.text(splitDesc, 20, y);
    y += splitDesc.length * 5 + 8;

    // Section 3: Risk Assessment Breakdown
    doc.setFontSize(11);
    doc.setTextColor(6, 78, 59);
    doc.setFont("helvetica", "bold");
    doc.text("3. Risk Assessment Breakdown", 20, y);
    doc.line(20, y + 2, pageW - 20, y + 2);

    y += 8;

    const lVal = risk.likelihood || 1;
    const iVal = risk.impact || 1;

    // Likelihood & Impact Boxes
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(20, y, (pageW - 45) / 2, 22, 2, 2, "F");
    doc.roundedRect(20 + (pageW - 45) / 2 + 5, y, (pageW - 45) / 2, 22, 2, 2, "F");

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(71, 85, 105);
    doc.text("LIKELIHOOD SCORE", 25, y + 7);
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(`${lVal} - ${LIKELIHOOD_LABELS[lVal] || "N/A"}`, 25, y + 17);

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(71, 85, 105);
    const box2X = 20 + (pageW - 45) / 2 + 10;
    doc.text("IMPACT SCORE", box2X, y + 7);
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(`${iVal} - ${IMPACT_LABELS[iVal] || "N/A"}`, box2X, y + 17);

    y += 30;

    // Section 4: Mitigation & Action Plan
    doc.setFontSize(11);
    doc.setTextColor(6, 78, 59);
    doc.setFont("helvetica", "bold");
    doc.text("4. Mitigation & Action Plan", 20, y);
    doc.line(20, y + 2, pageW - 20, y + 2);

    y += 8;
    doc.setFontSize(9.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 41, 59);

    const splitMit = doc.splitTextToSize(risk.mitigation_plan || "No specific mitigation plan recorded for this risk.", pageW - 40);
    doc.text(splitMit, 20, y);
    y += splitMit.length * 5 + 10;

    // Section 5: Sign Off / Footer Info
    doc.setDrawColor(226, 232, 240);
    doc.line(20, pageH - 25, pageW - 20, pageH - 25);

    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.setFont("helvetica", "normal");
    doc.text(`Exported by: ${user?.full_name || "System User"} (${user?.email || ""})`, 20, pageH - 18);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, pageH - 12);
    doc.text("Page 1 of 1 — Confidential RiskSense Document", pageW - 20, pageH - 12, { align: "right" });

    doc.setFillColor(6, 78, 59);
    doc.rect(0, pageH - 4, pageW, 4, "F");

    const fileName = `${(risk.risk_code || "RISK").replace(/[^a-zA-Z0-9_-]/g, "_")}_Summary.pdf`;
    doc.save(fileName);
    toast.success("Risk PDF exported successfully", { id: toastId });
  } catch (err) {
    console.error("Single Risk PDF Export error:", err);
    toast.error("Failed to export Risk PDF", { id: toastId });
  }
}
