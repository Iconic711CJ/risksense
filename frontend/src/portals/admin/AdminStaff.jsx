import { useEffect, useState } from "react";
import { Plus, Trash2, Edit2, Loader2, Search, Users, ChevronDown, ChevronRight, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { getUsers, createUser, updateUser, deleteUser, getDepartments } from "../../services/api";
import useAppStore from "../../store/useAppStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</label>
      {children}
    </div>
  );
}

export default function AdminStaff() {
  const currentUser = useAppStore((s) => s.user);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [collapsedDepts, setCollapsedDepts] = useState({});
  const [form, setForm] = useState({ email: "", password: "", full_name: "", role: "department_user", department_id: "" });
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const [u, d] = await Promise.all([getUsers(), getDepartments()]);
      setUsers(u);
      setDepartments(d);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function getGrouped(userList) {
    const deptMap = {};
    const unassigned = [];
    for (const u of userList) {
      const deptId = u.department_id;
      if (!deptId) unassigned.push(u);
      else {
        if (!deptMap[deptId]) deptMap[deptId] = [];
        deptMap[deptId].push(u);
      }
    }
    const groups = departments
      .filter((d) => deptMap[d.id]?.length > 0)
      .map((d) => ({ id: d.id, name: d.name, code: d.code, users: deptMap[d.id] }));
    if (unassigned.length > 0) groups.push({ id: "__unassigned__", name: "Unassigned", code: "—", users: unassigned });
    return groups;
  }

  const filtered = search
    ? users.filter((u) =>
        u.full_name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
      )
    : users;

  const grouped = getGrouped(filtered);

  function toggleDept(id) {
    setCollapsedDepts((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.email || !form.password || !form.full_name) {
      toast.error("All fields are required");
      return;
    }
    setSaving(true);
    try {
      await createUser({ ...form, department_id: form.department_id || null });
      toast.success("Staff account created");
      setShowCreate(false);
      setForm({ email: "", password: "", full_name: "", role: "department_user", department_id: "" });
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create account");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateUser(editTarget.id, {
        full_name: form.full_name,
        role: form.role,
        department_id: form.department_id || null,
      });
      toast.success("User updated");
      setEditTarget(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to update user");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    setDeleting(id);
    try {
      await deleteUser(id);
      toast.success("User deleted");
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to delete user");
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
            <Users className="w-5 h-5 text-[#064E3B]" />
            <h1 className="text-xl font-black text-slate-900">Staff Management</h1>
          </div>
          <p className="text-sm text-slate-400">{users.length} staff accounts · {departments.length} departments</p>
        </div>
        <Button
          onClick={() => { setForm({ email: "", password: "", full_name: "", role: "department_user", department_id: "" }); setShowCreate(true); }}
          className="gap-2"
        >
          <UserPlus className="w-4 h-4" />
          Add Staff
        </Button>
      </div>

      {/* Search */}
      <div className="relative w-64">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        <Input
          className="pl-9"
          placeholder="Search staff..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 text-[#064E3B] animate-spin" />
        </div>
      ) : grouped.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Users className="w-8 h-8 text-slate-200 mx-auto mb-2" />
          <p className="text-slate-400 text-sm">No staff accounts yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {grouped.map((group) => {
            const isCollapsed = collapsedDepts[group.id];
            return (
              <div key={group.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <button
                  onClick={() => toggleDept(group.id)}
                  className="w-full flex items-center gap-3 px-5 py-3.5 bg-slate-50 border-b border-slate-100 hover:bg-slate-100 transition-colors"
                >
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-[9px] font-black text-[#064E3B]">{group.code}</span>
                  </div>
                  <span className="font-bold text-slate-700 text-sm flex-1 text-left">{group.name}</span>
                  <span className="text-xs font-bold text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-full mr-2">
                    {group.users.length}
                  </span>
                  {isCollapsed
                    ? <ChevronRight className="w-4 h-4 text-slate-400" />
                    : <ChevronDown className="w-4 h-4 text-slate-400" />
                  }
                </button>

                {!isCollapsed && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-50">
                          <th className="text-left px-5 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Name</th>
                          <th className="text-left px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email</th>
                          <th className="text-right px-5 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.users.map((u) => (
                          <tr key={u.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-[#064E3B]/10 flex items-center justify-center flex-shrink-0">
                                  <span className="text-[10px] font-bold text-[#064E3B]">
                                    {(u.full_name || "?").charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <span className="font-semibold text-slate-700">{u.full_name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-400 text-xs font-mono">{u.email}</td>
                            <td className="px-5 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setEditTarget(u);
                                    setForm({ full_name: u.full_name, role: u.role, department_id: u.department_id ?? "", email: u.email, password: "" });
                                  }}
                                  className="w-7 h-7 text-slate-400 hover:text-[#064E3B] hover:bg-emerald-50"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(u.id)}
                                  disabled={deleting === u.id}
                                  className="w-7 h-7 text-slate-400 hover:text-red-500 hover:bg-red-50"
                                >
                                  {deleting === u.id
                                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    : <Trash2 className="w-3.5 h-3.5" />
                                  }
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={(open) => { if (!open) setShowCreate(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-[#064E3B]" />
              Add Staff Account
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="px-6 pb-2 space-y-4">
              <Field label="Full Name">
                <Input placeholder="Jane Doe" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              </Field>
              <Field label="Email">
                <Input type="email" placeholder="jane@nipa.ac.zm" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </Field>
              <Field label="Password">
                <Input type="password" placeholder="Min 8 characters" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </Field>
              <Field label="Department">
                <select
                  className="w-full h-9 px-3 rounded-lg text-sm border border-border bg-secondary/50 text-foreground focus:outline-none focus:border-primary/50"
                  value={form.department_id}
                  onChange={(e) => setForm({ ...form, department_id: e.target.value })}
                >
                  <option value="">— Unassigned —</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </Field>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open) setEditTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-[#064E3B]" />
              Edit Staff Member
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate}>
            <div className="px-6 pb-2 space-y-4">
              <Field label="Full Name">
                <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              </Field>
              <Field label="Department">
                <select
                  className="w-full h-9 px-3 rounded-lg text-sm border border-border bg-secondary/50 text-foreground focus:outline-none focus:border-primary/50"
                  value={form.department_id ?? ""}
                  onChange={(e) => setForm({ ...form, department_id: e.target.value })}
                >
                  <option value="">— Unassigned —</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </Field>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
