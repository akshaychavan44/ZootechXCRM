import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, UserPlus, Shield, KeyRound, CheckCircle2, AlertCircle,
  Search, X, Edit3, Trash2, Power, RefreshCw, Lock, Briefcase,
  CheckSquare, FileText, Check, ShieldCheck, Eye, Sparkles, Sliders
} from "lucide-react";
import { apiFetch } from "../lib/api";

export type UserRole = "SUPER_ADMIN" | "SUB_ADMIN" | "SALES" | "DEVELOPER" | "DIGITAL_MARKETING";

export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  is_active: boolean;
  must_change_password: boolean;
  allowed_pages?: string[];
  permissions?: Record<string, { read: boolean; write: boolean; delete?: boolean }>;
  created_at: string;
  updated_at: string;
}

export interface AppPermissionPage {
  id: string;
  label: string;
  category: "Core & CRM" | "Sales & SOW" | "Finance & Billing" | "Development" | "Marketing" | "Administration";
  description: string;
}

export const ALL_SYSTEM_PAGES: AppPermissionPage[] = [
  // Core & CRM
  { id: "dashboard", label: "Dashboard Overview", category: "Core & CRM", description: "Primary KPI metrics, charts & summary data" },
  { id: "clients", label: "Client Directory", category: "Core & CRM", description: "Customer accounts, company records & projects" },
  { id: "tasks", label: "Company Tasks", category: "Core & CRM", description: "Cross-functional task assignments & Kanban" },
  { id: "vault", label: "Credentials Vault", category: "Core & CRM", description: "Encrypted API keys, production logins & secrets" },

  // Sales & SOW
  { id: "leads", label: "Leads Pipeline", category: "Sales & SOW", description: "Inbound CRM leads, qualification stages & conversions" },
  { id: "followups", label: "Follow-ups", category: "Sales & SOW", description: "Scheduled client calls, reminders & overdue tracking" },
  { id: "quotations", label: "Quotations", category: "Sales & SOW", description: "Pricing estimates & client quotation proposals" },
  { id: "sows", label: "Scope of Work (SOW)", category: "Sales & SOW", description: "Enterprise SOW drafts, version history & public share links" },

  // Finance & Billing
  { id: "invoices", label: "Invoices & Billing", category: "Finance & Billing", description: "GST tax invoices, draft invoices & status" },
  { id: "invoices/new", label: "Create Invoice", category: "Finance & Billing", description: "Document builder to issue new tax invoices" },
  { id: "payments", label: "Payments Ledger", category: "Finance & Billing", description: "Payment records, reconciliation & balances" },
  { id: "expenses", label: "Company Expenses", category: "Finance & Billing", description: "Operating expenditures & expense tracking" },

  // Development
  { id: "projects", label: "Projects & Dev Workspace", category: "Development", description: "Assigned development sprints, progress updates & status" },
  { id: "developers", label: "Developers Roster", category: "Development", description: "Engineering team monitoring & project allocation" },
  { id: "issues", label: "Issue Tickets & Bugs", category: "Development", description: "Technical bug tracker & issue reporting" },
  { id: "updates", label: "Daily Standups", category: "Development", description: "Developer daily sprint updates & blockers" },

  // Marketing
  { id: "overview", label: "Marketing Overview", category: "Marketing", description: "Digital marketing campaign metrics, ROAS & pacing" },
  { id: "campaigns", label: "Marketing Campaigns", category: "Marketing", description: "Paid ad campaigns, budget pacing & targets" },
  { id: "assets", label: "Creatives & Assets", category: "Marketing", description: "Figma ads, copywriting hooks & visual decks" },
  { id: "mockups", label: "Ad Mockup Studio", category: "Marketing", description: "Google, LinkedIn & Meta live ad mockup previews" },

  // Administration
  { id: "users", label: "Team & User Management", category: "Administration", description: "Employee provisioning, roles & custom page access" },
  { id: "audit-logs", label: "System Audit Logs", category: "Administration", description: "Tamper-evident security history & event logs" },
  { id: "settings", label: "Company Settings", category: "Administration", description: "Global company profile & master SOW template" },
];

export function getRoleDefaultPages(role: UserRole): string[] {
  switch (role) {
    case "SUPER_ADMIN":
      return ALL_SYSTEM_PAGES.map((p) => p.id);
    case "SUB_ADMIN":
      return ["dashboard", "projects", "sows", "clients", "invoices", "tasks", "vault", "users", "leads", "expenses"];
    case "SALES":
      return ["dashboard", "leads", "followups", "clients", "quotations", "sows", "tasks"];
    case "DEVELOPER":
      return ["dashboard", "projects", "tasks", "issues", "updates", "vault"];
    case "DIGITAL_MARKETING":
      return ["dashboard", "overview", "clients", "campaigns", "assets", "mockups"];
    default:
      return ["dashboard"];
  }
}

const roleColors: Record<UserRole, { bg: string; text: string; border: string }> = {
  SUPER_ADMIN: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30" },
  SUB_ADMIN: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/30" },
  SALES: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30" },
  DEVELOPER: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" },
  DIGITAL_MARKETING: { bg: "bg-pink-500/10", text: "text-pink-400", border: "border-pink-500/30" },
};

export default function UsersManagement({
  dark = true,
  isSubAdmin = false
}: {
  dark?: boolean;
  isSubAdmin?: boolean;
}) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editUser, setEditUser] = useState<ManagedUser | null>(null);
  const [resetUser, setResetUser] = useState<ManagedUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);

  // Create Form State
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "SALES" as UserRole,
    department: "Sales & BD",
    allowed_pages: getRoleDefaultPages("SALES"),
    permissions: {} as Record<string, { read: boolean; write: boolean }>,
  });

  const showNotification = (message: string, type: "success" | "error" = "success") => {
    setNotice({ type, message });
    setTimeout(() => setNotice(null), 3500);
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await apiFetch("/api/users");
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to load users");
      setUsers(data.data || []);
    } catch (err) {
      showNotification(err instanceof Error ? err.message : "Unable to reach user service", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const handleRoleChangeCreate = (role: UserRole) => {
    const defaultPages = getRoleDefaultPages(role);
    const defaultDept =
      role === "DEVELOPER"
        ? "Engineering"
        : role === "SALES"
        ? "Sales & BD"
        : role === "DIGITAL_MARKETING"
        ? "Marketing"
        : role === "SUB_ADMIN"
        ? "Operations"
        : "Executive";

    setCreateForm((prev) => ({
      ...prev,
      role,
      department: defaultDept,
      allowed_pages: defaultPages,
    }));
  };

  const toggleCreatePage = (pageId: string) => {
    setCreateForm((prev) => {
      const exists = prev.allowed_pages.includes(pageId);
      const next = exists
        ? prev.allowed_pages.filter((p) => p !== pageId)
        : [...prev.allowed_pages, pageId];
      return { ...prev, allowed_pages: next };
    });
  };

  const toggleEditPage = (pageId: string) => {
    if (!editUser) return;
    const current = editUser.allowed_pages || getRoleDefaultPages(editUser.role);
    const exists = current.includes(pageId);
    const next = exists ? current.filter((p) => p !== pageId) : [...current, pageId];
    setEditUser({ ...editUser, allowed_pages: next });
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim() || !createForm.email.trim() || createForm.password.length < 6) {
      showNotification("Please provide a name, valid email, and password (min 6 chars)", "error");
      return;
    }
    setSaving(true);
    try {
      const response = await apiFetch("/api/users", {
        method: "POST",
        body: JSON.stringify(createForm),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to create user");
      showNotification(`Employee ${data.data.name} provisioned successfully!`);
      setShowCreateModal(false);
      setCreateForm({
        name: "",
        email: "",
        password: "",
        role: "SALES",
        department: "Sales & BD",
        allowed_pages: getRoleDefaultPages("SALES"),
        permissions: {},
      });
      await loadUsers();
    } catch (err) {
      showNotification(err instanceof Error ? err.message : "Failed to create employee", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    setSaving(true);
    try {
      const response = await apiFetch(`/api/users/${editUser.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editUser.name,
          role: editUser.role,
          department: editUser.department,
          is_active: editUser.is_active,
          allowed_pages: editUser.allowed_pages || getRoleDefaultPages(editUser.role),
          permissions: editUser.permissions || {},
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to update user");
      showNotification(`Updated ${editUser.name} successfully!`);
      setEditUser(null);
      await loadUsers();
    } catch (err) {
      showNotification(err instanceof Error ? err.message : "Update failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (user: ManagedUser) => {
    const nextStatus = !user.is_active;
    try {
      const response = await apiFetch(`/api/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: nextStatus }),
      });
      if (!response.ok) throw new Error("Status update failed");
      showNotification(`${user.name} is now ${nextStatus ? "Active" : "Deactivated"}`);
      await loadUsers();
    } catch (err) {
      showNotification(err instanceof Error ? err.message : "Status update failed", "error");
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUser || newPassword.length < 6) {
      showNotification("Password must be at least 6 characters", "error");
      return;
    }
    setSaving(true);
    try {
      const response = await apiFetch(`/api/users/${resetUser.id}/reset-password`, {
        method: "POST",
        body: JSON.stringify({ password: newPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Reset failed");
      showNotification(`Password for ${resetUser.name} has been updated.`);
      setResetUser(null);
      setNewPassword("");
    } catch (err) {
      showNotification(err instanceof Error ? err.message : "Failed to reset password", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (user: ManagedUser) => {
    if (!window.confirm(`Are you sure you want to remove account for ${user.name} (${user.email})?`)) return;
    try {
      const response = await apiFetch(`/api/users/${user.id}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to remove user");
      }
      showNotification(`User ${user.name} removed successfully.`);
      await loadUsers();
    } catch (err) {
      showNotification(err instanceof Error ? err.message : "Unable to delete user", "error");
    }
  };

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
      const q = query.toLowerCase().trim();
      const matchesQuery =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.department && u.department.toLowerCase().includes(q));
      return matchesRole && matchesQuery;
    });
  }, [users, roleFilter, query]);

  const cardBg = dark ? "bg-[#111622] border-[#222d42]" : "bg-white border-[#eee6da]";
  const inputBg = dark
    ? "bg-[#0d121d] border-[#222d42] text-[#f1f5f9] focus:border-[#cca45f]"
    : "bg-[#fbf7f0] border-[#e8dfd1] text-[#1c1917] focus:border-[#a07432]";
  const muted = dark ? "text-[#94a3b8]" : "text-[#78716c]";

  // Group pages by category for clean UI rendering
  const pageCategories = useMemo(() => {
    const cats: Record<string, AppPermissionPage[]> = {};
    ALL_SYSTEM_PAGES.forEach((p) => {
      if (!cats[p.category]) cats[p.category] = [];
      cats[p.category].push(p);
    });
    return cats;
  }, []);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      <AnimatePresence>
        {notice && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl text-white text-xs font-medium shadow-2xl ${
              notice.type === "success" ? "bg-emerald-600" : "bg-rose-600"
            }`}
          >
            {notice.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{notice.message}</span>
            <button onClick={() => setNotice(null)} className="ml-2 opacity-70 hover:opacity-100">
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className={`text-2xl font-bold tracking-tight ${dark ? "text-white" : "text-[#1c1917]"}`}>
              Employee & User Management
            </h1>
            {isSubAdmin && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/30">
                Sub-Admin Provisioning
              </span>
            )}
          </div>
          <p className={`text-xs mt-1 ${muted}`}>
            Create user logins, set individual credentials, and customize granular page access & read/write permissions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadUsers}
            disabled={loading}
            title="Refresh user list"
            className={`h-10 w-10 rounded-xl border flex items-center justify-center transition ${
              dark ? "border-[#222d42] hover:bg-white/5 text-[#cca45f]" : "border-[#eee6da] hover:bg-black/5 text-[#a07432]"
            }`}
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className={`h-10 px-4 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-md ${
              dark
                ? "bg-[#cca45f] text-black hover:bg-[#d8b26e]"
                : "bg-[#a07432] text-white hover:bg-[#8f6426]"
            }`}
          >
            <UserPlus size={15} />
            <span>Create New User</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Accounts", value: users.length, icon: Users, color: "text-[#cca45f]" },
          { label: "Active Employees", value: users.filter((u) => u.is_active).length, icon: Power, color: "text-emerald-400" },
          { label: "Developers", value: users.filter((u) => u.role === "DEVELOPER").length, icon: Briefcase, color: "text-blue-400" },
          { label: "Sales & Marketing", value: users.filter((u) => ["SALES", "DIGITAL_MARKETING"].includes(u.role)).length, icon: Shield, color: "text-pink-400" },
        ].map((kpi) => (
          <div key={kpi.label} className={`rounded-2xl border p-4 ${cardBg} shadow-sm relative overflow-hidden`}>
            <div className="flex items-center justify-between">
              <div className={`text-[11px] font-semibold uppercase tracking-wider ${muted}`}>{kpi.label}</div>
              <kpi.icon size={16} className={kpi.color} />
            </div>
            <div className={`mt-2 text-2xl font-bold mono ${kpi.color}`}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Search & Filters */}
      <div className={`rounded-2xl border p-3.5 flex flex-col sm:flex-row gap-3 items-center justify-between ${cardBg}`}>
        <div className="relative w-full sm:w-80">
          <Search size={15} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${muted}`} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, email, or department..."
            className={`h-9 w-full rounded-xl border pl-9 pr-3 text-xs outline-none ${inputBg}`}
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {["ALL", "SUPER_ADMIN", "SUB_ADMIN", "SALES", "DEVELOPER", "DIGITAL_MARKETING"].map((role) => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold whitespace-nowrap transition ${
                roleFilter === role
                  ? dark
                    ? "bg-[#cca45f] text-black shadow-sm font-bold"
                    : "bg-[#a07432] text-white shadow-sm font-bold"
                  : `${muted} hover:bg-white/5`
              }`}
            >
              {role === "ALL" ? "All Roles" : role.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className={`rounded-2xl border overflow-hidden ${cardBg} shadow-sm`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-xs">
            <thead className={`border-b ${dark ? "bg-[#171f30]/60 border-[#222d42]" : "bg-[#f5eddf]/50 border-[#eee6da]"} ${muted} uppercase tracking-wider text-[10px]`}>
              <tr>
                <th className="p-3.5">Employee Name & Email</th>
                <th className="p-3.5">Role</th>
                <th className="p-3.5">Department</th>
                <th className="p-3.5">Page Permissions</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Created Date</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${dark ? "divide-[#222d42]" : "divide-[#eee6da]"}`}>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className={`p-12 text-center text-xs ${muted}`}>
                    No employee accounts found matching your search.
                  </td>
                </tr>
              ) : (
                filtered.map((user) => {
                  const roleStyle = roleColors[user.role] || roleColors.DEVELOPER;
                  const allowed = user.allowed_pages || getRoleDefaultPages(user.role);
                  return (
                    <tr key={user.id} className={`hover:${dark ? "bg-white/[0.02]" : "bg-black/[0.01]"}`}>
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-xl flex items-center justify-center font-bold text-xs border ${
                            user.is_active
                              ? dark ? "bg-[#171f30] text-[#cca45f] border-[#cca45f]/30" : "bg-white text-[#a07432] border-[#a07432]/30"
                              : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                          }`}>
                            {user.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className={`font-semibold ${dark ? "text-[#f1f5f9]" : "text-[#1c1917]"}`}>{user.name}</div>
                            <div className={`text-[11px] mono ${muted}`}>{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${roleStyle.bg} ${roleStyle.text} ${roleStyle.border}`}>
                          {user.role.replace("_", " ")}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className={`font-medium ${dark ? "text-[#cbd5e1]" : "text-[#44403c]"}`}>{user.department || "General"}</span>
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5 flex-wrap max-w-[240px]">
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            {allowed.length} pages
                          </span>
                          <span className={`text-[10px] truncate ${muted}`} title={allowed.join(", ")}>
                            {allowed.slice(0, 3).join(", ")}{allowed.length > 3 ? "..." : ""}
                          </span>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <button
                          onClick={() => handleToggleStatus(user)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition border ${
                            user.is_active
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                              : "bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20"
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${user.is_active ? "bg-emerald-400 animate-pulse" : "bg-rose-400"}`} />
                          {user.is_active ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className={`p-3.5 text-[11px] mono ${muted}`}>
                        {new Date(user.created_at).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            title="Reset Password"
                            onClick={() => setResetUser(user)}
                            className={`p-1.5 rounded-lg border transition ${
                              dark ? "border-[#222d42] hover:bg-white/5 text-amber-400" : "border-[#eee6da] hover:bg-black/5 text-amber-600"
                            }`}
                          >
                            <KeyRound size={13} />
                          </button>
                          <button
                            title="Edit Permissions & Details"
                            onClick={() => setEditUser(user)}
                            className={`p-1.5 rounded-lg border transition ${
                              dark ? "border-[#222d42] hover:bg-white/5 text-blue-400" : "border-[#eee6da] hover:bg-black/5 text-blue-600"
                            }`}
                          >
                            <Edit3 size={13} />
                          </button>
                          {user.role !== "SUPER_ADMIN" && (
                            <button
                              title="Delete Account"
                              onClick={() => handleDeleteUser(user)}
                              className={`p-1.5 rounded-lg border transition ${
                                dark ? "border-[#222d42] hover:bg-rose-500/10 text-rose-400" : "border-[#eee6da] hover:bg-rose-50 text-rose-600"
                              }`}
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE EMPLOYEE MODAL */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`relative w-full max-w-[640px] my-8 rounded-3xl border p-6 shadow-2xl ${cardBg} z-10 max-h-[90vh] flex flex-col`}
            >
              <div className="flex items-center justify-between pb-4 border-b border-inherit">
                <div>
                  <h3 className={`font-bold text-base ${dark ? "text-white" : "text-[#1c1917]"}`}>Provision New User</h3>
                  <p className={`text-xs ${muted}`}>Set login credentials, role, and custom page permissions</p>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className={`h-8 w-8 rounded-xl border flex items-center justify-center ${dark ? "border-[#222d42]" : "border-[#eee6da]"}`}
                >
                  <X size={15} />
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="space-y-4 pt-4 overflow-y-auto pr-1 flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={`text-[11px] font-semibold ${muted}`}>Full Name *</label>
                    <input
                      required
                      value={createForm.name}
                      onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                      placeholder="e.g. Sara Mitchell"
                      className={`mt-1.5 w-full h-10 rounded-xl border px-3 text-xs outline-none ${inputBg}`}
                    />
                  </div>

                  <div>
                    <label className={`text-[11px] font-semibold ${muted}`}>Work Email *</label>
                    <input
                      required
                      type="email"
                      value={createForm.email}
                      onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                      placeholder="sara@zootechx.com"
                      className={`mt-1.5 w-full h-10 rounded-xl border px-3 text-xs outline-none ${inputBg}`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className={`text-[11px] font-semibold ${muted}`}>Temporary Password *</label>
                    <input
                      required
                      type="text"
                      value={createForm.password}
                      onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                      placeholder="UserSecret123!"
                      className={`mt-1.5 w-full h-10 rounded-xl border px-3 text-xs mono outline-none ${inputBg}`}
                    />
                  </div>

                  <div>
                    <label className={`text-[11px] font-semibold ${muted}`}>System Role *</label>
                    <select
                      value={createForm.role}
                      onChange={(e) => handleRoleChangeCreate(e.target.value as UserRole)}
                      className={`mt-1.5 w-full h-10 rounded-xl border px-3 text-xs outline-none ${inputBg}`}
                    >
                      <option value="SALES">Sales Representative</option>
                      <option value="DEVELOPER">Developer / Engineer</option>
                      <option value="DIGITAL_MARKETING">Digital Marketing</option>
                      <option value="SUB_ADMIN">Sub Admin</option>
                      {!isSubAdmin && <option value="SUPER_ADMIN">Super Admin</option>}
                    </select>
                  </div>

                  <div>
                    <label className={`text-[11px] font-semibold ${muted}`}>Department</label>
                    <input
                      value={createForm.department}
                      onChange={(e) => setCreateForm({ ...createForm, department: e.target.value })}
                      placeholder="Department name"
                      className={`mt-1.5 w-full h-10 rounded-xl border px-3 text-xs outline-none ${inputBg}`}
                    />
                  </div>
                </div>

                {/* Granular Page Permissions Checkboxes */}
                <div className={`rounded-2xl border p-4 ${dark ? "bg-[#0d121d] border-[#222d42]" : "bg-[#fbf7f0] border-[#eee6da]"}`}>
                  <div className="flex items-center justify-between pb-3 border-b border-inherit">
                    <div className="flex items-center gap-2">
                      <Sliders size={14} className="text-[#cca45f]" />
                      <span className="text-xs font-bold">Allowed Pages & Permissions</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#cca45f]/15 text-[#cca45f]">
                        {createForm.allowed_pages.length} of {ALL_SYSTEM_PAGES.length} Enabled
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setCreateForm((prev) => ({ ...prev, allowed_pages: getRoleDefaultPages(prev.role) }))}
                        className="text-[10px] text-[#cca45f] hover:underline font-semibold"
                      >
                        Role Defaults
                      </button>
                      <span className="opacity-30">•</span>
                      <button
                        type="button"
                        onClick={() => setCreateForm((prev) => ({ ...prev, allowed_pages: ALL_SYSTEM_PAGES.map((p) => p.id) }))}
                        className="text-[10px] text-indigo-400 hover:underline font-semibold"
                      >
                        Select All
                      </button>
                      <span className="opacity-30">•</span>
                      <button
                        type="button"
                        onClick={() => setCreateForm((prev) => ({ ...prev, allowed_pages: [] }))}
                        className="text-[10px] text-rose-400 hover:underline font-semibold"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 space-y-4 max-h-[220px] overflow-y-auto pr-1">
                    {Object.entries(pageCategories).map(([category, pages]) => (
                      <div key={category}>
                        <div className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${muted}`}>
                          {category}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {pages.map((page) => {
                            const isChecked = createForm.allowed_pages.includes(page.id);
                            return (
                              <label
                                key={page.id}
                                className={`flex items-start gap-2.5 p-2 rounded-xl border cursor-pointer transition text-xs select-none ${
                                  isChecked
                                    ? dark
                                      ? "bg-[#171f30] border-[#cca45f]/40 text-white"
                                      : "bg-white border-[#a07432]/40 text-[#1c1917]"
                                    : dark
                                    ? "bg-transparent border-[#222d42] opacity-60 hover:opacity-100"
                                    : "bg-transparent border-[#eee6da] opacity-60 hover:opacity-100"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleCreatePage(page.id)}
                                  className="mt-0.5 rounded text-[#cca45f] focus:ring-0"
                                />
                                <div className="min-w-0">
                                  <div className="font-semibold leading-tight">{page.label}</div>
                                  <div className={`text-[10px] leading-tight mt-0.5 truncate ${muted}`}>
                                    {page.description}
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 flex gap-2 justify-end border-t border-inherit">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold border ${dark ? "border-[#222d42]" : "border-[#eee6da]"}`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className={`px-5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                      dark ? "bg-[#cca45f] text-black font-bold" : "bg-[#a07432] text-white font-bold"
                    }`}
                  >
                    {saving ? <RefreshCw size={14} className="animate-spin" /> : <UserPlus size={14} />}
                    <span>Create User Account</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT USER & PERMISSIONS MODAL */}
      <AnimatePresence>
        {editUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setEditUser(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`relative w-full max-w-[640px] my-8 rounded-3xl border p-6 shadow-2xl ${cardBg} z-10 max-h-[90vh] flex flex-col`}
            >
              <div className="flex items-center justify-between pb-4 border-b border-inherit">
                <div>
                  <h3 className={`font-bold text-base ${dark ? "text-white" : "text-[#1c1917]"}`}>
                    Edit User: {editUser.name}
                  </h3>
                  <p className={`text-xs ${muted}`}>Update role, department, and custom allowed pages</p>
                </div>
                <button
                  onClick={() => setEditUser(null)}
                  className={`h-8 w-8 rounded-xl border flex items-center justify-center ${dark ? "border-[#222d42]" : "border-[#eee6da]"}`}
                >
                  <X size={15} />
                </button>
              </div>

              <form onSubmit={handleUpdateUser} className="space-y-4 pt-4 overflow-y-auto pr-1 flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={`text-[11px] font-semibold ${muted}`}>Full Name</label>
                    <input
                      value={editUser.name}
                      onChange={(e) => setEditUser({ ...editUser, name: e.target.value })}
                      className={`mt-1.5 w-full h-10 rounded-xl border px-3 text-xs outline-none ${inputBg}`}
                    />
                  </div>

                  <div>
                    <label className={`text-[11px] font-semibold ${muted}`}>Work Email</label>
                    <input
                      disabled
                      value={editUser.email}
                      className={`mt-1.5 w-full h-10 rounded-xl border px-3 text-xs outline-none opacity-60 ${inputBg}`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={`text-[11px] font-semibold ${muted}`}>Role</label>
                    <select
                      value={editUser.role}
                      onChange={(e) => {
                        const newRole = e.target.value as UserRole;
                        setEditUser({
                          ...editUser,
                          role: newRole,
                          allowed_pages: getRoleDefaultPages(newRole),
                        });
                      }}
                      className={`mt-1.5 w-full h-10 rounded-xl border px-3 text-xs outline-none ${inputBg}`}
                    >
                      <option value="DEVELOPER">Developer</option>
                      <option value="SALES">Sales / BD</option>
                      <option value="SUB_ADMIN">Sub Admin</option>
                      <option value="DIGITAL_MARKETING">Digital Marketing</option>
                      {!isSubAdmin && <option value="SUPER_ADMIN">Super Admin</option>}
                    </select>
                  </div>
                  <div>
                    <label className={`text-[11px] font-semibold ${muted}`}>Department</label>
                    <input
                      value={editUser.department}
                      onChange={(e) => setEditUser({ ...editUser, department: e.target.value })}
                      className={`mt-1.5 w-full h-10 rounded-xl border px-3 text-xs outline-none ${inputBg}`}
                    />
                  </div>
                </div>

                {/* Granular Page Permissions Checkboxes */}
                <div className={`rounded-2xl border p-4 ${dark ? "bg-[#0d121d] border-[#222d42]" : "bg-[#fbf7f0] border-[#eee6da]"}`}>
                  <div className="flex items-center justify-between pb-3 border-b border-inherit">
                    <div className="flex items-center gap-2">
                      <Sliders size={14} className="text-[#cca45f]" />
                      <span className="text-xs font-bold">Custom Page Access</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#cca45f]/15 text-[#cca45f]">
                        {(editUser.allowed_pages || getRoleDefaultPages(editUser.role)).length} of {ALL_SYSTEM_PAGES.length} Enabled
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEditUser({ ...editUser, allowed_pages: getRoleDefaultPages(editUser.role) })}
                        className="text-[10px] text-[#cca45f] hover:underline font-semibold"
                      >
                        Reset Defaults
                      </button>
                      <span className="opacity-30">•</span>
                      <button
                        type="button"
                        onClick={() => setEditUser({ ...editUser, allowed_pages: ALL_SYSTEM_PAGES.map((p) => p.id) })}
                        className="text-[10px] text-indigo-400 hover:underline font-semibold"
                      >
                        All
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 space-y-4 max-h-[220px] overflow-y-auto pr-1">
                    {Object.entries(pageCategories).map(([category, pages]) => (
                      <div key={category}>
                        <div className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${muted}`}>
                          {category}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {pages.map((page) => {
                            const isChecked = (editUser.allowed_pages || getRoleDefaultPages(editUser.role)).includes(page.id);
                            return (
                              <label
                                key={page.id}
                                className={`flex items-start gap-2.5 p-2 rounded-xl border cursor-pointer transition text-xs select-none ${
                                  isChecked
                                    ? dark
                                      ? "bg-[#171f30] border-[#cca45f]/40 text-white"
                                      : "bg-white border-[#a07432]/40 text-[#1c1917]"
                                    : dark
                                    ? "bg-transparent border-[#222d42] opacity-60 hover:opacity-100"
                                    : "bg-transparent border-[#eee6da] opacity-60 hover:opacity-100"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleEditPage(page.id)}
                                  className="mt-0.5 rounded text-[#cca45f] focus:ring-0"
                                />
                                <div className="min-w-0">
                                  <div className="font-semibold leading-tight">{page.label}</div>
                                  <div className={`text-[10px] leading-tight mt-0.5 truncate ${muted}`}>
                                    {page.description}
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 flex gap-2 justify-end border-t border-inherit">
                  <button
                    type="button"
                    onClick={() => setEditUser(null)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold border ${dark ? "border-[#222d42]" : "border-[#eee6da]"}`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className={`px-5 py-2 rounded-xl text-xs font-semibold ${dark ? "bg-[#cca45f] text-black font-bold" : "bg-[#a07432] text-white font-bold"}`}
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* RESET PASSWORD MODAL */}
      <AnimatePresence>
        {resetUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setResetUser(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`relative w-full max-w-[440px] rounded-3xl border p-6 shadow-2xl ${cardBg} z-10`}
            >
              <div className="flex items-center justify-between pb-4 border-b border-inherit">
                <h3 className={`font-bold text-base ${dark ? "text-white" : "text-[#1c1917]"}`}>Reset Password</h3>
                <button
                  onClick={() => setResetUser(null)}
                  className={`h-8 w-8 rounded-xl border flex items-center justify-center ${dark ? "border-[#222d42]" : "border-[#eee6da]"}`}
                >
                  <X size={15} />
                </button>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-4 pt-4">
                <p className={`text-xs ${muted}`}>
                  Assign a new personal password for <strong>{resetUser.name}</strong> ({resetUser.email}).
                </p>

                <div>
                  <label className={`text-[11px] font-semibold ${muted}`}>New Password *</label>
                  <input
                    required
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="NewSecret123!"
                    className={`mt-1.5 w-full h-10 rounded-xl border px-3 text-xs mono outline-none ${inputBg}`}
                  />
                </div>

                <div className="pt-3 flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setResetUser(null)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold border ${dark ? "border-[#222d42]" : "border-[#eee6da]"}`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className={`px-5 py-2 rounded-xl text-xs font-semibold ${dark ? "bg-[#cca45f] text-black font-bold" : "bg-[#a07432] text-white font-bold"}`}
                  >
                    Update Password
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
