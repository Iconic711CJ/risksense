import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";

const REQUIRED_FIELDS = [
  { key: "risk_id", label: "Risk ID" },
  { key: "category", label: "Category" },
  { key: "risk_description", label: "Risk Description" },
  { key: "inherent_likelihood", label: "Inherent Likelihood" },
  { key: "inherent_impact", label: "Inherent Impact" }
];

export default function ImportMappingModal({ open, onClose, columns, onMapped }) {
  const [mapping, setMapping] = useState({});

  const handleApply = () => {
    // Reverse the mapping from { "Mapped Field": "Original File Column" } to { "Original File Column": "Mapped Field" }
    // As the backend expects { "Original Column from Pandas": "standard_db_col" }
    const backendMapping = {};
    for (const [standardCol, originalCol] of Object.entries(mapping)) {
      if (originalCol) backendMapping[originalCol] = standardCol;
    }
    onMapped(backendMapping);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle>Map File Columns</DialogTitle>
          <DialogDescription>
            We couldn't automatically detect the required columns in your file. 
            Please map them manually below. Ensure at least Risk ID is mapped.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto scrollbar-thin pr-2">
          {REQUIRED_FIELDS.map(field => (
            <div key={field.key} className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-foreground">
                {field.label} {field.key === "risk_id" && <span className="text-red-500">*</span>}
              </label>
              <select 
                className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                value={mapping[field.key] || ""}
                onChange={(e) => setMapping({ ...mapping, [field.key]: e.target.value })}
              >
                <option value="">-- Ignore / Missing --</option>
                {columns.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleApply} disabled={!mapping.risk_id}>
            Apply & Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
