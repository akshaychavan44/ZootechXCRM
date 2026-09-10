import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Code2, FolderKanban, Users, Plus, KeyRound, RefreshCw,
  Send, Trash2, CalendarDays, ExternalLink, ShieldCheck, CheckCircle2,
  Clock, AlertCircle, ChevronRight, X, ArrowLeft, ArrowUpRight, LogOut, Sun, Moon, FileText,
  LayoutDashboard, TrendingUp, Zap, Bug
} from "lucide-react";
import { apiFetch } from "../lib/api";
import CredentialsVault from "./CredentialsVault";
import ScopeOfWorkWorkspace from "./ScopeOfWorkWorkspace";

type Developer = {
  id: string;
  name: string;
  email: string;
  assigned_projects?: number;
  completed_projects?: number;
  active_projects?: number;
  average_progress?: number | string;
  last_activity_at?: string | null;
};

type Project = {
  id: string;
  name: string;
  client_name: string | null;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  progress?: number | string;
  assigned_developer_id: string;
  developer_name?: string;
};

type Update = {
  id: string;
  message: string;
  progress: number;
  author_name?: string;
  created_at: string;
};

export default function DeveloperWorkspace({
  admin = false,
  subAdmin = false,
  embedded = false,
  onLogout,
  onBack,
  dark: propDark,
  onToggleTheme,
  currentUser,
}: {
  admin?: boolean;
  subAdmin?: boolean;
  embedded?: boolean;
  onLogout?: () => void;
  onBack?: () => void;
  dark?: boolean;
  onToggleTheme?: () => void;
  currentUser?: any;
}) {
  const [activeTab, setActiveTab] = useState<"dashboard" | "projects" | "daily" | "issues" | "team" | "assign" | "vault" | "sows">("dashboard");
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeDeveloperId, setActiveDeveloperId] = useState<string | null>(null);
  const [projectStatusFilter, setProjectStatusFilter] = useState("ALL");
  const [selected, setSelected] = useState<Project | null>(null);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState(0);
  const [notice, setNotice] = useState("");

  // Daily Updates State
  const [dailyUpdatesList, setDailyUpdatesList] = useState<Array<{
    id: string;
    developer_name: string;
    completed_today: string;
    in_progress: string;
    pending: string;
    blocked: string;
    tomorrows_plan: string;
    hours_worked: number;
    project_name?: string;
    created_at: string;
  }>>([]);
  const [dailyForm, setDailyForm] = useState({
    completedToday: "",
    inProgress: "",
    pending: "",
    blocked: "None",
    tomorrowsPlan: "",
    hoursWorked: 8,
    projectName: "",
  });

  // Developer Issues State
  type Issue = {
    id: string;
    developer_id?: string;
    developer_name?: string;
    title: string;
    description: string;
    project_name: string;
    priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    type: "BUG" | "FEATURE" | "IMPROVEMENT";
    status: "OPEN" | "IN_PROGRESS" | "RESOLVED";
    created_at: string;
    updated_at?: string;
  };

  const [issuesList, setIssuesList] = useState<Issue[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [issueForm, setIssueForm] = useState<{
    title: string;
    description: string;
    projectName: string;
    priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    type: "BUG" | "FEATURE" | "IMPROVEMENT";
  }>({
    title: "",
    description: "",
    projectName: "",
    priority: "MEDIUM",
    type: "BUG",
  });
  const [showIssueModal, setShowIssueModal] = useState(false);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 3000);
    return () => clearTimeout(timer);
  }, [notice]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<"" | "developer" | "project" | "update">("");
  const [removingDeveloper, setRemovingDeveloper] = useState(false);
  const [showCreateDevModal, setShowCreateDevModal] = useState(false);
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

  // Forms
  const [developerForm, setDeveloperForm] = useState({ name: "", email: "", password: "" });
  const [projectForm, setProjectForm] = useState({
    name: "",
    clientName: "",
    description: "",
    priority: "MEDIUM",
    dueDate: "",
    assignedDeveloperId: "",
  });
  const dueDateRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const projectResponse = await apiFetch("/api/projects");
      const projectData = await projectResponse.json();
      if (!projectResponse.ok) throw new Error(projectData.message || "Unable to load projects");
      setProjects(projectData.data ?? []);

      if (admin) {
        const developerResponse = await apiFetch("/api/developers");
        const developerData = await developerResponse.json();
        if (!developerResponse.ok) throw new Error(developerData.message || "Unable to load developers");
        setDevelopers(developerData.data ?? []);
      }

      if (!subAdmin) {
        try {
          const duRes = await apiFetch("/api/daily-updates");
          const duData = await duRes.json();
          if (duRes.ok && Array.isArray(duData.data)) setDailyUpdatesList(duData.data);
        } catch {}
      }

      try {
        const issuesRes = await apiFetch("/api/developer-issues");
        const issuesData = await issuesRes.json();
        if (issuesRes.ok && Array.isArray(issuesData.data)) setIssuesList(issuesData.data);
      } catch {}
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to reach the project service.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if ((subAdmin || !admin) && activeTab === "daily") {
      setActiveTab("projects");
    }
    if (subAdmin && activeTab === "vault") {
      setActiveTab("projects");
    }
  }, [subAdmin, admin, activeTab]);

  const submitDailyUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dailyForm.completedToday.trim() || !dailyForm.tomorrowsPlan.trim()) {
      setNotice("Please fill in today's completed work and tomorrow's plan.");
      return;
    }
    setSaving("update");
    try {
      const res = await apiFetch("/api/daily-updates", {
        method: "POST",
        body: JSON.stringify({
          ...dailyForm,
          hoursWorked: Number(dailyForm.hoursWorked) || 8,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to submit daily update");
      setDailyUpdatesList((prev) => [data.data, ...prev]);
      setNotice("Daily update submitted successfully!");
      setDailyForm({
        completedToday: "",
        inProgress: "",
        pending: "",
        blocked: "None",
        tomorrowsPlan: "",
        hoursWorked: 8,
        projectName: "",
      });
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSaving("");
    }
  };

  const submitIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (admin || subAdmin) return;
    if (!issueForm.title.trim()) {
      setNotice("Please enter an issue title.");
      return;
    }
    setSaving("update");
    try {
      const res = await apiFetch("/api/developer-issues", {
        method: "POST",
        body: JSON.stringify({
          title: issueForm.title.trim(),
          description: issueForm.description.trim() || "No description provided.",
          projectName: issueForm.projectName.trim() || "General Engineering",
          priority: issueForm.priority,
          type: issueForm.type,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to log issue");
      setIssuesList((prev) => [data.data, ...prev]);
      setShowIssueModal(false);
      setIssueForm({ title: "", description: "", projectName: "", priority: "MEDIUM", type: "BUG" });
      setNotice("Issue logged to tracker successfully.");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Failed to report issue");
    } finally {
      setSaving("");
    }
  };

  const resolveIssue = async (issueId: string) => {
    if (admin || subAdmin) return;
    try {
      const res = await apiFetch(`/api/developer-issues/${issueId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "RESOLVED" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Unable to update issue status");
      setIssuesList((prev) => prev.map((i) => (i.id === issueId ? { ...i, status: "RESOLVED" } : i)));
      if (selectedIssue?.id === issueId) {
        setSelectedIssue((prev) => prev ? { ...prev, status: "RESOLVED" } : null);
      }
      setNotice("Issue marked as resolved.");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Unable to update issue status");
    }
  };

  useEffect(() => {
    void load();
    if (!admin) return;
    const refreshId = window.setInterval(() => void load(), 12000);
    return () => window.clearInterval(refreshId);
  }, [admin, subAdmin]);

  const selectProject = async (project: Project) => {
    setSelected(project);
    setProgress(Number(project.progress ?? (project.status === "COMPLETED" ? 100 : 0)));
    try {
      const response = await apiFetch(`/api/projects/${project.id}/updates`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to load updates");
      setUpdates(data.data ?? []);
    } catch (error) {
      setUpdates([]);
      setNotice(error instanceof Error ? error.message : "Unable to load updates");
    }
  };

  const createDeveloper = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!developerForm.name.trim() || !developerForm.email.trim() || developerForm.password.length < 8) {
      setNotice("Enter a name, email, and password with at least 8 characters.");
      return;
    }
    setSaving("developer");
    try {
      const response = await apiFetch("/api/developers", {
        method: "POST",
        body: JSON.stringify(developerForm),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setDevelopers((current) => [data.data, ...current]);
      setDeveloperForm({ name: "", email: "", password: "" });
      setShowCreateDevModal(false);
      setNotice("Developer account created successfully.");
      void load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to create developer");
    } finally {
      setSaving("");
    }
  };

  const createProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectForm.name.trim() || !projectForm.assignedDeveloperId) {
      setNotice("Enter a project name and select an assigned developer.");
      return;
    }
    setSaving("project");
    try {
      const response = await apiFetch("/api/projects", {
        method: "POST",
        body: JSON.stringify(projectForm),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setProjects((current) => [data.data, ...current]);
      setProjectForm({
        name: "",
        clientName: "",
        description: "",
        priority: "MEDIUM",
        dueDate: "",
        assignedDeveloperId: "",
      });
      setNotice("Project assigned successfully.");
      setActiveTab("projects");
      void load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to assign project");
    } finally {
      setSaving("");
    }
  };

  const addUpdate = async () => {
    if (!selected || admin) return;
    setSaving("update");
    try {
      const response = await apiFetch(`/api/projects/${selected.id}/updates`, {
        method: "POST",
        body: JSON.stringify({ message, progress, status: selected.status }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setUpdates((current) => [data.data, ...current]);
      if (data.project) {
        const next = { ...selected, status: data.project.status, progress: data.project.progress };
        setSelected(next);
        setProjects((current) => current.map((p) => (p.id === next.id ? { ...p, ...next } : p)));
      }
      setMessage("");
      setNotice("Progress update saved.");
      void load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to save update");
    } finally {
      setSaving("");
    }
  };

  const removeDeveloper = async () => {
    if (!activeDeveloperId) return;
    const developer = developers.find((item) => item.id === activeDeveloperId);
    if (!developer || !window.confirm(`Remove ${developer.name}'s developer login?`)) return;
    setRemovingDeveloper(true);
    try {
      const response = await apiFetch(`/api/developers/${developer.id}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Unable to remove developer");
      }
      setNotice("Developer account removed.");
      setActiveDeveloperId(null);
      void load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to remove developer");
    } finally {
      setRemovingDeveloper(false);
    }
  };

  const updateProjectStatus = async (status: string) => {
    if (!selected || admin) return;
    setSaving("update");
    try {
      const response = await apiFetch(`/api/projects/${selected.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to update project status");
      const next = { ...selected, ...data.data, progress: selected.progress };
      setSelected(next);
      setProjects((current) => current.map((p) => (p.id === next.id ? { ...p, ...next } : p)));
      setNotice(`Project status updated to ${status.replace("_", " ")}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to update status");
    } finally {
      setSaving("");
    }
  };

  const visibleProjects = projects.filter(
    (project) =>
      (!activeDeveloperId || project.assigned_developer_id === activeDeveloperId) &&
      (projectStatusFilter === "ALL" || project.status === projectStatusFilter)
  );

  const activeProjects = projects.filter((p) => p.status === "IN_PROGRESS").length;
  const completedProjects = projects.filter((p) => p.status === "COMPLETED").length;
  const averageProgress = projects.length
    ? Math.round(
        projects.reduce(
          (sum, p) => sum + Number(p.progress ?? (p.status === "COMPLETED" ? 100 : 0)),
          0
        ) / projects.length
      )
    : 0;

  // Colors (Nocturne & Ivory Luxury Palette)
  const bgMain = dark ? "bg-[#0c1017] text-[#f1f5f9]" : "bg-[#fbf8f2] text-[#1c1917]";
  const bgSidebar = dark ? "bg-[#0f1420] border-[#1b2438]" : "bg-[#f8f4ec] border-[#ede5d8]";
  const bgCard = dark ? "bg-[#121826] border-[#1e293b] text-[#f1f5f9]" : "bg-white border-[#eee6da] text-[#1c1917] shadow-[0_4px_20px_-2px_rgba(180,155,120,0.08)]";
  const inputBg = dark ? "bg-[#171f30] border-[#222d42] text-[#f1f5f9] placeholder-[#5a687d]" : "bg-[#fcfaf7] border-[#e5dcd0] text-[#1c1917] placeholder-[#a8a199]";
  const mutedText = dark ? "text-[#8e9bb0]" : "text-[#78716c]";

  type NavItem = {
    id: "dashboard" | "projects" | "daily" | "issues" | "team" | "assign" | "vault" | "sows";
    label: string;
    icon: React.ComponentType<any>;
    badge?: number;
  };

  const navigationItems: NavItem[] = useMemo(() => {
    const items: NavItem[] = [
      { id: "dashboard", label: "Dev Pulse", icon: LayoutDashboard },
      { id: "projects", label: admin ? "All Projects" : "My Projects", icon: FolderKanban, badge: projects.length },
      ...(admin && !subAdmin ? [{ id: "daily", label: "Daily Updates", icon: CalendarDays, badge: dailyUpdatesList.length } as NavItem] : []),
      ...(!admin ? [{ id: "sows", label: "Scope of Work (SOW)", icon: FileText } as NavItem] : []),
      { id: "issues", label: "Issues & Bugs", icon: AlertCircle, badge: issuesList.filter((i) => i.status !== "RESOLVED").length },
      ...(admin ? [{ id: "team", label: "Team Members", icon: Users, badge: developers.length } as NavItem] : []),
      ...(admin ? [{ id: "assign", label: "Assign Project", icon: Plus } as NavItem] : []),
      ...(!subAdmin ? [{ id: "vault", label: "Credentials & API Vault", icon: KeyRound } as NavItem] : []),
    ];

    if (!currentUser?.allowed_pages || !Array.isArray(currentUser.allowed_pages) || currentUser.allowed_pages.length === 0) {
      return items;
    }
    const allowed = currentUser.allowed_pages;
    const filtered = items.filter(
      (item) =>
        allowed.includes(item.id) ||
        (item.id === "daily" && allowed.includes("daily_updates")) ||
        (item.id === "vault" && allowed.includes("credentials_vault")) ||
        (item.id === "issues" && allowed.includes("developer_issues")) ||
        (item.id === "team" && allowed.includes("developers"))
    );
    return filtered.length > 0 ? filtered : items;
  }, [admin, subAdmin, projects.length, dailyUpdatesList.length, issuesList, developers.length, currentUser?.allowed_pages]);

  useEffect(() => {
    if (navigationItems.length > 0 && !navigationItems.some((n) => n.id === activeTab)) {
      setActiveTab(navigationItems[0].id);
    }
  }, [navigationItems, activeTab]);

  const renderTabContent = () => (
    <>
      {/* NOTICE BANNER */}
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

      {/* TAB 0: ENGINEERING PULSE DASHBOARD */}
      {activeTab === "dashboard" && (
        <div className="space-y-6 max-w-[1600px] mx-auto w-full">
          {/* Header & Quick Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className={`text-2xl font-bold tracking-tight ${dark ? "text-white" : "text-slate-900"}`}>
                Engineering Pulse
              </h3>
              <p className={`text-xs mt-1 ${mutedText}`}>
                {admin
                  ? "Sprint velocity, project lifecycles, and engineering health."
                  : "Live sprint track, deliverables velocity, active bugs, and standup tracking."}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {admin ? (
                <button
                  onClick={() => setActiveTab("assign")}
                  className="flex h-9 items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 px-3.5 text-xs font-semibold text-white shadow-sm transition"
                >
                  <Plus size={14} />
                  <span>Assign Project</span>
                </button>
              ) : (
                <>
                  {!subAdmin && (
                    <button
                      onClick={() => setShowIssueModal(true)}
                      className="flex h-9 items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 px-3.5 text-xs font-semibold text-white shadow-sm transition"
                    >
                      <Plus size={14} />
                      <span>Report Bug</span>
                    </button>
                  )}
                  <button
                    onClick={() => setActiveTab("daily")}
                    className={`flex h-9 items-center gap-2 rounded-xl border px-3.5 text-xs font-semibold transition ${
                      dark ? "border-[#222d42] bg-[#171f30] text-slate-200 hover:bg-[#1e293b]" : "border-[#e5dcd0] bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <CalendarDays size={14} />
                    <span>Daily Standup</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* 4 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Metric 1: Active In Progress */}
            <div className={`p-5 rounded-2xl border transition-all ${bgCard}`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-medium uppercase tracking-wider ${mutedText}`}>Active Deliveries</span>
                <div className="h-9 w-9 rounded-xl flex items-center justify-center bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <FolderKanban size={18} />
                </div>
              </div>
              <div className="mt-3">
                <div className={`text-2xl font-bold font-mono ${dark ? "text-white" : "text-slate-900"}`}>
                  {activeProjects}
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-[11px] text-cyan-400 font-medium">
                  <span>{projects.length} total projects assigned</span>
                </div>
              </div>
            </div>

            {/* Metric 2: Delivery Velocity */}
            <div className={`p-5 rounded-2xl border transition-all ${bgCard}`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-medium uppercase tracking-wider ${mutedText}`}>Sprint Velocity</span>
                <div className="h-9 w-9 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <TrendingUp size={18} />
                </div>
              </div>
              <div className="mt-3">
                <div className={`text-2xl font-bold font-mono ${dark ? "text-white" : "text-slate-900"}`}>
                  {averageProgress}%
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-[11px] text-emerald-400 font-medium">
                  <span>{completedProjects} projects shipped</span>
                </div>
              </div>
            </div>

            {/* Metric 3: Open Issues / Bugs */}
            <div className={`p-5 rounded-2xl border transition-all ${bgCard}`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-medium uppercase tracking-wider ${mutedText}`}>Unresolved Bugs</span>
                <div className="h-9 w-9 rounded-xl flex items-center justify-center bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <AlertCircle size={18} />
                </div>
              </div>
              <div className="mt-3">
                <div className={`text-2xl font-bold font-mono ${dark ? "text-white" : "text-slate-900"}`}>
                  {issuesList.filter((i) => i.status !== "RESOLVED").length}
                </div>
                <div className={`flex items-center gap-1.5 mt-1 text-[11px] font-medium ${
                  issuesList.filter((i) => i.status !== "RESOLVED" && (i.priority === "URGENT" || i.priority === "HIGH")).length > 0
                    ? "text-rose-400"
                    : "text-emerald-400"
                }`}>
                  <span>
                    {issuesList.filter((i) => i.status !== "RESOLVED" && (i.priority === "URGENT" || i.priority === "HIGH")).length} critical priority
                  </span>
                </div>
              </div>
            </div>

            {/* Metric 4: Standup Activity */}
            <div className={`p-5 rounded-2xl border transition-all ${bgCard}`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-medium uppercase tracking-wider ${mutedText}`}>Standup Logs</span>
                <div className="h-9 w-9 rounded-xl flex items-center justify-center bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <CalendarDays size={18} />
                </div>
              </div>
              <div className="mt-3">
                <div className={`text-2xl font-bold font-mono ${dark ? "text-white" : "text-slate-900"}`}>
                  {dailyUpdatesList.length}
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-[11px] text-indigo-400 font-medium">
                  <span>Logged developer standups</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2-Column Split: Active Projects & Bug Radar */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Side: Active Sprints & Standup Feed (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Active Projects Tracker */}
              <div className={`rounded-2xl border p-5 ${bgCard}`}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className={`text-sm font-bold ${dark ? "text-white" : "text-slate-900"}`}>Current Project Sprints</h4>
                    <p className={`text-[11px] ${mutedText}`}>Assigned deliverables and milestone completion</p>
                  </div>
                  <button
                    onClick={() => setActiveTab("projects")}
                    className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                  >
                    <span>All Projects</span>
                    <ArrowUpRight size={13} />
                  </button>
                </div>

                {projects.length === 0 ? (
                  <div className="py-8 text-center">
                    <FolderKanban size={28} className={`mx-auto mb-2 opacity-30 ${mutedText}`} />
                    <p className={`text-xs ${mutedText}`}>No assigned projects found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {projects.slice(0, 4).map((p) => {
                      const prog = Number(p.progress ?? (p.status === "COMPLETED" ? 100 : 0));
                      return (
                        <div
                          key={p.id}
                          onClick={() => {
                            selectProject(p);
                            setActiveTab("projects");
                          }}
                          className={`p-3.5 rounded-xl border cursor-pointer hover:border-indigo-500/30 transition ${
                            dark ? "border-[#1b2438] bg-[#0f1420]/60 hover:bg-[#151c2e]" : "border-[#ede5d8] bg-[#fbf8f2] hover:bg-[#f5ede0]"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <h5 className={`text-xs font-bold truncate ${dark ? "text-white" : "text-slate-900"}`}>
                                  {p.name}
                                </h5>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                                  p.priority === "URGENT" || p.priority === "HIGH"
                                    ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                    : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                                }`}>
                                  {p.priority}
                                </span>
                              </div>
                              <div className={`text-[10px] mt-0.5 ${mutedText}`}>
                                {p.client_name ? `Client: ${p.client_name}` : "Internal Project"}
                                {p.due_date ? ` • Due: ${p.due_date}` : ""}
                              </div>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              p.status === "COMPLETED"
                                ? "bg-emerald-500/10 text-emerald-400"
                                : p.status === "IN_PROGRESS"
                                ? "bg-cyan-500/10 text-cyan-400"
                                : "bg-slate-500/10 text-slate-400"
                            }`}>
                              {p.status.replace("_", " ")}
                            </span>
                          </div>

                          {/* Progress bar */}
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-[10px] mb-1">
                              <span className={mutedText}>Sprint Progress</span>
                              <span className="font-mono font-bold">{prog}%</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  prog >= 80 ? "bg-emerald-400" : prog >= 40 ? "bg-indigo-400" : "bg-cyan-400"
                                }`}
                                style={{ width: `${prog}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Recent Standup Submissions */}
              <div className={`rounded-2xl border p-5 ${bgCard}`}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className={`text-sm font-bold ${dark ? "text-white" : "text-slate-900"}`}>Recent Standup Logs</h4>
                    <p className={`text-[11px] ${mutedText}`}>Engineering daily progress & roadblocks</p>
                  </div>
                  <button
                    onClick={() => setActiveTab("daily")}
                    className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                  >
                    <span>All Standups</span>
                    <ArrowUpRight size={13} />
                  </button>
                </div>

                {dailyUpdatesList.length === 0 ? (
                  <div className="py-6 text-center">
                    <CalendarDays size={24} className={`mx-auto mb-2 opacity-30 ${mutedText}`} />
                    <p className={`text-xs ${mutedText}`}>No standups logged yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {dailyUpdatesList.slice(0, 3).map((up) => (
                      <div
                        key={up.id}
                        className={`p-3 rounded-xl border ${
                          dark ? "border-[#1b2438] bg-[#0f1420]/60" : "border-[#ede5d8] bg-[#fbf8f2]"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-indigo-400">{up.developer_name}</span>
                          <span className={`text-[10px] ${mutedText}`}>{up.hours_worked || 8} hrs logged</span>
                        </div>
                        <div className="mt-1.5 text-xs">
                          <span className={`text-[10px] uppercase font-bold text-slate-400 mr-1.5`}>Done:</span>
                          <span className="text-slate-300">{up.completed_today || "Tasks completed"}</span>
                        </div>
                        {up.blocked && up.blocked.toLowerCase() !== "none" && (
                          <div className="mt-1 text-[11px] text-rose-400 flex items-center gap-1">
                            <span className="font-bold">Blocker:</span>
                            <span>{up.blocked}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Side: Unresolved Bug Radar & Shortcuts (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              {/* Unresolved Bug Radar */}
              <div className={`rounded-2xl border p-5 ${bgCard}`}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className={`text-sm font-bold ${dark ? "text-white" : "text-slate-900"}`}>Active Bug Radar</h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {issuesList.filter((i) => i.status !== "RESOLVED").length}
                      </span>
                    </div>
                    <p className={`text-[11px] ${mutedText}`}>Unresolved issues needing attention</p>
                  </div>
                  <button
                    onClick={() => setActiveTab("issues")}
                    className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                  >
                    <span>Full Tracker</span>
                    <ArrowUpRight size={13} />
                  </button>
                </div>

                {issuesList.filter((i) => i.status !== "RESOLVED").length === 0 ? (
                  <div className="py-8 text-center">
                    <CheckCircle2 size={28} className="mx-auto mb-2 text-emerald-400/60" />
                    <p className="text-xs font-medium text-emerald-400">Zero open blockers. Clean build!</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {issuesList
                      .filter((i) => i.status !== "RESOLVED")
                      .slice(0, 5)
                      .map((issue) => (
                        <div
                          key={issue.id}
                          onClick={() => {
                            setSelectedIssue(issue);
                            setActiveTab("issues");
                          }}
                          className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer hover:border-amber-500/30 transition ${
                            dark ? "border-[#1b2438] bg-[#0f1420]/60 hover:bg-[#151c2e]" : "border-[#ede5d8] bg-[#fbf8f2] hover:bg-[#f5ede0]"
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold truncate">{issue.title}</div>
                            <div className={`text-[10px] mt-0.5 flex items-center gap-2 ${mutedText}`}>
                              <span>{issue.project_name || "Engineering"}</span>
                              <span>•</span>
                              <span className={`font-semibold ${
                                issue.priority === "URGENT" || issue.priority === "HIGH" ? "text-rose-400" : "text-slate-400"
                              }`}>
                                {issue.priority}
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                            {issue.type}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Developer Tooling Shortcuts */}
              <div className={`rounded-2xl border p-5 ${bgCard}`}>
                <h4 className={`text-sm font-bold mb-1 ${dark ? "text-white" : "text-slate-900"}`}>Developer Shortcuts</h4>
                <p className={`text-[11px] mb-4 ${mutedText}`}>Quick navigation to workspace utilities</p>

                <div className="space-y-2">
                  <button
                    onClick={() => setActiveTab("projects")}
                    className={`w-full p-2.5 rounded-xl border flex items-center justify-between text-left transition ${
                      dark ? "border-[#1b2438] bg-[#0f1420]/60 hover:bg-[#151c2e]" : "border-[#ede5d8] bg-[#fbf8f2] hover:bg-[#f5ede0]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <FolderKanban size={15} className="text-cyan-400" />
                      <span className="text-xs font-semibold">Browse Projects & Tasks</span>
                    </div>
                    <ChevronRight size={14} className={mutedText} />
                  </button>

                  {!admin && (
                    <button
                      onClick={() => setActiveTab("sows")}
                      className={`w-full p-2.5 rounded-xl border flex items-center justify-between text-left transition ${
                        dark ? "border-[#1b2438] bg-[#0f1420]/60 hover:bg-[#151c2e]" : "border-[#ede5d8] bg-[#fbf8f2] hover:bg-[#f5ede0]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <FileText size={15} className="text-indigo-400" />
                        <span className="text-xs font-semibold">Scope of Work (SOWs)</span>
                      </div>
                      <ChevronRight size={14} className={mutedText} />
                    </button>
                  )}

                  {!subAdmin && (
                    <button
                      onClick={() => setActiveTab("vault")}
                      className={`w-full p-2.5 rounded-xl border flex items-center justify-between text-left transition ${
                        dark ? "border-[#1b2438] bg-[#0f1420]/60 hover:bg-[#151c2e]" : "border-[#ede5d8] bg-[#fbf8f2] hover:bg-[#f5ede0]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <KeyRound size={15} className="text-amber-400" />
                        <span className="text-xs font-semibold">Credentials & API Vault</span>
                      </div>
                      <ChevronRight size={14} className={mutedText} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: PROJECTS */}
      {activeTab === "projects" && (
            <div className="space-y-6 max-w-[1600px] mx-auto w-full">
              {/* TOP STATS CARDS */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Total Projects", value: projects.length, color: "text-white" },
                  { label: "Active In Progress", value: activeProjects, color: "text-cyan-400" },
                  { label: "Completed", value: completedProjects, color: "text-emerald-400" },
                  { label: "Avg Delivery Rate", value: `${averageProgress}%`, color: "text-indigo-400" },
                ].map((stat) => (
                  <div key={stat.label} className={`rounded-3xl border p-4 lg:p-5 ${bgCard} shadow-sm`}>
                    <div className={`text-[11px] font-semibold uppercase tracking-wider ${mutedText}`}>
                      {stat.label}
                    </div>
                    <div className={`text-2xl lg:text-3xl font-bold mt-1.5 ${stat.color}`}>
                      {stat.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* FILTERS & SEARCH */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  {["ALL", "NEW", "IN_PROGRESS", "COMPLETED"].map((st) => (
                    <button
                      key={st}
                      onClick={() => setProjectStatusFilter(st)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                        projectStatusFilter === st
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                          : `${mutedText} border border-inherit hover:bg-white/5`
                      }`}
                    >
                      {st === "ALL" ? "All Projects" : st.replace("_", " ")}
                    </button>
                  ))}
                </div>

                {admin && (
                  <div className="flex items-center gap-2">
                    <select
                      value={activeDeveloperId ?? ""}
                      onChange={(e) => setActiveDeveloperId(e.target.value || null)}
                      className={`h-9 rounded-xl border px-3 text-xs outline-none ${inputBg}`}
                    >
                      <option value="">All Developers</option>
                      {developers.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={() => setActiveTab("assign")}
                      className="flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-3.5 text-xs font-semibold text-white shadow hover:opacity-95"
                    >
                      <Plus size={14} />
                      <span>New Project</span>
                    </button>
                  </div>
                )}
              </div>

              {/* PROJECTS GRID */}
              {loading && projects.length === 0 ? (
                <div className={`rounded-3xl border p-12 text-center text-sm ${bgCard}`}>
                  Loading projects...
                </div>
              ) : visibleProjects.length === 0 ? (
                <div className={`rounded-3xl border border-dashed p-14 text-center ${bgCard}`}>
                  <FolderKanban size={32} className="mx-auto text-slate-500 opacity-60 mb-2" />
                  <p className="text-sm font-semibold">No projects found in this category.</p>
                  <p className={`text-xs mt-1 ${mutedText}`}>
                    {admin ? "Assign a new project to get started." : "No tasks currently assigned to you."}
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {visibleProjects.map((project) => {
                    const projectProgress = Number(
                      project.progress ?? (project.status === "COMPLETED" ? 100 : 0)
                    );
                    const isSelected = selected?.id === project.id;
                    return (
                      <div
                        key={project.id}
                        onClick={() => void selectProject(project)}
                        className={`cursor-pointer rounded-3xl border p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl ${
                          isSelected
                            ? "border-indigo-500 bg-indigo-950/20 ring-2 ring-indigo-500/20"
                            : `${bgCard} hover:border-indigo-500/40`
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className={`font-bold text-sm leading-tight ${dark ? "text-white" : "text-slate-900"}`}>
                              {project.name}
                            </h3>
                            <div className={`text-xs mt-1 ${mutedText}`}>
                              {project.client_name || "Internal Project"}
                              {project.developer_name ? ` • ${project.developer_name}` : ""}
                            </div>
                          </div>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                              project.status === "COMPLETED"
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : project.status === "IN_PROGRESS"
                                ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                                : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            }`}
                          >
                            {project.status.replace("_", " ")}
                          </span>
                        </div>

                        <p className={`mt-3 line-clamp-2 text-xs leading-relaxed ${mutedText}`}>
                          {project.description || "No description provided."}
                        </p>

                        <div className="mt-4 pt-3 border-t border-inherit">
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className={mutedText}>Completion</span>
                            <span className="font-semibold text-indigo-400">{projectProgress}%</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-400 transition-all duration-500"
                              style={{ width: `${projectProgress}%` }}
                            />
                          </div>
                        </div>

                        {project.due_date && (
                          <div className={`mt-3 flex items-center gap-1.5 text-[11px] ${mutedText}`}>
                            <CalendarDays size={13} />
                            <span>Due: {new Date(project.due_date).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* PROJECT DETAILS & PROGRESS UPDATE MODAL/DRAWER */}
              <AnimatePresence>
                {selected && (
                  <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setSelected(null)}
                      className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
                    />

                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 10 }}
                      className={`relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border p-6 lg:p-8 shadow-2xl ${
                        dark ? "border-white/10 bg-[#121624] text-white" : "border-slate-200 bg-white text-slate-900"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4 border-b border-inherit pb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-xl font-bold">{selected.name}</h3>
                            <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                              {selected.status.replace("_", " ")}
                            </span>
                          </div>
                          <p className={`text-xs mt-1 ${mutedText}`}>
                            Client: {selected.client_name || "Internal"} • Assigned:{" "}
                            {selected.developer_name || "Developer"}
                          </p>
                        </div>
                        <button
                          onClick={() => setSelected(null)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-white"
                        >
                          <X size={20} />
                        </button>
                      </div>

                      {/* Project Description */}
                      <div className="mt-4">
                        <h4 className={`text-[11px] font-bold uppercase tracking-wider ${mutedText}`}>
                          Project Scope & Non-secret Notes
                        </h4>
                        <p className={`mt-1 text-xs leading-relaxed ${dark ? "text-slate-300" : "text-slate-700"}`}>
                          {selected.description || "No description added."}
                        </p>
                      </div>

                      {/* STATUS & PROGRESS */}
                      {admin ? (
                        <div className="mt-5 rounded-2xl border border-inherit p-4">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold">Project Status & Work Done</span>
                            <span className="text-xs text-indigo-400 font-semibold">
                              {selected.progress ?? (selected.status === "COMPLETED" ? 100 : 0)}% complete
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-2 mb-3">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-bold border ${
                                selected.status === "COMPLETED"
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                  : selected.status === "IN_PROGRESS"
                                  ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                                  : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              }`}
                            >
                              {selected.status.replace("_", " ")}
                            </span>
                            <span className={`text-[11px] ${mutedText}`}>
                              Managed by developer ({selected.developer_name || "Assigned Developer"})
                            </span>
                          </div>

                          <div className="h-2.5 w-full rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-400 transition-all duration-500"
                              style={{
                                width: `${selected.progress ?? (selected.status === "COMPLETED" ? 100 : 0)}%`,
                              }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="mt-5 rounded-2xl border border-inherit p-4">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold">Update Status</span>
                            <span className="text-xs text-indigo-400 font-semibold">{progress}% complete</span>
                          </div>

                          <div className="grid grid-cols-4 gap-2 mb-4">
                            {[
                              { id: "NEW", label: "New" },
                              { id: "PENDING", label: "Pending" },
                              { id: "IN_PROGRESS", label: "In Progress" },
                              { id: "COMPLETED", label: "Completed" },
                            ].map((s) => (
                              <button
                                key={s.id}
                                onClick={() => void updateProjectStatus(s.id)}
                                className={`py-2 rounded-xl text-xs font-semibold transition ${
                                  selected.status === s.id
                                    ? "bg-indigo-600 text-white shadow-md"
                                    : "border border-inherit text-slate-400 hover:bg-white/5"
                                }`}
                              >
                                {s.label}
                              </button>
                            ))}
                          </div>

                          {/* Slider */}
                          <label className="block text-xs font-semibold mb-1">Progress Percentage</label>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={progress}
                            onChange={(e) => setProgress(Number(e.target.value))}
                            className="w-full accent-indigo-600 h-2 bg-slate-800 rounded-lg cursor-pointer"
                          />

                          {/* Note */}
                          <textarea
                            rows={2}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Add progress note or milestone completed..."
                            className={`mt-3 w-full rounded-xl border p-3 text-xs outline-none ${inputBg}`}
                          />

                          <button
                            disabled={saving === "update"}
                            onClick={() => void addUpdate()}
                            className="mt-3 w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs font-semibold shadow hover:opacity-95 disabled:opacity-50"
                          >
                            <Send size={14} />
                            <span>{saving === "update" ? "Saving..." : "Save Progress Update"}</span>
                          </button>
                        </div>
                      )}

                      {/* UPDATES TIMELINE */}
                      <div className="mt-6">
                        <h4 className="text-xs font-bold mb-3">Delivery Updates History</h4>
                        <div className="space-y-2.5 max-h-56 overflow-y-auto">
                          {updates.map((u) => (
                            <div key={u.id} className="rounded-2xl border border-inherit p-3 text-xs">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-slate-200">
                                  {u.author_name || "Developer"}
                                </span>
                                <span className="font-mono text-indigo-400 font-bold">{u.progress}%</span>
                              </div>
                              {u.message && <p className={`mt-1 ${mutedText}`}>{u.message}</p>}
                              <div className={`mt-1.5 text-[10px] ${mutedText}`}>
                                {new Date(u.created_at).toLocaleString()}
                              </div>
                            </div>
                          ))}
                          {updates.length === 0 && (
                            <div className={`text-center py-4 text-xs ${mutedText}`}>
                              No progress logs recorded yet.
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* TAB 2: TEAM MEMBERS (ADMIN ONLY) */}
          {activeTab === "team" && admin && (
            <div className="space-y-6 max-w-[1600px] mx-auto w-full">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className={`text-xl font-bold ${dark ? "text-white" : "text-slate-900"}`}>Engineering Team Directory</h3>
                  <p className={`text-xs mt-1 ${mutedText}`}>
                    Manage developer logins, delivery workloads, and active task progress.
                  </p>
                </div>
                <button
                  onClick={() => setShowCreateDevModal(true)}
                  className="flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-semibold text-white shadow hover:bg-indigo-700"
                >
                  <Plus size={16} />
                  <span>Create Developer Login</span>
                </button>
              </div>

              {/* Developer Cards Grid */}
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {developers.map((dev) => {
                  const assigned = Number(dev.assigned_projects ?? 0);
                  const active = Number(dev.active_projects ?? 0);
                  const done = Number(dev.completed_projects ?? 0);
                  const avg = Number(dev.average_progress ?? 0);
                  const isSelected = activeDeveloperId === dev.id;

                  return (
                    <div
                      key={dev.id}
                      className={`rounded-3xl border p-5 transition-all ${
                        isSelected
                          ? "border-indigo-500 bg-indigo-950/20 ring-2 ring-indigo-500/20"
                          : bgCard
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-bold text-sm">{dev.name}</div>
                          <div className={`text-xs mt-0.5 ${mutedText}`}>{dev.email}</div>
                        </div>
                        <span className="rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-[10px] font-bold text-indigo-400">
                          {avg}% Progress
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-xl bg-white/5 p-2">
                          <div className="text-base font-bold text-white">{assigned}</div>
                          <div className={`text-[10px] uppercase ${mutedText}`}>Assigned</div>
                        </div>
                        <div className="rounded-xl bg-cyan-500/10 p-2">
                          <div className="text-base font-bold text-cyan-400">{active}</div>
                          <div className="text-[10px] uppercase text-cyan-400">Active</div>
                        </div>
                        <div className="rounded-xl bg-emerald-500/10 p-2">
                          <div className="text-base font-bold text-emerald-400">{done}</div>
                          <div className="text-[10px] uppercase text-emerald-400">Done</div>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center gap-2">
                        <button
                          onClick={() => {
                            setActiveDeveloperId(isSelected ? null : dev.id);
                            setActiveTab("projects");
                          }}
                          className="flex-1 h-8 rounded-xl border border-inherit text-xs font-semibold hover:bg-white/5 transition"
                        >
                          View Projects
                        </button>
                        <button
                          onClick={() => {
                            setActiveDeveloperId(dev.id);
                            void removeDeveloper();
                          }}
                          title="Remove developer"
                          className="h-8 w-8 flex items-center justify-center rounded-xl text-rose-400 hover:bg-rose-500/10 transition"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: ASSIGN PROJECT (ADMIN ONLY) */}
          {activeTab === "assign" && admin && (
            <div className="max-w-2xl mx-auto w-full space-y-5">
              <div className={`rounded-3xl border p-6 lg:p-8 ${bgCard} shadow-xl`}>
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="h-9 w-9 rounded-xl bg-indigo-600/15 text-indigo-400 flex items-center justify-center">
                    <Plus size={18} />
                  </div>
                  <h3 className="text-lg font-bold">Assign New Project</h3>
                </div>
                <p className={`text-xs mb-6 ${mutedText}`}>
                  Allocate a client or internal project with clear deliverables and assigned developer.
                </p>

                <form onSubmit={createProject} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                      Project Title *
                    </label>
                    <input
                      required
                      value={projectForm.name}
                      onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                      placeholder="e.g. Next.js E-Commerce Redesign"
                      className={`h-11 w-full rounded-xl border px-3.5 text-xs outline-none focus:border-indigo-500 ${inputBg}`}
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                        Client / Business Name
                      </label>
                      <input
                        value={projectForm.clientName}
                        onChange={(e) => setProjectForm({ ...projectForm, clientName: e.target.value })}
                        placeholder="e.g. Apex Global"
                        className={`h-11 w-full rounded-xl border px-3.5 text-xs outline-none focus:border-indigo-500 ${inputBg}`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                        Assign Developer *
                      </label>
                      <select
                        required
                        value={projectForm.assignedDeveloperId}
                        onChange={(e) => setProjectForm({ ...projectForm, assignedDeveloperId: e.target.value })}
                        className={`h-11 w-full rounded-xl border px-3 text-xs outline-none focus:border-indigo-500 ${inputBg}`}
                      >
                        <option value="">Select an engineer</option>
                        {developers.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} ({d.email})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                        Priority Level
                      </label>
                      <select
                        value={projectForm.priority}
                        onChange={(e) => setProjectForm({ ...projectForm, priority: e.target.value })}
                        className={`h-11 w-full rounded-xl border px-3 text-xs outline-none focus:border-indigo-500 ${inputBg}`}
                      >
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                        <option value="URGENT">Urgent</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                        Target Due Date
                      </label>
                      <input
                        type="date"
                        ref={dueDateRef}
                        value={projectForm.dueDate}
                        onChange={(e) => setProjectForm({ ...projectForm, dueDate: e.target.value })}
                        className={`h-11 w-full rounded-xl border px-3 text-xs outline-none focus:border-indigo-500 ${inputBg}`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                      Deliverables & Scope Brief
                    </label>
                    <textarea
                      rows={3}
                      value={projectForm.description}
                      onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                      placeholder="Describe the expected functionality, endpoints, Figma links, or deployment requirements..."
                      className={`w-full rounded-xl border p-3.5 text-xs outline-none focus:border-indigo-500 ${inputBg}`}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={saving === "project" || developers.length === 0}
                    className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-700 text-white font-semibold text-xs shadow-lg shadow-indigo-600/25 hover:opacity-95 disabled:opacity-50"
                  >
                    {saving === "project" ? "Assigning Project..." : "Assign Project to Developer"}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB: DAILY UPDATES */}
          {activeTab === "daily" && admin && !subAdmin && (
            <div className="space-y-6 max-w-[1600px] mx-auto w-full">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className={`text-xl font-bold ${dark ? "text-white" : "text-slate-900"}`}>Developer Daily Standup & Work Log</h3>
                  <p className={`text-xs mt-1 ${mutedText}`}>
                    Log daily progress, completed tasks, blockers, and hours worked
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Submission Form */}
                <div className={`lg:col-span-1 rounded-3xl border p-5 sm:p-6 ${bgCard} shadow-sm`}>
                  <h4 className="font-bold text-sm mb-1">Submit Daily Report</h4>
                  <p className={`text-xs mb-4 ${mutedText}`}>Keep leads and managers in sync</p>

                  <form onSubmit={submitDailyUpdate} className="space-y-3.5 text-xs">
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Project</label>
                      <input
                        value={dailyForm.projectName}
                        onChange={e => setDailyForm({ ...dailyForm, projectName: e.target.value })}
                        placeholder="e.g. ZootechX CRM Core"
                        className={`h-9 w-full rounded-xl border px-3 text-xs outline-none ${inputBg}`}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Completed Today *</label>
                      <textarea
                        required
                        rows={3}
                        value={dailyForm.completedToday}
                        onChange={e => setDailyForm({ ...dailyForm, completedToday: e.target.value })}
                        placeholder="Merged SOW module, resolved payment CORS issue..."
                        className={`w-full rounded-xl border p-2.5 text-xs outline-none ${inputBg}`}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">In Progress *</label>
                      <textarea
                        required
                        rows={2}
                        value={dailyForm.inProgress}
                        onChange={e => setDailyForm({ ...dailyForm, inProgress: e.target.value })}
                        placeholder="Unit testing and frontend wiring..."
                        className={`w-full rounded-xl border p-2.5 text-xs outline-none ${inputBg}`}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Blocked</label>
                        <input
                          value={dailyForm.blocked}
                          onChange={e => setDailyForm({ ...dailyForm, blocked: e.target.value })}
                          placeholder="None"
                          className={`h-9 w-full rounded-xl border px-3 text-xs outline-none ${inputBg}`}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Hours Worked *</label>
                        <input
                          type="number"
                          step="0.5"
                          min="0.5"
                          max="24"
                          required
                          value={dailyForm.hoursWorked}
                          onChange={e => setDailyForm({ ...dailyForm, hoursWorked: Number(e.target.value) })}
                          className={`h-9 w-full rounded-xl border px-3 text-xs mono outline-none ${inputBg}`}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Tomorrow's Plan *</label>
                      <textarea
                        required
                        rows={2}
                        value={dailyForm.tomorrowsPlan}
                        onChange={e => setDailyForm({ ...dailyForm, tomorrowsPlan: e.target.value })}
                        placeholder="End-to-end regression testing..."
                        className={`w-full rounded-xl border p-2.5 text-xs outline-none ${inputBg}`}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={saving === "update"}
                      className="w-full h-10 mt-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md transition"
                    >
                      {saving === "update" ? "Saving..." : "Submit Daily Update"}
                    </button>
                  </form>
                </div>

                {/* Feed of Updates */}
                <div className="lg:col-span-2 space-y-3">
                  <h4 className="font-bold text-sm mb-3">Recent Daily Reports ({dailyUpdatesList.length})</h4>
                  {dailyUpdatesList.length === 0 ? (
                    <div className={`rounded-3xl border p-12 text-center text-xs ${bgCard} ${mutedText}`}>
                      No daily updates logged yet. Submit your first update above.
                    </div>
                  ) : (
                    dailyUpdatesList.map((du) => (
                      <div key={du.id} className={`rounded-2xl border p-4.5 ${bgCard} shadow-sm space-y-3`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm">{du.developer_name}</span>
                            {du.project_name && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                {du.project_name}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mono">
                              {du.hours_worked}h logged
                            </span>
                            <span className={`text-[11px] mono ${mutedText}`}>
                              {new Date(du.created_at).toLocaleDateString([], { month: "short", day: "numeric" })}
                            </span>
                          </div>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-2.5 text-xs">
                          <div className="rounded-xl p-2.5 bg-black/20 border border-inherit">
                            <div className="text-[10px] font-semibold uppercase text-emerald-400 mb-1">Completed Today</div>
                            <p className="leading-relaxed">{du.completed_today}</p>
                          </div>
                          <div className="rounded-xl p-2.5 bg-black/20 border border-inherit">
                            <div className="text-[10px] font-semibold uppercase text-blue-400 mb-1">In Progress</div>
                            <p className="leading-relaxed">{du.in_progress}</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between text-[11px] pt-1 border-t border-inherit/40 gap-2">
                          <div>
                            <span className="text-slate-400 font-medium">Tomorrow: </span>
                            <span>{du.tomorrows_plan}</span>
                          </div>
                          {du.blocked && du.blocked !== "None" && (
                            <div className="text-rose-400 font-medium">
                              Blocked: {du.blocked}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: ISSUES & BUGS */}
          {activeTab === "issues" && (
            <div className="space-y-6 max-w-[1600px] mx-auto w-full">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className={`text-xl font-bold ${dark ? "text-white" : "text-slate-900"}`}>Developer Issue & Bug Tracker</h3>
                  <p className={`text-xs mt-1 ${mutedText}`}>
                    {admin || subAdmin
                      ? "Review bugs, technical debt, and issues reported by developers (Read-Only)"
                      : "Log bugs, technical debt, and feature improvements"}
                  </p>
                </div>
                {!admin && !subAdmin && (
                  <button
                    onClick={() => setShowIssueModal(true)}
                    className="h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-2 shadow"
                  >
                    <Plus size={15} />
                    <span>Report Bug / Issue</span>
                  </button>
                )}
                {(admin || subAdmin) && (
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1.5 rounded-full text-[11px] font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20">
                      Read-Only View
                    </span>
                  </div>
                )}
              </div>

              {/* Issues Grid */}
              {issuesList.length === 0 ? (
                <div className={`rounded-3xl border p-12 text-center text-xs ${bgCard} ${mutedText}`}>
                  No developer issues or bugs reported yet.
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {issuesList.map((issue) => (
                    <div
                      key={issue.id}
                      onClick={() => setSelectedIssue(issue)}
                      className={`cursor-pointer rounded-2xl border p-5 ${bgCard} shadow-sm flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-500/40`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2.5">
                          <div className="flex items-center gap-1.5">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              issue.type === "BUG" ? "bg-rose-500/10 text-rose-400 border-rose-500/30" : "bg-blue-500/10 text-blue-400 border-blue-500/30"
                            }`}>
                              {issue.type}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              issue.priority === "URGENT" || issue.priority === "HIGH" ? "bg-amber-500/10 text-amber-400 border-amber-500/30" : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                            }`}>
                              {issue.priority}
                            </span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            issue.status === "RESOLVED" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                          }`}>
                            {issue.status}
                          </span>
                        </div>
                        <h4 className="font-bold text-sm leading-snug">{issue.title}</h4>
                        <div className="mt-1 text-xs text-indigo-400 font-semibold">
                          Reported by: {issue.developer_name || "Developer"}
                        </div>
                        <p className={`mt-2 text-xs line-clamp-3 leading-relaxed ${mutedText}`}>{issue.description}</p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-inherit flex items-center justify-between text-xs">
                        <span className={`text-[11px] mono font-medium ${mutedText}`}>
                          {issue.project_name || "General Engineering"}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-indigo-400 hover:underline font-semibold">
                            Read Details →
                          </span>
                          {!admin && !subAdmin && issue.status !== "RESOLVED" && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                void resolveIssue(issue.id);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold hover:bg-emerald-500/20"
                            >
                              Resolve
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* READ COMPLETE DESCRIPTION MODAL */}
              <AnimatePresence>
                {selectedIssue && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedIssue(null)} />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className={`relative w-full max-w-[560px] max-h-[85vh] overflow-y-auto rounded-3xl border p-6 lg:p-7 shadow-2xl ${bgCard} z-10`}
                    >
                      <div className="flex items-start justify-between pb-3 border-b border-inherit gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              selectedIssue.type === "BUG" ? "bg-rose-500/10 text-rose-400 border-rose-500/30" : "bg-blue-500/10 text-blue-400 border-blue-500/30"
                            }`}>
                              {selectedIssue.type}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              selectedIssue.priority === "URGENT" || selectedIssue.priority === "HIGH" ? "bg-amber-500/10 text-amber-400 border-amber-500/30" : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                            }`}>
                              {selectedIssue.priority} Priority
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              selectedIssue.status === "RESOLVED" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                            }`}>
                              {selectedIssue.status}
                            </span>
                          </div>
                          <h4 className="font-bold text-lg leading-snug">{selectedIssue.title}</h4>
                        </div>
                        <button onClick={() => setSelectedIssue(null)} className={`h-8 w-8 rounded-xl border flex items-center justify-center shrink-0 ${dark ? "border-[#222d42]" : "border-[#eee6da]"}`}>
                          <X size={15} />
                        </button>
                      </div>

                      <div className="py-4 space-y-4 text-xs">
                        <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-black/10 border border-inherit">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Reporting Developer</span>
                            <span className="font-bold text-indigo-400 text-xs">{selectedIssue.developer_name || "Developer"}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Associated Project</span>
                            <span className="font-bold text-xs">{selectedIssue.project_name || "General Engineering"}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Date Reported</span>
                            <span className={`text-[11px] ${mutedText}`}>{new Date(selectedIssue.created_at).toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Current Status</span>
                            <span className="font-bold text-xs">{selectedIssue.status}</span>
                          </div>
                        </div>

                        <div>
                          <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                            Full Description
                          </h5>
                          <div className={`p-4 rounded-2xl border text-xs leading-relaxed whitespace-pre-wrap ${dark ? "bg-slate-900/50 border-white/10 text-slate-200" : "bg-slate-50 border-slate-200 text-slate-800"}`}>
                            {selectedIssue.description || "No description provided."}
                          </div>
                        </div>

                        {(admin || subAdmin) && (
                          <div className={`p-3 rounded-xl border text-[11px] ${dark ? "bg-slate-900/30 border-white/5 text-slate-400" : "bg-slate-100 border-slate-200 text-slate-600"}`}>
                            Read-Only View: Super Admin and Sub-Admin accounts cannot create, edit, delete, or change status of developer reported issues.
                          </div>
                        )}
                      </div>

                      <div className="pt-3 border-t border-inherit flex justify-end gap-2">
                        {!admin && !subAdmin && selectedIssue.status !== "RESOLVED" && (
                          <button
                            onClick={() => void resolveIssue(selectedIssue.id)}
                            className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            Mark Resolved
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setSelectedIssue(null)}
                          className={`px-4 py-2 rounded-xl text-xs font-semibold border ${dark ? "border-[#222d42]" : "border-[#eee6da]"}`}
                        >
                          Close
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

              {/* LOG ISSUE MODAL (DEVELOPER ONLY) */}
              <AnimatePresence>
                {showIssueModal && !admin && !subAdmin && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowIssueModal(false)} />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className={`relative w-full max-w-[480px] rounded-3xl border p-6 shadow-2xl ${bgCard} z-10`}
                    >
                      <div className="flex items-center justify-between pb-3 border-b border-inherit">
                        <h4 className="font-bold text-sm">Report Bug / Technical Issue</h4>
                        <button onClick={() => setShowIssueModal(false)} className={`h-8 w-8 rounded-xl border flex items-center justify-center ${dark ? "border-[#222d42]" : "border-[#eee6da]"}`}>
                          <X size={15} />
                        </button>
                      </div>

                      <form onSubmit={submitIssue} className="space-y-3.5 pt-3 text-xs">
                        <div>
                          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Issue Title *</label>
                          <input
                            required
                            value={issueForm.title}
                            onChange={e => setIssueForm({ ...issueForm, title: e.target.value })}
                            placeholder="e.g. Memory leak during large CSV export"
                            className={`h-9 w-full rounded-xl border px-3 text-xs outline-none ${inputBg}`}
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Description *</label>
                          <textarea
                            required
                            rows={4}
                            value={issueForm.description}
                            onChange={e => setIssueForm({ ...issueForm, description: e.target.value })}
                            placeholder="Steps to reproduce, stack trace, or proposed resolution..."
                            className={`w-full rounded-xl border p-2.5 text-xs outline-none ${inputBg}`}
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Associated Project</label>
                          <input
                            value={issueForm.projectName}
                            onChange={e => setIssueForm({ ...issueForm, projectName: e.target.value })}
                            placeholder="e.g. ZootechX CRM Core"
                            className={`h-9 w-full rounded-xl border px-3 text-xs outline-none ${inputBg}`}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Type</label>
                            <select
                              value={issueForm.type}
                              onChange={e => setIssueForm({ ...issueForm, type: e.target.value as any })}
                              className={`h-9 w-full rounded-xl border px-3 text-xs outline-none ${inputBg}`}
                            >
                              <option value="BUG">Bug</option>
                              <option value="FEATURE">Feature Request</option>
                              <option value="IMPROVEMENT">Improvement</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Priority</label>
                            <select
                              value={issueForm.priority}
                              onChange={e => setIssueForm({ ...issueForm, priority: e.target.value as any })}
                              className={`h-9 w-full rounded-xl border px-3 text-xs outline-none ${inputBg}`}
                            >
                              <option value="LOW">Low</option>
                              <option value="MEDIUM">Medium</option>
                              <option value="HIGH">High</option>
                              <option value="URGENT">Urgent</option>
                            </select>
                          </div>
                        </div>

                        <div className="pt-2 flex justify-end gap-2">
                          <button type="button" onClick={() => setShowIssueModal(false)} className={`px-4 py-2 rounded-xl text-xs font-semibold border ${dark ? "border-[#222d42]" : "border-[#eee6da]"}`}>
                            Cancel
                          </button>
                          <button type="submit" disabled={saving === "update"} className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50">
                            {saving === "update" ? "Submitting..." : "Submit Issue"}
                          </button>
                        </div>
                      </form>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* TAB 4: CREDENTIALS VAULT */}
          {activeTab === "vault" && !subAdmin && (
            <div className="max-w-[1600px] mx-auto w-full">
              <CredentialsVault dark={dark} />
            </div>
          )}

          {/* TAB 5: SCOPE OF WORK (SOW) */}
          {activeTab === "sows" && (
            <div className="max-w-[1600px] mx-auto w-full">
              <ScopeOfWorkWorkspace dark={dark} readOnly={true} />
            </div>
          )}

          {/* CREATE DEVELOPER MODAL */}
          <AnimatePresence>
            {showCreateDevModal && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <div
                  className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
                  onClick={() => setShowCreateDevModal(false)}
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`relative w-full max-w-md rounded-3xl border p-6 shadow-2xl ${bgCard}`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-base">Create Developer Login</h3>
                    <button
                      onClick={() => setShowCreateDevModal(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <form onSubmit={createDeveloper} className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold mb-1">Developer Full Name</label>
                      <input
                        required
                        value={developerForm.name}
                        onChange={(e) => setDeveloperForm({ ...developerForm, name: e.target.value })}
                        placeholder="e.g. Rahul Sharma"
                        className={`h-10 w-full rounded-xl border px-3 text-xs outline-none ${inputBg}`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Work Email</label>
                      <input
                        required
                        type="email"
                        value={developerForm.email}
                        onChange={(e) => setDeveloperForm({ ...developerForm, email: e.target.value })}
                        placeholder="e.g. rahul@company.com"
                        className={`h-10 w-full rounded-xl border px-3 text-xs outline-none ${inputBg}`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Temporary Password</label>
                      <input
                        required
                        type="password"
                        minLength={8}
                        value={developerForm.password}
                        onChange={(e) => setDeveloperForm({ ...developerForm, password: e.target.value })}
                        placeholder="Min 8 characters"
                        className={`h-10 w-full rounded-xl border px-3 text-xs outline-none ${inputBg}`}
                      />
                    </div>
                    <div className="pt-2 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowCreateDevModal(false)}
                        className="h-9 px-4 rounded-xl border border-inherit text-xs font-semibold"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={saving === "developer"}
                        className="h-9 px-5 rounded-xl bg-indigo-600 text-xs font-semibold text-white shadow hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {saving === "developer" ? "Creating..." : "Create Account"}
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </>
      );

      if (embedded) {
        return (
          <div className="max-w-[1600px] mx-auto w-full space-y-6">
            {/* PAGE HEADER MATCHING SUPER ADMIN PAGES */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className={`text-[22px] font-bold ${dark ? "text-white" : "text-slate-900"}`}>
                    Developers & Projects
                  </h1>
                  <span className="rounded-full bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 text-[10px] font-bold text-indigo-400">
                    Engineering Hub
                  </span>
                </div>
                <p className={`text-[13px] ${mutedText} mt-0.5`}>
                  Manage engineering team, monitor delivery progress, and assign client tasks
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => void load()}
                  title="Refresh projects"
                  className={`flex h-9 w-9 items-center justify-center rounded-xl border transition ${
                    dark ? "border-white/10 text-slate-400 hover:text-white hover:bg-white/5" : "border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <RefreshCw size={15} className={loading ? "animate-spin text-indigo-400" : ""} />
                </button>

                {admin && (
                  <>
                    <button
                      onClick={() => setShowCreateDevModal(true)}
                      className={`h-9 px-3.5 rounded-xl border text-[13px] font-semibold flex items-center gap-2 transition ${
                        dark
                          ? "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <Users size={15} />
                      <span>Add Developer</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab("assign");
                        setSelected(null);
                      }}
                      className="h-9 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-[13px] font-medium flex items-center gap-2 shadow-sm hover:opacity-95"
                    >
                      <Plus size={16} />
                      <span>Assign Project</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* SUBNAV TABS */}
            <div className={`flex items-center gap-2 border-b pb-3 ${dark ? "border-white/10" : "border-[#eee6da]"}`}>
              {[
                { id: "projects", label: "Projects & Tasks", icon: FolderKanban, badge: projects.length },
                ...(admin ? [{ id: "team", label: "Team Members", icon: Users, badge: developers.length }] : []),
                ...(admin ? [{ id: "assign", label: "Assign Project", icon: Plus }] : []),
              ].map((tab) => {
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id as any);
                      setSelected(null);
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                      active
                        ? (dark
                            ? "bg-[#171f30] text-[#cca45f] border border-[#cca45f]/30 shadow-sm font-semibold"
                            : "bg-white text-[#a07432] border border-[#eee6da] shadow-sm font-semibold")
                        : `${mutedText} hover:${dark ? "bg-white/5 text-[#f1f5f9]" : "bg-[#f4eee4] text-[#1c1917]"}`
                    }`}
                  >
                    <tab.icon size={15} />
                    <span>{tab.label}</span>
                    {tab.badge !== undefined && (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          active
                            ? (dark ? "bg-[#cca45f]/20 text-[#cca45f]" : "bg-[#f5eddf] text-[#a07432]")
                            : (dark ? "bg-white/5 text-slate-400" : "bg-slate-100 text-slate-700")
                        }`}
                      >
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* TAB BODY CONTENT */}
            {renderTabContent()}
          </div>
        );
      }

      return (
        <div className={`luxury-app ${dark ? "dark-theme" : "light-theme"} h-screen w-full overflow-hidden flex flex-row ${bgMain} font-sans antialiased transition-colors duration-200`}>
          {/* SIDEBAR NAVIGATION */}
          <aside className={`w-[260px] shrink-0 hidden md:flex flex-col border-r ${bgSidebar} h-screen z-20`}>
            {/* Brand Header */}
            <div className="p-5 border-b border-inherit flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold text-base border ${
                  dark 
                    ? "bg-[#171f30] border-[#222d42] text-[#cca45f] shadow-[0_0_15px_rgba(204,164,95,0.15)]" 
                    : "bg-white border-[#eee6da] text-[#a07432] shadow-sm"
                }`}>
                  Z
                </div>
                <div>
                  <div className="font-bold text-[14px] leading-tight flex items-center gap-1.5">
                    ZootechX<span className={dark ? "text-[#cca45f]" : "text-[#a07432]"}>.ai</span>
                    <span className={`h-1.5 w-1.5 rounded-full animate-pulse ${dark ? "bg-[#cca45f]" : "bg-[#a07432]"}`} />
                  </div>
                  <div className={`text-[10px] font-mono uppercase tracking-widest font-semibold ${dark ? "text-[#cca45f]" : "text-[#a07432]"}`}>
                    {admin ? "Engineering Hub" : "Developer Workspace"}
                  </div>
                </div>
              </div>
              {onBack && (
                <button
                  onClick={onBack}
                  title="Return to portal"
                  className={`p-1.5 rounded-lg border border-inherit transition ${dark ? "text-slate-400 hover:text-white hover:bg-white/5" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"}`}
                >
                  <ArrowLeft size={16} />
                </button>
              )}
            </div>

            {/* Navigation List */}
            <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
              {navigationItems.map((item) => {
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id as any);
                      setSelected(null);
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-[13px] font-medium transition-all ${
                      active
                        ? (dark ? "bg-[#171f30] text-[#cca45f] border border-[#cca45f]/30 shadow-md font-semibold" : "bg-white text-[#a07432] border border-[#eee6da] shadow-sm font-semibold")
                        : `${mutedText} ${dark ? "hover:bg-[#121826] hover:text-[#f1f5f9]" : "hover:bg-[#f4eee4] hover:text-[#1c1917]"}`
                    }`}
                  >
                    <item.icon size={18} className={active ? (dark ? "text-[#cca45f]" : "text-[#a07432]") : (dark ? "text-slate-400" : "text-slate-500")} />
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.badge !== undefined && (
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                          active
                            ? (dark ? "bg-[#cca45f]/20 text-[#cca45f]" : "bg-[#f5eddf] text-[#a07432]")
                            : (dark ? "bg-white/5 text-slate-400" : "bg-slate-100 text-slate-700")
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Bottom Actions */}
            {onLogout && (
              <div className="p-4 border-t border-inherit space-y-3">
                <div className="flex items-center gap-2.5 px-2 py-1">
                  <div className="h-8 w-8 rounded-lg bg-indigo-600/20 text-indigo-400 font-bold flex items-center justify-center text-xs border border-indigo-500/30 shrink-0">
                    {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : "D"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate leading-tight">{currentUser?.name || "Developer"}</p>
                    <p className={`text-[10px] truncate leading-tight ${mutedText}`}>{currentUser?.email || "dev@zootechx.com"}</p>
                  </div>
                </div>
                <button
                  onClick={onLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition"
                >
                  <LogOut size={15} />
                  <span>Log out</span>
                </button>
              </div>
            )}
          </aside>

          {/* MAIN VIEWPORT */}
          <div className="flex-1 min-w-0 h-screen flex flex-col overflow-hidden">
            {/* TOP BAR */}
            <header className={`w-full h-16 shrink-0 border-b flex items-center justify-between px-4 sm:px-6 backdrop-blur-xl ${bgSidebar}`}>
              <div className="flex items-center gap-3">
                <h2 className={`text-lg font-bold tracking-tight capitalize ${dark ? "text-white" : "text-slate-900"}`}>
                  {activeTab === "dashboard"
                    ? "Engineering Pulse"
                    : activeTab === "projects"
                    ? "Projects & Tasks"
                    : activeTab === "daily"
                    ? "Daily Developer Updates"
                    : activeTab === "sows"
                    ? "Scope of Work (SOW)"
                    : activeTab === "issues"
                    ? "Issues & Bug Tracker"
                    : activeTab === "team"
                    ? "Team Developers"
                    : activeTab === "assign"
                    ? "Assign Project"
                    : "Credentials & Secret Vault"}
                </h2>
                <div className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 text-[10px] font-bold text-indigo-400">
                  {currentUser?.name ? `${currentUser.name} • Dev` : (admin ? "Super Admin Access" : "Developer Role")}
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Day & Night Theme Toggle Button */}
                <button
                  onClick={handleToggleTheme}
                  title={dark ? "Switch to Day (Light Mode)" : "Switch to Night (Dark Mode)"}
                  aria-label={dark ? "Switch to Day (Light Mode)" : "Switch to Night (Dark Mode)"}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
                    dark 
                      ? "bg-[#121826] border-[#1e293b] text-[#f1f5f9] hover:border-[#cca45f]/40 shadow-sm" 
                      : "bg-white border-[#eee6da] text-[#1c1917] hover:border-[#a07432]/40 shadow-sm"
                  }`}
                >
                  {dark ? (
                    <Moon size={13} className="text-[#cca45f]" />
                  ) : (
                    <Sun size={13} className="text-amber-500" />
                  )}
                  <span className="text-[10px] font-bold tracking-widest uppercase font-mono">
                    {dark ? "NIGHT" : "DAY"}
                  </span>
                  <div className={`w-8 h-4 rounded-full p-0.5 transition-colors flex items-center ${
                    dark ? "bg-[#090d16] justify-end" : "bg-[#ede5d8] justify-start"
                  }`}>
                    <div className={`w-3 h-3 rounded-full shadow transition-transform ${
                      dark ? "bg-[#cca45f]" : "bg-[#b88a44]"
                    }`} />
                  </div>
                </button>

                <button
                  onClick={() => void load()}
                  title="Refresh projects"
                  className={`flex h-9 w-9 items-center justify-center rounded-xl border transition ${
                    dark ? "border-white/10 text-slate-400 hover:text-white hover:bg-white/5" : "border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <RefreshCw size={15} className={loading ? "animate-spin text-indigo-400" : ""} />
                </button>

                {/* Mobile tab buttons */}
                <div className="flex md:hidden items-center gap-1">
                  {navigationItems.map((it) => (
                    <button
                      key={it.id}
                      onClick={() => {
                        setActiveTab(it.id as any);
                        setSelected(null);
                      }}
                      className={`p-2 rounded-xl border ${
                        activeTab === it.id
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : (dark ? "border-white/10 text-slate-400 hover:text-white" : "border-slate-200 text-slate-600 hover:bg-slate-100")
                      }`}
                    >
                      <it.icon size={16} />
                    </button>
                  ))}
                </div>
              </div>
            </header>

            {/* CONTENT AREA */}
            <main className={`flex-1 h-full overflow-y-auto p-6 lg:p-8 space-y-6 ${bgMain}`}>
              {renderTabContent()}
            </main>
          </div>
        </div>
      );
    }
