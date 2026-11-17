import { useEffect, useState, useMemo } from "react";
import {
  Plus, Trash2, Edit2, Loader2, Search, Users, UserPlus, Shield, UserCog,
  Key, Eye, EyeOff, Copy, Check, AlertTriangle, Sparkles, Lock, Unlock,
  CheckCircle2, XCircle, ChevronRight, UserCheck, ShieldAlert,
  Info, Filter, MoreVertical, Building2, Mail, Calendar, Hash
} from "lucide-react";
import { toast } from "sonner";
import { getUsers, createUser, updateUser, deleteUser, getDepartments, resetUserPassword } from "../../services/api";
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

const ROLE_PERMISSIONS = {
  super_admin: [
    "Full Platform Surveillance",
    "Reset Any User Password",
    "Manage All Administrators",
    "System Settings & Database Backup",
    "Global Department Management",
    "Full Audit Trail Inspection",
  ],
  admin: [
    "Manage Department Staff",
    "Create & Edit Department Risks",
    "Approve Risk Mitigations",
    "Department Audit Visibility",
  ],
  department_user: [
    "Report Department Risks",
    "Update Mitigation Action Plans",
    "Department Kanban Board",
  ],
};

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
  
  // Filtering & Search
  const [search, setSearch] = useState("");
  const [activeFilterTab, setActiveFilterTab] = useState("all"); // all | super_admin | admin | department_user | suspended
  const [deptFilter, setDeptFilter] = useState("all");

  // Selection & Inspector
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [inspectUser, setInspectUser] = useState(null);

  // Dialogs
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(null);

  // Reset Password Dialog
  const [resetTarget, setResetTarget] = useState(null);
  const [resetPasswordVal, setResetPasswordVal] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form State
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

  // Filter calculations
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Role or status tab filter
      if (activeFilterTab === "suspended" && u.status !== "suspended") return false;
      if (activeFilterTab !== "all" && activeFilterTab !== "suspended" && u.role !== activeFilterTab) return false;
      
      // Department filter
      if (deptFilter !== "all" && u.department_id !== deptFilter) return false;

      // Text search
      if (search) {
        const query = search.toLowerCase();
        const matchesName = (u.full_name || "").toLowerCase().includes(query);
        const matchesEmail = (u.email || "").toLowerCase().includes(query);
        const matchesDept = (u.departments?.name || "").toLowerCase().includes(query);
        if (!matchesName && !matchesEmail && !matchesDept) return false;
      }

      return true;
    });
  }, [users, activeFilterTab, deptFilter, search]);

  // Counts for Metric Cards
  const totalCount = users.length;
  const superAdminCount = users.filter((u) => u.role === "super_admin").length;
  const adminCount = users.filter((u) => u.role === "admin").length;
  const staffCount = users.filter((u) => u.role === "department_user").length;
  const suspendedCount = users.filter((u) => u.status === "suspended").length;

  // Bulk actions
  function toggleSelectAll() {
    if (selectedIds.size === filteredUsers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredUsers.map((u) => u.id)));
    }
  }

  function toggleSelectOne(id) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  }

  async function handleBulkStatusChange(newStatus) {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    try {
      for (const id of selectedIds) {
        if (id !== currentUser?.id) {
          await updateUser(id, { status: newStatus });
        }
      }
      toast.success(`Updated status for ${count} users`);
      setSelectedIds(new Set());
      load();
    } catch {
      toast.error("Failed to complete bulk status update");
    }
  }

  // Create User
  async function handleCreate(e) {
    e.preventDefault();
    if (!form.email || !form.password || !form.full_name) {
      toast.error("Email, password and name are required");
      return;
    }
    setSaving(true);
    try {
      await createUser({ ...form, department_id: form.department_id || null });
      toast.success(`User ${form.full_name} created successfully`);
      setShowCreate(false);
      resetForm();
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create user");
    } finally {
      setSaving(false);
    }
  }

  // Update User
  async function handleUpdate(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateUser(editTarget.id, {
        full_name: form.full_name,
        role: form.role,
        department_id: form.department_id || null,
      });
      toast.success("User updated successfully");
      setEditTarget(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to update user");
    } finally {
      setSaving(false);
    }
  }

  // Toggle Single Status
  async function handleToggleStatus(u) {
    if (u.id === currentUser?.id) {
      toast.error("Cannot suspend your own account");
      return;
    }
    const newStatus = u.status === "suspended" ? "active" : "suspended";
    try {
      await updateUser(u.id, { status: newStatus });
      toast.success(`User ${u.full_name} account set to ${newStatus}`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to update account status");
    }
  }

  // Generate Password
  function generateRandomPassword() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setResetPasswordVal(password);
    setShowPassword(true);
    setCopied(false);
  }

  async function handleCopyPassword() {
    if (!resetPasswordVal) return;
    await navigator.clipboard.writeText(resetPasswordVal);
    setCopied(true);
    toast.success("Password copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  // Reset Password
  async function handleResetPassword(e) {
    e.preventDefault();
    if (!resetPasswordVal || resetPasswordVal.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setResetting(true);
    try {
      await resetUserPassword(resetTarget.id, resetPasswordVal);
      toast.success(`Password reset successfully for ${resetTarget.full_name}`);
      setResetTarget(null);
      setResetPasswordVal("");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to reset password");
    } finally {
      setResetting(false);
    }
  }

  // Delete User
  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    if (deleteTarget.id === currentUser?.id) {
      toast.error("Cannot delete your own account");
      setDeleteTarget(null);
      return;
    }
    setDeleting(deleteTarget.id);
    try {
      await deleteUser(deleteTarget.id);
      toast.success(`User ${deleteTarget.full_name} deleted`);
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to delete user");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Users className="w-4 h-4 text-indigo-400" />
            </div>
            <h1 className="text-xl font-black text-white">User & Access Governance</h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Authority Center
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Control accounts, role hierarchies, password policies, and security permissions enterprise-wide.
          </p>
        </div>

        <Button
          onClick={() => { resetForm(); setShowCreate(true); }}
          className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 gap-2 font-bold text-xs"
        >
          <UserPlus className="w-4 h-4" />
          Create New Account
        </Button>
      </div>

      {/* ── Quick Stat Filter Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { id: "all", label: "Total Accounts", count: totalCount, icon: Users, color: "text-slate-200", bg: "hover:border-slate-700" },
          { id: "super_admin", label: "Super Admins", count: superAdminCount, icon: Shield, color: "text-indigo-400", bg: "hover:border-indigo-500/50" },
          { id: "admin", label: "Administrators", count: adminCount, icon: UserCog, color: "text-violet-400", bg: "hover:border-violet-500/50" },
          { id: "department_user", label: "Staff Members", count: staffCount, icon: UserCheck, color: "text-emerald-400", bg: "hover:border-emerald-500/50" },
          { id: "suspended", label: "Suspended", count: suspendedCount, icon: ShieldAlert, color: "text-rose-400", bg: "hover:border-rose-500/50" },
        ].map((card) => {
          const Icon = card.icon;
          const isSelected = activeFilterTab === card.id;
          return (
            <div
              key={card.id}
              onClick={() => setActiveFilterTab(card.id)}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                isSelected
                  ? "bg-slate-800 border-indigo-500 shadow-md shadow-indigo-500/10"
                  : "bg-slate-900/80 border-slate-800 " + card.bg
              }`}
            >
              <div className="flex items-center justify-between">
                <Icon className={`w-4 h-4 ${card.color}`} />
                <span className={`text-base font-black tabular-nums ${card.color}`}>{card.count}</span>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">{card.label}</p>
            </div>
          );
        })}
      </div>

      {/* ── Filter & Search Controls ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search Box */}
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <Input
              className={`pl-9 text-xs ${darkInput}`}
              placeholder="Search by name, email or dept..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Department Filter */}
          <select
            className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
          >
            <option value="all">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
            ))}
          </select>
        </div>

        {/* Active Filter Count */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          <span className="text-xs text-slate-500 font-medium">
            Showing <strong className="text-slate-200 font-bold">{filteredUsers.length}</strong> of {totalCount} users
          </span>
          {(activeFilterTab !== "all" || deptFilter !== "all" || search) && (
            <button
              onClick={() => { setActiveFilterTab("all"); setDeptFilter("all"); setSearch(""); }}
              className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold uppercase tracking-wider underline"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* ── Bulk Action Bar (Visible when items selected) ───────────────────── */}
      {selectedIds.size > 0 && (
        <div className="p-3 bg-indigo-950/60 border border-indigo-500/30 rounded-xl flex items-center justify-between gap-4 animate-slide-up">
          <div className="flex items-center gap-2.5">
            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-black flex items-center justify-center">
              {selectedIds.size}
            </span>
            <span className="text-xs font-semibold text-indigo-200">Accounts Selected</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkStatusChange("suspended")}
              className="bg-slate-900 border-slate-700 text-rose-300 hover:bg-rose-500/10 text-xs h-7 gap-1"
            >
              <Lock className="w-3 h-3" /> Suspend Selected
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkStatusChange("active")}
              className="bg-slate-900 border-slate-700 text-emerald-300 hover:bg-emerald-500/10 text-xs h-7 gap-1"
            >
              <Unlock className="w-3 h-3" /> Activate Selected
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedIds(new Set())}
              className="text-slate-400 hover:text-white text-xs h-7"
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* ── Users Table ─────────────────────────────────────────────────────── */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-7 h-7 text-indigo-400 animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                  <th className="px-4 py-3 text-left w-10">
                    <input
                      type="checkbox"
                      checked={filteredUsers.length > 0 && selectedIds.size === filteredUsers.length}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0 cursor-pointer"
                    />
                  </th>
                  <th className="text-left px-4 py-3">User Profile</th>
                  <th className="text-left px-4 py-3">Email Address</th>
                  <th className="text-left px-4 py-3">Role Authority</th>
                  <th className="text-left px-4 py-3">Department</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-right px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <Users className="w-10 h-10 text-slate-700 mx-auto mb-2 opacity-60" />
                      <p className="text-slate-400 font-semibold text-sm">No user accounts found</p>
                      <p className="text-slate-600 text-xs mt-0.5">Try refining your search or active filter criteria.</p>
                    </td>
                  </tr>
                ) : filteredUsers.map((u) => {
                  const RoleIcon = ROLE_ICONS[u.role] ?? Users;
                  const isSelected = selectedIds.has(u.id);
                  const isSuspended = u.status === "suspended";

                  return (
                    <tr
                      key={u.id}
                      className={`border-b border-slate-800/60 transition-colors ${
                        isSelected ? "bg-indigo-950/20" : "hover:bg-slate-800/40"
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="px-4 py-3.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(u.id)}
                          className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0 cursor-pointer"
                        />
                      </td>

                      {/* Name / Avatar / Inspector Click */}
                      <td className="px-4 py-3.5">
                        <div
                          className="flex items-center gap-3 cursor-pointer group"
                          onClick={() => setInspectUser(u)}
                        >
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0 group-hover:border-indigo-400 transition-colors">
                            <span className="text-xs font-black text-indigo-300">
                              {(u.full_name || "?").charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-100 group-hover:text-indigo-300 transition-colors">
                                {u.full_name}
                              </span>
                              {u.id === currentUser?.id && (
                                <span className="text-[9px] font-black text-indigo-400 bg-indigo-500/15 border border-indigo-500/30 px-1.5 py-0.2 rounded-full">
                                  YOU
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500 flex items-center gap-1">
                              View Permissions <ChevronRight className="w-2.5 h-2.5" />
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-4 py-3.5 text-slate-300 font-mono text-xs">
                        {u.email}
                      </td>

                      {/* Role Badge */}
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${ROLE_COLORS[u.role] ?? ROLE_COLORS.department_user}`}>
                          <RoleIcon className="w-3 h-3" />
                          {ROLE_LABELS[u.role] ?? u.role}
                        </span>
                      </td>

                      {/* Department */}
                      <td className="px-4 py-3.5 text-slate-300 text-xs">
                        {u.departments ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700/60 text-slate-300">
                            <Building2 className="w-2.5 h-2.5 text-slate-500" />
                            {u.departments.name}
                          </span>
                        ) : (
                          <span className="text-slate-600 font-italic">Unassigned</span>
                        )}
                      </td>

                      {/* Account Status Badge */}
                      <td className="px-4 py-3.5">
                        {isSuspended ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 text-[10px] font-bold uppercase tracking-wider">
                            <Lock className="w-2.5 h-2.5" /> Suspended
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Active
                          </span>
                        )}
                      </td>

                      {/* Row Actions */}
                      <td className="px-6 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Info Inspector */}
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Inspect User Details"
                            onClick={() => setInspectUser(u)}
                            className="w-7 h-7 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10"
                          >
                            <Info className="w-3.5 h-3.5" />
                          </Button>

                          {/* Lock / Unlock */}
                          <Button
                            variant="ghost"
                            size="icon"
                            title={isSuspended ? "Activate Account" : "Suspend Account"}
                            onClick={() => handleToggleStatus(u)}
                            disabled={u.id === currentUser?.id}
                            className={`w-7 h-7 ${isSuspended ? "text-rose-400 hover:bg-rose-500/15" : "text-slate-400 hover:text-amber-400 hover:bg-amber-500/10"}`}
                          >
                            {isSuspended ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                          </Button>

                          {/* Reset Password */}
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Reset Password"
                            onClick={() => {
                              setResetTarget(u);
                              setResetPasswordVal("");
                              setShowPassword(false);
                              setCopied(false);
                            }}
                            className="w-7 h-7 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10"
                          >
                            <Key className="w-3.5 h-3.5" />
                          </Button>

                          {/* Edit User */}
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Edit User"
                            onClick={() => {
                              setEditTarget(u);
                              setForm({ full_name: u.full_name, role: u.role, department_id: u.department_id ?? "", email: u.email, password: "" });
                            }}
                            className="w-7 h-7 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>

                          {/* Delete User */}
                          {u.id !== currentUser?.id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Delete User"
                              onClick={() => setDeleteTarget(u)}
                              disabled={deleting === u.id}
                              className="w-7 h-7 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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

      {/* ── User Inspector / Permission Drawer Modal ────────────────────────── */}
      <Dialog open={!!inspectUser} onOpenChange={(open) => { if (!open) setInspectUser(null); }}>
        <DialogContent className="bg-slate-900 border border-slate-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-400" />
              Account Authority & Permissions
            </DialogTitle>
          </DialogHeader>

          {inspectUser && (
            <div className="space-y-5 pt-2">
              {/* Profile Card */}
              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-black text-lg text-white shadow-lg">
                    {(inspectUser.full_name || "?").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-white">{inspectUser.full_name}</h3>
                      {inspectUser.status === "suspended" ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          Suspended
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 font-mono">{inspectUser.email}</p>
                    <p className="text-[11px] text-indigo-400 font-medium mt-0.5">
                      {inspectUser.departments?.name ? `${inspectUser.departments.name} Department` : "Global Scope"}
                    </p>
                  </div>
                </div>

                <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${ROLE_COLORS[inspectUser.role]}`}>
                  {ROLE_LABELS[inspectUser.role] ?? inspectUser.role}
                </span>
              </div>

              {/* Granted System Privileges */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Granted Privileges & Authority
                </p>
                <div className="space-y-1.5 bg-slate-950/50 p-3 rounded-xl border border-slate-800">
                  {(ROLE_PERMISSIONS[inspectUser.role] || []).map((perm) => (
                    <div key={perm} className="flex items-center gap-2 text-xs text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{perm}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Actions Grid */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Super Admin Management Actions
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const target = inspectUser;
                      setInspectUser(null);
                      setResetTarget(target);
                      setResetPasswordVal("");
                    }}
                    className="bg-slate-800 border-slate-700 text-amber-300 hover:bg-amber-500/10 text-xs gap-1.5 justify-start"
                  >
                    <Key className="w-3.5 h-3.5" /> Reset Password
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      handleToggleStatus(inspectUser);
                      setInspectUser(null);
                    }}
                    disabled={inspectUser.id === currentUser?.id}
                    className="bg-slate-800 border-slate-700 text-indigo-300 hover:bg-indigo-500/10 text-xs gap-1.5 justify-start"
                  >
                    {inspectUser.status === "suspended" ? <Unlock className="w-3.5 h-3.5 text-emerald-400" /> : <Lock className="w-3.5 h-3.5 text-rose-400" />}
                    {inspectUser.status === "suspended" ? "Reactivate Account" : "Suspend Account"}
                  </Button>
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setInspectUser(null)}
                  className="text-slate-400 hover:text-white"
                >
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Create User Dialog ──────────────────────────────────────────────── */}
      <Dialog open={showCreate} onOpenChange={(open) => { if (!open) setShowCreate(false); }}>
        <DialogContent className="bg-slate-900 border border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-indigo-400" />
              Create New System Account
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="px-6 pb-2 space-y-4">
              <Field label="Full Name">
                <Input className={darkInput} placeholder="e.g. Jane Mumba" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              </Field>
              <Field label="Email Address">
                <Input type="email" className={darkInput} placeholder="user@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </Field>
              <Field label="Initial Password">
                <Input type="password" className={darkInput} placeholder="Minimum 8 characters" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </Field>
              <Field label="Assigned Role Authority">
                <select className={`w-full h-9 px-3 rounded-lg text-sm border ${darkInput}`} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </Field>
              {form.role === "department_user" && (
                <Field label="Assigned Department">
                  <select className={`w-full h-9 px-3 rounded-lg text-sm border ${darkInput}`} value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}>
                    <option value="">— Unassigned —</option>
                    {departments.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.code})</option>)}
                  </select>
                </Field>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-white hover:bg-slate-800">
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Edit User Dialog ────────────────────────────────────────────────── */}
      <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open) setEditTarget(null); }}>
        <DialogContent className="bg-slate-900 border border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-indigo-400" />
              Edit Account Authority
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate}>
            <div className="px-6 pb-2 space-y-4">
              <Field label="Full Name">
                <Input className={darkInput} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              </Field>
              <Field label="Role Level">
                <select className={`w-full h-9 px-3 rounded-lg text-sm border ${darkInput}`} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </Field>
              <Field label="Department">
                <select className={`w-full h-9 px-3 rounded-lg text-sm border ${darkInput}`} value={form.department_id ?? ""} onChange={(e) => setForm({ ...form, department_id: e.target.value })}>
                  <option value="">— Unassigned —</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.code})</option>)}
                </select>
              </Field>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setEditTarget(null)} className="text-slate-400 hover:text-white hover:bg-slate-800">
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Reset Password Dialog ───────────────────────────────────────────── */}
      <Dialog open={!!resetTarget} onOpenChange={(open) => { if (!open) setResetTarget(null); }}>
        <DialogContent className="bg-slate-900 border border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <Key className="w-4 h-4 text-amber-400" />
              </div>
              Reset User Password
            </DialogTitle>
          </DialogHeader>
          {resetTarget && (
            <form onSubmit={handleResetPassword}>
              <div className="px-6 pb-2 space-y-4">
                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center font-bold text-indigo-400 text-sm">
                    {(resetTarget.full_name || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-semibold text-slate-200 truncate">{resetTarget.full_name}</p>
                    <p className="text-xs text-slate-400 font-mono truncate">{resetTarget.email}</p>
                  </div>
                </div>

                <Field label="New Secure Password">
                  <div className="relative flex items-center">
                    <Input
                      type={showPassword ? "text" : "password"}
                      className={`pr-20 ${darkInput}`}
                      placeholder="Enter new password"
                      value={resetPasswordVal}
                      onChange={(e) => setResetPasswordVal(e.target.value)}
                    />
                    <div className="absolute right-2 flex items-center gap-1">
                      {resetPasswordVal && (
                        <button
                          type="button"
                          onClick={handleCopyPassword}
                          title="Copy password"
                          className="p-1 text-slate-400 hover:text-white transition-colors"
                        >
                          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        title={showPassword ? "Hide password" : "Show password"}
                        className="p-1 text-slate-400 hover:text-white transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </Field>

                <div className="flex items-center justify-between pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={generateRandomPassword}
                    className="bg-slate-800 border-slate-700 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300 text-xs gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Generate Secure Password
                  </Button>
                  <span className="text-[11px] text-slate-500">Min 6 characters</span>
                </div>
              </div>

              <DialogFooter className="mt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setResetTarget(null)}
                  className="text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={resetting || !resetPasswordVal}
                  className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20"
                >
                  {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Reset"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ──────────────────────────────────────── */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="bg-slate-900 border border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
              </div>
              Confirm Account Deletion
            </DialogTitle>
          </DialogHeader>
          {deleteTarget && (
            <div className="space-y-4 pt-2">
              <p className="text-sm text-slate-300">
                Are you sure you want to permanently delete the user account for <strong className="text-white font-semibold">{deleteTarget.full_name}</strong> (<span className="font-mono text-slate-400">{deleteTarget.email}</span>)?
              </p>
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-900/50 text-xs text-rose-300 space-y-1">
                <p className="font-semibold text-rose-200">Permanent Action Warning</p>
                <p>This user will be erased from Supabase Auth and their profile will be removed. This cannot be undone.</p>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setDeleteTarget(null)}
                  className="text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={deleting === deleteTarget.id}
                  onClick={handleConfirmDelete}
                  className="bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-500/20 font-bold"
                >
                  {deleting === deleteTarget.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete Account"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
