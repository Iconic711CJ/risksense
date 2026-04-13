import { useEffect, useState } from "react";
import { Plus, Trash2, Edit2, Loader2, Search, Users, UserPlus, Shield, UserCog } from "lucide-react";
import { toast } from "sonner";
import { getUsers, createUser, updateUser, deleteUser, getDepartments } from "../../services/api";
import useAppStore from "../../store/useAppStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

const ROLES = [
  { value: "super_admin", label: "Super Admin" },
  { value: "admin", label: "Admin" },
  { value: "department_user", label: "Staff" },
];

const ROLE_COLORS = {
  super_admin: "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30",
  admin: "bg-violet-500/20 text-violet-300 border border-violet-500/30",
  department_user: "bg-slate-700 text-slate-300 border border-slate-600",
};

const ROLE_ICONS = {
  super_admin: Shield,
  admin: UserCog,
  department_user: Users,
};

const ROLE_LABELS = { super_admin: "Super Admin", admin: "Admin", department_user: "Staff" };

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</label>
      {children}
    </div>
  );
}

const darkInput = "bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-600 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20";

export default function SAUsers() {
  const currentUser = useAppStore((s) => s.user);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const [form, setForm] = useState({ email: "", password: "", full_name: "", role: "department_user", department_id: "" });
  const [saving, setSaving] = useState(false);

  function resetForm() {
    setForm({ email: "", password: "", full_name: "", role: "department_user", department_id: "" });
  }

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

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.email || !form.password || !form.full_name) {
      toast.error("Email, password and name are required");
      return;
    }
    setSaving(true);
    try {
      await createUser({ ...form, department_id: form.department_id || null });
      toast.success("User created");
      setShowCreate(false);
      resetForm();
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create user");
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
    if (id === currentUser?.id) { toast.error("Cannot delete your own account"); return; }
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

  const filtered = users.filter((u) => {
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    const matchSearch = !search || u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    return matchRole && matchSearch;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Users className="w-4 h-4 text-indigo-400" />
            </div>
            <h1 className="text-xl font-black text-white">User Management</h1>
          </div>
          <p className="text-sm text-slate-500">{users.length} total accounts</p>
        </div>
        <Button
          onClick={() => { resetForm(); setShowCreate(true); }}
          className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 gap-2"
        >
          <UserPlus className="w-4 h-4" />
          New User
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <Input
            className={`pl-9 w-56 ${darkInput}`}
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="all">All Roles</option>
          {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Name</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Email</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Role</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Department</th>
                  <th className="text-right px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center">
                    <Users className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                    <p className="text-slate-600 text-xs">No users found</p>
                  </td></tr>
                ) : filtered.map((u) => {
                  const RoleIcon = ROLE_ICONS[u.role] ?? Users;
                  return (
                    <tr key={u.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-[10px] font-bold text-indigo-400">
                              {(u.full_name || "?").charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="font-semibold text-slate-200">{u.full_name}</span>
                          {u.id === currentUser?.id && (
                            <span className="text-[9px] font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">you</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-400 font-mono text-xs">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${ROLE_COLORS[u.role] ?? ROLE_COLORS.department_user}`}>
                          <RoleIcon className="w-2.5 h-2.5" />
                          {ROLE_LABELS[u.role] ?? u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{u.departments?.name ?? "—"}</td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditTarget(u);
                              setForm({ full_name: u.full_name, role: u.role, department_id: u.department_id ?? "", email: u.email, password: "" });
                            }}
                            className="w-7 h-7 text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          {u.id !== currentUser?.id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(u.id)}
                              disabled={deleting === u.id}
                              className="w-7 h-7 text-slate-500 hover:text-red-400 hover:bg-red-500/10"
                            >
                              {deleting === u.id
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <Trash2 className="w-3.5 h-3.5" />
                              }
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={(open) => { if (!open) setShowCreate(false); }}>
        <DialogContent className="bg-slate-900 border border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-indigo-400" />
              Create New User
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="px-6 pb-2 space-y-4">
              <Field label="Full Name">
                <Input className={darkInput} placeholder="John Doe" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              </Field>
              <Field label="Email">
                <Input type="email" className={darkInput} placeholder="user@nipa.ac.zm" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </Field>
              <Field label="Password">
                <Input type="password" className={darkInput} placeholder="Min 8 characters" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </Field>
              <Field label="Role">
                <select className={`w-full h-9 px-3 rounded-lg text-sm border ${darkInput}`} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </Field>
              {form.role === "department_user" && (
                <Field label="Department">
                  <select className={`w-full h-9 px-3 rounded-lg text-sm border ${darkInput}`} value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}>
                    <option value="">— None —</option>
                    {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </Field>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-white hover:bg-slate-800">
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-500 text-white">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create User"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open) setEditTarget(null); }}>
        <DialogContent className="bg-slate-900 border border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-indigo-400" />
              Edit User
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate}>
            <div className="px-6 pb-2 space-y-4">
              <Field label="Full Name">
                <Input className={darkInput} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              </Field>
              <Field label="Role">
                <select className={`w-full h-9 px-3 rounded-lg text-sm border ${darkInput}`} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </Field>
              <Field label="Department">
                <select className={`w-full h-9 px-3 rounded-lg text-sm border ${darkInput}`} value={form.department_id ?? ""} onChange={(e) => setForm({ ...form, department_id: e.target.value })}>
                  <option value="">— None —</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
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
    </div>
  );
}
