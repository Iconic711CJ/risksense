import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Eye, EyeOff, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { getUsers, createUser, deleteUser, getDepartments } from "../services/api";
import { cn, formatDate } from "../lib/utils";
import useAppStore from "../store/useAppStore";

const ROLE_STYLES = {
  admin: "bg-purple-500/15 text-purple-400 border-purple-500/25",
  department_user: "bg-sky-500/15 text-sky-400 border-sky-500/25",
};

function AddUserDialog({ departments, onClose, onCreated }) {
  const [form, setForm] = useState({
    full_name: "", email: "", password: "", role: "department_user", department_id: ""
  });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  function set(key, val) { setForm((f) => ({ ...f, [key]: val })); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.full_name || !form.email || !form.password) {
      toast.error("Name, email and password are required");
      return;
    }
    if (form.role === "department_user" && !form.department_id) {
      toast.error("Please select a department");
      return;
    }
    setLoading(true);
    try {
      const user = await createUser({
        ...form,
        department_id: form.role === "admin" ? null : form.department_id,
      });
      toast.success(`User ${user.full_name} created`);
      onCreated();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create user");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-display font-bold text-foreground">Add New User</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground/80">Full Name</label>
            <input
              type="text" value={form.full_name} onChange={(e) => set("full_name", e.target.value)}
              placeholder="John Banda" required
              className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground/80">Email</label>
            <input
              type="email" value={form.email} onChange={(e) => set("email", e.target.value)}
              placeholder="john@nipa.ac.zm" required
              className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground/80">Password</label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"} value={form.password} onChange={(e) => set("password", e.target.value)}
                placeholder="Minimum 6 characters" required minLength={6}
                className="w-full px-4 py-2.5 pr-10 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <button type="button" onClick={() => setShowPw((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground/80">Role</label>
              <select value={form.role} onChange={(e) => set("role", e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40">
                <option value="department_user">Department User</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
            {form.role === "department_user" && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground/80">Department</label>
                <select value={form.department_id} onChange={(e) => set("department_id", e.target.value)} required
                  className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40">
                  <option value="">Select...</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-2 mt-2">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : "Create User"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function UserManagement() {
  const currentUser = useAppStore((s) => s.user);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [usersData, depts] = await Promise.all([getUsers(), getDepartments()]);
      setUsers(usersData || []);
      setDepartments(depts || []);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function handleDelete(userId) {
    setDeleting(userId);
    try {
      await deleteUser(userId);
      toast.success("User deleted");
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to delete user");
    } finally {
      setDeleting(null);
      setConfirmDelete(null);
    }
  }

  const COL = "px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground";

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground tracking-tight">User Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{users.length} users registered</p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          Add User
        </button>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-secondary/50 border-b border-border">
            <tr>
              <th className={COL}>Name</th>
              <th className={COL}>Email</th>
              <th className={COL}>Role</th>
              <th className={COL}>Department</th>
              <th className={COL}>Created</th>
              <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              [...Array(4)].map((_, i) => (
                <tr key={i}>
                  <td colSpan={6} className="px-4 py-3">
                    <div className="h-6 rounded-lg bg-secondary animate-pulse" />
                  </td>
                </tr>
              ))
            ) : users.map((u) => (
              <tr key={u.id} className="hover:bg-secondary/20 transition-colors group">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                      <span className="text-[11px] font-bold text-primary">
                        {(u.full_name || "U").charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">{u.full_name}</p>
                      {u.id === currentUser?.id && (
                        <p className="text-[9px] text-primary font-medium">You</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-muted-foreground">{u.email || "—"}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={cn("px-2 py-0.5 rounded-lg text-[10px] font-bold border capitalize", ROLE_STYLES[u.role])}>
                    {u.role === "department_user" ? "Dept User" : "Admin"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-muted-foreground">
                    {u.departments?.name || (u.role === "admin" ? "All Departments" : "—")}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-muted-foreground">{formatDate(u.created_at)}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  {u.id !== currentUser?.id && (
                    <button
                      onClick={() => setConfirmDelete(u)}
                      disabled={deleting === u.id}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                    >
                      {deleting === u.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && !users.length && (
          <div className="text-center py-12 text-sm text-muted-foreground">No users found</div>
        )}
      </div>

      {/* Add User Dialog */}
      {addOpen && (
        <AddUserDialog
          departments={departments}
          onClose={() => setAddOpen(false)}
          onCreated={fetchAll}
        />
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setConfirmDelete(null)}>
          <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-display font-bold text-foreground">Delete User?</h3>
            <p className="text-sm text-muted-foreground mt-2">
              This will permanently delete <strong className="text-foreground">{confirmDelete.full_name}</strong> and all their data.
            </p>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
                Cancel
              </button>
              <button onClick={() => handleDelete(confirmDelete.id)}
                className="flex-1 py-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-sm font-bold text-red-400 hover:bg-red-500/25 transition-all">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
