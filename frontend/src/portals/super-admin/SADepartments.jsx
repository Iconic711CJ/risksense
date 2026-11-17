import { useEffect, useState } from "react";
import {
  Plus, Trash2, Edit2, Loader2, Building2, BarChart3, CheckCircle2,
  AlertTriangle, Search, ShieldAlert, Layers
} from "lucide-react";
import { toast } from "sonner";
import { getDepartments, createDepartment, updateDepartment, deleteDepartment } from "../../services/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

const darkInput = "bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-600 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20";

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</label>
      {children}
    </div>
  );
}

export default function SADepartments() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({ name: "", code: "" });
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const d = await getDepartments();
      setDepartments(d);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.name || !form.code) { toast.error("Name and code are required"); return; }
    setSaving(true);
    try {
      await createDepartment(form);
      toast.success("Department created successfully");
      setShowCreate(false);
      setForm({ name: "", code: "" });
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create department");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateDepartment(editTarget.id, form);
      toast.success("Department updated successfully");
      setEditTarget(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to update department");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteConfirmTarget) return;
    setDeleting(true);
    try {
      await deleteDepartment(deleteConfirmTarget.id);
      toast.success(`Department "${deleteConfirmTarget.name}" deleted`);
      setDeleteConfirmTarget(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to delete department");
    } finally {
      setDeleting(false);
    }
  }

  const filtered = departments.filter((d) =>
    (d.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (d.code || "").toLowerCase().includes(search.toLowerCase())
  );

  const totalRisks = departments.reduce((acc, d) => acc + (d.total_risks || 0), 0);
  const totalCritical = departments.reduce((acc, d) => acc + (d.critical_count || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-indigo-400" />
            </div>
            <h1 className="text-xl font-black text-white">Department Governance</h1>
          </div>
          <p className="text-sm text-slate-500">
            {departments.length} departments registered across the enterprise
          </p>
        </div>
        <Button
          onClick={() => { setForm({ name: "", code: "" }); setShowCreate(true); }}
          className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 gap-2 text-xs font-bold"
        >
          <Plus className="w-4 h-4" />
          New Department
        </Button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-2xl font-black text-white">{departments.length}</p>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Total Departments</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <Layers className="w-5 h-5 text-indigo-400" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-2xl font-black text-white">{totalRisks}</p>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Total Active Risks</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-violet-400" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-2xl font-black text-rose-400">{totalCritical}</p>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Critical Severity Risks</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search departments by name or code (e.g. Finance, FIN)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((d) => {
            const resolveRate = d.total_risks > 0
              ? Math.round((d.resolved_count / d.total_risks) * 100)
              : 0;
            return (
              <div key={d.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-indigo-500/30 transition-all group flex flex-col justify-between">
                <div>
                  {/* Card header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                        <span className="text-xs font-black text-indigo-400">{d.code}</span>
                      </div>
                      <div>
                        <p className="font-bold text-white text-sm">{d.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">{d.id.slice(0, 8)}…</p>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => { setEditTarget(d); setForm({ name: d.name, code: d.code }); }}
                        className="w-7 h-7 text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10"
                        title="Edit Department"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteConfirmTarget(d)}
                        className="w-7 h-7 text-slate-500 hover:text-red-400 hover:bg-red-500/10"
                        title="Delete Department"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="text-center p-2 rounded-xl bg-slate-800/60">
                      <p className="text-base font-black text-white">{d.total_risks ?? 0}</p>
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">Total</p>
                    </div>
                    <div className="text-center p-2 rounded-xl bg-rose-500/5 border border-rose-500/10">
                      <p className={`text-base font-black ${(d.critical_count ?? 0) > 0 ? "text-rose-400" : "text-slate-600"}`}>
                        {d.critical_count ?? 0}
                      </p>
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">Critical</p>
                    </div>
                    <div className="text-center p-2 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                      <p className="text-base font-black text-emerald-400">{d.resolved_count ?? 0}</p>
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">Resolved</p>
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] text-slate-500 font-medium">Resolution progress</span>
                    <span className="text-[10px] font-bold text-slate-400">{resolveRate}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all"
                      style={{ width: `${resolveRate}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="col-span-full py-16 text-center">
              <Building2 className="w-10 h-10 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400 text-sm font-semibold">No departments found</p>
              <p className="text-slate-600 text-xs mt-1">Try adjusting your search query or create a new department</p>
            </div>
          )}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={(open) => { if (!open) setShowCreate(false); }}>
        <DialogContent className="bg-slate-900 border border-slate-700 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-400" />
              New Department
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="px-6 pb-2 space-y-4">
              <Field label="Department Name">
                <Input className={darkInput} placeholder="e.g. Risk & Compliance" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </Field>
              <Field label="Code (short)">
                <Input
                  className={darkInput}
                  placeholder="e.g. RISK"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  maxLength={8}
                />
              </Field>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-white hover:bg-slate-800">
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-500 text-white">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open) setEditTarget(null); }}>
        <DialogContent className="bg-slate-900 border border-slate-700 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-indigo-400" />
              Edit Department
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate}>
            <div className="px-6 pb-2 space-y-4">
              <Field label="Department Name">
                <Input className={darkInput} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </Field>
              <Field label="Code">
                <Input
                  className={darkInput}
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  maxLength={8}
                />
              </Field>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setEditTarget(null)} className="text-slate-400 hover:text-white hover:bg-slate-800">
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-500 text-white">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Mandatory Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmTarget} onOpenChange={(open) => { if (!open) setDeleteConfirmTarget(null); }}>
        <DialogContent className="bg-slate-900 border border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-rose-400 flex items-center gap-2 text-base font-black">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              Confirm Department Deletion
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Are you sure you want to permanently delete{" "}
              <span className="font-bold text-white">"{deleteConfirmTarget?.name}"</span> ({deleteConfirmTarget?.code})?
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 space-y-1">
            <p className="font-bold">⚠️ Irreversible Governance Action:</p>
            <p className="text-[11px] text-rose-300/80">
              Deleting this department may affect associated department user accounts and historical risk registry links. Please ensure all risks have been reassigned or archived prior to deletion.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeleteConfirmTarget(null)}
              className="text-slate-400 hover:text-white hover:bg-slate-800 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
            >
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Delete Department"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
