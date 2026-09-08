import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight, Check, CheckCircle2, ChevronRight, Copy, ExternalLink,
  Flame, Globe, Layers, LogOut, Mail, Megaphone, Moon, MousePointerClick,
  Pause, Play, Plus, RefreshCw, Search, Send, Share2, Sparkles, Sun,
  Target, Trash2, TrendingUp, UserCheck, Users, X, DollarSign, PlayCircle,
  Building2, Phone, ShieldCheck, CheckCheck, BarChart3, PieChart as PieIcon,
  Radio, Zap, Edit3, Download, Eye, Settings, Sliders, Activity, Filter,
  FolderPlus, FileText, CheckSquare, Clock, AlertCircle, Briefcase, Link2
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { apiFetch } from "../lib/api";

interface DigitalMarketingWorkspaceProps {
  admin?: boolean;
  readOnly?: boolean;
  embedded?: boolean;
  onLogout?: () => void;
  onBack?: () => void;
  dark?: boolean;
  onToggleTheme?: () => void;
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
}: DigitalMarketingWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "clients" | "projects" | "assets" | "mockups">("overview");
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

  // Exact luxury aesthetic matching user's reference
  const pageBg = dark ? "bg-[#0d1117] text-[#f0f3f6]" : "bg-[#fbf8f3] text-[#141414]";
  const sandCard = dark ? "bg-[#161b22] border-[#30363d]" : "bg-[#f4efe6] border-[#e7e1d5]";
  const whiteCard = dark ? "bg-[#161b22] border-[#30363d]" : "bg-[#ffffff] border-[#ede7dc]";
  const textSub = dark ? "text-[#8b949e]" : "text-[#55524e]";
  const textMuted = dark ? "text-[#6e7681]" : "text-[#8c8882]";
  const pillBlack = dark ? "bg-[#ffffff] text-[#0d1117] hover:bg-[#eaecef]" : "bg-[#111111] text-[#ffffff] hover:bg-[#000000]";
  const pillSand = dark ? "bg-[#21262d] text-[#c9d1d9] border-[#30363d]" : "bg-[#ede7dc] text-[#33312e] border-transparent";
  const pillOutline = dark ? "bg-[#161b22] border-[#30363d] text-[#c9d1d9] hover:bg-[#21262d]" : "bg-white/80 border-[#ded8ce] text-[#222222] hover:bg-white";

  return (
    <div className={`${embedded ? "w-full min-h-full pb-16" : "h-screen w-full overflow-y-auto"} transition-colors duration-200 ${pageBg}`}>
      {/* Toast Notice */}
      <AnimatePresence>
        {notice && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full px-5 py-2 text-xs font-mono font-medium shadow-xl border ${
              dark ? "bg-[#161b22] text-[#58a6ff] border-[#30363d]" : "bg-[#111111] text-white border-black"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{notice}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOP HEADER */}
      <header className={`sticky top-0 z-40 w-full border-b ${dark ? "border-[#21262d] bg-[#0d1117]/85" : "border-[#ede7dc] bg-[#fbf8f3]/85"} backdrop-blur-md px-4 sm:px-8 py-3.5`}>
        <div className="w-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {admin && onBack && !embedded && (
              <button
                type="button"
                onClick={onBack}
                className={`flex h-8 w-8 items-center justify-center rounded-full border ${pillOutline} transition`}
                title="Back to Admin"
              >
                <ChevronRight size={14} className="rotate-180" />
              </button>
            )}
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-md bg-[#111111] text-white flex items-center justify-center font-bold text-xs font-serif">
                Z
              </div>
              <span className="font-semibold tracking-tight text-sm">Marketing Workspace</span>
              {readOnly && (
                <span className="rounded-full bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 text-[10px] font-bold text-indigo-400">
                  Shared Live View
                </span>
              )}
            </div>
          </div>

          {/* Navigation Pill Switcher */}
          <div className={`hidden md:flex items-center gap-1 rounded-full p-1 border ${dark ? "bg-[#161b22] border-[#30363d]" : "bg-[#ede7dc]/60 border-[#ded8ce]"}`}>
            {[
              { id: "overview", label: "Overview" },
              { id: "clients", label: `Clients (${clients.length})` },
              { id: "projects", label: `Client Projects (${projects.length})` },
              { id: "assets", label: `Client Assets (${assets.length})` },
              { id: "mockups", label: "Live Ad Mockups" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`rounded-full px-3.5 py-1 text-xs font-medium transition ${
                  activeTab === tab.id
                    ? dark ? "bg-[#ffffff] text-[#0d1117]" : "bg-[#111111] text-[#ffffff]"
                    : `${textSub} hover:text-black dark:hover:text-white`
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-2">
            {!readOnly && (
              <>
                <button
                  type="button"
                  onClick={() => setShowAddClientModal(true)}
                  className={`hidden sm:flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition shadow-sm ${pillBlack}`}
                >
                  <span>+ Client</span>
                  <ArrowUpRight size={13} />
                </button>

                <button
                  type="button"
                  onClick={() => setShowAddProjectModal(true)}
                  className={`hidden lg:flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition border ${pillOutline}`}
                >
                  <span>+ Project</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowAddAssetModal(true)}
                  className={`hidden lg:flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition border ${pillOutline}`}
                >
                  <span>+ Asset</span>
                </button>
              </>
            )}

            {!embedded && (
              <button
                type="button"
                onClick={handleToggleTheme}
                className={`flex h-8 w-8 items-center justify-center rounded-full border ${pillOutline} transition`}
                title="Toggle Theme"
              >
                {dark ? <Sun size={13} /> : <Moon size={13} />}
              </button>
            )}

            <button
              type="button"
              onClick={() => loadAllData(true)}
              disabled={refreshing}
              className={`flex h-8 w-8 items-center justify-center rounded-full border ${pillOutline} transition`}
              title="Refresh Telemetry"
            >
              <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
            </button>

            {!embedded && onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-stone-500 hover:text-red-500 transition"
              >
                <LogOut size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="mt-2.5 flex md:hidden items-center gap-1 overflow-x-auto pb-1 text-xs">
          {["overview", "clients", "projects", "assets", "mockups"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`shrink-0 rounded-full px-3 py-1 capitalize font-medium ${
                activeTab === tab ? "bg-[#111111] text-white dark:bg-white dark:text-black" : textSub
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="mx-auto w-full max-w-7xl px-4 sm:px-8 py-8 sm:py-12 space-y-12">
        {/* ========================================================================= */}
        {/* EDITORIAL HERO SECTION (SHOWN ON OVERVIEW) */}
        {/* ========================================================================= */}
        {activeTab === "overview" && (
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left Column: Quiet Luxury Headline & Actions */}
          <div className="lg:col-span-6 space-y-6 pt-2">
            <div className="space-y-1">
              <h1 className="text-4xl sm:text-6xl lg:text-[68px] font-editorial leading-[1.04] tracking-tight">
                <span className="block font-bold">Client Marketing,</span>
                <span className="block font-normal italic">engineered for</span>
                <span className="block font-normal italic">revenue scale.</span>
              </h1>
            </div>

            <p className={`text-sm sm:text-base ${textSub} max-w-md leading-relaxed`}>
              Complete client management suite. Track client retainers, active growth projects, multi-channel ad deliverables, and creative assets in one unified workspace.
            </p>

            {/* Action Pills */}
            {!readOnly ? (
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddClientModal(true)}
                  className={`flex items-center gap-2 rounded-full px-6 py-3 text-xs sm:text-sm font-medium transition shadow-sm ${pillBlack}`}
                >
                  <span>+ Onboard Client</span>
                  <ArrowUpRight size={15} />
                </button>

                <button
                  type="button"
                  onClick={() => setShowAddProjectModal(true)}
                  className={`flex items-center gap-2 rounded-full px-5 py-3 text-xs sm:text-sm font-medium transition ${pillOutline}`}
                >
                  <FolderPlus size={15} />
                  <span>+ Client Project</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowAddAssetModal(true)}
                  className={`flex items-center gap-2 rounded-full px-5 py-3 text-xs sm:text-sm font-medium transition ${pillOutline}`}
                >
                  <FileText size={15} />
                  <span>+ Client Asset</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <div className="inline-flex items-center gap-2 rounded-full px-4 py-2 border text-xs font-semibold bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
                  <ShieldCheck size={14} />
                  <span>Read-Only Visibility • Synchronized with Marketing Team</span>
                </div>
              </div>
            )}

            {/* Floating Capsule Badge */}
            <div className="pt-4">
              <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 border shadow-sm ${whiteCard}`}>
                <div className="flex h-4 w-4 items-center justify-center rounded-full bg-black text-white dark:bg-white dark:text-black">
                  <Check size={10} />
                </div>
                <span className="font-mono text-xs text-stone-500 dark:text-stone-400">
                  {clients.length} Clients Managed • ${overview?.totalMonthlyRetainer.toLocaleString() || "55,300"}/mo Retainer • 100% On-Track
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Quiet Luxury Interactive Agency Mockup */}
          <div className="lg:col-span-6">
            <div className={`rounded-[32px] border ${sandCard} p-4 sm:p-6 space-y-4 shadow-sm relative`}>
              {/* Notification capsule */}
              <div className="flex items-center justify-end">
                <div className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 border text-[11px] font-mono shadow-sm ${whiteCard}`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-stone-600 dark:text-stone-300">
                    Latest Asset: "{assets[0]?.name || "Apex Copy Matrix"}" in review
                  </span>
                </div>
              </div>

              {/* Main Workspace Frame */}
              <div className="grid grid-cols-12 gap-3 items-start">
                {/* Thin Vertical Navigation Pill Track */}
                <div className={`col-span-2 sm:col-span-1 rounded-full border py-3 px-1 flex flex-col items-center gap-2.5 ${whiteCard}`}>
                  {[
                    { id: "overview", char: "o" },
                    { id: "clients", char: "c" },
                    { id: "projects", char: "p" },
                    { id: "assets", char: "a" },
                    { id: "mockups", char: "m" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id as any)}
                      className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-mono uppercase font-semibold transition ${
                        activeTab === item.id
                          ? dark ? "bg-white text-black" : "bg-black text-white"
                          : "text-stone-400 hover:text-black dark:hover:text-white"
                      }`}
                    >
                      {item.char}
                    </button>
                  ))}
                </div>

                {/* Dashboard Center Area */}
                <div className="col-span-10 sm:col-span-11 space-y-3.5">
                  {/* Top 3 Metric Blocks */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className={`rounded-2xl border p-3 text-center ${whiteCard}`}>
                      <div className={`text-[10px] font-mono ${textMuted}`}>Retainers</div>
                      <div className="text-base sm:text-lg font-bold font-mono mt-0.5">
                        ${overview?.totalMonthlyRetainer.toLocaleString() || "55.3k"}
                      </div>
                      <div className="text-[10px] text-emerald-600 font-mono font-semibold">+18% MoM</div>
                    </div>

                    <div className={`rounded-2xl border p-3 text-center ${whiteCard}`}>
                      <div className={`text-[10px] font-mono ${textMuted}`}>Active Proj</div>
                      <div className="text-base sm:text-lg font-bold font-mono mt-0.5">
                        {overview?.activeProjects || projects.length}
                      </div>
                      <div className="text-[10px] text-emerald-600 font-mono font-semibold">5.4x avg roas</div>
                    </div>

                    <div className={`rounded-2xl border p-3 text-center ${whiteCard}`}>
                      <div className={`text-[10px] font-mono ${textMuted}`}>Assets</div>
                      <div className="text-base sm:text-lg font-bold font-mono mt-0.5">
                        {overview?.totalAssets || assets.length}
                      </div>
                      <div className="text-[10px] text-stone-500 font-mono">
                        {overview?.assetsApproved || 3} approved
                      </div>
                    </div>
                  </div>

                  {/* Client Snapshot Quick Bar */}
                  <div className={`rounded-2xl border p-3.5 space-y-2.5 ${whiteCard}`}>
                    <div className="grid grid-cols-12 text-[10px] font-mono uppercase text-stone-400 pb-1 border-b border-inherit">
                      <span className="col-span-6">Client & Industry</span>
                      <span className="col-span-3">Retainer</span>
                      <span className="col-span-3 text-right">Status</span>
                    </div>

                    {clients.slice(0, 3).map((cl) => (
                      <div key={cl.id} className="grid grid-cols-12 items-center text-xs font-mono">
                        <div className="col-span-6 truncate">
                          <span className="font-semibold text-stone-800 dark:text-stone-200">{cl.name}</span>
                          <span className="block text-[10px] text-stone-400">{cl.industry}</span>
                        </div>
                        <span className="col-span-3 text-stone-700 dark:text-stone-300 font-semibold">
                          ${cl.monthly_retainer.toLocaleString()}
                        </span>
                        <span className="col-span-3 text-right">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            cl.status === "ACTIVE" ? pillBlack : pillSand
                          }`}>
                            {cl.status.toLowerCase()}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Active Projects Tracker Capsule */}
                  <div className={`rounded-2xl border p-3.5 flex items-start gap-3 ${whiteCard}`}>
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-black text-white dark:bg-white dark:text-black font-mono font-bold text-[10px]">
                      PM
                    </div>
                    <div className="text-[11px] leading-snug">
                      <div className="font-semibold text-stone-800 dark:text-stone-200">
                        {projects.length} Active Growth Projects across {clients.length} Enterprise Clients
                      </div>
                      <div className="text-[10px] text-stone-500 font-mono mt-0.5">
                        Deliverables synced • Weekly ROAS target tracking active
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        )}

        {/* ========================================================================= */}
        {/* VIEW 1: AGENCY OVERVIEW */}
        {/* ========================================================================= */}
        {activeTab === "overview" && overview && (
          <section className="space-y-8 pt-4 border-t border-inherit">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold font-editorial">Agency Portfolio Overview</h2>
                <p className={`text-xs ${textMuted}`}>Retainers, active growth deliverables, and creative assets under management.</p>
              </div>
              <div className="flex items-center gap-3 font-mono text-xs text-stone-500">
                <span>Monthly Retainers: <strong className="text-black dark:text-white font-bold">${overview.totalMonthlyRetainer.toLocaleString()}</strong></span>
                <span>•</span>
                <span>Budget Managed: <strong className="text-black dark:text-white font-bold">${overview.totalBudgetManaged.toLocaleString()}</strong></span>
              </div>
            </div>

            {/* 6 Key Client Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: "Total Retainer Revenue", value: `$${overview.totalMonthlyRetainer.toLocaleString()}`, sub: "+18.4% MoM", positive: true },
                { label: "Total Managed Budget", value: `$${overview.totalBudgetManaged.toLocaleString()}`, sub: "4 active campaigns", positive: true },
                { label: "Active Clients", value: `${overview.activeClients} / ${overview.totalClients}`, sub: "100% retention", positive: true },
                { label: "Growth Projects", value: `${overview.activeProjects}`, sub: "Delivering on schedule", positive: true },
                { label: "Client Assets", value: `${overview.totalAssets}`, sub: `${overview.assetsApproved} approved`, positive: true },
                { label: "Pending Approvals", value: `${overview.assetsInReview}`, sub: "Review required", positive: false },
              ].map((kpi, idx) => (
                <div key={idx} className={`rounded-2xl border p-4 ${whiteCard}`}>
                  <div className={`text-[11px] font-mono ${textMuted}`}>{kpi.label}</div>
                  <div className="text-xl font-bold font-mono mt-1 text-stone-900 dark:text-stone-100">{kpi.value}</div>
                  <div className={`text-[10px] font-mono mt-1 font-semibold ${kpi.positive ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                    {kpi.sub}
                  </div>
                </div>
              ))}
            </div>

            {/* Client Retainer Distribution Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {overview.clientPortfolio.map((cp, idx) => (
                <div key={idx} className={`rounded-3xl border p-5 space-y-3 ${whiteCard}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm font-sans text-stone-900 dark:text-stone-100 truncate">{cp.name}</span>
                    <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      ${cp.retainer.toLocaleString()}/mo
                    </span>
                  </div>
                  <div className="space-y-1 text-xs font-mono text-stone-500">
                    <div className="flex justify-between">
                      <span>Active Projects:</span>
                      <strong className="text-stone-800 dark:text-stone-200">{cp.projectCount}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Assets on File:</span>
                      <strong className="text-stone-800 dark:text-stone-200">{cp.assetCount}</strong>
                    </div>
                  </div>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        const target = clients.find((c) => c.name === cp.name);
                        if (target) setSelectedClientId(target.id);
                        setActiveTab("projects");
                      }}
                      className={`w-full rounded-full py-1 text-xs font-mono border transition ${pillOutline}`}
                    >
                      view client projects ↗
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
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
                  className="rounded-full p-1 text-stone-400 hover:text-black dark:hover:text-white"
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
                  className="rounded-full p-1 text-stone-400 hover:text-black dark:hover:text-white"
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
                  className="rounded-full p-1 text-stone-400 hover:text-black dark:hover:text-white"
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
                  className="rounded-full p-1 text-stone-400 hover:text-black dark:hover:text-white"
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
                  className="rounded-full p-1 text-stone-400 hover:text-black dark:hover:text-white"
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
