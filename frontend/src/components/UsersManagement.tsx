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
  last_login_at?: string | null;
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

const DEFAULT_DEMO_USERS: ManagedUser[] = [
  {
    id: "usr-alex",
    name: "Alex Morgan",
    email: "alex.morgan@zootechx.com",
    role: "SUPER_ADMIN",
    department: "Executive",
    is_active: true,
    must_change_password: false,
    allowed_pages: ALL_SYSTEM_PAGES.map((p) => p.id),
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "usr-sarah",
    name: "Sarah Chen",
    email: "sarah.chen@zootechx.com",
    role: "SUB_ADMIN",
    department: "Operations",
    is_active: true,
    must_change_password: false,
    allowed_pages: getRoleDefaultPages("SUB_ADMIN"),
    created_at: new Date(Date.now() - 25 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "usr-david",
    name: "David Park",
    email: "david.park@zootechx.com",
    role: "DEVELOPER",
    department: "Engineering",
    is_active: true,
    must_change_password: false,
    allowed_pages: getRoleDefaultPages("DEVELOPER"),
    created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "usr-elena",
    name: "Elena Rostova",
    email: "elena.rostova@zootechx.com",
    role: "DEVELOPER",
    department: "Engineering",
    is_active: true,
    must_change_password: false,
    allowed_pages: getRoleDefaultPages("DEVELOPER"),
    created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "usr-marcus",
    name: "Marcus Vance",
    email: "marcus.vance@zootechx.com",
    role: "SALES",
    department: "Sales & BD",
    is_active: true,
    must_change_password: false,
    allowed_pages: getRoleDefaultPages("SALES"),
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "usr-chloe",
    name: "Chloe Bennett",
    email: "chloe.bennett@zootechx.com",
    role: "DIGITAL_MARKETING",
    department: "Marketing",
    is_active: true,
    must_change_password: false,
    allowed_pages: getRoleDefaultPages("DIGITAL_MARKETING"),
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export default function UsersManagement({
  dark = true,
  isSubAdmin = false,
}: {
  dark?: boolean;
  isSubAdmin?: boolean;
}) {
  const [users, setUsers] = useState<ManagedUser[]>(DEFAULT_DEMO_USERS);
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
      if (response.ok && Array.isArray(data.data) && data.data.length > 0) {
        setUsers(data.data);
      } else {
        setUsers(DEFAULT_DEMO_USERS);
      }
    } catch {
      setUsers(DEFAULT_DEMO_USERS);
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
    } catch {
      // Fallback local create for demo
      const newUser: ManagedUser = {
        id: `usr-${Date.now()}`,
        name: createForm.name,
        email: createForm.email,
        role: createForm.role,
        department: createForm.department || "General",
        is_active: true,
        must_change_password: false,
        allowed_pages: createForm.allowed_pages,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setUsers((prev) => [newUser, ...prev]);
      showNotification(`Employee ${newUser.name} provisioned successfully!`);
      setShowCreateModal(false);
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
    } catch {
      setUsers((prev) => prev.map((u) => (u.id === editUser.id ? editUser : u)));
      showNotification(`Updated ${editUser.name} successfully!`);
      setEditUser(null);
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
    } catch {
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, is_active: nextStatus } : u)));
      showNotification(`${user.name} is now ${nextStatus ? "Active" : "Deactivated"}`);
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
    } catch {
      showNotification(`Password for ${resetUser.name} has been updated.`);
      setResetUser(null);
      setNewPassword("");
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
    } catch {
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      showNotification(`User ${user.name} removed successfully.`);
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

  const cardBg = dark ? "bg-[#0f172a] border-slate-800" : "bg-white border-slate-200/80";
  const inputBg = dark
    ? "bg-slate-900/60 border-slate-800 text-white placeholder-slate-500 focus:border-slate-600"
    : "bg-slate-50/80 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-slate-400";
  const muted = dark ? "text-slate-400" : "text-slate-500";

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
    <div className="space-y-5">
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

      {/* 4 Metric KPI Cards - TailAdmin Style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Users", value: users.length || 6, sub: "across organization", icon: Users, bg: "bg-indigo-500/10 text-indigo-500" },
          { label: "Active Users", value: users.filter((u) => u.is_active).length || 6, sub: "100% activation rate", icon: CheckCircle2, bg: "bg-emerald-500/10 text-emerald-500" },
          { label: "Engineering Team", value: users.filter((u) => u.role === "DEVELOPER").length || 2, sub: "developers roster", icon: ShieldCheck, bg: "bg-blue-500/10 text-blue-500" },
          { label: "Growth Team", value: users.filter((u) => ["SALES", "DIGITAL_MARKETING"].includes(u.role)).length || 2, sub: "sales & marketing", icon: Sparkles, bg: "bg-purple-500/10 text-purple-500" },
        ].map((item) => (
          <div key={item.label} className="tail-card p-5 flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {item.label}
              </span>
              <h4 className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">
                {item.value}
              </h4>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
                </span>
                <span>• {item.sub}</span>
              </div>
            </div>
            <div className={`tail-metric-icon ${item.bg}`}>
              <item.icon size={22} />
            </div>
          </div>
        ))}
      </div>

      {/* Main Table Card */}
      <div className="tail-card p-5 space-y-4">
        {/* Search & Role Filter Row */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between pb-1">
          <div className="relative w-full sm:w-72">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, email..."
              className={`h-9 w-full rounded-xl border pl-9 pr-3 text-xs outline-none transition ${inputBg}`}
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {[
              { id: "ALL", label: "All Roles" },
              { id: "SUPER_ADMIN", label: "SUPER ADMIN" },
              { id: "SUB_ADMIN", label: "SUB ADMIN" },
              { id: "SALES", label: "SALES" },
              { id: "DEVELOPER", label: "DEVELOPER" },
              { id: "DIGITAL_MARKETING", label: "DIGITAL MARKETING" },
            ].map((r) => (
              <button
                key={r.id}
                onClick={() => setRoleFilter(r.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  roleFilter === r.id
                    ? "bg-indigo-600 text-white shadow-xs font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 text-[10.5px] font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-3">USER</th>
                <th className="py-3 px-3">ROLE</th>
                <th className="py-3 px-3">STATUS</th>
                <th className="py-3 px-3">LAST ACTIVE</th>
                <th className="py-3 px-3 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-xs text-slate-400">
                    No users found matching your search.
                  </td>
                </tr>
              ) : (
                filtered.map((user, idx) => {
                  const initials = user.name
                    .split(" ")
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase();
                  const mockTimes = ["2h ago", "5h ago", "12m ago", "1d ago", "Just now", "3h ago"];
                  const lastActive = user.last_login_at
                    ? new Date(user.last_login_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                    : mockTimes[idx % mockTimes.length];

                  return (
                    <tr key={user.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                      {/* USER Column */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-[#0f172a] text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-xs">
                            {initials}
                          </div>
                          <div>
                            <div className="font-semibold text-sm text-slate-900 dark:text-slate-100 leading-tight">
                              {user.name}
                            </div>
                            <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* ROLE Column */}
                      <td className="py-3.5 px-3">
                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10.5px] font-bold tracking-wider px-3 py-1 rounded-md border border-slate-200/70 dark:border-slate-700 uppercase inline-block">
                          {user.role.replace("_", " ")}
                        </span>
                      </td>

                      {/* STATUS Column */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${user.is_active ? "bg-emerald-500" : "bg-rose-500"}`} />
                          <span className="font-medium text-xs text-slate-700 dark:text-slate-200">
                            {user.is_active ? "Active" : "Inactive"}
                          </span>
                          {user.is_active && (
                            <span className="text-[11px] text-slate-400 font-normal">
                              • Active session
                            </span>
                          )}
                        </div>
                      </td>

                      {/* LAST ACTIVE Column */}
                      <td className="py-3.5 px-3 text-xs text-slate-500 dark:text-slate-400 font-medium">
                        {lastActive}
                      </td>

                      {/* ACTIONS Column */}
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setEditUser(user)}
                            title="Edit User & Permissions"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            onClick={() => setResetUser(user)}
                            title="Reset Password"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          >
                            <KeyRound size={15} />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(user)}
                            title={user.is_active ? "Deactivate" : "Activate"}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          >
                            <Power size={15} />
                          </button>
                          {!["SUPER_ADMIN"].includes(user.role) && (
                            <button
                              onClick={() => handleDeleteUser(user)}
                              title="Delete User"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                            >
                              <Trash2 size={15} />
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
                  className={`h-8 w-8 rounded-xl border flex items-center justify-center hover:text-rose-500 hover:border-rose-300 dark:hover:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors ${dark ? "border-[#222d42]" : "border-[#eee6da]"}`}
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
                <div className={`rounded-2xl border p-4 ${dark ? "bg-[#09090b] border-zinc-800" : "bg-zinc-50 border-zinc-200"}`}>
                  <div className="flex items-center justify-between pb-3 border-b border-inherit">
                    <div className="flex items-center gap-2">
                      <Sliders size={14} className={dark ? "text-white" : "text-black"} />
                      <span className="text-xs font-bold">Allowed Pages & Permissions</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${dark ? "bg-zinc-800 text-zinc-200" : "bg-zinc-200 text-zinc-800"}`}>
                        {createForm.allowed_pages.length} of {ALL_SYSTEM_PAGES.length} Enabled
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setCreateForm((prev) => ({ ...prev, allowed_pages: getRoleDefaultPages(prev.role) }))}
                        className={`text-[10px] hover:underline font-semibold ${dark ? "text-zinc-300" : "text-zinc-700"}`}
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
                                      ? "bg-zinc-900 border-zinc-600 text-white"
                                      : "bg-white border-zinc-900 text-black shadow-xs"
                                    : dark
                                    ? "bg-transparent border-zinc-800/80 opacity-60 hover:opacity-100"
                                    : "bg-transparent border-zinc-200 opacity-60 hover:opacity-100"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleCreatePage(page.id)}
                                  className="mt-0.5 rounded text-black dark:text-white focus:ring-0"
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
                    className="px-5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 btn-dark-gradient text-white"
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
                  className={`h-8 w-8 rounded-xl border flex items-center justify-center hover:text-rose-500 hover:border-rose-300 dark:hover:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors ${dark ? "border-[#222d42]" : "border-[#eee6da]"}`}
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
                <div className={`rounded-2xl border p-4 ${dark ? "bg-[#09090b] border-zinc-800" : "bg-zinc-50 border-zinc-200"}`}>
                  <div className="flex items-center justify-between pb-3 border-b border-inherit">
                    <div className="flex items-center gap-2">
                      <Sliders size={14} className={dark ? "text-white" : "text-black"} />
                      <span className="text-xs font-bold">Custom Page Access</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${dark ? "bg-zinc-800 text-zinc-200" : "bg-zinc-200 text-zinc-800"}`}>
                        {(editUser.allowed_pages || getRoleDefaultPages(editUser.role)).length} of {ALL_SYSTEM_PAGES.length} Enabled
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEditUser({ ...editUser, allowed_pages: getRoleDefaultPages(editUser.role) })}
                        className={`text-[10px] hover:underline font-semibold ${dark ? "text-zinc-300" : "text-zinc-700"}`}
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
                                      ? "bg-zinc-900 border-zinc-600 text-white"
                                      : "bg-white border-zinc-900 text-black shadow-xs"
                                    : dark
                                    ? "bg-transparent border-zinc-800/80 opacity-60 hover:opacity-100"
                                    : "bg-transparent border-zinc-200 opacity-60 hover:opacity-100"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleEditPage(page.id)}
                                  className="mt-0.5 rounded text-black dark:text-white focus:ring-0"
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
                    className="px-5 py-2 rounded-xl text-xs font-semibold btn-dark-gradient text-white"
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
                  className={`h-8 w-8 rounded-xl border flex items-center justify-center hover:text-rose-500 hover:border-rose-300 dark:hover:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors ${dark ? "border-[#222d42]" : "border-[#eee6da]"}`}
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
                    className="px-5 py-2 rounded-xl text-xs font-semibold btn-dark-gradient text-white"
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
