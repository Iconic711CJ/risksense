import { useEffect, useState } from "react";
import { Plus, Trash2, Edit2, Loader2, Building2, BarChart3, CheckCircle2, AlertOctagon } from "lucide-react";
import { toast } from "sonner";
import { getDepartments, createDepartment, updateDepartment, deleteDepartment } from "../../services/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
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
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleting, setDeleting] = useState(null);
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
      toast.success("Department created");
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
      toast.success("Department updated");
      setEditTarget(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to update department");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    setDeleting(id);
    try {
      await deleteDepartment(id);
      toast.success("Department deleted");
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to delete department");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-indigo-400" />
            </div>
            <h1 className="text-xl font-black text-white">Departments</h1>
          </div>
          <p className="text-sm text-slate-500">{departments.length} departments configured</p>
        </div>
        <Button
          onClick={() => { setForm({ name: "", code: "" }); setShowCreate(true); }}
          className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 gap-2"
        >
          <Plus className="w-4 h-4" />
          New Department
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {departments.map((d) => {
            const resolveRate = d.total_risks > 0
              ? Math.round((d.resolved_count / d.total_risks) * 100)
              : 0;
            return (
              <div key={d.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-indigo-500/30 transition-all group">
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
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(d.id)}
                      disabled={deleting === d.id}
                      className="w-7 h-7 text-slate-500 hover:text-red-400 hover:bg-red-500/10"
                    >
                      {deleting === d.id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Trash2 className="w-3.5 h-3.5" />
                      }
                    </Button>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="text-center p-2 rounded-xl bg-slate-800/60">
                    <p className="text-base font-black text-white">{d.total_risks ?? 0}</p>
                    <p className="text-[9px] font-bold text-slate-600 uppercase tracking-wider mt-0.5">Total</p>
                  </div>
                  <div className="text-center p-2 rounded-xl bg-red-500/5 border border-red-500/10">
                    <p className={`text-base font-black ${(d.critical_count ?? 0) > 0 ? "text-rose-400" : "text-slate-600"}`}>
                      {d.critical_count ?? 0}
                    </p>
                    <p className="text-[9px] font-bold text-slate-600 uppercase tracking-wider mt-0.5">Critical</p>
                  </div>
                  <div className="text-center p-2 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                    <p className="text-base font-black text-emerald-400">{d.resolved_count ?? 0}</p>
                    <p className="text-[9px] font-bold text-slate-600 uppercase tracking-wider mt-0.5">Resolved</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] text-slate-500 font-medium">Resolution rate</span>
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

          {departments.length === 0 && (
            <div className="col-span-full py-16 text-center">
              <Building2 className="w-10 h-10 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">No departments yet</p>
              <p className="text-slate-600 text-xs mt-1">Create your first department to get started</p>
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
                <Input className={darkInput} placeholder="e.g. Procurement" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </Field>
              <Field label="Code (short)">
                <Input
                  className={darkInput}
                  placeholder="e.g. PROC"
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
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
