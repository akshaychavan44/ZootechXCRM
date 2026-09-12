import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, CalendarDays, ClipboardList, Search,
  Sun, Moon, ShieldCheck, Phone, Mail, Clock, ExternalLink,
  ChevronRight, Filter, LogOut, CheckCircle2, AlertCircle, Building, X, Megaphone,
  LayoutDashboard, TrendingUp, Target, Flame, ArrowUpRight, CheckSquare,
  Menu, ChevronDown, Bell, Settings, RefreshCw
} from "lucide-react";
import { apiFetch } from "../lib/api";
import ScopeOfWorkWorkspace from "./ScopeOfWorkWorkspace";
import UniversalTasksWorkspace from "./UniversalTasksWorkspace";
import DigitalMarketingWorkspace from "./DigitalMarketingWorkspace";
import ZootechXLogo from "./ZootechXLogo";

interface SalesDashboardProps {
  onLogout: () => void;
  dark?: boolean;
  onToggleTheme?: () => void;
  currentUser?: any;
}

type Lead = {
  id: string;
  full_name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  source: string;
  status: string;
  notes: string | null;
  created_at: string;
};

type Followup = {
  id: string;
  lead_name: string;
  company: string | null;
  type: string;
  followup_date: string;
  followup_time: string | null;
  assigned_to: string | null;
  priority: string | null;
  status: string;
  notes: string | null;
};

type Client = {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  gst_number: string | null;
  projects?: Array<{ id: string; title: string; name: string; status: string; category?: string; budget?: number; deadline?: string }>;
};

export default function SalesDashboard({ onLogout, dark: propDark = true, onToggleTheme, currentUser }: SalesDashboardProps) {
  const [page, setPage] = useState<"dashboard" | "leads" | "followups" | "clients" | "sows" | "tasks">("dashboard");
  const [leadScope, setLeadScope] = useState<"all" | "my">("all");
  const [dark, setDark] = useState<boolean>(() => {
    if (propDark !== undefined) return propDark;
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("dark");
    }
    return true;
  });

  useEffect(() => {
    if (propDark !== undefined) {
      setDark(propDark);
    }
  }, [propDark]);

  const handleToggleTheme = () => {
    if (onToggleTheme) {
      onToggleTheme();
      return;
    }
    const next = !dark;
    setDark(next);
    if (typeof window !== "undefined") {
      document.documentElement.classList.toggle("dark", next);
      document.documentElement.classList.toggle("light", !next);
    }
  };

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [followups, setFollowups] = useState<Followup[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [notice, setNotice] = useState("");

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
    const q = query.trim().toLowerCase();
    if (!q) return { leads: [], clients: [], followups: [] };
    return {
      leads: leads.filter(l => (l.full_name || "").toLowerCase().includes(q) || (l.company || "").toLowerCase().includes(q) || (l.email || "").toLowerCase().includes(q)).slice(0, 4),
      clients: clients.filter(c => (c.name || "").toLowerCase().includes(q) || (c.company || "").toLowerCase().includes(q) || (c.email || "").toLowerCase().includes(q)).slice(0, 4),
      followups: followups.filter(f => (f.lead_name || "").toLowerCase().includes(q) || (f.company || "").toLowerCase().includes(q)).slice(0, 4),
    };
  }, [query, leads, clients, followups]);

  const pendingFollowups = useMemo(() => followups.filter((f) => f.status !== "COMPLETED"), [followups]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 3000);
    return () => clearTimeout(timer);
  }, [notice]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const scopeParam = leadScope ? `?scope=${leadScope}` : "";
      const [l, f, c] = await Promise.all([
        apiFetch(`/api/leads${scopeParam}`),
        apiFetch(`/api/followups${scopeParam}`),
        apiFetch("/api/clients"),
      ]);
      const [ld, fd, cd] = await Promise.all([l.json(), f.json(), c.json()]);
      if (!l.ok || !f.ok || !c.ok) throw new Error("Unable to load shared CRM data");
      setLeads(ld.data ?? []);
      setFollowups(fd.data ?? []);
      setClients(cd.data ?? []);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => void load(), 12000);
    return () => window.clearInterval(interval);
  }, [leadScope]);

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
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Failed to update status");
      void load();
    }
  };

  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      const q = query.toLowerCase();
      const matchesQuery =
        !query ||
        l.full_name.toLowerCase().includes(q) ||
        (l.company && l.company.toLowerCase().includes(q)) ||
        (l.phone && l.phone.toLowerCase().includes(q)) ||
        (l.email && l.email.toLowerCase().includes(q));
      const matchesStatus = status === "ALL" || l.status === status;
      return matchesQuery && matchesStatus;
    });
  }, [leads, query, status]);

  const filteredFollowups = useMemo(() => {
    return followups.filter(
      (f) =>
        `${f.lead_name} ${f.company ?? ""} ${f.type}`
          .toLowerCase()
          .includes(query.toLowerCase())
    );
  }, [followups, query]);

  const filteredClients = useMemo(() => {
    return clients.filter(
      (c) =>
        `${c.name} ${c.company ?? ""} ${c.phone ?? ""} ${c.email ?? ""}`
          .toLowerCase()
          .includes(query.toLowerCase())
    );
  }, [clients, query]);

  // Professional SaaS Theme Palette matching screenshot
  const bgMain = dark ? "bg-[#090d16] text-slate-100" : "bg-[#f8fafc] text-slate-900";
  const bgSidebar = dark ? "bg-[#0c1017] border-slate-800 text-slate-300" : "bg-white border-slate-200/90 text-slate-700";
  const bgCard = dark ? "bg-[#0f172a] border-slate-800 text-slate-100 shadow-sm" : "bg-white border-slate-200/80 text-slate-900 shadow-sm";
  const inputBg = dark ? "bg-[#090d16] border-slate-800 text-slate-100 placeholder-slate-500 focus:border-slate-600" : "bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-slate-400";
  const mutedText = dark ? "text-slate-400" : "text-slate-500";

  // Sales Funnel & Summary Analytics
  const totalLeadsCount = leads.length;
  const convertedLeads = useMemo(() => leads.filter((l) => {
    const s = (l.status || "").toUpperCase();
    return s.includes("CONVERT") || s.includes("WON") || s.includes("CLOSED");
  }), [leads]);
  const conversionRate = totalLeadsCount > 0 ? Math.round((convertedLeads.length / totalLeadsCount) * 100) : 0;
  const pendingFollowupsList = useMemo(() => followups.filter((f) => f.status !== "COMPLETED"), [followups]);

  // Stage breakdown
  const stageStats = useMemo(() => {
    let newCount = 0;
    let contactedCount = 0;
    let qualifiedCount = 0;
    let negotiationCount = 0;
    let wonCount = 0;

    leads.forEach((l) => {
      const s = (l.status || "").toUpperCase();
      if (s.includes("CONVERT") || s.includes("WON") || s.includes("CLOSED")) wonCount++;
      else if (s.includes("NEGOTIAT") || s.includes("PROP")) negotiationCount++;
      else if (s.includes("QUALIF")) qualifiedCount++;
      else if (s.includes("CONTACT")) contactedCount++;
      else newCount++;
    });

    return { newCount, contactedCount, qualifiedCount, negotiationCount, wonCount };
  }, [leads]);

  type SalesMenuItem = {
    id: "dashboard" | "leads" | "followups" | "clients" | "sows" | "tasks";
    label: string;
    icon: React.ComponentType<any>;
    badge?: number;
  };

  const menu: SalesMenuItem[] = useMemo(() => {
    const allItems: SalesMenuItem[] = [
      { id: "dashboard", label: "Sales Radar", icon: LayoutDashboard },
      { id: "leads", label: "Lead Intelligence", icon: Users, badge: leads.length },
      { id: "followups", label: "Follow-up Queue", icon: CalendarDays, badge: followups.length },
      { id: "sows", label: "Scope of Work (SOW)", icon: ClipboardList },
      { id: "tasks", label: "Assigned Tasks", icon: ShieldCheck },
      { id: "clients", label: "Client Directory", icon: Users, badge: clients.length },
    ];
    if (!currentUser?.allowed_pages || !Array.isArray(currentUser.allowed_pages) || currentUser.allowed_pages.length === 0) {
      return allItems;
    }
    const allowed = currentUser.allowed_pages;
    const filtered = allItems.filter((item) => allowed.includes(item.id));
    return filtered.length > 0 ? filtered : allItems;
  }, [currentUser?.allowed_pages, leads.length, followups.length, clients.length]);

  useEffect(() => {
    if (menu.length > 0 && !menu.some((m) => m.id === page)) {
      setPage(menu[0].id);
    }
  }, [menu, page]);

  return (
    <div className={`luxury-app role-shell sales-shell ${dark ? "dark-theme" : "light-theme"} h-screen w-full overflow-hidden flex flex-row ${bgMain} font-sans antialiased transition-colors duration-200`}>
      {/* SIDEBAR NAVIGATION */}
      <aside className={`w-[260px] shrink-0 ${sidebarOpen ? "hidden md:flex" : "hidden"} flex-col border-r ${bgSidebar} h-screen z-20 select-none transition-all duration-300`}>
        {/* Brand Header */}
        <div className={`px-4 py-3.5 border-b ${dark ? "border-slate-800" : "border-slate-200/80"} flex items-center justify-between`}>
          <ZootechXLogo variant="full" size="sm" dark={dark} subtitle="SALES PLATFORM" />
        </div>

        <div className="px-3.5 pt-4 pb-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8] dark:text-slate-500">MENU</span>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {menu.map((item) => {
            const active = page === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setPage(item.id);
                  setSelectedLead(null);
                }}
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

        {/* Bottom Actions */}
        <div className={`p-4 border-t ${dark ? "border-slate-800" : "border-slate-200/80"} space-y-3`}>
          <div className={`flex items-center gap-2.5 px-3 py-2 rounded-xl ${dark ? "bg-slate-800/40 border border-slate-800" : "bg-slate-50 border border-slate-200/80"}`}>
            <div className={`h-8 w-8 rounded-lg font-bold flex items-center justify-center text-xs shrink-0 ${dark ? "bg-white text-black" : "bg-slate-900 text-white"} shadow-2xs`}>
              {currentUser?.name ? currentUser.name.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase() : "SE"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className={`text-xs font-bold truncate leading-tight ${dark ? "text-white" : "text-slate-900"}`}>{currentUser?.name || "Sales Executive"}</p>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              </div>
              <p className="text-[10px] truncate leading-tight text-slate-500 dark:text-slate-400">{currentUser?.email || "sales@zootechx"}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition"
          >
            <LogOut size={15} />
            <span>Log out</span>
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
              <Search size={16} className={`absolute left-3.5 ${query ? "text-cyan-500" : "text-slate-400"} transition-colors pointer-events-none`} />
              <input
                value={query}
                onFocus={() => setIsSearchOpen(true)}
                onChange={(e) => { setQuery(e.target.value); setIsSearchOpen(true); }}
                placeholder="Search or type command..."
                className={`w-full h-10 pl-10 pr-14 rounded-xl border text-sm transition-all outline-none shadow-2xs ${
                  dark
                    ? "bg-slate-900/90 border-slate-800 text-slate-100 placeholder-slate-500 focus:border-cyan-500/80 focus:bg-slate-900 focus:ring-2 focus:ring-cyan-500/20"
                    : "bg-slate-50/70 border-slate-200/90 text-slate-900 placeholder-slate-400 hover:bg-slate-50 focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15"
                }`}
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => { setQuery(""); setIsSearchOpen(false); }}
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

              {query && isSearchOpen && (
                <div className={`absolute top-12 left-0 w-full rounded-2xl border shadow-2xl z-30 max-h-[320px] overflow-auto ${bgCard} p-2`}>
                  {searchMatches.leads.length > 0 && (
                    <div>
                      <div className="px-2 pt-1 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Leads</div>
                      {searchMatches.leads.map(lead => (
                        <button key={lead.id} onClick={() => { setPage("leads"); setSelectedLead(lead); setQuery(""); setIsSearchOpen(false); }} className={`w-full text-left p-2.5 rounded-xl flex items-center gap-3 hover:${dark ? "bg-white/5" : "bg-slate-50"}`}>
                          <div className="h-8 w-8 rounded-full bg-cyan-600 text-white flex items-center justify-center text-[11px] font-bold">
                            {lead.full_name ? lead.full_name.charAt(0) : "L"}
                          </div>
                          <div>
                            <div className="text-[13px] font-medium">{lead.full_name}</div>
                            <div className="text-[11px] text-slate-400">{lead.company || lead.email}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {searchMatches.clients.length > 0 && (
                    <div>
                      <div className="px-2 pt-2 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Clients</div>
                      {searchMatches.clients.map(client => (
                        <button key={client.id} onClick={() => { setPage("clients"); setQuery(""); setIsSearchOpen(false); }} className={`w-full text-left p-2.5 rounded-xl flex items-center gap-3 hover:${dark ? "bg-white/5" : "bg-slate-50"}`}>
                          <div className="h-8 w-8 rounded-xl bg-emerald-600/10 text-emerald-400 flex items-center justify-center">
                            <Users size={14} />
                          </div>
                          <div>
                            <div className="text-[13px] font-medium">{client.name}</div>
                            <div className="text-[11px] text-slate-400">{client.company || client.email}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {searchMatches.followups.length > 0 && (
                    <div>
                      <div className="px-2 pt-2 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Follow-ups</div>
                      {searchMatches.followups.map(f => (
                        <button key={f.id} onClick={() => { setPage("followups"); setQuery(""); setIsSearchOpen(false); }} className={`w-full text-left p-2.5 rounded-xl flex items-center gap-3 hover:${dark ? "bg-white/5" : "bg-slate-50"}`}>
                          <div className="h-8 w-8 rounded-xl bg-cyan-600/10 text-cyan-400 flex items-center justify-center">
                            <CalendarDays size={14} />
                          </div>
                          <div>
                            <div className="text-[13px] font-medium">{f.lead_name}</div>
                            <div className="text-[11px] text-slate-400">{f.type} · {f.followup_date}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {searchMatches.leads.length === 0 && searchMatches.clients.length === 0 && searchMatches.followups.length === 0 && (
                    <div className="p-3 text-[13px] text-slate-400">No matching leads or clients found</div>
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
              title="Refresh Sales Data"
              className="h-10 w-10 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 shadow-2xs transition shrink-0"
            >
              <RefreshCw size={15} className={loading ? "animate-spin text-cyan-500" : ""} />
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
                        <div className="font-bold text-[14px]">Follow-up Queue</div>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-cyan-500/15 text-cyan-500 border border-cyan-500/30">
                          SALES
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400">{pendingFollowups.length} scheduled</span>
                    </div>
                  </div>
                  <div className="max-h-[300px] overflow-auto divide-y divide-slate-100 dark:divide-slate-800">
                    {pendingFollowups.slice(0, 6).map((f) => (
                      <div key={f.id} onClick={() => { setPage("followups"); setNotifOpen(false); }} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition flex items-start gap-2.5">
                        <div className="w-2 h-2 rounded-full bg-cyan-500 mt-1.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">{f.lead_name}</p>
                          <p className="text-[11px] text-slate-400 truncate">{f.type} · {f.followup_date}</p>
                        </div>
                      </div>
                    ))}
                    {pendingFollowups.length === 0 && (
                      <div className="p-6 text-center text-xs text-slate-400">All follow-ups complete 🎉</div>
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
                  {currentUser?.name ? currentUser.name.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase() : "SE"}
                </div>
                <span className="hidden sm:inline text-sm font-semibold text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white transition">
                  {currentUser?.name?.split(" ")[0] || "Sales"}
                </span>
                <ChevronDown size={15} className={`text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-transform duration-200 ${userDropdownOpen ? "rotate-180" : ""}`} />
              </button>
              {userDropdownOpen && (
                <div className={`absolute right-0 top-12 w-56 rounded-2xl border shadow-2xl z-30 p-2 ${bgCard}`}>
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{currentUser?.name || "Sales Executive"}</p>
                    <p className="text-[11px] text-slate-400 truncate">{currentUser?.email || "sales@zootechx"}</p>
                  </div>
                  <button
                    onClick={() => { setPage("dashboard"); setUserDropdownOpen(false); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:${dark ? "bg-white/5" : "bg-slate-100"} transition`}
                  >
                    <Settings size={14} />
                    <span>Sales Radar</span>
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

        {/* CONTENT AREA */}
        <main className={`flex-1 h-full overflow-y-auto p-6 lg:p-8 space-y-6 ${bgMain}`}>
          {notice && (
            <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-4 text-xs font-semibold text-indigo-300 flex items-center justify-between">
              <span>{notice}</span>
              <button onClick={() => setNotice("")} className="opacity-70 hover:opacity-100">
                <X size={14} />
              </button>
            </div>
          )}

          {/* TAB: SALES RADAR DASHBOARD */}
          {page === "dashboard" && (
            <div className="space-y-6 max-w-[1600px] mx-auto w-full">
              {/* Header & Quick Action */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className={`text-2xl font-bold tracking-tight ${dark ? "text-white" : "text-slate-900"}`}>
                    Sales Radar
                  </h3>
                  <p className={`text-xs mt-1 ${mutedText}`}>
                    Pipeline velocity, actionable client follow-ups, and conversion metrics.
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => {
                      setPage("leads");
                      setSelectedLead(null);
                    }}
                    className="flex h-9 items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 px-3.5 text-xs font-semibold text-white shadow-sm transition"
                  >
                    <Users size={14} />
                    <span>View Lead Pool</span>
                  </button>
                  <button
                    onClick={() => setPage("followups")}
                    className={`flex h-9 items-center gap-2 rounded-xl border px-3.5 text-xs font-semibold transition ${
                      dark ? "border-[#222d42] bg-[#171f30] text-slate-200 hover:bg-[#1e293b]" : "border-[#e5dcd0] bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <CalendarDays size={14} />
                    <span>Follow-up Queue</span>
                  </button>
                </div>
              </div>

              {/* 4 TailAdmin KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {/* Metric 1: Total Leads */}
                <div className="tail-card p-5 md:p-6">
                  <div className="tail-metric-icon mb-5">
                    <Target size={24} className="text-cyan-600 dark:text-cyan-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Pipeline</p>
                  <div className="mt-3 flex items-end justify-between">
                    <h4 className="text-2xl lg:text-3xl font-bold text-slate-800 dark:text-white font-mono">{totalLeadsCount}</h4>
                    <div className="flex items-center gap-1.5">
                      <span className="tail-badge-info">+12%</span>
                    </div>
                  </div>
                </div>

                {/* Metric 2: Win / Conversion Rate */}
                <div className="tail-card p-5 md:p-6">
                  <div className="tail-metric-icon mb-5">
                    <TrendingUp size={24} className="text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Conversion Rate</p>
                  <div className="mt-3 flex items-end justify-between">
                    <h4 className="text-2xl lg:text-3xl font-bold text-slate-800 dark:text-white font-mono">{conversionRate}%</h4>
                    <div className="flex items-center gap-1.5">
                      <span className="tail-badge-success">{convertedLeads.length} won</span>
                    </div>
                  </div>
                </div>

                {/* Metric 3: Pending Follow-ups */}
                <div className="tail-card p-5 md:p-6">
                  <div className="tail-metric-icon mb-5">
                    <Clock size={24} className="text-amber-600 dark:text-amber-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Pending Touches</p>
                  <div className="mt-3 flex items-end justify-between">
                    <h4 className="text-2xl lg:text-3xl font-bold text-slate-800 dark:text-white font-mono">{pendingFollowupsList.length}</h4>
                    <div className="flex items-center gap-1.5">
                      <span className={pendingFollowupsList.length > 0 ? "tail-badge-warning" : "tail-badge-success"}>
                        {pendingFollowupsList.length > 0 ? "Action needed" : "All cleared"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Metric 4: Corporate Clients */}
                <div className="tail-card p-5 md:p-6">
                  <div className="tail-metric-icon mb-5">
                    <Building size={24} className="text-purple-600 dark:text-purple-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Corporate Clients</p>
                  <div className="mt-3 flex items-end justify-between">
                    <h4 className="text-2xl lg:text-3xl font-bold text-slate-800 dark:text-white font-mono">{clients.length}</h4>
                    <div className="flex items-center gap-1.5">
                      <span className="tail-badge-info">Retained</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Deal Pipeline Funnel Visualizer */}
              <div className={`rounded-2xl border p-5 ${bgCard}`}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className={`text-sm font-bold ${dark ? "text-white" : "text-slate-900"}`}>Deal Stage Funnel</h4>
                    <p className={`text-[11px] ${mutedText}`}>Distribution of prospects across pipeline stages</p>
                  </div>
                  <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    {totalLeadsCount} Total Leads
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {/* Stage 1: New */}
                  <div className={`p-3 rounded-xl border ${dark ? "border-zinc-800 bg-[#09090b]" : "border-zinc-200 bg-zinc-50"}`}>
                    <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">1. Discovery / New</div>
                    <div className="text-xl font-bold font-mono mt-1 text-sky-400">{stageStats.newCount}</div>
                    <div className="mt-2 h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full bg-sky-400 rounded-full"
                        style={{ width: `${totalLeadsCount > 0 ? (stageStats.newCount / totalLeadsCount) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Stage 2: Contacted */}
                  <div className={`p-3 rounded-xl border ${dark ? "border-zinc-800 bg-[#09090b]" : "border-zinc-200 bg-zinc-50"}`}>
                    <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">2. Contacted</div>
                    <div className="text-xl font-bold font-mono mt-1 text-indigo-400">{stageStats.contactedCount}</div>
                    <div className="mt-2 h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full bg-indigo-400 rounded-full"
                        style={{ width: `${totalLeadsCount > 0 ? (stageStats.contactedCount / totalLeadsCount) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Stage 3: Qualified */}
                  <div className={`p-3 rounded-xl border ${dark ? "border-zinc-800 bg-[#09090b]" : "border-zinc-200 bg-zinc-50"}`}>
                    <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">3. Qualified</div>
                    <div className="text-xl font-bold font-mono mt-1 text-amber-400">{stageStats.qualifiedCount}</div>
                    <div className="mt-2 h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full"
                        style={{ width: `${totalLeadsCount > 0 ? (stageStats.qualifiedCount / totalLeadsCount) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Stage 4: Proposal */}
                  <div className={`p-3 rounded-xl border ${dark ? "border-zinc-800 bg-[#09090b]" : "border-zinc-200 bg-zinc-50"}`}>
                    <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">4. Proposal / Neg.</div>
                    <div className="text-xl font-bold font-mono mt-1 text-purple-400">{stageStats.negotiationCount}</div>
                    <div className="mt-2 h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full bg-purple-400 rounded-full"
                        style={{ width: `${totalLeadsCount > 0 ? (stageStats.negotiationCount / totalLeadsCount) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Stage 5: Won */}
                  <div className={`p-3 rounded-xl border ${dark ? "border-zinc-800 bg-[#09090b]" : "border-zinc-200 bg-zinc-50"}`}>
                    <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">5. Converted / Won</div>
                    <div className="text-xl font-bold font-mono mt-1 text-emerald-400">{stageStats.wonCount}</div>
                    <div className="mt-2 h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full bg-emerald-400 rounded-full"
                        style={{ width: `${totalLeadsCount > 0 ? (stageStats.wonCount / totalLeadsCount) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 2-Column Split: Hot Prospects & Follow-up Execution */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Side: Hot Prospects / Recent Leads (7 cols) */}
                <div className="lg:col-span-7 space-y-6">
                  <div className={`rounded-2xl border p-5 ${bgCard}`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Flame size={16} className="text-amber-500" />
                        <div>
                          <h4 className={`text-sm font-bold ${dark ? "text-white" : "text-slate-900"}`}>Active Prospects Radar</h4>
                          <p className={`text-[11px] ${mutedText}`}>Latest leads entering the pipeline</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setPage("leads");
                          setSelectedLead(null);
                        }}
                        className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                      >
                        <span>Lead Directory</span>
                        <ArrowUpRight size={13} />
                      </button>
                    </div>

                    {leads.length === 0 ? (
                      <div className="py-8 text-center">
                        <Users size={28} className={`mx-auto mb-2 opacity-30 ${mutedText}`} />
                        <p className={`text-xs ${mutedText}`}>No leads registered in CRM</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {leads.slice(0, 5).map((lead) => (
                          <div
                            key={lead.id}
                            onClick={() => {
                              setSelectedLead(lead);
                              setPage("leads");
                            }}
                            className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer hover:border-cyan-500/30 transition ${
                              dark ? "border-zinc-800 bg-[#09090b] hover:bg-zinc-900" : "border-zinc-200 bg-zinc-50 hover:bg-zinc-100"
                            }`}
                          >
                            <div className="min-w-0 flex-1 pr-3">
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-bold truncate ${dark ? "text-white" : "text-slate-900"}`}>
                                  {lead.full_name}
                                </span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-medium shrink-0">
                                  {lead.source}
                                </span>
                              </div>
                              <div className={`text-[11px] mt-1 flex items-center gap-2 ${mutedText}`}>
                                <span>{lead.company || "Individual"}</span>
                                {lead.phone && (
                                  <>
                                    <span>•</span>
                                    <span>{lead.phone}</span>
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 capitalize">
                                {lead.status.replaceAll("_", " ")}
                              </span>
                              <ChevronRight size={14} className={mutedText} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Side: Follow-up Queue & Clients (5 cols) */}
                <div className="lg:col-span-5 space-y-6">
                  {/* Today's Follow-up Action Queue */}
                  <div className={`rounded-2xl border p-5 ${bgCard}`}>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className={`text-sm font-bold ${dark ? "text-white" : "text-slate-900"}`}>Action Follow-up Queue</h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            {pendingFollowupsList.length}
                          </span>
                        </div>
                        <p className={`text-[11px] ${mutedText}`}>Pending client interactions</p>
                      </div>
                      <button
                        onClick={() => setPage("followups")}
                        className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                      >
                        <span>Full Queue</span>
                        <ArrowUpRight size={13} />
                      </button>
                    </div>

                    {pendingFollowupsList.length === 0 ? (
                      <div className="py-8 text-center">
                        <CheckCircle2 size={28} className="mx-auto mb-2 text-emerald-400/60" />
                        <p className="text-xs font-medium text-emerald-400">All follow-ups completed!</p>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {pendingFollowupsList.slice(0, 5).map((f) => (
                          <div
                            key={f.id}
                            className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                              dark ? "border-zinc-800 bg-[#09090b]" : "border-zinc-200 bg-zinc-50"
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-semibold truncate">{f.lead_name}</div>
                              <div className={`text-[10px] mt-0.5 flex items-center gap-2 ${mutedText}`}>
                                <span className="capitalize font-medium">{f.type}</span>
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
                              Done
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Retained Clients Overview */}
                  <div className={`rounded-2xl border p-5 ${bgCard}`}>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className={`text-sm font-bold ${dark ? "text-white" : "text-slate-900"}`}>Client Directory</h4>
                        <p className={`text-[11px] ${mutedText}`}>Active enterprise relationships</p>
                      </div>
                      <button
                        onClick={() => setPage("clients")}
                        className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                      >
                        <span>View All</span>
                        <ArrowUpRight size={13} />
                      </button>
                    </div>

                    {clients.length === 0 ? (
                      <div className="py-6 text-center">
                        <Building size={24} className={`mx-auto mb-2 opacity-30 ${mutedText}`} />
                        <p className={`text-xs ${mutedText}`}>No clients registered yet</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {clients.slice(0, 4).map((c) => (
                          <div
                            key={c.id}
                            className={`p-2.5 rounded-xl border flex items-center justify-between ${
                              dark ? "border-zinc-800 bg-[#09090b]" : "border-zinc-200 bg-zinc-50"
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-semibold truncate">{c.name}</div>
                              <div className={`text-[10px] ${mutedText} truncate`}>{c.company || "Individual"}</div>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 font-mono">
                              {c.projects?.length || 0} projects
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

          {/* TAB: LEADS */}
          {page === "leads" && (
            <div className="space-y-6 max-w-[1600px] mx-auto w-full">
              {/* FILTERS & SEARCH */}
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="relative w-full sm:w-80">
                  <Search size={15} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${mutedText}`} />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search leads by name, company, phone..."
                    className={`h-10 w-full rounded-xl border pl-9 pr-3 text-xs outline-none focus:border-indigo-500 ${inputBg}`}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  {/* Lead Scope Toggle */}
                  <div className={`inline-flex rounded-xl border p-1 ${dark ? "bg-[#171f30] border-[#222d42]" : "bg-slate-100 border-slate-200"}`}>
                    <button
                      type="button"
                      onClick={() => setLeadScope("all")}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                        leadScope === "all"
                          ? "bg-cyan-600 text-white shadow-sm"
                          : mutedText
                      }`}
                    >
                      All Leads
                    </button>
                    <button
                      type="button"
                      onClick={() => setLeadScope("my")}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                        leadScope === "my"
                          ? "bg-cyan-600 text-white shadow-sm"
                          : mutedText
                      }`}
                    >
                      My Leads
                    </button>
                  </div>

                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className={`h-10 rounded-xl border px-3 text-xs outline-none ${inputBg}`}
                  >
                    <option value="ALL">All Statuses</option>
                    {Array.from(new Set(leads.map((l) => l.status))).map((st) => (
                      <option key={st} value={st}>
                        {st.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* LEADS GRID */}
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredLeads.map((lead) => (
                  <div
                    key={lead.id}
                    onClick={() => setSelectedLead(lead)}
                    className={`cursor-pointer rounded-3xl border p-5 transition-all hover:-translate-y-1 hover:border-indigo-500/40 hover:shadow-xl ${bgCard}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className={`font-bold text-sm ${dark ? "text-white" : "text-slate-900"}`}>
                          {lead.full_name}
                        </div>
                        <div className={`text-xs mt-0.5 ${mutedText}`}>
                          {lead.company || "Individual Client"}
                        </div>
                      </div>
                      <span className="rounded-full bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 text-[10px] font-bold text-indigo-400">
                        {lead.status.replaceAll("_", " ")}
                      </span>
                    </div>

                    <div className={`mt-4 space-y-1.5 text-xs ${mutedText}`}>
                      <div className="flex items-center gap-2">
                        <Phone size={13} className="text-indigo-400" />
                        <span>{lead.phone || "No phone"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail size={13} className="text-indigo-400" />
                        <span className="truncate">{lead.email || "No email"}</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-inherit flex items-center justify-between text-[11px]">
                      <span className={mutedText}>Source: {lead.source}</span>
                      <span className="text-indigo-400 font-semibold flex items-center gap-1">
                        Details <ChevronRight size={13} />
                      </span>
                    </div>
                  </div>
                ))}

                {filteredLeads.length === 0 && (
                  <div className={`col-span-full rounded-3xl border border-dashed p-14 text-center ${mutedText}`}>
                    No leads match your search criteria.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: FOLLOW-UPS */}
          {page === "followups" && (
            <div className="space-y-6 max-w-[1600px] mx-auto w-full">
              <div className={`overflow-hidden rounded-3xl border ${bgCard} shadow-sm`}>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px]">
                    <thead className={`border-b border-inherit ${dark ? "bg-white/5 text-slate-400" : "bg-slate-100 text-slate-600"} text-[11px] uppercase tracking-wider font-bold`}>
                      <tr>
                        <th className="p-3.5 text-left">Lead / Client</th>
                        <th className="p-3.5 text-left">Activity Type</th>
                        <th className="p-3.5 text-left">Scheduled Time</th>
                        <th className="p-3.5 text-left">Assigned</th>
                        <th className="p-3.5 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y border-inherit">
                      {filteredFollowups.map((f) => (
                        <tr key={f.id} className={`hover:${dark ? "bg-white/5" : "bg-slate-50"} transition`}>
                          <td className="p-3.5">
                            <div className={`font-bold text-xs ${dark ? "text-white" : "text-slate-900"}`}>{f.lead_name}</div>
                            <div className={`text-[11px] ${mutedText}`}>{f.company || "—"}</div>
                          </td>
                          <td className={`p-3.5 text-xs ${dark ? "text-slate-200" : "text-slate-800"}`}>{f.type}</td>
                          <td className={`p-3.5 text-xs font-mono ${dark ? "text-slate-200" : "text-slate-800"}`}>
                            {new Date(f.followup_date).toLocaleDateString()}{" "}
                            <span className={mutedText}>{f.followup_time || ""}</span>
                          </td>
                          <td className={`p-3.5 text-xs ${dark ? "text-slate-200" : "text-slate-800"}`}>{f.assigned_to || "Team"}</td>
                          <td className="p-3.5">
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
                          </td>
                        </tr>
                      ))}
                      {filteredFollowups.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-10 text-center text-xs text-slate-400">
                            No follow-ups recorded yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: CLIENTS */}
          {page === "clients" && (
            <div className="space-y-6 max-w-[1600px] mx-auto w-full">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className={`text-2xl font-bold tracking-tight ${dark ? "text-white" : "text-slate-900"}`}>
                    Client Directory
                  </h3>
                  <p className={`text-xs mt-1 ${mutedText}`}>
                    Enterprise accounts, corporate contacts, billing info, and active projects.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                    {filteredClients.length} Corporate Accounts
                  </span>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredClients.map((client) => (
                  <div
                    key={client.id}
                    className={`rounded-3xl border p-5 transition-all hover:-translate-y-1 hover:border-indigo-500/40 hover:shadow-xl ${bgCard}`}
                  >
                    <div className={`font-bold text-sm ${dark ? "text-white" : "text-slate-900"}`}>{client.company || client.name}</div>
                    <div className={`text-xs mt-0.5 ${mutedText}`}>{client.name}</div>

                    <div className={`mt-4 space-y-1.5 text-xs ${mutedText}`}>
                      <div className="flex items-center gap-2">
                        <Phone size={13} className="text-indigo-400" />
                        <span>{client.phone || "No phone"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail size={13} className="text-indigo-400" />
                        <span className="truncate">{client.email || "No email"}</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-inherit text-[11px] font-mono text-slate-400">
                      GSTIN: {client.gst_number || "Unregistered"}
                    </div>

                    {client.projects && client.projects.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-inherit">
                        <div className={`text-[10px] font-semibold uppercase tracking-wider ${mutedText} mb-1.5`}>
                          Active Projects ({client.projects.length})
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {client.projects.map((p) => (
                            <span
                              key={p.id}
                              className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
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

          {/* TAB 4: SCOPE OF WORK */}
          {page === "sows" && (
            <div className="max-w-[1600px] mx-auto w-full">
              <ScopeOfWorkWorkspace dark={dark} />
            </div>
          )}

          {/* TAB 5: ASSIGNED TASKS */}
          {page === "tasks" && (
            <div className="max-w-[1600px] mx-auto w-full">
              <UniversalTasksWorkspace dark={dark} canCreate={false} canUpdateStatus={true} />
            </div>
          )}
        </main>
      </div>

      {/* LEAD DETAIL MODAL */}
      <AnimatePresence>
        {selectedLead && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setSelectedLead(null)}
            />
            <motion.div
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              className={`relative h-full w-full max-w-md border-l p-6 overflow-y-auto ${bgCard} shadow-2xl z-10`}
            >
              <div className="flex items-center justify-between border-b border-inherit pb-4">
                <h3 className="font-bold text-base">Lead Information</h3>
                <button onClick={() => setSelectedLead(null)} className="text-slate-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <div className="mt-5 space-y-4 text-xs">
                <div>
                  <span className={`block uppercase font-bold text-[10px] ${mutedText}`}>Full Name</span>
                  <div className="text-sm font-bold mt-0.5">{selectedLead.full_name}</div>
                </div>

                <div>
                  <span className={`block uppercase font-bold text-[10px] ${mutedText}`}>Company</span>
                  <div className="text-sm mt-0.5">{selectedLead.company || "—"}</div>
                </div>

                <div>
                  <span className={`block uppercase font-bold text-[10px] ${mutedText}`}>Contact Info</span>
                  <div className="mt-1 space-y-1">
                    <div>{selectedLead.phone || "No phone"}</div>
                    <div>{selectedLead.email || "No email"}</div>
                  </div>
                </div>

                <div>
                  <span className={`block uppercase font-bold text-[10px] ${mutedText}`}>Lead Source</span>
                  <div className="mt-0.5 font-semibold text-indigo-400">{selectedLead.source}</div>
                </div>

                <div>
                  <span className={`block uppercase font-bold text-[10px] ${mutedText}`}>Notes</span>
                  <div className="mt-1 p-3 rounded-xl bg-white/5 border border-inherit leading-relaxed">
                    {selectedLead.notes || "No notes logged."}
                  </div>
                </div>

                <div className="pt-4 flex gap-2">
                  {selectedLead.phone && (
                    <a
                      href={`tel:${selectedLead.phone}`}
                      className="flex-1 h-9 rounded-xl bg-indigo-600 text-white font-semibold flex items-center justify-center gap-1.5 shadow"
                    >
                      <Phone size={14} />
                      Call Lead
                    </a>
                  )}
                  {selectedLead.email && (
                    <a
                      href={`mailto:${selectedLead.email}`}
                      className="flex-1 h-9 rounded-xl border border-inherit text-white font-semibold flex items-center justify-center gap-1.5 hover:bg-white/5"
                    >
                      <Mail size={14} />
                      Email
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
