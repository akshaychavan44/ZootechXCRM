import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight, Check, CheckCircle2, ChevronRight, Copy, ExternalLink,
  Flame, Globe, Layers, LogOut, Mail, Megaphone, Moon, MousePointerClick,
  Pause, Play, Plus, RefreshCw, Search, Send, Share2, Sparkles, Sun,
  Target, Trash2, TrendingUp, UserCheck, Users, X, DollarSign, PlayCircle,
  Building2, Phone, ShieldCheck, CheckCheck, BarChart3, PieChart as PieIcon,
  Radio, Zap, Edit3, Download, Eye, Settings, Sliders, Activity, Filter,
  FolderPlus, FileText, CheckSquare, Clock, AlertCircle, Briefcase, Link2,
  Menu, ChevronDown, Bell, LayoutDashboard
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { apiFetch } from "../lib/api";
import ZootechXLogo from "./ZootechXLogo";

interface DigitalMarketingWorkspaceProps {
  admin?: boolean;
  readOnly?: boolean;
  embedded?: boolean;
  onLogout?: () => void;
  onBack?: () => void;
  dark?: boolean;
  onToggleTheme?: () => void;
  currentUser?: any;
}

export type MarketingClient = {
  id: string;
  name: string;
  industry: string;
  contact_name: string;
  contact_email: string;
  monthly_retainer: number;
  status: "ACTIVE" | "ONBOARDING" | "PAUSED";
  website?: string;
  created_at: string;
};

export type MarketingClientProject = {
  id: string;
  client_id: string;
  client_name: string;
  title: string;
  category: "Paid Search" | "Paid Social" | "SEO & Content" | "Brand & Creative" | "Email & CRM";
  budget: number;
  spend: number;
  target_roas: number;
  current_roas: number;
  status: "PLANNING" | "IN_PROGRESS" | "IN_REVIEW" | "ACTIVE" | "COMPLETED";
  deadline: string;
  deliverables: string;
  created_at: string;
};

export type MarketingClientAsset = {
  id: string;
  client_id: string;
  client_name: string;
  project_id?: string | null;
  project_title?: string | null;
  name: string;
  asset_type: "Ad Creative" | "Video Script" | "Copywriting" | "Brand Asset" | "Landing Page" | "Report";
  file_format: "Figma" | "Video / MP4" | "Graphic / PNG" | "PDF" | "Drive / Doc";
  asset_url: string;
  status: "APPROVED" | "IN_REVIEW" | "NEEDS_REVISION" | "DRAFT";
  version: string;
  notes?: string;
  created_at: string;
};

type OverviewStats = {
  totalClients: number;
  activeClients: number;
  totalMonthlyRetainer: number;
  totalProjects: number;
  activeProjects: number;
  totalBudgetManaged: number;
  totalSpend: number;
  totalAssets: number;
  assetsInReview: number;
  assetsApproved: number;
  clientPortfolio: Array<{
    name: string;
    retainer: number;
    projectCount: number;
    assetCount: number;
  }>;
};

export default function DigitalMarketingWorkspace({
  admin = false,
  readOnly = false,
  embedded = false,
  onLogout,
  onBack,
  dark: propDark = false,
  onToggleTheme,
  currentUser,
}: DigitalMarketingWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "clients" | "projects" | "assets" | "mockups">("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [dark, setDark] = useState<boolean>(() => {
    if (propDark !== undefined) return propDark;
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("zootechx_theme");
      return saved ? saved === "dark" : false;
    }
    return false;
  });

  useEffect(() => {
    if (propDark !== undefined) setDark(propDark);
  }, [propDark]);

  const handleToggleTheme = () => {
    if (onToggleTheme) {
      onToggleTheme();
      return;
    }
    const next = !dark;
    setDark(next);
    if (typeof window !== "undefined") {
      localStorage.setItem("zootechx_theme", next ? "dark" : "light");
      if (next) {
        document.documentElement.classList.add("dark");
        document.documentElement.classList.remove("light");
      } else {
        document.documentElement.classList.remove("dark");
        document.documentElement.classList.add("light");
      }
    }
  };

  // State
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [clients, setClients] = useState<MarketingClient[]>([]);
  const [projects, setProjects] = useState<MarketingClientProject[]>([]);
  const [assets, setAssets] = useState<MarketingClientAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Filters & Search
  const [selectedClientId, setSelectedClientId] = useState<string>("ALL");
  const [projectCategoryFilter, setProjectCategoryFilter] = useState<string>("ALL");
  const [projectStatusFilter, setProjectStatusFilter] = useState<string>("ALL");
  const [assetStatusFilter, setAssetStatusFilter] = useState<string>("ALL");
  const [assetTypeFilter, setAssetTypeFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

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
    const q = searchQuery.trim().toLowerCase();
    if (!q) return { clients: [], projects: [], assets: [] };
    return {
      clients: clients.filter(c => (c.name || "").toLowerCase().includes(q) || (c.industry || "").toLowerCase().includes(q) || (c.contact_name || "").toLowerCase().includes(q)).slice(0, 4),
      projects: projects.filter(p => (p.title || "").toLowerCase().includes(q) || (p.client_name || "").toLowerCase().includes(q) || (p.category || "").toLowerCase().includes(q)).slice(0, 4),
      assets: assets.filter(a => (a.name || "").toLowerCase().includes(q) || (a.client_name || "").toLowerCase().includes(q) || (a.asset_type || "").toLowerCase().includes(q)).slice(0, 4),
    };
  }, [searchQuery, clients, projects, assets]);

  const marketingAlerts = useMemo(() => {
    return projects.filter(p => p.status === "PLANNING" || p.status === "IN_REVIEW");
  }, [projects]);
  const [trafficPeriod, setTrafficPeriod] = useState<"today" | "week" | "month">("today");

  // Modals
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [editingClient, setEditingClient] = useState<MarketingClient | null>(null);
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState<MarketingClientProject | null>(null);
  const [showAddAssetModal, setShowAddAssetModal] = useState(false);
  const [previewingAsset, setPreviewingAsset] = useState<MarketingClientAsset | null>(null);
  const [mockupFormat, setMockupFormat] = useState<"google" | "linkedin" | "meta">("google");

  // Form states: New Client
  const [clientForm, setClientForm] = useState({
    name: "",
    industry: "B2B SaaS & Cloud",
    contact_name: "",
    contact_email: "",
    monthly_retainer: 12000,
    website: "",
    status: "ACTIVE" as const,
  });

  // Form states: New Project
  const [projectForm, setProjectForm] = useState({
    client_id: "",
    title: "",
    category: "Paid Search" as const,
    budget: 15000,
    target_roas: 5.5,
    deadline: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
    deliverables: "High-intent search ad groups, weekly ROAS pacing reports",
  });

  // Form states: New Asset
  const [assetForm, setAssetForm] = useState({
    client_id: "",
    project_id: "",
    name: "",
    asset_type: "Ad Creative" as const,
    file_format: "Figma" as const,
    asset_url: "https://figma.com/@zootechx/ads-deck",
    status: "IN_REVIEW" as const,
    version: "v1.0",
    notes: "Review copy hooks and design variations for client approval.",
  });

  const triggerNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3500);
  };

  // Load all client management data
  const loadAllData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [overRes, clientsRes, projectsRes, assetsRes] = await Promise.all([
        apiFetch("/api/marketing/clients/overview"),
        apiFetch("/api/marketing/clients"),
        apiFetch("/api/marketing/projects"),
        apiFetch("/api/marketing/assets"),
      ]);

      const [overData, clientsData, projectsData, assetsData] = await Promise.all([
        overRes.json(),
        clientsRes.json(),
        projectsRes.json(),
        assetsRes.json(),
      ]);

      if (overRes.ok && overData.data) setOverview(overData.data);
      if (clientsRes.ok && Array.isArray(clientsData.data)) {
        setClients(clientsData.data);
        if (!projectForm.client_id && clientsData.data.length > 0) {
          setProjectForm((prev) => ({ ...prev, client_id: clientsData.data[0].id }));
        }
        if (!assetForm.client_id && clientsData.data.length > 0) {
          setAssetForm((prev) => ({ ...prev, client_id: clientsData.data[0].id }));
        }
      }
      if (projectsRes.ok && Array.isArray(projectsData.data)) setProjects(projectsData.data);
      if (assetsRes.ok && Array.isArray(assetsData.data)) setAssets(assetsData.data);
    } catch {
      triggerNotice("Client data connected with offline precision mode.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // CSV Exporter
  const exportCsv = (filename: string, rows: Record<string, any>[]) => {
    if (!rows || rows.length === 0) return;
    const keys = Object.keys(rows[0]);
    const csvContent = [
      keys.join(","),
      ...rows.map((row) =>
        keys.map((k) => `"${String(row[k] ?? "").replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportClientsCsv = () => {
    if (clients.length === 0) {
      triggerNotice("No clients available to export.");
      return;
    }
    const rows = clients.map((c) => ({
      "Client Name": c.name,
      Industry: c.industry,
      "Monthly Retainer ($)": c.monthly_retainer,
      "Contact Person": c.contact_name,
      "Contact Email": c.contact_email,
      Status: c.status,
      Website: c.website || "N/A",
      "Onboarded Date": new Date(c.created_at).toLocaleDateString(),
    }));
    exportCsv(`zootechx_clients_${new Date().toISOString().split("T")[0]}.csv`, rows);
    triggerNotice("Client roster exported as CSV.");
  };

  const exportProjectsCsv = () => {
    if (projects.length === 0) {
      triggerNotice("No projects available to export.");
      return;
    }
    const rows = projects.map((p) => ({
      "Project Title": p.title,
      Client: p.client_name,
      Category: p.category,
      "Budget ($)": p.budget,
      "Spend ($)": p.spend,
      "Target ROAS": `${p.target_roas}x`,
      "Current ROAS": `${p.current_roas}x`,
      Status: p.status,
      Deadline: p.deadline,
      Deliverables: p.deliverables,
    }));
    exportCsv(`zootechx_client_projects_${new Date().toISOString().split("T")[0]}.csv`, rows);
    triggerNotice("Client projects exported as CSV.");
  };

  const exportAssetsCsv = () => {
    if (assets.length === 0) {
      triggerNotice("No assets available to export.");
      return;
    }
    const rows = assets.map((a) => ({
      "Asset Name": a.name,
      Client: a.client_name,
      "Associated Project": a.project_title || "General Brand Asset",
      "Asset Type": a.asset_type,
      "File Format": a.file_format,
      Status: a.status,
      Version: a.version,
      "Link / URL": a.asset_url,
      Notes: a.notes || "None",
      "Registered Date": new Date(a.created_at).toLocaleDateString(),
    }));
    exportCsv(`zootechx_client_assets_${new Date().toISOString().split("T")[0]}.csv`, rows);
    triggerNotice("Client asset register exported as CSV.");
  };

  // Client Handlers
  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch("/api/marketing/clients", {
        method: "POST",
        body: JSON.stringify(clientForm),
      });
      const data = await res.json();
      if (res.ok && data.data) {
        setClients((prev) => [data.data, ...prev]);
        setShowAddClientModal(false);
        setClientForm({
          name: "",
          industry: "B2B SaaS & Cloud",
          contact_name: "",
          contact_email: "",
          monthly_retainer: 12000,
          website: "",
          status: "ACTIVE",
        });
        triggerNotice(`Client "${data.data.name}" onboarded successfully!`);
        loadAllData(false);
      } else {
        triggerNotice(data.message || "Failed to add client.");
      }
    } catch {
      triggerNotice("Error adding new client.");
    }
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;
    try {
      const res = await apiFetch(`/api/marketing/clients/${editingClient.id}`, {
        method: "PATCH",
        body: JSON.stringify(editingClient),
      });
      const data = await res.json();
      if (res.ok && data.data) {
        setClients((prev) => prev.map((c) => (c.id === editingClient.id ? data.data : c)));
        setEditingClient(null);
        triggerNotice(`Client "${data.data.name}" updated!`);
        loadAllData(false);
      }
    } catch {
      triggerNotice("Error updating client.");
    }
  };

  const handleDeleteClient = async (id: string) => {
    const target = clients.find((c) => c.id === id);
    if (!confirm(`Are you sure you want to delete ${target?.name || "this client"} and all associated projects & assets?`)) return;
    try {
      const res = await apiFetch(`/api/marketing/clients/${id}`, { method: "DELETE" });
      if (res.ok) {
        setClients((prev) => prev.filter((c) => c.id !== id));
        setProjects((prev) => prev.filter((p) => p.client_id !== id));
        setAssets((prev) => prev.filter((a) => a.client_id !== id));
        triggerNotice("Client and associated data removed.");
        loadAllData(false);
      }
    } catch {
      triggerNotice("Unable to remove client.");
    }
  };

  // Project Handlers
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch("/api/marketing/projects", {
        method: "POST",
        body: JSON.stringify(projectForm),
      });
      const data = await res.json();
      if (res.ok && data.data) {
        setProjects((prev) => [data.data, ...prev]);
        setShowAddProjectModal(false);
        setProjectForm({
          client_id: clients[0]?.id || "",
          title: "",
          category: "Paid Search",
          budget: 15000,
          target_roas: 5.5,
          deadline: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
          deliverables: "High-intent search ad groups, weekly ROAS pacing reports",
        });
        triggerNotice(`Project "${data.data.title}" launched for client!`);
        loadAllData(false);
      }
    } catch {
      triggerNotice("Error creating client project.");
    }
  };

  const handleUpdateProjectStatus = async (id: string, status: MarketingClientProject["status"]) => {
    try {
      const res = await apiFetch(`/api/marketing/projects/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (res.ok && data.data) {
        setProjects((prev) => prev.map((p) => (p.id === id ? data.data : p)));
        triggerNotice(`Project status updated to ${status}`);
        loadAllData(false);
      }
    } catch {
      triggerNotice("Error updating project status.");
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm("Are you sure you want to remove this client project?")) return;
    try {
      const res = await apiFetch(`/api/marketing/projects/${id}`, { method: "DELETE" });
      if (res.ok) {
        setProjects((prev) => prev.filter((p) => p.id !== id));
        triggerNotice("Project removed.");
        loadAllData(false);
      }
    } catch {
      triggerNotice("Unable to delete project.");
    }
  };

  // Asset Handlers
  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch("/api/marketing/assets", {
        method: "POST",
        body: JSON.stringify(assetForm),
      });
      const data = await res.json();
      if (res.ok && data.data) {
        setAssets((prev) => [data.data, ...prev]);
        setShowAddAssetModal(false);
        setAssetForm({
          client_id: clients[0]?.id || "",
          project_id: "",
          name: "",
          asset_type: "Ad Creative",
          file_format: "Figma",
          asset_url: "https://figma.com/@zootechx/ads-deck",
          status: "IN_REVIEW",
          version: "v1.0",
          notes: "",
        });
        triggerNotice(`Asset "${data.data.name}" added to client library!`);
        loadAllData(false);
      }
    } catch {
      triggerNotice("Error registering client asset.");
    }
  };

  const handleUpdateAssetStatus = async (id: string, status: MarketingClientAsset["status"]) => {
    try {
      const res = await apiFetch(`/api/marketing/assets/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (res.ok && data.data) {
        setAssets((prev) => prev.map((a) => (a.id === id ? data.data : a)));
        if (previewingAsset && previewingAsset.id === id) {
          setPreviewingAsset(data.data);
        }
        triggerNotice(`Asset review status changed to ${status}`);
        loadAllData(false);
      }
    } catch {
      triggerNotice("Error updating asset status.");
    }
  };

  const handleDeleteAsset = async (id: string) => {
    if (!confirm("Are you sure you want to remove this asset?")) return;
    try {
      const res = await apiFetch(`/api/marketing/assets/${id}`, { method: "DELETE" });
      if (res.ok) {
        setAssets((prev) => prev.filter((a) => a.id !== id));
        if (previewingAsset && previewingAsset.id === id) setPreviewingAsset(null);
        triggerNotice("Asset removed from library.");
        loadAllData(false);
      }
    } catch {
      triggerNotice("Unable to delete asset.");
    }
  };

  // Filtered views
  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      const matchSearch =
        !searchQuery ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.industry.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.contact_name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchSearch;
    });
  }, [clients, searchQuery]);

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const matchClient = selectedClientId === "ALL" || p.client_id === selectedClientId;
      const matchCategory = projectCategoryFilter === "ALL" || p.category === projectCategoryFilter;
      const matchStatus = projectStatusFilter === "ALL" || p.status === projectStatusFilter;
      const matchSearch =
        !searchQuery ||
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.client_name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchClient && matchCategory && matchStatus && matchSearch;
    });
  }, [projects, selectedClientId, projectCategoryFilter, projectStatusFilter, searchQuery]);

  const filteredAssets = useMemo(() => {
    return assets.filter((a) => {
      const matchClient = selectedClientId === "ALL" || a.client_id === selectedClientId;
      const matchStatus = assetStatusFilter === "ALL" || a.status === assetStatusFilter;
      const matchType = assetTypeFilter === "ALL" || a.asset_type === assetTypeFilter;
      const matchSearch =
        !searchQuery ||
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.client_name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchClient && matchStatus && matchType && matchSearch;
    });
  }, [assets, selectedClientId, assetStatusFilter, assetTypeFilter, searchQuery]);

  // Professional SaaS Theme Palette matching screenshot
  const pageBg = dark ? "bg-[#090d16] text-slate-100" : "bg-[#f8fafc] text-slate-900";
  const sandCard = dark ? "bg-[#0f172a] border-slate-800 text-slate-100 shadow-sm" : "bg-white border-slate-200/80 text-slate-900 shadow-sm";
  const whiteCard = dark ? "bg-[#0f172a] border-slate-800 text-slate-100 shadow-sm" : "bg-white border-slate-200/80 text-slate-900 shadow-sm";
  const bgCard = whiteCard;
  const textSub = dark ? "text-slate-400" : "text-slate-500";
  const textMuted = dark ? "text-slate-400" : "text-slate-500";
  const pillBlack = "bg-[#0f172a] dark:bg-white text-white dark:text-slate-900 shadow-sm";
  const pillSand = dark ? "bg-slate-800 text-slate-300 border-slate-700" : "bg-slate-100 text-slate-900 border-slate-200";
  const pillOutline = dark ? "bg-[#0f172a] border-slate-800 text-slate-300 hover:bg-slate-800" : "bg-white border-slate-200 text-slate-800 hover:bg-slate-50";
  const bgSidebar = dark ? "bg-[#0c1017] border-slate-800 text-slate-300" : "bg-white border-slate-200/90 text-slate-700";

  return (
    <div className={`role-shell marketing-shell ${dark ? "dark-theme" : "light-theme"} ${embedded ? "w-full min-h-full pb-16" : "h-screen w-full overflow-hidden flex flex-row"} transition-colors duration-200 ${pageBg}`}>
      {/* Toast Notice */}
      <AnimatePresence>
        {notice && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full px-5 py-2 text-xs font-mono font-medium shadow-xl border ${
              dark ? "bg-slate-900 text-white border-slate-700" : "bg-black text-white border-black"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{notice}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SIDEBAR NAVIGATION (Standalone) */}
      {!embedded && (
        <aside className={`w-[260px] shrink-0 ${sidebarOpen ? "hidden md:flex" : "hidden"} flex-col border-r ${bgSidebar} h-screen z-20 select-none transition-all duration-300`}>
          {/* Brand Header */}
          <div className={`px-4 py-3.5 border-b ${dark ? "border-slate-800" : "border-slate-200/80"} flex items-center justify-between`}>
            <ZootechXLogo variant="full" size="sm" dark={dark} subtitle="MARKETING HUB" />
            {admin && onBack && (
              <button
                onClick={onBack}
                title="Return to portal"
                className={`p-1.5 rounded-lg border ${dark ? "border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/50" : "border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100"} transition`}
              >
                <ChevronRight size={16} className="rotate-180" />
              </button>
            )}
          </div>

          <div className="px-3.5 pt-4 pb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8] dark:text-slate-500">MENU</span>
          </div>

          {/* Navigation List */}
          <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
            {[
              { id: "overview", label: "Overview", icon: LayoutDashboard },
              { id: "clients", label: "Clients", icon: Users },
              { id: "projects", label: "Campaign Projects", icon: Target },
              { id: "assets", label: "Creative Assets", icon: Layers },
              { id: "mockups", label: "Ad Mockups", icon: Megaphone, isNew: true },
            ].map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
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
                  {item.isNew && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E8F8EE] text-[#059669] dark:bg-emerald-500/10 dark:text-emerald-400">
                      NEW
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Bottom Actions */}
          <div className={`p-4 border-t ${dark ? "border-slate-800" : "border-slate-200/80"} space-y-3`}>
            <div className={`flex items-center gap-2.5 px-3 py-2 rounded-xl ${dark ? "bg-slate-800/40 border border-slate-800" : "bg-slate-50 border border-slate-200/80"}`}>
              <div className={`h-8 w-8 rounded-lg font-bold flex items-center justify-center text-xs shrink-0 ${dark ? "bg-white text-black" : "bg-slate-900 text-white"} shadow-2xs`}>
                {currentUser?.name ? currentUser.name.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase() : "DM"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className={`text-xs font-bold truncate leading-tight ${dark ? "text-white" : "text-slate-900"}`}>{currentUser?.name || "Marketing"}</p>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                </div>
                <p className="text-[10px] truncate leading-tight text-slate-500 dark:text-slate-400">{currentUser?.email || "marketing@zootechx"}</p>
              </div>
            </div>
            {onLogout && (
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition"
              >
                <LogOut size={15} />
                <span>Sign out</span>
              </button>
            )}
          </div>
        </aside>
      )}

      {/* MAIN VIEWPORT */}
      <div className={`flex-1 min-w-0 ${embedded ? "" : "h-screen overflow-hidden flex flex-col"}`}>
        {/* TOP HEADER - Exact TailAdmin Layout matching demo.tailadmin.com */}
        <header className={`sticky top-0 z-40 w-full h-[68px] border-b flex items-center justify-between gap-4 px-4 sm:px-6 transition-colors duration-200 relative ${
          dark
            ? "border-slate-800 bg-[#090d16] text-white shadow-[0_2px_12px_-2px_rgba(0,0,0,0.3)]"
            : "border-slate-200/90 bg-white text-slate-900 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.04)]"
        }`}>
          {/* Left: Hamburger / Back Toggle + Search Bar */}
          <div className="flex items-center gap-3 flex-1 max-w-[440px]">
            {admin && onBack && !embedded ? (
              <button
                type="button"
                onClick={onBack}
                className="h-10 w-10 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-2xs transition shrink-0"
                title="Back to Admin"
              >
                <ChevronRight size={16} className="rotate-180" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (embedded) {
                    setMobileNavOpen(!mobileNavOpen);
                  } else {
                    setSidebarOpen(!sidebarOpen);
                    setMobileNavOpen(!mobileNavOpen);
                  }
                }}
                className="h-10 w-10 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-2xs transition shrink-0"
                title="Toggle Sidebar"
              >
                <Menu size={18} />
              </button>
            )}

            <div ref={searchContainerRef} className="flex items-center flex-1 relative">
              <Search size={16} className={`absolute left-3.5 ${searchQuery ? "text-pink-500" : "text-slate-400"} transition-colors pointer-events-none`} />
              <input
                value={searchQuery}
                onFocus={() => setIsSearchOpen(true)}
              onChange={(e) => { setSearchQuery(e.target.value); setIsSearchOpen(true); }}
              placeholder="Search or type command..."
              className={`w-full h-10 pl-10 pr-14 rounded-xl border text-sm transition-all outline-none shadow-2xs ${
                dark
                  ? "bg-slate-900/90 border-slate-800 text-slate-100 placeholder-slate-500 focus:border-pink-500/80 focus:bg-slate-900 focus:ring-2 focus:ring-pink-500/20"
                  : "bg-slate-50/70 border-slate-200/90 text-slate-900 placeholder-slate-400 hover:bg-slate-50 focus:bg-white focus:border-pink-500 focus:ring-2 focus:ring-pink-500/15"
              }`}
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => { setSearchQuery(""); setIsSearchOpen(false); }}
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

            {searchQuery && isSearchOpen && (
              <div className={`absolute top-12 left-0 w-full rounded-2xl border shadow-2xl z-50 max-h-[320px] overflow-auto ${bgCard} p-2`}>
                {searchMatches.clients.length > 0 && (
                  <div>
                    <div className="px-2 pt-1 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Marketing Clients</div>
                    {searchMatches.clients.map(client => (
                      <button key={client.id} onClick={() => { setActiveTab("clients"); setSearchQuery(""); setIsSearchOpen(false); }} className={`w-full text-left p-2.5 rounded-xl flex items-center gap-3 hover:${dark ? "bg-white/5" : "bg-slate-50"}`}>
                        <div className="h-8 w-8 rounded-full bg-pink-600 text-white flex items-center justify-center text-[11px] font-bold">
                          {client.name ? client.name.charAt(0) : "C"}
                        </div>
                        <div>
                          <div className="text-[13px] font-medium">{client.name}</div>
                          <div className="text-[11px] text-slate-400">{client.industry} · {client.contact_name}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {searchMatches.projects.length > 0 && (
                  <div>
                    <div className="px-2 pt-2 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Campaigns & Projects</div>
                    {searchMatches.projects.map(project => (
                      <button key={project.id} onClick={() => { setActiveTab("projects"); setSearchQuery(""); setIsSearchOpen(false); }} className={`w-full text-left p-2.5 rounded-xl flex items-center gap-3 hover:${dark ? "bg-white/5" : "bg-slate-50"}`}>
                        <div className="h-8 w-8 rounded-xl bg-pink-600/10 text-pink-400 flex items-center justify-center">
                          <Target size={14} />
                        </div>
                        <div>
                          <div className="text-[13px] font-medium">{project.title}</div>
                          <div className="text-[11px] text-slate-400">{project.client_name} · {project.category}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {searchMatches.assets.length > 0 && (
                  <div>
                    <div className="px-2 pt-2 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Creative Assets</div>
                    {searchMatches.assets.map(asset => (
                      <button key={asset.id} onClick={() => { setActiveTab("assets"); setSearchQuery(""); setIsSearchOpen(false); }} className={`w-full text-left p-2.5 rounded-xl flex items-center gap-3 hover:${dark ? "bg-white/5" : "bg-slate-50"}`}>
                        <div className="h-8 w-8 rounded-xl bg-indigo-600/10 text-indigo-400 flex items-center justify-center">
                          <Layers size={14} />
                        </div>
                        <div>
                          <div className="text-[13px] font-medium">{asset.name}</div>
                          <div className="text-[11px] text-slate-400">{asset.client_name} · {asset.asset_type}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {searchMatches.clients.length === 0 && searchMatches.projects.length === 0 && searchMatches.assets.length === 0 && (
                  <div className="p-3 text-[13px] text-slate-400">No matching clients, campaigns, or assets</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Center: Navigation Pill Switcher (Shown when embedded) */}
        {embedded && (
          <div className="hidden md:flex items-center gap-1 rounded-xl p-1 border bg-slate-100/90 dark:bg-slate-900/90 border-slate-200/90 dark:border-slate-800 shadow-2xs">
            {[
              { id: "overview", label: "Overview" },
              { id: "clients", label: "Clients" },
              { id: "projects", label: "Projects" },
              { id: "assets", label: "Assets" },
              { id: "mockups", label: "Ad Mockups" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  activeTab === tab.id
                    ? dark ? "bg-[#3758F9]/15 text-[#5475F9] font-semibold shadow-xs" : "bg-[#ECF2FE] text-[#3758F9] font-semibold shadow-xs"
                    : `${textSub} hover:text-slate-900 dark:hover:text-white`
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Right: Actions, Theme Toggle, Notifications, Profile */}
        <div className="flex items-center gap-3">
          {!readOnly && (
            <button
              type="button"
              onClick={() => setShowAddClientModal(true)}
              className="hidden sm:flex items-center gap-1.5 rounded-xl h-10 px-3.5 text-xs font-semibold bg-slate-900 hover:bg-black dark:bg-pink-600 dark:hover:bg-pink-500 text-white transition shadow-sm shrink-0"
            >
              <Plus size={14} />
              <span>Client</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => loadAllData(true)}
            disabled={refreshing}
            className="h-10 w-10 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 shadow-2xs transition shrink-0"
            title="Refresh Telemetry"
          >
            <RefreshCw size={15} className={refreshing ? "animate-spin text-pink-400" : ""} />
          </button>

          {/* Circular Theme Toggle Button (TailAdmin style) */}
          <button
            onClick={() => handleToggleTheme()}
            type="button"
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
              {marketingAlerts.length > 0 && (
                <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#f97316] ring-2 ring-white dark:ring-slate-900" />
              )}
            </button>
            {notifOpen && (
              <div className={`absolute right-0 top-12 w-[340px] rounded-2xl border shadow-2xl z-50 ${bgCard} overflow-hidden`}>
                <div className={`p-4 border-b ${dark ? "border-slate-800" : "border-slate-100"}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="font-bold text-[14px]">Marketing Campaigns</div>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-pink-500/15 text-pink-500 border border-pink-500/30">
                        ROAS
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">{marketingAlerts.length} pending review</span>
                  </div>
                </div>
                <div className="max-h-[300px] overflow-auto divide-y divide-slate-100 dark:divide-slate-800">
                  {marketingAlerts.slice(0, 6).map((proj) => (
                    <div key={proj.id} onClick={() => { setActiveTab("projects"); setNotifOpen(false); }} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition flex items-start gap-2.5">
                      <div className="w-2 h-2 rounded-full bg-pink-500 mt-1.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">{proj.title}</p>
                        <p className="text-[11px] text-slate-400 truncate">{proj.client_name} · {proj.status}</p>
                      </div>
                    </div>
                  ))}
                  {marketingAlerts.length === 0 && (
                    <div className="p-6 text-center text-xs text-slate-400">All campaigns active 🎉</div>
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
                {currentUser?.name ? currentUser.name.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase() : "DM"}
              </div>
              <span className="hidden sm:inline text-sm font-semibold text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white transition">
                {currentUser?.name?.split(" ")[0] || "Marketing"}
              </span>
              <ChevronDown size={15} className={`text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-transform duration-200 ${userDropdownOpen ? "rotate-180" : ""}`} />
            </button>
            {userDropdownOpen && (
              <div className={`absolute right-0 top-12 w-56 rounded-2xl border shadow-2xl z-50 p-2 ${bgCard}`}>
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{currentUser?.name || "Digital Marketing"}</p>
                  <p className="text-[11px] text-slate-400 truncate">{currentUser?.email || "marketing@zootechx"}</p>
                </div>
                <button
                  onClick={() => { setActiveTab("overview"); setUserDropdownOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:${dark ? "bg-white/5" : "bg-slate-100"} transition`}
                >
                  <Settings size={14} />
                  <span>Marketing Overview</span>
                </button>
                <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                {onLogout && (
                  <button
                    onClick={() => { setUserDropdownOpen(false); onLogout(); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-500 hover:bg-rose-500/10 transition"
                  >
                    <LogOut size={14} />
                    <span>Sign out</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileNavOpen && (
          <div className="mt-2.5 flex md:hidden items-center gap-1 overflow-x-auto pb-1 text-xs border-t border-slate-200 dark:border-slate-800 pt-2">
            {[
              { id: "overview", label: "Overview" },
              { id: "clients", label: "Clients" },
              { id: "projects", label: "Projects" },
              { id: "assets", label: "Assets" },
              { id: "mockups", label: "Ad Mockups" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id as any); setMobileNavOpen(false); }}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                  activeTab === tab.id
                    ? dark ? "bg-[#3758F9]/15 text-[#5475F9] font-semibold" : "bg-[#ECF2FE] text-[#3758F9] font-semibold"
                    : textSub
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* MAIN CONTAINER */}
      <main className={`mx-auto w-full max-w-7xl ${embedded ? "px-4 sm:px-8 py-8 sm:py-12 space-y-12" : "flex-1 overflow-y-auto px-4 sm:px-8 py-8 sm:py-12 space-y-12"}`}>
        {/* ========================================================================= */}
        {/* EDITORIAL HERO SECTION (SHOWN ON OVERVIEW) */}
        {/* ========================================================================= */}
        {/* ========================================================================= */}
        {/* TAILADMIN MARKETING DASHBOARD OVERVIEW */}
        {/* ========================================================================= */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* ====== Top Metric Cards Group ====== */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 xl:grid-cols-3">
              {/* Metric 1 */}
              <div className="tail-card p-5 md:p-6">
                <div className="tail-metric-icon mb-5">
                  <Sparkles size={24} className="text-indigo-600 dark:text-indigo-400" />
                </div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Avg. Client Rating</p>
                <div className="mt-3 flex items-end justify-between">
                  <h4 className="text-2xl font-bold text-slate-800 dark:text-white">7.8/10</h4>
                  <div className="flex items-center gap-1.5">
                    <span className="tail-badge-success">+20%</span>
                    <span className="text-xs text-slate-400">Vs last month</span>
                  </div>
                </div>
              </div>

              {/* Metric 2 */}
              <div className="tail-card p-5 md:p-6">
                <div className="tail-metric-icon mb-5">
                  <Users size={24} className="text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Instagram Followers</p>
                <div className="mt-3 flex items-end justify-between">
                  <h4 className="text-2xl font-bold text-slate-800 dark:text-white">5,934</h4>
                  <div className="flex items-center gap-1.5">
                    <span className="tail-badge-danger">-3.59%</span>
                    <span className="text-xs text-slate-400">Vs last month</span>
                  </div>
                </div>
              </div>

              {/* Metric 3 */}
              <div className="tail-card p-5 md:p-6">
                <div className="tail-metric-icon mb-5">
                  <DollarSign size={24} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Revenue</p>
                <div className="mt-3 flex items-end justify-between">
                  <h4 className="text-2xl font-bold text-slate-800 dark:text-white">
                    ${overview?.totalMonthlyRetainer ? overview.totalMonthlyRetainer.toLocaleString() : "9,758"}
                  </h4>
                  <div className="flex items-center gap-1.5">
                    <span className="tail-badge-success">+15%</span>
                    <span className="text-xs text-slate-400">Vs last month</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ====== Main 12-Column Grid ====== */}
            <div className="grid grid-cols-12 gap-4 md:gap-6">
              {/* Left 8 Columns */}
              <div className="col-span-12 xl:col-span-8 space-y-6">
                {/* Chart Card: Impression & Data Traffic */}
                <div className="tail-card p-5 sm:p-6">
                  <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
                        Impression & Data Traffic
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Jun 1, 2024 - Dec 1, 2025
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-bold text-slate-800 dark:text-white">
                            ${overview?.totalMonthlyRetainer ? overview.totalMonthlyRetainer.toLocaleString() : "9,758.00"}
                          </span>
                          <span className="tail-badge-success">+7.96%</span>
                        </div>
                        <span className="text-xs text-slate-500 dark:text-slate-400 block text-right">
                          Total Revenue
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Recharts Area Chart */}
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={[
                          { month: "Jan", impressions: 4200, traffic: 2400 },
                          { month: "Feb", impressions: 5300, traffic: 3100 },
                          { month: "Mar", impressions: 6100, traffic: 3900 },
                          { month: "Apr", impressions: 5800, traffic: 4200 },
                          { month: "May", impressions: 7500, traffic: 5200 },
                          { month: "Jun", impressions: 8400, traffic: 5900 },
                          { month: "Jul", impressions: 7900, traffic: 6300 },
                          { month: "Aug", impressions: 9200, traffic: 6800 },
                          { month: "Sep", impressions: 9800, traffic: 7400 },
                          { month: "Oct", impressions: 11200, traffic: 8100 },
                          { month: "Nov", impressions: 12600, traffic: 8900 },
                          { month: "Dec", impressions: 13900, traffic: 9758 },
                        ]}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="colorImpressions" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorTraffic" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={dark ? "#1e293b" : "#f1f5f9"} />
                        <XAxis dataKey="month" stroke={dark ? "#64748b" : "#94a3b8"} fontSize={12} tickLine={false} />
                        <YAxis stroke={dark ? "#64748b" : "#94a3b8"} fontSize={12} tickLine={false} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: dark ? "#0f172a" : "#ffffff",
                            borderColor: dark ? "#1e293b" : "#e2e8f0",
                            borderRadius: "0.75rem",
                            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                            fontSize: "12px"
                          }}
                        />
                        <Area type="monotone" dataKey="impressions" stroke="#4f46e5" strokeWidth={2.5} fillOpacity={1} fill="url(#colorImpressions)" name="Impressions" />
                        <Area type="monotone" dataKey="traffic" stroke="#06b6d4" strokeWidth={2.5} fillOpacity={1} fill="url(#colorTraffic)" name="Traffic" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Table Card: Featured Campaigns */}
                <div className="tail-card overflow-hidden">
                  <div className="flex items-center justify-between p-5 sm:px-6 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Featured Campaigns</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Active growth deliverables across client accounts</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab("projects")}
                      className="tail-btn-secondary"
                    >
                      <span>View All</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50/70 dark:bg-slate-800/30 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                        <tr>
                          <th className="py-3 px-5 sm:px-6 font-medium">Creator / Client</th>
                          <th className="py-3 px-5 sm:px-6 font-medium">Campaign</th>
                          <th className="py-3 px-5 sm:px-6 font-medium">Status</th>
                          <th className="py-3 px-5 sm:px-6 font-medium text-right">ROAS Target</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {(projects.length > 0 ? projects.slice(0, 5) : [
                          { id: "1", client_name: "Wilson Gouse", title: "Grow your brand by multi-channel", category: "Ads campaign", status: "ACTIVE", target_roas: 5.4 },
                          { id: "2", client_name: "Terry Franci", title: "Make Better Ideas - Meta Launch", category: "Ads campaign", status: "IN_PROGRESS", target_roas: 4.8 },
                          { id: "3", client_name: "Alena Franci", title: "Increase website traffic with SEO", category: "SEO campaign", status: "ACTIVE", target_roas: 6.2 },
                          { id: "4", client_name: "Jocelyn Kenter", title: "Digital Marketing that converts", category: "Paid Search", status: "PLANNING", target_roas: 4.5 },
                          { id: "5", client_name: "Brandon Philips", title: "Self branding & retargeting", category: "Ads campaign", status: "ACTIVE", target_roas: 5.0 },
                        ]).map((p: any, idx: number) => (
                          <tr key={p.id || idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition">
                            <td className="py-3.5 px-5 sm:px-6">
                              <div className="flex items-center gap-3">
                                <div className="relative h-9 w-9 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-200 shrink-0">
                                  {p.client_name ? p.client_name.split(" ").map((w: string) => w[0]).slice(0, 2).join("") : "DM"}
                                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
                                </div>
                                <div>
                                  <p className="font-semibold text-slate-800 dark:text-white text-xs">{p.client_name}</p>
                                  <span className="text-[11px] text-slate-400">{p.category || "Client Account"}</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-5 sm:px-6">
                              <div>
                                <p className="font-medium text-slate-800 dark:text-white text-xs truncate max-w-xs">{p.title}</p>
                                <span className="text-[11px] text-slate-400">Deliverable Strategy</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-5 sm:px-6">
                              <span className={
                                p.status === "ACTIVE" || p.status === "COMPLETED" || p.status === "APPROVED"
                                  ? "tail-badge-success"
                                  : p.status === "IN_PROGRESS" || p.status === "PLANNING"
                                  ? "tail-badge-warning"
                                  : "tail-badge-danger"
                              }>
                                {p.status === "ACTIVE" ? "Success" : p.status === "IN_PROGRESS" ? "Pending" : p.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-5 sm:px-6 text-right font-semibold text-slate-800 dark:text-white text-xs">
                              {p.target_roas ? `${p.target_roas}x` : "5.0x"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Right 4 Columns */}
              <div className="col-span-12 xl:col-span-4 space-y-6">
                {/* Traffic Stats Card */}
                <div className="tail-card p-5 sm:p-6">
                  <div className="flex items-center justify-between gap-2 mb-5">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Traffic Stats</h3>
                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl text-xs">
                      {(["today", "week", "month"] as const).map((period) => (
                        <button
                          key={period}
                          type="button"
                          onClick={() => setTrafficPeriod(period)}
                          className={`rounded-lg px-2.5 py-1 capitalize font-medium transition ${
                            trafficPeriod === period
                              ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold"
                              : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
                          }`}
                        >
                          {period}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {/* Item 1 */}
                    <div className="flex items-end justify-between py-4">
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">New Subscribers</p>
                        <h4 className="text-2xl font-bold text-slate-800 dark:text-white">567K</h4>
                        <span className="flex items-center gap-1 mt-1">
                          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">+3.85%</span>
                          <span className="text-[11px] text-slate-400">then last Week</span>
                        </span>
                      </div>
                      <div className="h-9 w-24">
                        <svg className="w-full h-full text-emerald-500" viewBox="0 0 100 30" fill="none">
                          <path d="M0 25 Q 25 5, 50 18 T 100 8" stroke="currentColor" strokeWidth="2.5" fill="none" />
                        </svg>
                      </div>
                    </div>

                    {/* Item 2 */}
                    <div className="flex items-end justify-between py-4">
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Conversion Rate</p>
                        <h4 className="text-2xl font-bold text-slate-800 dark:text-white">276K</h4>
                        <span className="flex items-center gap-1 mt-1">
                          <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">-5.39%</span>
                          <span className="text-[11px] text-slate-400">then last Week</span>
                        </span>
                      </div>
                      <div className="h-9 w-24">
                        <svg className="w-full h-full text-rose-500" viewBox="0 0 100 30" fill="none">
                          <path d="M0 8 Q 25 22, 50 12 T 100 24" stroke="currentColor" strokeWidth="2.5" fill="none" />
                        </svg>
                      </div>
                    </div>

                    {/* Item 3 */}
                    <div className="flex items-end justify-between py-4">
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Page Bounce Rate</p>
                        <h4 className="text-2xl font-bold text-slate-800 dark:text-white">285</h4>
                        <span className="flex items-center gap-1 mt-1">
                          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">+12.74%</span>
                          <span className="text-[11px] text-slate-400">then last Week</span>
                        </span>
                      </div>
                      <div className="h-9 w-24">
                        <svg className="w-full h-full text-emerald-500" viewBox="0 0 100 30" fill="none">
                          <path d="M0 20 Q 25 10, 50 22 T 100 5" stroke="currentColor" strokeWidth="2.5" fill="none" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Top Traffic Source Card */}
                <div className="tail-card p-5 sm:p-6">
                  <div className="flex items-center justify-between gap-2 mb-5">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Top Traffic Source</h3>
                    <button type="button" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                      <Sliders size={16} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    {[
                      { name: "Google", pct: 79, color: "bg-indigo-600", dot: "bg-blue-500" },
                      { name: "YouTube", pct: 55, color: "bg-red-500", dot: "bg-red-500" },
                      { name: "Facebook", pct: 48, color: "bg-blue-600", dot: "bg-blue-600" },
                      { name: "Instagram", pct: 48, color: "bg-pink-500", dot: "bg-pink-500" },
                    ].map((item) => (
                      <div key={item.name} className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className={`h-2.5 w-2.5 rounded-full ${item.dot}`} />
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-3 w-40">
                          <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.pct}%` }} />
                          </div>
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 w-8 text-right">{item.pct}%</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6">
                    <button
                      type="button"
                      onClick={() => setActiveTab("clients")}
                      className="tail-btn-secondary w-full"
                    >
                      View All Client Sources
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Client Retainer Distribution Row */}
            {overview && (
              <div className="tail-card p-5 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Active Client Portfolio</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Monthly retainers, active growth deliverables, and creative assets under management</p>
                  </div>
                  <div className="text-xs text-slate-500">
                    Monthly Retainers: <strong className="text-slate-900 dark:text-white font-bold">${overview.totalMonthlyRetainer.toLocaleString()}</strong>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {overview.clientPortfolio.map((cp, idx) => (
                    <div key={idx} className="tail-card p-4 space-y-3 border border-slate-200/80 dark:border-slate-800">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900 dark:text-white truncate">{cp.name}</span>
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                          ${cp.retainer.toLocaleString()}/mo
                        </span>
                      </div>
                      <div className="space-y-1 text-xs text-slate-500">
                        <div className="flex justify-between">
                          <span>Projects:</span>
                          <strong className="text-slate-700 dark:text-slate-300">{cp.projectCount}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Assets:</span>
                          <strong className="text-slate-700 dark:text-slate-300">{cp.assetCount}</strong>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const target = clients.find((c) => c.name === cp.name);
                          if (target) setSelectedClientId(target.id);
                          setActiveTab("projects");
                        }}
                        className="tail-btn-secondary w-full text-[11px] py-1.5"
                      >
                        View Projects
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: CLIENTS DIRECTORY */}
        {/* ========================================================================= */}
        {activeTab === "clients" && (
          <section className="space-y-6 pt-4 border-t border-inherit">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold font-editorial">Client Brands & Retainers</h2>
                <p className={`text-xs ${textMuted}`}>Manage client contracts, primary contacts, industries, and service levels.</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={exportClientsCsv}
                  className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium border ${pillOutline}`}
                >
                  <Download size={13} />
                  <span>Export Clients</span>
                </button>

                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => setShowAddClientModal(true)}
                    className={`flex items-center gap-1.5 rounded-full px-5 py-2 text-xs font-medium ${pillBlack}`}
                  >
                    <span>+ Onboard New Client</span>
                    <ArrowUpRight size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Client Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredClients.map((client) => {
                const clientProjects = projects.filter((p) => p.client_id === client.id);
                const clientAssets = assets.filter((a) => a.client_id === client.id);

                return (
                  <div key={client.id} className={`rounded-3xl border p-6 flex flex-col justify-between space-y-4 ${whiteCard}`}>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-mono font-medium ${
                          client.status === "ACTIVE" ? pillBlack : pillSand
                        }`}>
                          {client.status}
                        </span>
                        <span className="text-emerald-600 font-bold font-mono text-sm">
                          ${client.monthly_retainer.toLocaleString()}/mo
                        </span>
                      </div>

                      <div>
                        <h3 className="font-bold text-lg font-sans text-stone-900 dark:text-stone-100">{client.name}</h3>
                        <p className={`text-xs ${textSub} font-mono mt-0.5`}>{client.industry}</p>
                      </div>

                      <div className={`p-3 rounded-2xl border ${sandCard} space-y-1.5 text-xs font-mono`}>
                        <div className="flex items-center justify-between text-stone-500">
                          <span>Contact Person:</span>
                          <span className="font-semibold text-stone-900 dark:text-stone-100">{client.contact_name}</span>
                        </div>
                        <div className="flex items-center justify-between text-stone-500">
                          <span>Email:</span>
                          <a href={`mailto:${client.contact_email}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                            {client.contact_email}
                          </a>
                        </div>
                        {client.website && (
                          <div className="flex items-center justify-between text-stone-500">
                            <span>Website:</span>
                            <a href={client.website} target="_blank" rel="noreferrer" className="text-stone-600 dark:text-stone-400 hover:underline flex items-center gap-1">
                              <span>{client.website.replace(/^https?:\/\//, "")}</span>
                              <ExternalLink size={10} />
                            </a>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-center text-xs font-mono">
                        <div className={`p-2 rounded-xl border ${sandCard}`}>
                          <div className="text-stone-400 text-[10px]">Active Projects</div>
                          <div className="font-bold text-stone-800 dark:text-stone-200 mt-0.5">{clientProjects.length}</div>
                        </div>
                        <div className={`p-2 rounded-xl border ${sandCard}`}>
                          <div className="text-stone-400 text-[10px]">Client Assets</div>
                          <div className="font-bold text-stone-800 dark:text-stone-200 mt-0.5">{clientAssets.length}</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-inherit">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedClientId(client.id);
                            setActiveTab("projects");
                          }}
                          className={`rounded-full px-3 py-1 text-xs font-mono border ${pillOutline}`}
                        >
                          Projects ({clientProjects.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedClientId(client.id);
                            setActiveTab("assets");
                          }}
                          className={`rounded-full px-3 py-1 text-xs font-mono border ${pillOutline}`}
                        >
                          Assets ({clientAssets.length})
                        </button>
                      </div>

                      {!readOnly && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingClient(client)}
                            className={`rounded-full p-1.5 border ${pillOutline}`}
                            title="Edit Client"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteClient(client.id)}
                            className="text-stone-400 hover:text-red-500 transition p-1.5"
                            title="Delete Client"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: CLIENT PROJECTS */}
        {/* ========================================================================= */}
        {activeTab === "projects" && (
          <section className="space-y-6 pt-4 border-t border-inherit">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold font-editorial">Client Marketing Projects</h2>
                <p className={`text-xs ${textMuted}`}>Deliverable schedules, ad spend budgets, and ROAS performance targets.</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={exportProjectsCsv}
                  className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium border ${pillOutline}`}
                >
                  <Download size={13} />
                  <span>Export Projects</span>
                </button>

                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => setShowAddProjectModal(true)}
                    className={`flex items-center gap-1.5 rounded-full px-5 py-2 text-xs font-medium ${pillBlack}`}
                  >
                    <span>+ Create Client Project</span>
                    <ArrowUpRight size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                <span className="text-stone-400">Filter Client:</span>
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className={`rounded-full px-3 py-1 text-xs font-mono border outline-none ${whiteCard}`}
                >
                  <option value="ALL">All Clients ({projects.length})</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>

                <span className="text-stone-400 ml-2">Category:</span>
                {["ALL", "Paid Search", "Paid Social", "Brand & Creative"].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setProjectCategoryFilter(cat)}
                    className={`rounded-full px-3 py-1 text-[11px] font-medium transition ${
                      projectCategoryFilter === cat ? (dark ? "bg-white text-black" : "bg-black text-white") : pillOutline
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <div className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 border text-xs font-mono ${whiteCard}`}>
                  <Search size={13} className="text-stone-400" />
                  <input
                    type="text"
                    placeholder="Search projects..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent outline-none text-xs w-36 sm:w-44"
                  />
                  {searchQuery && (
                    <button type="button" onClick={() => setSearchQuery("")} className="text-stone-400 hover:text-black dark:hover:text-white">
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Projects Table */}
            <div className={`rounded-3xl border overflow-hidden ${whiteCard}`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className={`border-b ${dark ? "border-[#30363d] bg-[#161b22]" : "border-[#ede7dc] bg-[#f8f5ee]"} text-stone-400 text-[11px]`}>
                    <tr>
                      <th className="px-6 py-3.5">Project Title & Deliverables</th>
                      <th className="px-6 py-3.5">Client & Category</th>
                      <th className="px-6 py-3.5">Spend / Budget</th>
                      <th className="px-6 py-3.5">Target ROAS</th>
                      <th className="px-6 py-3.5">Deadline</th>
                      <th className="px-6 py-3.5">Status</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-inherit">
                    {filteredProjects.map((proj) => (
                      <tr key={proj.id} className="hover:bg-stone-500/5 transition">
                        <td className="px-6 py-4">
                          <div className="font-sans font-bold text-sm text-stone-900 dark:text-stone-100">{proj.title}</div>
                          <div className="text-[10px] text-stone-400 mt-0.5 max-w-sm truncate">{proj.deliverables}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-stone-800 dark:text-stone-200">{proj.client_name}</div>
                          <div className="text-[10px] text-stone-400">{proj.category}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-stone-800 dark:text-stone-200 font-semibold">
                            ${proj.spend.toLocaleString()} / <span className="text-stone-400 font-normal">${proj.budget.toLocaleString()}</span>
                          </div>
                          <div className="w-24 h-1 bg-stone-200 dark:bg-stone-700 rounded-full mt-1.5 overflow-hidden">
                            <div
                              className="h-full bg-black dark:bg-white rounded-full"
                              style={{ width: `${Math.min(100, proj.budget > 0 ? (proj.spend / proj.budget) * 100 : 0)}%` }}
                            />
                          </div>
                        </td>
                        <td className="px-6 py-4 font-bold text-emerald-600 dark:text-emerald-400">
                          {proj.current_roas}x <span className="text-stone-400 text-[10px] font-normal">({proj.target_roas}x goal)</span>
                        </td>
                        <td className="px-6 py-4 text-stone-500">{proj.deadline}</td>
                        <td className="px-6 py-4">
                          {!readOnly ? (
                            <select
                              value={proj.status}
                              onChange={(e) => handleUpdateProjectStatus(proj.id, e.target.value as any)}
                              className={`rounded-full px-2.5 py-0.5 text-[10px] font-mono border outline-none ${
                                proj.status === "ACTIVE" ? pillBlack : pillSand
                              }`}
                            >
                              <option value="PLANNING">PLANNING</option>
                              <option value="IN_PROGRESS">IN_PROGRESS</option>
                              <option value="IN_REVIEW">IN_REVIEW</option>
                              <option value="ACTIVE">ACTIVE</option>
                              <option value="COMPLETED">COMPLETED</option>
                            </select>
                          ) : (
                            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-mono border ${
                              proj.status === "ACTIVE" ? pillBlack : pillSand
                            }`}>
                              {proj.status}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {!readOnly && (
                            <button
                              type="button"
                              onClick={() => handleDeleteProject(proj.id)}
                              className="text-stone-400 hover:text-red-500 transition p-1"
                              title="Delete Project"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* VIEW 4: CLIENT ASSETS HUB */}
        {/* ========================================================================= */}
        {activeTab === "assets" && (
          <section className="space-y-6 pt-4 border-t border-inherit">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold font-editorial">Client Creative & Ad Assets</h2>
                <p className={`text-xs ${textMuted}`}>Ad copy, video hook scripts, Figma files, and design assets organized per client brand.</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={exportAssetsCsv}
                  className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium border ${pillOutline}`}
                >
                  <Download size={13} />
                  <span>Export Assets</span>
                </button>

                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => setShowAddAssetModal(true)}
                    className={`flex items-center gap-1.5 rounded-full px-5 py-2 text-xs font-medium ${pillBlack}`}
                  >
                    <span>+ Add Client Asset</span>
                    <ArrowUpRight size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                <span className="text-stone-400">Client:</span>
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className={`rounded-full px-3 py-1 text-xs font-mono border outline-none ${whiteCard}`}
                >
                  <option value="ALL">All Clients ({assets.length})</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>

                <span className="text-stone-400 ml-2">Review Status:</span>
                {["ALL", "APPROVED", "IN_REVIEW", "NEEDS_REVISION", "DRAFT"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setAssetStatusFilter(st)}
                    className={`rounded-full px-3 py-1 text-[11px] font-medium transition ${
                      assetStatusFilter === st ? (dark ? "bg-white text-black" : "bg-black text-white") : pillOutline
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Asset Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredAssets.map((asset) => (
                <div key={asset.id} className={`rounded-3xl border p-5 flex flex-col justify-between space-y-4 ${whiteCard}`}>
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2.5 py-0.5 ${pillSand}`}>{asset.file_format}</span>
                        <span className="text-stone-400">• {asset.version}</span>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        asset.status === "APPROVED"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                          : asset.status === "IN_REVIEW"
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                          : pillSand
                      }`}>
                        {asset.status}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-bold text-base font-sans text-stone-900 dark:text-stone-100">{asset.name}</h3>
                      <div className="flex items-center gap-2 text-xs font-mono text-stone-500 mt-0.5">
                        <span className="font-semibold text-stone-700 dark:text-stone-300">{asset.client_name}</span>
                        {asset.project_title && <span>• {asset.project_title}</span>}
                      </div>
                    </div>

                    {asset.notes && (
                      <p className={`text-xs ${textSub} leading-relaxed`}>{asset.notes}</p>
                    )}
                  </div>

                  <div className={`p-3 rounded-2xl border ${sandCard} flex flex-wrap items-center justify-between gap-2 text-xs font-mono`}>
                    <span className="text-stone-500 truncate max-w-[200px]">{asset.asset_url}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPreviewingAsset(asset)}
                        className="text-stone-900 dark:text-white font-semibold flex items-center gap-1 hover:underline"
                      >
                        <Eye size={12} />
                        <span>Inspect & Review</span>
                      </button>

                      <a
                        href={asset.asset_url}
                        target="_blank"
                        rel="noreferrer"
                        className={`rounded-full p-1 border ${pillOutline}`}
                        title="Open External URL"
                      >
                        <ExternalLink size={12} />
                      </a>

                      {!readOnly && (
                        <button
                          type="button"
                          onClick={() => handleDeleteAsset(asset.id)}
                          className="text-stone-400 hover:text-red-500 transition p-1"
                          title="Delete Asset"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* VIEW 5: LIVE AD MOCKUPS */}
        {/* ========================================================================= */}
        {activeTab === "mockups" && (
          <section className="space-y-6 pt-4 border-t border-inherit">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold font-editorial">Live Multi-Channel Ad Simulator</h2>
                <p className={`text-xs ${textMuted}`}>Preview how client copy and creative assets render live across search, feed, and inmail channels.</p>
              </div>

              {/* Format Mockup Switcher */}
              <div className="flex items-center gap-1.5 font-mono text-xs">
                {(["google", "linkedin", "meta"] as const).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setMockupFormat(fmt)}
                    className={`rounded-full px-3.5 py-1 font-medium capitalize transition ${
                      mockupFormat === fmt ? (dark ? "bg-white text-black" : "bg-black text-white") : pillOutline
                    }`}
                  >
                    {fmt === "google" ? "Google Search" : fmt === "linkedin" ? "LinkedIn Feed" : "Meta / Instagram"}
                  </button>
                ))}
              </div>
            </div>

            {/* Mockup Frame */}
            <div className={`max-w-2xl mx-auto rounded-3xl border p-6 sm:p-8 space-y-4 ${sandCard}`}>
              {mockupFormat === "google" && (
                <div className="space-y-2 text-left">
                  <div className="flex items-center gap-2 text-[11px] font-mono text-stone-500">
                    <span className="font-bold text-black dark:text-white">Sponsored</span>
                    <span>•</span>
                    <span>https://apexlogistics.io/enterprise-freight</span>
                  </div>
                  <h4 className="text-lg font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
                    Apex Global Logistics | Automated Freight & Multi-Modal Supply Chain
                  </h4>
                  <p className={`text-xs ${textSub} leading-relaxed`}>
                    Scale distribution by 10x with zero tracking latency. Instant custom quotes, automated freight compliance, and guaranteed SLA fulfillment for global enterprises.
                  </p>
                  <div className="pt-3 flex flex-wrap gap-3 text-xs text-blue-600 dark:text-blue-400">
                    <span className="cursor-pointer hover:underline">Get Instant Freight Rate</span>
                    <span>•</span>
                    <span className="cursor-pointer hover:underline">Enterprise API Docs</span>
                    <span>•</span>
                    <span className="cursor-pointer hover:underline">Schedule Supply Review</span>
                  </div>
                </div>
              )}

              {mockupFormat === "linkedin" && (
                <div className="space-y-3 text-left">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-full bg-black text-white flex items-center justify-center font-serif font-bold text-sm">
                      Z
                    </div>
                    <div>
                      <div className="font-bold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                        <span>Zenith Health Systems</span>
                        <span className="text-[10px] text-stone-400 font-mono">• Promoted</span>
                      </div>
                      <div className="text-[11px] text-stone-400 font-mono">Telemedicine & Rapid Patient Scheduling Platform</div>
                    </div>
                  </div>
                  <p className={`text-xs ${textSub} leading-relaxed`}>
                    Patients shouldn't wait 3 weeks for essential diagnostics. Discover how leading clinics decreased appointment no-shows by 44% with localized HIPAA-compliant scheduling.
                  </p>
                  <div className={`rounded-2xl border overflow-hidden ${whiteCard}`}>
                    <div className="h-44 bg-stone-300 dark:bg-stone-800 flex items-center justify-center text-stone-400 font-mono text-xs">
                      [Clinical Video Creative: Doctor Trust Hook Script v3]
                    </div>
                    <div className="p-4 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-stone-400 uppercase font-mono">zenithhealth.org</div>
                        <div className="font-bold text-xs text-stone-900 dark:text-stone-100">National Clinic Patient Booking Suite</div>
                      </div>
                      <button type="button" className={`rounded-full px-4 py-1.5 text-xs font-semibold ${pillBlack}`}>
                        Book Clinic Demo
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {mockupFormat === "meta" && (
                <div className="space-y-3 text-left">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-stone-900 text-white flex items-center justify-center font-bold text-xs font-serif">
                      A
                    </div>
                    <div>
                      <div className="font-bold text-xs">auraretail.official</div>
                      <div className="text-[10px] text-stone-400">Sponsored</div>
                    </div>
                  </div>
                  <p className={`text-xs ${textSub} leading-relaxed`}>
                    Early Access: The Luxury Autumn Collection has arrived. Crafted with organic silks and tailored cuts. Limited run of 250 units worldwide.
                  </p>
                  <div className={`rounded-2xl border overflow-hidden ${whiteCard}`}>
                    <div className="h-48 bg-stone-200 dark:bg-stone-800 flex items-center justify-center text-stone-400 font-mono text-xs">
                      [Black Friday Carousel Graphic: Story & Reel Motion Asset]
                    </div>
                    <div className="p-3.5 flex items-center justify-between">
                      <span className="font-bold text-xs">Shop Autumn Collective</span>
                      <button type="button" className={`rounded-full px-4 py-1.5 text-xs font-semibold ${pillBlack}`}>
                        Shop Now
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}
      </main>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: ADD NEW CLIENT */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showAddClientModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className={`w-full max-w-md rounded-[28px] border p-6 sm:p-7 shadow-2xl space-y-4 ${whiteCard}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg font-editorial">Onboard New Client</h3>
                  <p className={`text-xs ${textMuted}`}>Register a client brand into the marketing roster.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddClientModal(false)}
                  className="rounded-full p-1 text-stone-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCreateClient} className="space-y-3.5 text-xs font-mono">
                <div>
                  <label className="block text-[11px] text-stone-500 mb-1">Company / Brand Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex Global Logistics"
                    value={clientForm.name}
                    onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                    className={`w-full rounded-full px-4 py-2.5 border outline-none ${dark ? "bg-[#0d1117] border-[#30363d]" : "bg-[#faf7f2] border-[#ded8ce]"}`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] text-stone-500 mb-1">Industry</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. HealthTech, SaaS"
                      value={clientForm.industry}
                      onChange={(e) => setClientForm({ ...clientForm, industry: e.target.value })}
                      className={`w-full rounded-full px-4 py-2.5 border outline-none ${dark ? "bg-[#0d1117] border-[#30363d]" : "bg-[#faf7f2] border-[#ded8ce]"}`}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-stone-500 mb-1">Monthly Retainer ($)</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={clientForm.monthly_retainer}
                      onChange={(e) => setClientForm({ ...clientForm, monthly_retainer: Number(e.target.value) })}
                      className={`w-full rounded-full px-4 py-2.5 border outline-none ${dark ? "bg-[#0d1117] border-[#30363d]" : "bg-[#faf7f2] border-[#ded8ce]"}`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] text-stone-500 mb-1">Contact Person</label>
                    <input
                      type="text"
                      required
                      placeholder="Elena Rostova"
                      value={clientForm.contact_name}
                      onChange={(e) => setClientForm({ ...clientForm, contact_name: e.target.value })}
                      className={`w-full rounded-full px-4 py-2.5 border outline-none ${dark ? "bg-[#0d1117] border-[#30363d]" : "bg-[#faf7f2] border-[#ded8ce]"}`}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-stone-500 mb-1">Contact Email</label>
                    <input
                      type="email"
                      required
                      placeholder="elena@company.com"
                      value={clientForm.contact_email}
                      onChange={(e) => setClientForm({ ...clientForm, contact_email: e.target.value })}
                      className={`w-full rounded-full px-4 py-2.5 border outline-none ${dark ? "bg-[#0d1117] border-[#30363d]" : "bg-[#faf7f2] border-[#ded8ce]"}`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-stone-500 mb-1">Website URL (optional)</label>
                  <input
                    type="url"
                    placeholder="https://clientwebsite.com"
                    value={clientForm.website}
                    onChange={(e) => setClientForm({ ...clientForm, website: e.target.value })}
                    className={`w-full rounded-full px-4 py-2.5 border outline-none ${dark ? "bg-[#0d1117] border-[#30363d]" : "bg-[#faf7f2] border-[#ded8ce]"}`}
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddClientModal(false)}
                    className="rounded-full px-4 py-2 text-stone-400 hover:text-black dark:hover:text-white"
                  >
                    cancel
                  </button>
                  <button
                    type="submit"
                    className={`rounded-full px-5 py-2 font-medium ${pillBlack}`}
                  >
                    onboard client ↗
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL 2: EDIT CLIENT */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {editingClient && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className={`w-full max-w-md rounded-[28px] border p-6 sm:p-7 shadow-2xl space-y-4 ${whiteCard}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg font-editorial">Edit Client Profile</h3>
                  <p className={`text-xs ${textMuted}`}>{editingClient.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingClient(null)}
                  className="rounded-full p-1 text-stone-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleUpdateClient} className="space-y-3.5 text-xs font-mono">
                <div>
                  <label className="block text-[11px] text-stone-500 mb-1">Monthly Retainer ($)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={editingClient.monthly_retainer}
                    onChange={(e) => setEditingClient({ ...editingClient, monthly_retainer: Number(e.target.value) })}
                    className={`w-full rounded-full px-4 py-2.5 border outline-none ${dark ? "bg-[#0d1117] border-[#30363d]" : "bg-[#faf7f2] border-[#ded8ce]"}`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-stone-500 mb-1">Client Status</label>
                  <select
                    value={editingClient.status}
                    onChange={(e) => setEditingClient({ ...editingClient, status: e.target.value as any })}
                    className={`w-full rounded-full px-3.5 py-2.5 border outline-none ${dark ? "bg-[#0d1117] border-[#30363d]" : "bg-[#faf7f2] border-[#ded8ce]"}`}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="ONBOARDING">ONBOARDING</option>
                    <option value="PAUSED">PAUSED</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-stone-500 mb-1">Contact Email</label>
                  <input
                    type="email"
                    required
                    value={editingClient.contact_email}
                    onChange={(e) => setEditingClient({ ...editingClient, contact_email: e.target.value })}
                    className={`w-full rounded-full px-4 py-2.5 border outline-none ${dark ? "bg-[#0d1117] border-[#30363d]" : "bg-[#faf7f2] border-[#ded8ce]"}`}
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingClient(null)}
                    className="rounded-full px-4 py-2 text-stone-400 hover:text-black dark:hover:text-white"
                  >
                    cancel
                  </button>
                  <button
                    type="submit"
                    className={`rounded-full px-5 py-2 font-medium ${pillBlack}`}
                  >
                    save changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL 3: ADD CLIENT PROJECT */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showAddProjectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className={`w-full max-w-md rounded-[28px] border p-6 sm:p-7 shadow-2xl space-y-4 ${whiteCard}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg font-editorial">Create Client Project</h3>
                  <p className={`text-xs ${textMuted}`}>Define campaign deliverables, budget, and ROAS target.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddProjectModal(false)}
                  className="rounded-full p-1 text-stone-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCreateProject} className="space-y-3.5 text-xs font-mono">
                <div>
                  <label className="block text-[11px] text-stone-500 mb-1">Select Client</label>
                  <select
                    required
                    value={projectForm.client_id}
                    onChange={(e) => setProjectForm({ ...projectForm, client_id: e.target.value })}
                    className={`w-full rounded-full px-3.5 py-2.5 border outline-none ${dark ? "bg-[#0d1117] border-[#30363d]" : "bg-[#faf7f2] border-[#ded8ce]"}`}
                  >
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-stone-500 mb-1">Project Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Q4 Performance Search & Social Sprint"
                    value={projectForm.title}
                    onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })}
                    className={`w-full rounded-full px-4 py-2.5 border outline-none ${dark ? "bg-[#0d1117] border-[#30363d]" : "bg-[#faf7f2] border-[#ded8ce]"}`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] text-stone-500 mb-1">Category</label>
                    <select
                      value={projectForm.category}
                      onChange={(e) => setProjectForm({ ...projectForm, category: e.target.value as any })}
                      className={`w-full rounded-full px-3.5 py-2.5 border outline-none ${dark ? "bg-[#0d1117] border-[#30363d]" : "bg-[#faf7f2] border-[#ded8ce]"}`}
                    >
                      <option value="Paid Search">Paid Search</option>
                      <option value="Paid Social">Paid Social</option>
                      <option value="SEO & Content">SEO & Content</option>
                      <option value="Brand & Creative">Brand & Creative</option>
                      <option value="Email & CRM">Email & CRM</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-stone-500 mb-1">Project Budget ($)</label>
                    <input
                      type="number"
                      required
                      min={100}
                      value={projectForm.budget}
                      onChange={(e) => setProjectForm({ ...projectForm, budget: Number(e.target.value) })}
                      className={`w-full rounded-full px-4 py-2.5 border outline-none ${dark ? "bg-[#0d1117] border-[#30363d]" : "bg-[#faf7f2] border-[#ded8ce]"}`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] text-stone-500 mb-1">Target ROAS (x)</label>
                    <input
                      type="number"
                      step={0.1}
                      min={1}
                      value={projectForm.target_roas}
                      onChange={(e) => setProjectForm({ ...projectForm, target_roas: Number(e.target.value) })}
                      className={`w-full rounded-full px-4 py-2.5 border outline-none ${dark ? "bg-[#0d1117] border-[#30363d]" : "bg-[#faf7f2] border-[#ded8ce]"}`}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-stone-500 mb-1">Target Deadline</label>
                    <input
                      type="date"
                      required
                      value={projectForm.deadline}
                      onChange={(e) => setProjectForm({ ...projectForm, deadline: e.target.value })}
                      className={`w-full rounded-full px-4 py-2.5 border outline-none ${dark ? "bg-[#0d1117] border-[#30363d]" : "bg-[#faf7f2] border-[#ded8ce]"}`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-stone-500 mb-1">Key Deliverables</label>
                  <input
                    type="text"
                    placeholder="Deliverables description..."
                    value={projectForm.deliverables}
                    onChange={(e) => setProjectForm({ ...projectForm, deliverables: e.target.value })}
                    className={`w-full rounded-full px-4 py-2.5 border outline-none ${dark ? "bg-[#0d1117] border-[#30363d]" : "bg-[#faf7f2] border-[#ded8ce]"}`}
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddProjectModal(false)}
                    className="rounded-full px-4 py-2 text-stone-400 hover:text-black dark:hover:text-white"
                  >
                    cancel
                  </button>
                  <button
                    type="submit"
                    className={`rounded-full px-5 py-2 font-medium ${pillBlack}`}
                  >
                    launch project ↗
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL 4: ADD CLIENT ASSET */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showAddAssetModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className={`w-full max-w-md rounded-[28px] border p-6 sm:p-7 shadow-2xl space-y-4 ${whiteCard}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg font-editorial">Register Client Asset</h3>
                  <p className={`text-xs ${textMuted}`}>Add creative hooks, video scripts, Figma decks, or copy docs.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddAssetModal(false)}
                  className="rounded-full p-1 text-stone-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCreateAsset} className="space-y-3.5 text-xs font-mono">
                <div>
                  <label className="block text-[11px] text-stone-500 mb-1">Select Client</label>
                  <select
                    required
                    value={assetForm.client_id}
                    onChange={(e) => setAssetForm({ ...assetForm, client_id: e.target.value })}
                    className={`w-full rounded-full px-3.5 py-2.5 border outline-none ${dark ? "bg-[#0d1117] border-[#30363d]" : "bg-[#faf7f2] border-[#ded8ce]"}`}
                  >
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-stone-500 mb-1">Associate to Project (optional)</label>
                  <select
                    value={assetForm.project_id}
                    onChange={(e) => setAssetForm({ ...assetForm, project_id: e.target.value })}
                    className={`w-full rounded-full px-3.5 py-2.5 border outline-none ${dark ? "bg-[#0d1117] border-[#30363d]" : "bg-[#faf7f2] border-[#ded8ce]"}`}
                  >
                    <option value="">-- General Client Brand Asset --</option>
                    {projects
                      .filter((p) => !assetForm.client_id || p.client_id === assetForm.client_id)
                      .map((p) => (
                        <option key={p.id} value={p.id}>{p.title}</option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-stone-500 mb-1">Asset Name / Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Q4 Black Friday Story Ad Creatives"
                    value={assetForm.name}
                    onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
                    className={`w-full rounded-full px-4 py-2.5 border outline-none ${dark ? "bg-[#0d1117] border-[#30363d]" : "bg-[#faf7f2] border-[#ded8ce]"}`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] text-stone-500 mb-1">Asset Type</label>
                    <select
                      value={assetForm.asset_type}
                      onChange={(e) => setAssetForm({ ...assetForm, asset_type: e.target.value as any })}
                      className={`w-full rounded-full px-3.5 py-2.5 border outline-none ${dark ? "bg-[#0d1117] border-[#30363d]" : "bg-[#faf7f2] border-[#ded8ce]"}`}
                    >
                      <option value="Ad Creative">Ad Creative</option>
                      <option value="Video Script">Video Script</option>
                      <option value="Copywriting">Copywriting</option>
                      <option value="Brand Asset">Brand Asset</option>
                      <option value="Landing Page">Landing Page</option>
                      <option value="Report">Report</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-stone-500 mb-1">File Format</label>
                    <select
                      value={assetForm.file_format}
                      onChange={(e) => setAssetForm({ ...assetForm, file_format: e.target.value as any })}
                      className={`w-full rounded-full px-3.5 py-2.5 border outline-none ${dark ? "bg-[#0d1117] border-[#30363d]" : "bg-[#faf7f2] border-[#ded8ce]"}`}
                    >
                      <option value="Figma">Figma</option>
                      <option value="Video / MP4">Video / MP4</option>
                      <option value="Graphic / PNG">Graphic / PNG</option>
                      <option value="PDF">PDF</option>
                      <option value="Drive / Doc">Drive / Doc</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-stone-500 mb-1">Asset URL / Cloud Link (Figma, Drive, etc.)</label>
                  <input
                    type="url"
                    required
                    placeholder="https://figma.com/file/..."
                    value={assetForm.asset_url}
                    onChange={(e) => setAssetForm({ ...assetForm, asset_url: e.target.value })}
                    className={`w-full rounded-full px-4 py-2.5 border outline-none ${dark ? "bg-[#0d1117] border-[#30363d]" : "bg-[#faf7f2] border-[#ded8ce]"}`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-stone-500 mb-1">Creative Notes / Review Context</label>
                  <textarea
                    rows={2}
                    placeholder="Notes for client review..."
                    value={assetForm.notes}
                    onChange={(e) => setAssetForm({ ...assetForm, notes: e.target.value })}
                    className={`w-full rounded-2xl p-3 border outline-none resize-none ${dark ? "bg-[#0d1117] border-[#30363d]" : "bg-[#faf7f2] border-[#ded8ce]"}`}
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddAssetModal(false)}
                    className="rounded-full px-4 py-2 text-stone-400 hover:text-black dark:hover:text-white"
                  >
                    cancel
                  </button>
                  <button
                    type="submit"
                    className={`rounded-full px-5 py-2 font-medium ${pillBlack}`}
                  >
                    save asset ↗
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL 5: INSPECT & APPROVE ASSET */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {previewingAsset && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-lg rounded-[28px] border p-6 sm:p-7 shadow-2xl space-y-4 ${whiteCard}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg font-editorial">{previewingAsset.name}</h3>
                  <p className={`text-xs ${textMuted}`}>{previewingAsset.client_name} • {previewingAsset.file_format}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewingAsset(null)}
                  className="rounded-full p-1 text-stone-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className={`p-4 rounded-2xl border ${sandCard} space-y-2 text-xs font-mono`}>
                <div className="flex justify-between">
                  <span className="text-stone-500">Asset Type:</span>
                  <span className="font-semibold text-stone-800 dark:text-stone-200">{previewingAsset.asset_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Version:</span>
                  <span className="font-semibold text-stone-800 dark:text-stone-200">{previewingAsset.version}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Linked Project:</span>
                  <span className="font-semibold text-stone-800 dark:text-stone-200">{previewingAsset.project_title || "General Brand Asset"}</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-inherit">
                  <span className="text-stone-500">Current Status:</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    previewingAsset.status === "APPROVED"
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                      : previewingAsset.status === "IN_REVIEW"
                      ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                      : pillSand
                  }`}>
                    {previewingAsset.status}
                  </span>
                </div>
              </div>

              {previewingAsset.notes && (
                <div className="space-y-1">
                  <div className="text-[11px] font-mono text-stone-500">Review Notes:</div>
                  <div className={`p-3 rounded-xl border text-xs leading-relaxed ${sandCard}`}>
                    {previewingAsset.notes}
                  </div>
                </div>
              )}

              {/* Status Action Buttons */}
              {!readOnly && (
                <div className="space-y-2 pt-1">
                  <div className="text-[11px] font-mono text-stone-500">Update Review Decision:</div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleUpdateAssetStatus(previewingAsset.id, "APPROVED")}
                      className="flex-1 rounded-full py-2 text-xs font-mono font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition flex items-center justify-center gap-1"
                    >
                      <Check size={13} />
                      <span>Approve Asset</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateAssetStatus(previewingAsset.id, "NEEDS_REVISION")}
                      className="flex-1 rounded-full py-2 text-xs font-mono font-medium bg-amber-600 text-white hover:bg-amber-700 transition"
                    >
                      Request Revision
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateAssetStatus(previewingAsset.id, "IN_REVIEW")}
                      className={`flex-1 rounded-full py-2 text-xs font-mono font-medium border ${pillOutline}`}
                    >
                      In Review
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-inherit">
                <a
                  href={previewingAsset.asset_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 dark:text-blue-400 text-xs font-mono hover:underline flex items-center gap-1"
                >
                  <ExternalLink size={12} />
                  <span>Open in {previewingAsset.file_format} ↗</span>
                </a>

                <button
                  type="button"
                  onClick={() => setPreviewingAsset(null)}
                  className={`rounded-full px-5 py-2 text-xs font-medium ${pillBlack}`}
                >
                  close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
