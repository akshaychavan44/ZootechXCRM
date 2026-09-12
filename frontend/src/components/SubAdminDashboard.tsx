import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, CreditCard, Calculator, Users,
  BellRing, Briefcase, KeyRound, Plus, RefreshCw,
  Search, ShieldCheck, Sun, Moon, LogOut, CheckCircle2, AlertCircle, X, Megaphone,
  LayoutDashboard, TrendingUp, ArrowUpRight, Clock, Wallet, Menu, ChevronDown, Bell, Settings
} from "lucide-react";
import { apiFetch } from "../lib/api";
import DeveloperWorkspace from "./DeveloperWorkspace";
import CredentialsVault from "./CredentialsVault";
import ScopeOfWorkWorkspace from "./ScopeOfWorkWorkspace";
import UniversalTasksWorkspace from "./UniversalTasksWorkspace";
import DigitalMarketingWorkspace from "./DigitalMarketingWorkspace";
import UsersManagement from "./UsersManagement";
import ZootechXLogo from "./ZootechXLogo";

interface SubAdminDashboardProps {
  onLogout: () => void;
  dark?: boolean;
  onToggleTheme?: () => void;
  currentUser?: any;
}

type Client = {
  id: string;
  name: string;
  company: string | null;
  phone: string | null;
  email?: string | null;
  projects?: Array<{ id: string; title: string; name: string; status: string; category?: string; budget?: number; deadline?: string }>;
};
type Invoice = { id: string; invoice_number: string; total: string | number; paid_amount: string | number; client_name: string; due_date?: string };
type Expense = { id: string; title: string; category: string; amount: string | number; expense_date?: string; payment_method?: string };
type Payment = { id: string; invoice_number: string; amount: string | number; method: string };
type Lead = { id: string; full_name: string; company: string | null; email: string | null; phone: string | null; status: string };
type Followup = { id: string; lead_name: string; type: string; followup_date: string; followup_time: string | null; status: string };

export default function SubAdminDashboard({ onLogout, dark: propDark, onToggleTheme, currentUser }: SubAdminDashboardProps) {
  const [page, setPage] = useState<"dashboard" | "users" | "invoices" | "sows" | "tasks" | "expenses" | "leads" | "clients" | "developers" | "vault">("dashboard");
  const [dark, setDark] = useState<boolean>(() => {
    if (propDark !== undefined) return propDark;
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("zootechx_theme");
      if (saved) return saved === "dark";
    }
    return true;
  });

  useEffect(() => {
    if (propDark !== undefined) {
      setDark(propDark);
    }
  }, [propDark]);

  const handleToggleTheme = () => {
    const nextDark = !dark;
    setDark(nextDark);
    if (typeof window !== "undefined") {
      localStorage.setItem("zootechx_theme", nextDark ? "dark" : "light");
      if (nextDark) {
        document.documentElement.classList.add("dark");
        document.documentElement.classList.remove("light");
      } else {
        document.documentElement.classList.remove("dark");
        document.documentElement.classList.add("light");
      }
    }
    if (onToggleTheme) {
      onToggleTheme();
    }
  };

  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 3000);
    return () => clearTimeout(timer);
  }, [notice]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [subAdminSearch, setSubAdminSearch] = useState("");
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  // Data
  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [followups, setFollowups] = useState<Followup[]>([]);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const searchContainerRef = React.useRef<HTMLDivElement>(null);
  const userMenuRef = React.useRef<HTMLDivElement>(null);
  const notifContainerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
      if (notifContainerRef.current && !notifContainerRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchMatches = useMemo(() => {
    const q = subAdminSearch.trim().toLowerCase();
    if (!q) return { leads: [], clients: [], invoices: [] };
    return {
      leads: leads.filter(l => (l.full_name || "").toLowerCase().includes(q) || (l.company || "").toLowerCase().includes(q) || (l.email || "").toLowerCase().includes(q)).slice(0, 4),
      clients: clients.filter(c => (c.name || "").toLowerCase().includes(q) || (c.company || "").toLowerCase().includes(q) || (c.email || "").toLowerCase().includes(q)).slice(0, 4),
      invoices: invoices.filter(i => (i.invoice_number || "").toLowerCase().includes(q) || (i.client_name || "").toLowerCase().includes(q)).slice(0, 4),
    };
  }, [subAdminSearch, leads, clients, invoices]);

  // Sub-view forms
  const [showAddInvoiceModal, setShowAddInvoiceModal] = useState(false);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [showAddClientModal, setShowAddClientModal] = useState(false);

  const [clientForm, setClientForm] = useState({ name: "", company: "", phone: "", email: "" });
  const [invoiceForm, setInvoiceForm] = useState({
    invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
    clientId: "",
    total: "",
    paidAmount: "0",
    dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  });

  const handleOpenAddInvoiceModal = () => {
    setInvoiceForm({
      invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
      clientId: "",
      total: "",
      paidAmount: "0",
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    });
    setShowAddInvoiceModal(true);
  };

  const getClientDisplayName = (inv: Invoice) => {
    if (inv.client_name && inv.client_name !== "Client") return inv.client_name;
    const match = clients.find((c) => c.id === (inv as any).client_id);
    if (match) return match.company || match.name;
    return inv.client_name || "Direct Client";
  };
  const [expenseForm, setExpenseForm] = useState({
    title: "",
    category: "Operations",
    amount: "",
    expenseDate: new Date().toISOString().slice(0, 10),
    paymentMethod: "UPI",
    description: "",
  });

  const load = async () => {
    setLoading(true);
    try {
      const [cRes, iRes, eRes, pRes, lRes, fRes] = await Promise.all([
        apiFetch("/api/clients"),
        apiFetch("/api/invoices"),
        apiFetch("/api/expenses"),
        apiFetch("/api/payments"),
        apiFetch("/api/leads"),
        apiFetch("/api/followups"),
      ]);

      const [c, i, e, p, l, f] = await Promise.all([
        cRes.json(),
        iRes.json(),
        eRes.json(),
        pRes.json(),
        lRes.json(),
        fRes.json(),
      ]);

      if (cRes.ok) setClients(c.data || []);
      if (iRes.ok) setInvoices(i.data || []);
      if (eRes.ok) setExpenses(e.data || []);
      if (pRes.ok) setPayments(p.data || []);
      if (lRes.ok) setLeads(l.data || []);
      if (fRes.ok) setFollowups(f.data || []);
    } catch {
      setNotice("Failed to load records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => void load(), 12000);
    return () => window.clearInterval(interval);
  }, []);

  const handleUpdateFollowupStatus = async (followupId: string, newStatus: string) => {
    setFollowups((prev) =>
      prev.map((f) => (f.id === followupId ? { ...f, status: newStatus } : f))
    );
    try {
      const res = await apiFetch(`/api/followups/${followupId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      setNotice(`Follow-up status updated to ${newStatus}`);
    } catch {
      setNotice("Failed to update status");
      void load();
    }
  };

  const saveRecord = async (path: string, body: unknown, onSuccess: () => void) => {
    setSaving(true);
    setNotice("");
    try {
      const response = await apiFetch(path, {
        method: "POST",
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to save record");
      if (path === "/api/invoices" && data.data) {
        setInvoices((prev) => [data.data, ...prev.filter((i) => i.id !== data.data.id)]);
      }
      onSuccess();
      setNotice("Record successfully saved.");
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to save record");
    } finally {
      setSaving(false);
    }
  };

  // Summary Metrics
  const totalBilled = useMemo(() => invoices.reduce((s, i) => s + Number(i.total || 0), 0), [invoices]);
  const totalPaid = useMemo(() => invoices.reduce((s, i) => s + Number(i.paid_amount || 0), 0), [invoices]);
  const pendingAmount = Math.max(0, totalBilled - totalPaid);
  const totalExpenses = useMemo(() => expenses.reduce((s, e) => s + Number(e.amount || 0), 0), [expenses]);
  const pendingFollowups = useMemo(() => followups.filter((f) => f.status !== "COMPLETED"), [followups]);

  // Professional SaaS Theme Palette matching screenshot
  const bgMain = dark ? "bg-[#090d16] text-slate-100" : "bg-[#f8fafc] text-slate-900";
  const bgSidebar = dark ? "bg-[#0c1017] border-slate-800 text-slate-300" : "bg-white border-slate-200/80 text-slate-700";
  const bgCard = dark ? "bg-[#0f172a] border-slate-800 text-white shadow-sm" : "bg-white border-slate-200/80 text-slate-900 shadow-sm";
  const inputBg = dark ? "bg-slate-900/60 border-slate-800 text-white placeholder-slate-500" : "bg-slate-50/80 border-slate-200 text-slate-900 placeholder-slate-400";
  const mutedText = dark ? "text-slate-400" : "text-slate-500";

  if (page === "developers") {
    return <DeveloperWorkspace admin subAdmin dark={dark} onBack={() => setPage("invoices")} onToggleTheme={handleToggleTheme} />;
  }

  type SubAdminNavLink = {
    id: "dashboard" | "users" | "invoices" | "sows" | "tasks" | "expenses" | "leads" | "clients" | "developers";
    label: string;
    icon: React.ComponentType<any>;
    badge?: number;
  };

  const navLinks: SubAdminNavLink[] = [
    { id: "dashboard", label: "Operations Command", icon: LayoutDashboard },
    { id: "users", label: "Team & Users", icon: Users },
    { id: "invoices", label: "Invoices & Billing", icon: FileText, badge: invoices.length },
    { id: "sows", label: "Scope of Work (SOW)", icon: FileText },
    { id: "tasks", label: "Company Tasks", icon: ShieldCheck },
    { id: "expenses", label: "Expenses", icon: Calculator, badge: expenses.length },
    { id: "leads", label: "Shared Leads & Follow-ups", icon: Briefcase, badge: leads.length },
    { id: "clients", label: "Client Directory", icon: Briefcase, badge: clients.length },
    { id: "developers", label: "Developers & Projects", icon: Briefcase },
  ];

  return (
    <div className={`luxury-app role-shell subadmin-shell ${dark ? "dark-theme" : "light-theme"} h-screen w-full overflow-hidden flex flex-row ${bgMain} font-sans antialiased transition-colors duration-200`}>
      {/* SIDEBAR */}
      <aside className={`w-[260px] shrink-0 ${sidebarOpen ? "hidden md:flex" : "hidden"} flex-col ${bgSidebar} border-r h-screen z-20 select-none transition-all duration-300`}>
        {/* Brand */}
        <div className={`px-4 py-3.5 border-b ${dark ? "border-slate-800" : "border-slate-200/80"} flex items-center justify-between`}>
          <ZootechXLogo variant="full" size="sm" dark={dark} subtitle="SUB-ADMIN PORTAL" />
        </div>

        <div className="px-3.5 pt-4 pb-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8] dark:text-slate-500">MENU</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {navLinks.map((item) => {
            const active = page === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setPage(item.id as any)}
                aria-current={active ? "page" : undefined}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
                  active
                    ? dark
                      ? "bg-[#3758F9]/15 text-[#5475F9] font-semibold shadow-xs"
                      : "bg-[#ECF2FE] text-[#3758F9] font-semibold shadow-xs"
                    : dark
                      ? "text-slate-400 hover:text-white hover:bg-slate-800/60"
                      : "text-[#475467] hover:text-[#1D2939] hover:bg-[#F2F4F7]"
                }`}
              >
                <item.icon size={17} className={active ? (dark ? "text-[#5475F9]" : "text-[#3758F9]") : (dark ? "text-slate-400" : "text-[#667085]")} />
                <span className="flex-1 text-left truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer actions */}
        <div className={`p-3 border-t ${dark ? "border-slate-800" : "border-slate-200/80"} space-y-2`}>
          <div className={`flex items-center gap-2.5 px-3 py-2 rounded-xl ${dark ? "bg-slate-800/40 border border-slate-800" : "bg-slate-50 border border-slate-200/80"}`}>
            <div className={`h-8 w-8 rounded-lg font-bold flex items-center justify-center text-xs shrink-0 ${dark ? "bg-white text-black" : "bg-slate-900 text-white"} shadow-2xs`}>
              {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : "S"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className={`text-xs font-bold truncate leading-tight ${dark ? "text-white" : "text-slate-900"}`}>{currentUser?.name || "Sub Admin"}</p>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              </div>
              <p className="text-[10px] truncate leading-tight text-slate-500 dark:text-slate-400">{currentUser?.email || "subadmin@zootechx.com"}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition"
          >
            <LogOut size={15} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* MAIN VIEWPORT */}
      <div className="flex-1 min-w-0 h-screen flex flex-col overflow-hidden">
        {/* HEADER - Exact TailAdmin Layout matching demo.tailadmin.com */}
        <header className={`w-full h-[68px] shrink-0 border-b flex items-center justify-between gap-4 px-4 sm:px-6 transition-colors duration-200 relative z-30 ${
          dark
            ? "bg-[#090d16] border-slate-800 text-white shadow-[0_2px_12px_-2px_rgba(0,0,0,0.3)]"
            : "bg-white border-slate-200/90 text-slate-900 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.04)]"
        }`}>
          {/* Left: Sidebar Collapse Toggle + Search Bar */}
          <div className="flex items-center gap-3.5 flex-1 max-w-[500px]">
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="h-10 w-10 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-2xs transition shrink-0"
              title="Toggle Sidebar"
            >
              <Menu size={18} />
            </button>

            <div ref={searchContainerRef} className="flex items-center flex-1 relative">
              <Search size={16} className={`absolute left-3.5 ${subAdminSearch ? "text-amber-500" : "text-slate-400"} transition-colors pointer-events-none`} />
              <input
                value={subAdminSearch}
                onFocus={() => setIsSearchOpen(true)}
                onChange={(e) => { setSubAdminSearch(e.target.value); setIsSearchOpen(true); }}
                placeholder="Search or type command..."
                className={`w-full h-10 pl-10 pr-14 rounded-xl border text-sm transition-all outline-none shadow-2xs ${
                  dark
                    ? "bg-slate-900/90 border-slate-800 text-slate-100 placeholder-slate-500 focus:border-amber-500/80 focus:bg-slate-900 focus:ring-2 focus:ring-amber-500/20"
                    : "bg-slate-50/70 border-slate-200/90 text-slate-900 placeholder-slate-400 hover:bg-slate-50 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15"
                }`}
              />
              {subAdminSearch ? (
                <button
                  type="button"
                  onClick={() => { setSubAdminSearch(""); setIsSearchOpen(false); }}
                  className="absolute right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-md transition"
                  title="Clear search"
                >
                  <X size={13} />
                </button>
              ) : (
                <span className="absolute right-3 text-[11px] font-mono text-slate-400 border border-slate-200 dark:border-slate-700/60 rounded px-1.5 py-0.5 bg-white dark:bg-slate-800 pointer-events-none">
                  ⌘K
                </span>
              )}

              {subAdminSearch && isSearchOpen && (
                <div className={`absolute top-12 left-0 w-full rounded-2xl border shadow-2xl z-30 max-h-[320px] overflow-auto ${bgCard} p-2`}>
                  {searchMatches.leads.length > 0 && (
                    <div>
                      <div className={`px-2 pt-1 pb-1.5 text-[10px] font-semibold uppercase tracking-widest ${mutedText}`}>Leads</div>
                      {searchMatches.leads.map(lead => (
                        <button key={lead.id} onClick={() => { setPage("leads"); setSubAdminSearch(""); setIsSearchOpen(false); }} className={`w-full text-left p-2.5 rounded-xl flex items-center gap-3 hover:${dark ? "bg-white/5" : "bg-slate-50"}`}>
                          <div className="h-8 w-8 rounded-full bg-amber-600 text-white flex items-center justify-center text-[11px] font-bold">
                            {lead.full_name ? lead.full_name.charAt(0) : "L"}
                          </div>
                          <div>
                            <div className="text-[13px] font-medium">{lead.full_name}</div>
                            <div className={`text-[11px] ${mutedText}`}>{lead.company || lead.email}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {searchMatches.clients.length > 0 && (
                    <div>
                      <div className={`px-2 pt-2 pb-1.5 text-[10px] font-semibold uppercase tracking-widest ${mutedText}`}>Clients</div>
                      {searchMatches.clients.map(client => (
                        <button key={client.id} onClick={() => { setPage("clients"); setSubAdminSearch(""); setIsSearchOpen(false); }} className={`w-full text-left p-2.5 rounded-xl flex items-center gap-3 hover:${dark ? "bg-white/5" : "bg-slate-50"}`}>
                          <div className="h-8 w-8 rounded-xl bg-emerald-600/10 text-emerald-400 flex items-center justify-center">
                            <Briefcase size={14} />
                          </div>
                          <div>
                            <div className="text-[13px] font-medium">{client.name}</div>
                            <div className={`text-[11px] ${mutedText}`}>{client.company || client.email}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {searchMatches.invoices.length > 0 && (
                    <div>
                      <div className={`px-2 pt-2 pb-1.5 text-[10px] font-semibold uppercase tracking-widest ${mutedText}`}>Invoices</div>
                      {searchMatches.invoices.map(invoice => (
                        <button key={invoice.id} onClick={() => { setPage("invoices"); setSubAdminSearch(""); setIsSearchOpen(false); }} className={`w-full text-left p-2.5 rounded-xl flex items-center gap-3 hover:${dark ? "bg-white/5" : "bg-slate-50"}`}>
                          <div className="h-8 w-8 rounded-xl bg-amber-600/10 text-amber-400 flex items-center justify-center">
                            <FileText size={14} />
                          </div>
                          <div>
                            <div className="text-[13px] font-medium">{invoice.client_name}</div>
                            <div className={`text-[11px] ${mutedText}`}>{invoice.invoice_number} · ₹{Number(invoice.total).toLocaleString()}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {searchMatches.leads.length === 0 && searchMatches.clients.length === 0 && searchMatches.invoices.length === 0 && (
                    <div className={`p-3 text-[13px] ${mutedText}`}>No matching records found</div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex-1" />

          {/* Right: Actions, Theme Toggle, Notifications, Profile */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => void load()}
              title="Refresh Operations"
              className="h-10 w-10 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 shadow-2xs transition shrink-0"
            >
              <RefreshCw size={15} className={loading ? "animate-spin text-amber-500" : ""} />
            </button>

            {/* Circular Theme Toggle Button (TailAdmin style) */}
            <button
              onClick={handleToggleTheme}
              title={dark ? "Switch to Day Mode" : "Switch to Night Mode"}
              className="h-10 w-10 rounded-full border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 shadow-2xs transition shrink-0"
            >
              {dark ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-slate-600" />}
            </button>

            {/* Circular Notification Bell with Orange Dot (TailAdmin style) */}
            <div ref={notifContainerRef} className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                title="Notifications"
                aria-label="View notifications"
                className="h-10 w-10 rounded-full border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 shadow-2xs relative transition shrink-0"
              >
                <Bell size={18} />
                {pendingFollowups.length > 0 && (
                  <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#f97316] ring-2 ring-white dark:ring-slate-900" />
                )}
              </button>
              {notifOpen && (
                <div className={`absolute right-0 top-12 w-[340px] rounded-2xl border shadow-2xl z-40 ${bgCard} overflow-hidden`}>
                  <div className={`p-4 border-b ${dark ? "border-slate-800" : "border-slate-100"}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="font-bold text-[14px]">Operational Alerts</div>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30">
                          ACTIVE
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400">{pendingFollowups.length} pending</span>
                    </div>
                  </div>
                  <div className="max-h-[300px] overflow-auto divide-y divide-slate-100 dark:divide-slate-800">
                    {pendingFollowups.slice(0, 6).map((f) => (
                      <div key={f.id} onClick={() => { setPage("leads"); setNotifOpen(false); }} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition flex items-start gap-2.5">
                        <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">{f.lead_name}</p>
                          <p className="text-[11px] text-slate-400 truncate">{f.type} · {f.followup_date}</p>
                        </div>
                      </div>
                    ))}
                    {pendingFollowups.length === 0 && (
                      <div className="p-6 text-center text-xs text-slate-400">All follow-ups clear 🎉</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Pill (TailAdmin style: avatar + name + chevron) */}
            <div ref={userMenuRef} className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2.5 pl-2 py-1 pr-1.5 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800/60 transition group"
              >
                <div className="w-10 h-10 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold text-sm flex items-center justify-center overflow-hidden shrink-0 shadow-xs ring-1 ring-slate-900/10 dark:ring-white/20">
                  {currentUser?.name ? currentUser.name.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase() : "SA"}
                </div>
                <span className="hidden sm:inline text-sm font-semibold text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white transition">
                  {currentUser?.name?.split(" ")[0] || "Sub Admin"}
                </span>
                <ChevronDown size={15} className={`text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-transform duration-200 ${userDropdownOpen ? "rotate-180" : ""}`} />
              </button>
              {userDropdownOpen && (
                <div className={`absolute right-0 top-12 w-56 rounded-2xl border shadow-2xl z-30 p-2 ${bgCard}`}>
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{currentUser?.name || "Sub Admin"}</p>
                    <p className="text-[11px] text-slate-400 truncate">{currentUser?.email || "subadmin@zootechx.com"}</p>
                  </div>
                  <button
                    onClick={() => { setPage("users"); setUserDropdownOpen(false); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:${dark ? "bg-white/5" : "bg-slate-100"} transition`}
                  >
                    <Settings size={14} />
                    <span>Team & Settings</span>
                  </button>
                  <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                  <button
                    onClick={() => { setUserDropdownOpen(false); onLogout(); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-500 hover:bg-rose-500/10 transition"
                  >
                    <LogOut size={14} />
                    <span>Sign out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* CONTENT */}
        <main className={`flex-1 h-full overflow-y-auto p-6 lg:p-8 space-y-6 ${bgMain}`}>
          {notice && (
            <div className="flex items-center justify-between rounded-2xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-3 text-xs font-semibold text-indigo-300">
              <div className="flex items-center gap-2">
                <AlertCircle size={15} />
                <span>{notice}</span>
              </div>
              <button onClick={() => setNotice("")} className="opacity-70 hover:opacity-100">
                <X size={14} />
              </button>
            </div>
          )}

          {/* TAB: OPERATIONS COMMAND DASHBOARD */}
          {page === "dashboard" && (
            <div className="space-y-6 max-w-[1600px] mx-auto w-full">
              {/* Welcome & Quick Action Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className={`text-2xl font-bold tracking-tight ${dark ? "text-white" : "text-slate-900"}`}>
                    Operations Command
                  </h3>
                  <p className={`text-xs mt-1 ${mutedText}`}>
                    Executive overview of financial flow, follow-up queues, and corporate operations.
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleOpenAddInvoiceModal}
                    className="flex h-9 items-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 px-3.5 text-xs font-semibold text-white shadow-sm transition"
                  >
                    <Plus size={14} />
                    <span>Create Invoice</span>
                  </button>
                  <button
                    onClick={() => setShowAddExpenseModal(true)}
                    className={`flex h-9 items-center gap-2 rounded-xl border px-3.5 text-xs font-semibold transition ${
                      dark ? "border-[#222d42] bg-[#171f30] text-slate-200 hover:bg-[#1e293b]" : "border-[#e5dcd0] bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <Plus size={14} />
                    <span>Log Expense</span>
                  </button>
                  <button
                    onClick={() => setShowAddClientModal(true)}
                    className={`flex h-9 items-center gap-2 rounded-xl border px-3.5 text-xs font-semibold transition ${
                      dark ? "border-[#222d42] bg-[#171f30] text-slate-200 hover:bg-[#1e293b]" : "border-[#e5dcd0] bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <Plus size={14} />
                    <span>Add Client</span>
                  </button>
                  <button
                    onClick={() => setPage("users")}
                    className={`flex h-9 items-center gap-2 rounded-xl border px-3.5 text-xs font-semibold transition ${
                      dark ? "border-indigo-500/40 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20" : "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                    }`}
                  >
                    <Users size={14} />
                    <span>Provision User</span>
                  </button>
                </div>
              </div>

              {/* 4 TailAdmin KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {/* Metric 1: Total Invoiced */}
                <div className="tail-card p-5 md:p-6">
                  <div className="tail-metric-icon mb-5">
                    <TrendingUp size={24} className="text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Invoiced</p>
                  <div className="mt-3 flex items-end justify-between">
                    <h4 className="text-2xl lg:text-3xl font-bold text-slate-800 dark:text-white font-mono">
                      ₹{totalBilled.toLocaleString("en-IN")}
                    </h4>
                    <div className="flex items-center gap-1.5">
                      <span className="tail-badge-success">{invoices.length} inv</span>
                    </div>
                  </div>
                </div>

                {/* Metric 2: Pending Settlements */}
                <div className="tail-card p-5 md:p-6">
                  <div className="tail-metric-icon mb-5">
                    <Clock size={24} className="text-amber-600 dark:text-amber-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Pending Dues</p>
                  <div className="mt-3 flex items-end justify-between">
                    <h4 className="text-2xl lg:text-3xl font-bold text-slate-800 dark:text-white font-mono">
                      ₹{pendingAmount.toLocaleString("en-IN")}
                    </h4>
                    <div className="flex items-center gap-1.5">
                      <span className={pendingAmount > 0 ? "tail-badge-warning" : "tail-badge-success"}>
                        {pendingAmount > 0 ? "Pending" : "Cleared"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Metric 3: Operating Expenses */}
                <div className="tail-card p-5 md:p-6">
                  <div className="tail-metric-icon mb-5">
                    <Wallet size={24} className="text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Operating Expenses</p>
                  <div className="mt-3 flex items-end justify-between">
                    <h4 className="text-2xl lg:text-3xl font-bold text-slate-800 dark:text-white font-mono">
                      ₹{totalExpenses.toLocaleString("en-IN")}
                    </h4>
                    <div className="flex items-center gap-1.5">
                      <span className="tail-badge-info">{expenses.length} logs</span>
                    </div>
                  </div>
                </div>

                {/* Metric 4: Corporate Accounts */}
                <div className="tail-card p-5 md:p-6">
                  <div className="tail-metric-icon mb-5">
                    <Users size={24} className="text-cyan-600 dark:text-cyan-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Active Clients</p>
                  <div className="mt-3 flex items-end justify-between">
                    <h4 className="text-2xl lg:text-3xl font-bold text-slate-800 dark:text-white font-mono">
                      {clients.length}
                    </h4>
                    <div className="flex items-center gap-1.5">
                      <span className="tail-badge-info">{leads.length} leads</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Content Grid: Left 60% / Right 40% */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Side: Billing & Expenses (7 cols) */}
                <div className="lg:col-span-7 space-y-6">
                  {/* Recent Invoices Card */}
                  <div className={`rounded-2xl border p-5 ${bgCard}`}>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className={`text-sm font-bold ${dark ? "text-white" : "text-slate-900"}`}>Recent Billing Activity</h4>
                        <p className={`text-[11px] ${mutedText}`}>Latest client invoices and payment status</p>
                      </div>
                      <button
                        onClick={() => setPage("invoices")}
                        className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                      >
                        <span>View Invoices</span>
                        <ArrowUpRight size={13} />
                      </button>
                    </div>

                    {invoices.length === 0 ? (
                      <div className="py-8 text-center">
                        <FileText size={28} className={`mx-auto mb-2 opacity-30 ${mutedText}`} />
                        <p className={`text-xs ${mutedText}`}>No invoices issued yet</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className={`border-b ${dark ? "border-[#1e293b] text-slate-400" : "border-slate-200 text-slate-500"}`}>
                              <th className="pb-2 font-semibold">Invoice #</th>
                              <th className="pb-2 font-semibold">Client</th>
                              <th className="pb-2 font-semibold text-right">Amount</th>
                              <th className="pb-2 font-semibold text-right">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-inherit">
                            {invoices.slice(0, 5).map((inv) => {
                              const total = Number(inv.total || 0);
                              const paid = Number(inv.paid_amount || 0);
                              const isPaid = paid >= total && total > 0;
                              const isPartial = paid > 0 && paid < total;

                              return (
                                <tr key={inv.id} className={`hover:bg-white/[0.02] transition`}>
                                  <td className="py-2.5 font-mono font-medium">{inv.invoice_number}</td>
                                  <td className="py-2.5 font-medium truncate max-w-[140px]">{getClientDisplayName(inv)}</td>
                                  <td className="py-2.5 font-mono text-right font-semibold">₹{total.toLocaleString("en-IN")}</td>
                                  <td className="py-2.5 text-right">
                                    <span
                                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                        isPaid
                                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                          : isPartial
                                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                          : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                      }`}
                                    >
                                      {isPaid ? "Paid" : isPartial ? "Partial" : "Pending"}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Recent Operating Expenses */}
                  <div className={`rounded-2xl border p-5 ${bgCard}`}>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className={`text-sm font-bold ${dark ? "text-white" : "text-slate-900"}`}>Operating Outflows</h4>
                        <p className={`text-[11px] ${mutedText}`}>Recent office and administrative expenditures</p>
                      </div>
                      <button
                        onClick={() => setPage("expenses")}
                        className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                      >
                        <span>All Expenses</span>
                        <ArrowUpRight size={13} />
                      </button>
                    </div>

                    {expenses.length === 0 ? (
                      <div className="py-8 text-center">
                        <Calculator size={28} className={`mx-auto mb-2 opacity-30 ${mutedText}`} />
                        <p className={`text-xs ${mutedText}`}>No expenses logged yet</p>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {expenses.slice(0, 4).map((exp) => (
                          <div
                            key={exp.id}
                            className={`flex items-center justify-between p-3 rounded-xl border ${
                              dark ? "border-zinc-800 bg-[#09090b]" : "border-zinc-200 bg-zinc-50"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-indigo-500/10 text-indigo-400 font-bold text-xs">
                                ₹
                              </div>
                              <div>
                                <div className="text-xs font-semibold leading-tight">{exp.title}</div>
                                <div className={`text-[10px] mt-0.5 ${mutedText}`}>
                                  {exp.category} • {exp.payment_method || "UPI"} • {exp.expense_date || "Recent"}
                                </div>
                              </div>
                            </div>
                            <div className="text-right font-mono text-xs font-bold text-rose-400">
                              -₹{Number(exp.amount || 0).toLocaleString("en-IN")}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Side: Actionable Follow-up Queue & Clients (5 cols) */}
                <div className="lg:col-span-5 space-y-6">
                  {/* Actionable Follow-up Queue */}
                  <div className={`rounded-2xl border p-5 ${bgCard}`}>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className={`text-sm font-bold ${dark ? "text-white" : "text-slate-900"}`}>Follow-up Queue</h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            {pendingFollowups.length}
                          </span>
                        </div>
                        <p className={`text-[11px] ${mutedText}`}>Client & partner pending touches</p>
                      </div>
                      <button
                        onClick={() => setPage("leads")}
                        className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                      >
                        <span>View Leads</span>
                        <ArrowUpRight size={13} />
                      </button>
                    </div>

                    {pendingFollowups.length === 0 ? (
                      <div className="py-8 text-center">
                        <CheckCircle2 size={28} className="mx-auto mb-2 text-emerald-400/60" />
                        <p className="text-xs font-medium text-emerald-400">All follow-ups are up to date</p>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {pendingFollowups.slice(0, 4).map((f) => (
                          <div
                            key={f.id}
                            className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                              dark ? "border-zinc-800 bg-[#09090b]" : "border-zinc-200 bg-zinc-50"
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-semibold truncate">{f.lead_name}</div>
                              <div className={`text-[10px] mt-0.5 flex items-center gap-2 ${mutedText}`}>
                                <span className="capitalize">{f.type || "Call"}</span>
                                <span>•</span>
                                <span>{f.followup_date}</span>
                                {f.followup_time && <span>({f.followup_time})</span>}
                              </div>
                            </div>
                            <button
                              onClick={() => handleUpdateFollowupStatus(f.id, "COMPLETED")}
                              title="Mark as completed"
                              className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition shrink-0"
                            >
                              Complete
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Corporate Client Directory Snapshot */}
                  <div className={`rounded-2xl border p-5 ${bgCard}`}>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className={`text-sm font-bold ${dark ? "text-white" : "text-slate-900"}`}>Corporate Accounts</h4>
                        <p className={`text-[11px] ${mutedText}`}>Managed business clients</p>
                      </div>
                      <button
                        onClick={() => setPage("clients")}
                        className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                      >
                        <span>All Clients</span>
                        <ArrowUpRight size={13} />
                      </button>
                    </div>

                    {clients.length === 0 ? (
                      <div className="py-8 text-center">
                        <Briefcase size={28} className={`mx-auto mb-2 opacity-30 ${mutedText}`} />
                        <p className={`text-xs ${mutedText}`}>No corporate clients registered</p>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {clients.slice(0, 4).map((c) => (
                          <div
                            key={c.id}
                            className={`flex items-center justify-between p-3 rounded-xl border ${
                              dark ? "border-zinc-800 bg-[#09090b]" : "border-zinc-200 bg-zinc-50"
                            }`}
                          >
                            <div>
                              <div className="text-xs font-semibold">{c.name}</div>
                              <div className={`text-[10px] mt-0.5 ${mutedText}`}>
                                {c.company || "Individual"} {c.phone ? `• ${c.phone}` : ""}
                              </div>
                            </div>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-500/10 border border-slate-500/20">
                              {c.projects?.length || 0} Projects
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: INVOICES */}
          {page === "invoices" && (
            <div className="space-y-6 max-w-[1600px] mx-auto w-full">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className={`text-xl font-bold ${dark ? "text-white" : "text-slate-900"}`}>Invoices & Billing</h3>
                  <p className={`text-xs mt-1 ${mutedText}`}>Manage company billing and client payment records.</p>
                </div>
                <button
                  onClick={handleOpenAddInvoiceModal}
                  className="flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-semibold text-white shadow hover:bg-indigo-700"
                >
                  <Plus size={16} />
                  <span>Create Invoice</span>
                </button>
              </div>

              <div className={`overflow-hidden rounded-3xl border ${bgCard} shadow-sm`}>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px]">
                    <thead className={`border-b border-inherit ${dark ? "bg-white/5 text-slate-400" : "bg-slate-100 text-slate-600"} text-[11px] uppercase tracking-wider font-bold`}>
                      <tr>
                        <th className="p-3.5 text-left">Invoice No</th>
                        <th className="p-3.5 text-left">Client Name</th>
                        <th className="p-3.5 text-right">Total Amount</th>
                        <th className="p-3.5 text-right">Paid Amount</th>
                        <th className="p-3.5 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y border-inherit">
                      {invoices.map((inv) => {
                        const isPaid = Number(inv.paid_amount) >= Number(inv.total);
                        return (
                          <tr key={inv.id} className={`hover:${dark ? "bg-[#171f30]/60" : "bg-[#f6f1e7]"} transition`}>
                            <td className={`p-3.5 text-xs font-mono font-semibold ${dark ? "text-white" : "text-black"}`}>{inv.invoice_number}</td>
                            <td className={`p-3.5 text-xs font-medium ${dark ? "text-white" : "text-black"}`}>{getClientDisplayName(inv)}</td>
                            <td className={`p-3.5 text-xs font-mono font-bold text-right ${dark ? "text-white" : "text-black"}`}>
                              ₹{Number(inv.total).toLocaleString()}
                            </td>
                            <td className={`p-3.5 text-xs font-mono text-right font-semibold ${dark ? "text-emerald-400" : "text-emerald-600 font-bold"}`}>
                              ₹{Number(inv.paid_amount).toLocaleString()}
                            </td>
                            <td className="p-3.5">
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                                  isPaid
                                    ? (dark ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-emerald-50 text-emerald-700 border-emerald-300")
                                    : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                }`}
                              >
                                <span className={`h-1.5 w-1.5 rounded-full ${
                                  isPaid ? "bg-emerald-400" : "bg-amber-400"
                                }`} />
                                {isPaid ? "Paid" : "Pending"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: EXPENSES */}
          {page === "expenses" && (
            <div className="space-y-6 max-w-[1600px] mx-auto w-full">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className={`text-xl font-bold ${dark ? "text-white" : "text-slate-900"}`}>Company Expenses</h3>
                  <p className={`text-xs mt-1 ${mutedText}`}>Track operating costs and internal cash outflows.</p>
                </div>
                <button
                  onClick={() => setShowAddExpenseModal(true)}
                  className="flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-semibold text-white shadow hover:bg-indigo-700"
                >
                  <Plus size={16} />
                  <span>Log Expense</span>
                </button>
              </div>

              <div className={`overflow-hidden rounded-3xl border ${bgCard} shadow-sm`}>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px]">
                    <thead className={`border-b border-inherit ${dark ? "bg-white/5 text-slate-400" : "bg-slate-100 text-slate-600"} text-[11px] uppercase tracking-wider font-bold`}>
                      <tr>
                        <th className="p-3.5 text-left">Expense Title</th>
                        <th className="p-3.5 text-left">Category</th>
                        <th className="p-3.5 text-left">Payment Method</th>
                        <th className="p-3.5 text-left">Date</th>
                        <th className="p-3.5 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y border-inherit">
                      {expenses.map((e) => (
                        <tr key={e.id} className={`hover:${dark ? "bg-white/5" : "bg-slate-50"} transition`}>
                          <td className={`p-3.5 text-xs font-semibold ${dark ? "text-white" : "text-slate-900"}`}>{e.title}</td>
                          <td className={`p-3.5 text-xs ${dark ? "text-slate-200" : "text-slate-800"}`}>{e.category}</td>
                          <td className={`p-3.5 text-xs ${dark ? "text-slate-200" : "text-slate-800"}`}>{e.payment_method || "UPI"}</td>
                          <td className={`p-3.5 text-xs font-mono ${dark ? "text-slate-200" : "text-slate-800"}`}>
                            {e.expense_date ? new Date(e.expense_date).toLocaleDateString() : "—"}
                          </td>
                          <td className="p-3.5 text-xs font-mono font-bold text-right text-amber-400">
                            ₹{Number(e.amount).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SHARED LEADS & FOLLOW-UPS */}
          {page === "leads" && (
            <div className="space-y-6 max-w-[1600px] mx-auto w-full">
              <h3 className={`text-xl font-bold ${dark ? "text-white" : "text-slate-900"}`}>Shared Leads & Follow-ups Queue</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className={`rounded-3xl border p-5 ${bgCard}`}>
                  <h4 className={`font-bold text-sm mb-3 ${dark ? "text-white" : "text-slate-900"}`}>Recent Leads</h4>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {leads.map((l) => (
                      <div key={l.id} className={`p-3 rounded-2xl ${dark ? "bg-white/5" : "bg-slate-100"} text-xs flex justify-between items-center`}>
                        <div>
                          <div className={`font-bold ${dark ? "text-white" : "text-slate-900"}`}>{l.full_name}</div>
                          <div className={mutedText}>{l.company || l.phone}</div>
                        </div>
                        <span className="rounded-full bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 text-[10px] font-bold text-indigo-400">
                          {l.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={`rounded-3xl border p-5 ${bgCard}`}>
                  <h4 className={`font-bold text-sm mb-3 ${dark ? "text-white" : "text-slate-900"}`}>Follow-up Schedule</h4>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {followups.map((f) => (
                      <div key={f.id} className={`p-3 rounded-2xl ${dark ? "bg-white/5" : "bg-slate-100"} text-xs flex justify-between items-center`}>
                        <div>
                          <div className={`font-bold ${dark ? "text-white" : "text-slate-900"}`}>{f.lead_name}</div>
                          <div className={`font-mono ${mutedText}`}>
                            {f.type} • {f.followup_date}
                          </div>
                        </div>
                        <select
                          value={f.status}
                          onChange={(e) => void handleUpdateFollowupStatus(f.id, e.target.value)}
                          className={`h-7 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border cursor-pointer outline-none transition ${
                            f.status === "Completed"
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                              : f.status === "Converted"
                              ? "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30"
                              : f.status === "Contacted"
                              ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30"
                              : f.status === "Overdue"
                              ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
                              : f.status === "Rescheduled"
                              ? "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30"
                              : f.status === "Cancelled"
                              ? "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30"
                              : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                          }`}
                        >
                          <option value="Scheduled" className={dark ? "bg-[#121826] text-white" : "bg-white text-black"}>Scheduled</option>
                          <option value="Contacted" className={dark ? "bg-[#121826] text-white" : "bg-white text-black"}>Contacted</option>
                          <option value="Completed" className={dark ? "bg-[#121826] text-white" : "bg-white text-black"}>Completed</option>
                          <option value="Converted" className={dark ? "bg-[#121826] text-white" : "bg-white text-black"}>Converted</option>
                          <option value="Rescheduled" className={dark ? "bg-[#121826] text-white" : "bg-white text-black"}>Rescheduled</option>
                          <option value="Cancelled" className={dark ? "bg-[#121826] text-white" : "bg-white text-black"}>Cancelled</option>
                          <option value="Overdue" className={dark ? "bg-[#121826] text-white" : "bg-white text-black"}>Overdue</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: CLIENTS */}
          {page === "clients" && (
            <div className="space-y-6 max-w-[1600px] mx-auto w-full">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className={`text-xl font-bold ${dark ? "text-white" : "text-slate-900"}`}>Client Directory</h3>
                  <p className={`text-xs mt-1 ${mutedText}`}>Registered businesses and customer accounts.</p>
                </div>
                <button
                  onClick={() => setShowAddClientModal(true)}
                  className="flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-semibold text-white shadow hover:bg-indigo-700"
                >
                  <Plus size={16} />
                  <span>Add Client</span>
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {clients.map((c) => (
                  <div key={c.id} className={`rounded-3xl border p-5 ${bgCard}`}>
                    <div className={`font-bold text-sm ${dark ? "text-white" : "text-slate-900"}`}>{c.company || c.name}</div>
                    <div className={`text-xs mt-0.5 ${mutedText}`}>{c.name}</div>
                    <div className={`mt-3 text-xs ${mutedText}`}>Phone: {c.phone || "—"}</div>
                    {c.projects && c.projects.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-inherit">
                        <div className={`text-[10px] font-semibold uppercase tracking-wider ${mutedText} mb-1.5`}>
                          Active Projects ({c.projects.length})
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {c.projects.map((p) => (
                            <span
                              key={p.id}
                              className={`px-2 py-0.5 rounded-lg text-[10px] font-medium ${
                                dark
                                  ? "bg-zinc-900 text-zinc-300 border border-zinc-700"
                                  : "bg-zinc-100 text-zinc-800 border border-zinc-300"
                              }`}
                            >
                              {p.title || p.name} • <span className="font-bold">{p.status}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: SCOPE OF WORK */}
          {page === "sows" && (
            <div className="max-w-[1600px] mx-auto w-full">
              <ScopeOfWorkWorkspace dark={dark} />
            </div>
          )}

          {/* TAB 8: COMPANY TASKS */}
          {page === "tasks" && (
            <div className="max-w-[1600px] mx-auto w-full">
              <UniversalTasksWorkspace dark={dark} canCreate={true} canUpdateStatus={true} />
            </div>
          )}

          {/* TAB: TEAM & USER MANAGEMENT */}
          {page === "users" && (
            <div className="max-w-[1600px] mx-auto w-full">
              <UsersManagement dark={dark} isSubAdmin={true} />
            </div>
          )}
        </main>
      </div>

      {/* MODAL: ADD INVOICE */}
      <AnimatePresence>
        {showAddInvoiceModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => setShowAddInvoiceModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className={`relative w-full max-w-lg rounded-3xl border p-6 shadow-2xl ${bgCard}`}>
              <div className="flex items-center justify-between mb-4 border-b border-inherit pb-3">
                <h3 className="font-bold text-base">Create Invoice</h3>
                <button onClick={() => setShowAddInvoiceModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"><X size={18}/></button>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const selectedClient = clients.find((c) => c.id === invoiceForm.clientId);
                  const clientName = selectedClient ? (selectedClient.company || selectedClient.name) : undefined;
                  void saveRecord(
                    "/api/invoices",
                    {
                      invoiceNumber: invoiceForm.invoiceNumber,
                      clientId: invoiceForm.clientId,
                      clientName,
                      total: Number(invoiceForm.total),
                      paidAmount: Number(invoiceForm.paidAmount),
                      dueDate: new Date(invoiceForm.dueDate).toISOString(),
                    },
                    () => {
                      setShowAddInvoiceModal(false);
                      setInvoiceForm({
                        invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
                        clientId: "",
                        total: "",
                        paidAmount: "0",
                        dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
                      });
                    }
                  );
                }}
                className="space-y-3"
              >
                <div>
                  <label className="block text-xs font-semibold mb-1">Invoice Number</label>
                  <input required value={invoiceForm.invoiceNumber} onChange={(e) => setInvoiceForm({ ...invoiceForm, invoiceNumber: e.target.value })} className={`h-10 w-full rounded-xl border px-3 text-xs outline-none ${inputBg}`} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Select Client *</label>
                  <select required value={invoiceForm.clientId} onChange={(e) => setInvoiceForm({ ...invoiceForm, clientId: e.target.value })} className={`h-10 w-full rounded-xl border px-3 text-xs outline-none ${inputBg}`}>
                    <option value="">Choose client...</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.company || c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Total (₹) *</label>
                    <input required min="1" type="number" value={invoiceForm.total} onChange={(e) => setInvoiceForm({ ...invoiceForm, total: e.target.value })} className={`h-10 w-full rounded-xl border px-3 text-xs outline-none ${inputBg}`} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Amount Paid (₹)</label>
                    <input min="0" type="number" value={invoiceForm.paidAmount} onChange={(e) => setInvoiceForm({ ...invoiceForm, paidAmount: e.target.value })} className={`h-10 w-full rounded-xl border px-3 text-xs outline-none ${inputBg}`} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Due Date</label>
                  <input required type="date" value={invoiceForm.dueDate} onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })} className={`h-10 w-full rounded-xl border px-3 text-xs outline-none ${inputBg}`} />
                </div>
                <div className="pt-3 flex justify-end gap-2">
                  <button type="button" onClick={() => setShowAddInvoiceModal(false)} className="h-9 px-4 rounded-xl border border-inherit text-xs font-semibold">Cancel</button>
                  <button type="submit" disabled={saving || clients.length === 0} className="h-9 px-5 rounded-xl bg-indigo-600 text-xs font-semibold text-white shadow hover:bg-indigo-700 disabled:opacity-50">
                    {saving ? "Saving..." : "Create Invoice"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: RECORD EXPENSE */}
      <AnimatePresence>
        {showAddExpenseModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => setShowAddExpenseModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className={`relative w-full max-w-lg rounded-3xl border p-6 shadow-2xl ${bgCard}`}>
              <div className="flex items-center justify-between mb-4 border-b border-inherit pb-3">
                <h3 className="font-bold text-base">Record Expense</h3>
                <button onClick={() => setShowAddExpenseModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"><X size={18}/></button>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void saveRecord(
                    "/api/expenses",
                    {
                      ...expenseForm,
                      amount: Number(expenseForm.amount),
                    },
                    () => setShowAddExpenseModal(false)
                  );
                }}
                className="space-y-3"
              >
                <div>
                  <label className="block text-xs font-semibold mb-1">Expense Title *</label>
                  <input required value={expenseForm.title} onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })} placeholder="e.g. AWS Server Hosting" className={`h-10 w-full rounded-xl border px-3 text-xs outline-none ${inputBg}`} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Category</label>
                    <input required value={expenseForm.category} onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })} placeholder="Hosting, Office, Salary..." className={`h-10 w-full rounded-xl border px-3 text-xs outline-none ${inputBg}`} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Amount (₹) *</label>
                    <input required min="1" type="number" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} className={`h-10 w-full rounded-xl border px-3 text-xs outline-none ${inputBg}`} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Payment Method</label>
                    <select value={expenseForm.paymentMethod} onChange={(e) => setExpenseForm({ ...expenseForm, paymentMethod: e.target.value })} className={`h-10 w-full rounded-xl border px-3 text-xs outline-none ${inputBg}`}>
                      <option>UPI</option>
                      <option>Bank Transfer</option>
                      <option>Credit Card</option>
                      <option>Cash</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Expense Date</label>
                    <input required type="date" value={expenseForm.expenseDate} onChange={(e) => setExpenseForm({ ...expenseForm, expenseDate: e.target.value })} className={`h-10 w-full rounded-xl border px-3 text-xs outline-none ${inputBg}`} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Notes (Optional)</label>
                  <textarea rows={2} value={expenseForm.description} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} placeholder="Additional notes..." className={`w-full rounded-xl border p-2.5 text-xs outline-none ${inputBg}`} />
                </div>
                <div className="pt-3 flex justify-end gap-2">
                  <button type="button" onClick={() => setShowAddExpenseModal(false)} className="h-9 px-4 rounded-xl border border-inherit text-xs font-semibold">Cancel</button>
                  <button type="submit" disabled={saving} className="h-9 px-5 rounded-xl bg-indigo-600 text-xs font-semibold text-white shadow hover:bg-indigo-700 disabled:opacity-50">
                    {saving ? "Saving..." : "Save Expense"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: ADD CLIENT */}
      <AnimatePresence>
        {showAddClientModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => setShowAddClientModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className={`relative w-full max-w-lg rounded-3xl border p-6 shadow-2xl ${bgCard}`}>
              <div className="flex items-center justify-between mb-4 border-b border-inherit pb-3">
                <h3 className="font-bold text-base">Add Client</h3>
                <button onClick={() => setShowAddClientModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"><X size={18}/></button>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void saveRecord(
                    "/api/clients",
                    {
                      name: clientForm.name,
                      company: clientForm.company || undefined,
                      phone: clientForm.phone,
                      email: clientForm.email || undefined,
                    },
                    () => setShowAddClientModal(false)
                  );
                }}
                className="space-y-3"
              >
                <div>
                  <label className="block text-xs font-semibold mb-1">Contact Name *</label>
                  <input required value={clientForm.name} onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })} placeholder="e.g. Vikram Singhal" className={`h-10 w-full rounded-xl border px-3 text-xs outline-none ${inputBg}`} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Company / Business Name</label>
                  <input value={clientForm.company} onChange={(e) => setClientForm({ ...clientForm, company: e.target.value })} placeholder="e.g. Apex Innovations Ltd" className={`h-10 w-full rounded-xl border px-3 text-xs outline-none ${inputBg}`} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Phone *</label>
                    <input required value={clientForm.phone} onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })} placeholder="+91 98765 43210" className={`h-10 w-full rounded-xl border px-3 text-xs outline-none ${inputBg}`} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Email</label>
                    <input type="email" value={clientForm.email} onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })} placeholder="client@domain.com" className={`h-10 w-full rounded-xl border px-3 text-xs outline-none ${inputBg}`} />
                  </div>
                </div>
                <div className="pt-3 flex justify-end gap-2">
                  <button type="button" onClick={() => setShowAddClientModal(false)} className="h-9 px-4 rounded-xl border border-inherit text-xs font-semibold">Cancel</button>
                  <button type="submit" disabled={saving} className="h-9 px-5 rounded-xl bg-indigo-600 text-xs font-semibold text-white shadow hover:bg-indigo-700 disabled:opacity-50">
                    {saving ? "Saving..." : "Add Client"}
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
