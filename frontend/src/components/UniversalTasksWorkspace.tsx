import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckSquare, Plus, Search, CheckCircle2, AlertCircle, X,
  Clock, User, Tag, Calendar, RefreshCw, ChevronRight, AlertTriangle, Eye
} from "lucide-react";
import { apiFetch } from "../lib/api";

export interface CompanyTask {
  id: string;
  title: string;
  description: string;
  assigned_to_id: string;
  assigned_to_name: string;
  related_type: "PROJECT" | "LEAD" | "CLIENT" | "CAMPAIGN" | "GENERAL";
  related_id?: string | null;
  related_name?: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: "TO_DO" | "IN_PROGRESS" | "BLOCKED" | "REVIEW" | "COMPLETED";
  due_date?: string | null;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

interface UserOption {
  id: string;
  name: string;
  role: string;
}

const priorityStyles = {
  LOW: { bg: "bg-slate-500/10", text: "text-slate-400", border: "border-slate-500/20" },
  MEDIUM: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30" },
  HIGH: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30" },
  URGENT: { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/30" },
};

const statusStyles = {
  TO_DO: { bg: "bg-slate-500/10", text: "text-slate-400", label: "To Do" },
  IN_PROGRESS: { bg: "bg-blue-500/10", text: "text-blue-400", label: "In Progress" },
  BLOCKED: { bg: "bg-rose-500/10", text: "text-rose-400", label: "Blocked" },
  REVIEW: { bg: "bg-purple-500/10", text: "text-purple-400", label: "Review" },
  COMPLETED: { bg: "bg-emerald-500/10", text: "text-emerald-400", label: "Completed" },
};

export default function UniversalTasksWorkspace({
  dark = true,
  canCreate = true,
  canUpdateStatus = false,
}: {
  dark?: boolean;
  canCreate?: boolean;
  canUpdateStatus?: boolean;
}) {
  const [tasks, setTasks] = useState<CompanyTask[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [notice, setNotice] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewTask, setViewTask] = useState<CompanyTask | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [form, setForm] = useState({
    title: "",
    description: "",
    assignedToId: "",
    assignedToName: "",
    relatedType: "PROJECT" as CompanyTask["related_type"],
    relatedName: "",
    priority: "MEDIUM" as CompanyTask["priority"],
    dueDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
  });

  const showNotification = (message: string, type: "success" | "error" = "success") => {
    setNotice({ message, type });
    setTimeout(() => setNotice(null), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [taskRes, userRes] = await Promise.all([
        apiFetch("/api/tasks"),
        apiFetch("/api/users"),
      ]);
      const [taskData, userData] = await Promise.all([
        taskRes.json(),
        userRes.json(),
      ]);
      if (taskRes.ok) setTasks(taskData.data || []);
      if (userRes.ok) {
        setUsers(
          (userData.data || []).map((u: { id: string; name: string; role: string }) => ({
            id: u.id,
            name: u.name,
            role: u.role,
          }))
        );
        if (userData.data?.[0] && !form.assignedToId) {
          setForm((f) => ({
            ...f,
            assignedToId: userData.data[0].id,
            assignedToName: userData.data[0].name,
          }));
        }
      }
    } catch {
      showNotification("Unable to load tasks", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.assignedToId) {
      showNotification("Please provide a task title and assignee", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch("/api/tasks", {
        method: "POST",
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create task");
      showNotification(`Task "${data.data.title}" assigned successfully!`);
      setShowCreateModal(false);
      setForm({
        title: "",
        description: "",
        assignedToId: users[0]?.id || "",
        assignedToName: users[0]?.name || "",
        relatedType: "PROJECT",
        relatedName: "",
        priority: "MEDIUM",
        dueDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
      });
      await loadData();
    } catch (err) {
      showNotification(err instanceof Error ? err.message : "Failed to create task", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (task: CompanyTask, nextStatus: CompanyTask["status"]) => {
    try {
      const res = await apiFetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error("Status update failed");
      showNotification(`Task moved to ${statusStyles[nextStatus].label}`);
      await loadData();
    } catch {
      showNotification("Failed to update task", "error");
    }
  };

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      const matchesStatus = statusFilter === "ALL" || t.status === statusFilter;
      const matchesQuery =
        t.title.toLowerCase().includes(query.toLowerCase()) ||
        t.description.toLowerCase().includes(query.toLowerCase()) ||
        t.assigned_to_name.toLowerCase().includes(query.toLowerCase()) ||
        (t.related_name || "").toLowerCase().includes(query.toLowerCase());
      return matchesStatus && matchesQuery;
    });
  }, [tasks, statusFilter, query]);

  // Styling Tokens matching screenshot
  const cardBg = dark ? "bg-[#0f172a] border-slate-800 text-slate-100 shadow-sm" : "bg-white border-slate-200/80 text-slate-900 shadow-sm";
  const muted = dark ? "text-slate-400" : "text-slate-500";
  const inputBg = dark
    ? "bg-[#090d16] border-slate-800 text-slate-100 placeholder:text-slate-500 focus:border-slate-600"
    : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-400";

  return (
    <div className="space-y-6">
      {/* Toast */}
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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Company Task Orchestrator
          </h1>
          <p className={`text-xs mt-1 ${muted}`}>
            Cross-functional tracking across projects, sales leads, campaigns, and delivery
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="tail-btn-secondary flex h-9 w-9 items-center justify-center p-0"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          {canCreate && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="tail-btn-primary flex items-center gap-2"
            >
              <Plus size={14} />
              <span>Create Task</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats Cards - TailAdmin Metric style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Tasks", value: tasks.length, icon: CheckSquare, bg: "bg-indigo-500/10 text-indigo-500", tag: "Backlog" },
          { label: "In Progress", value: tasks.filter((t) => t.status === "IN_PROGRESS").length, icon: Clock, bg: "bg-blue-500/10 text-blue-500", tag: "Active" },
          { label: "Urgent Priority", value: tasks.filter((t) => t.priority === "URGENT").length, icon: AlertTriangle, bg: "bg-rose-500/10 text-rose-500", tag: "Urgent" },
          { label: "Completed", value: tasks.filter((t) => t.status === "COMPLETED").length, icon: CheckCircle2, bg: "bg-emerald-500/10 text-emerald-500", tag: "Done" },
        ].map((item) => (
          <div key={item.label} className="tail-card p-5 flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {item.label}
              </span>
              <h4 className="mt-2 text-2xl font-bold font-mono text-slate-900 dark:text-white">
                {item.value}
              </h4>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Live
                </span>
                <span>• {item.tag}</span>
              </div>
            </div>
            <div className={`tail-metric-icon ${item.bg}`}>
              <item.icon size={22} />
            </div>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="tail-card p-3 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search size={15} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${muted}`} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks, assignees, or projects..."
            className={`h-9 w-full rounded-xl border pl-9 pr-3 text-xs outline-none ${inputBg}`}
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {["ALL", "TO_DO", "IN_PROGRESS", "REVIEW", "COMPLETED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-all ${
                statusFilter === st
                  ? "bg-indigo-600 text-white shadow-xs font-bold"
                  : `${muted} hover:bg-slate-100 dark:hover:bg-slate-800`
              }`}
            >
              {st === "ALL" ? "All Tasks" : statusStyles[st as keyof typeof statusStyles]?.label || st}
            </button>
          ))}
        </div>
      </div>

      {/* Tasks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full tail-card p-12 text-center text-xs text-slate-500 dark:text-slate-400">
            No tasks found matching your criteria.
          </div>
        ) : (
          filtered.map((task) => {
            const pStyle = priorityStyles[task.priority] || priorityStyles.MEDIUM;
            const sStyle = statusStyles[task.status] || statusStyles.TO_DO;
            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setViewTask(task)}
                className="tail-card p-4 flex flex-col justify-between hover:border-indigo-500/50 hover:shadow-md cursor-pointer transition"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${pStyle.bg} ${pStyle.text} ${pStyle.border}`}>
                      {task.priority}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${sStyle.bg} ${sStyle.text}`}>
                      {sStyle.label}
                    </span>
                  </div>

                  <h4 className={`mt-3 font-semibold text-sm leading-snug ${dark ? "text-white" : "text-black"}`}>
                    {task.title}
                  </h4>
                  <p className={`mt-1.5 text-xs line-clamp-2 leading-relaxed ${muted}`}>
                    {task.description}
                  </p>

                  <div className="mt-3 pt-2.5 border-t border-inherit/60 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                    <div className={`flex items-center gap-1.5 ${muted}`}>
                      <User size={12} className={dark ? "text-zinc-400" : "text-zinc-600"} />
                      <span>Created by: <strong className={`font-semibold ${dark ? "text-zinc-200" : "text-zinc-800"}`}>{task.created_by_name || "Super Admin"}</strong></span>
                    </div>
                    {task.related_name && (
                      <div className={`flex items-center gap-1 font-medium ${dark ? "text-zinc-300" : "text-zinc-700"}`}>
                        <Tag size={12} />
                        <span className="truncate max-w-[140px]">{task.related_name} ({task.related_type})</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-inherit flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-indigo-600/20 text-indigo-400 font-bold text-[10px] flex items-center justify-center">
                      {task.assigned_to_name.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] uppercase tracking-wider text-slate-400 font-medium leading-none">Assignee</span>
                      <span className={`text-[11px] font-medium truncate max-w-[100px] leading-tight mt-0.5 ${dark ? "text-slate-200" : "text-slate-800"}`}>
                        {task.assigned_to_name}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      title="View Details"
                      onClick={() => setViewTask(task)}
                      className={`h-7 px-2.5 rounded-lg text-[10px] font-semibold transition border flex items-center gap-1 ${
                        dark ? "border-slate-700 text-slate-300 hover:bg-white/10" : "border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <Eye size={12} />
                      <span>View</span>
                    </button>
                    {canUpdateStatus && task.status !== "COMPLETED" && (
                      <button
                        title="Mark Completed"
                        onClick={() => handleStatusChange(task, "COMPLETED")}
                        className={`h-7 px-2.5 rounded-lg text-[10px] font-semibold transition border ${
                          dark ? "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10" : "border-emerald-600 text-emerald-600 hover:bg-emerald-50"
                        }`}
                      >
                        Complete
                      </button>
                    )}
                    {canUpdateStatus && task.status === "TO_DO" && (
                      <button
                        title="Start Progress"
                        onClick={() => handleStatusChange(task, "IN_PROGRESS")}
                        className={`h-7 px-2.5 rounded-lg text-[10px] font-semibold transition border ${
                          dark ? "border-blue-500/30 text-blue-400 hover:bg-blue-500/10" : "border-blue-600 text-blue-600 hover:bg-blue-50"
                        }`}
                      >
                        Start
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* CREATE TASK MODAL */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`relative w-full max-w-[520px] rounded-3xl border p-6 shadow-2xl ${cardBg} z-10`}
            >
              <div className="flex items-center justify-between pb-4 border-b border-inherit">
                <div>
                  <h3 className={`font-bold text-base ${dark ? "text-white" : "text-[#1c1917]"}`}>Create & Assign Task</h3>
                  <p className={`text-xs ${muted}`}>Delegate work across engineering, sales, or marketing</p>
                </div>
                <button onClick={() => setShowCreateModal(false)} className={`h-8 w-8 rounded-xl border flex items-center justify-center ${dark ? "border-[#222d42]" : "border-[#eee6da]"}`}>
                  <X size={15} />
                </button>
              </div>

              <form onSubmit={handleCreateTask} className="space-y-4 pt-4">
                <div>
                  <label className={`text-[11px] font-semibold ${muted}`}>Task Title *</label>
                  <input
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. Conduct security penetration review on API"
                    className={`mt-1.5 w-full h-10 rounded-xl border px-3 text-xs outline-none ${inputBg}`}
                  />
                </div>

                <div>
                  <label className={`text-[11px] font-semibold ${muted}`}>Description</label>
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Actionable instructions, acceptance criteria, or relevant links..."
                    className={`mt-1.5 w-full rounded-xl border p-3 text-xs outline-none ${inputBg}`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`text-[11px] font-semibold ${muted}`}>Assignee *</label>
                    <select
                      required
                      value={form.assignedToId}
                      onChange={(e) => {
                        const sel = users.find((u) => u.id === e.target.value);
                        setForm({ ...form, assignedToId: e.target.value, assignedToName: sel?.name || "" });
                      }}
                      className={`mt-1.5 w-full h-10 rounded-xl border px-3 text-xs outline-none ${inputBg}`}
                    >
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.role})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={`text-[11px] font-semibold ${muted}`}>Priority</label>
                    <select
                      value={form.priority}
                      onChange={(e) => setForm({ ...form, priority: e.target.value as CompanyTask["priority"] })}
                      className={`mt-1.5 w-full h-10 rounded-xl border px-3 text-xs outline-none ${inputBg}`}
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`text-[11px] font-semibold ${muted}`}>Related Area</label>
                    <select
                      value={form.relatedType}
                      onChange={(e) => setForm({ ...form, relatedType: e.target.value as CompanyTask["related_type"] })}
                      className={`mt-1.5 w-full h-10 rounded-xl border px-3 text-xs outline-none ${inputBg}`}
                    >
                      <option value="PROJECT">Project</option>
                      <option value="LEAD">Sales Lead</option>
                      <option value="CLIENT">Client</option>
                      <option value="CAMPAIGN">Campaign</option>
                      <option value="GENERAL">General</option>
                    </select>
                  </div>

                  <div>
                    <label className={`text-[11px] font-semibold ${muted}`}>Related Name</label>
                    <input
                      value={form.relatedName}
                      onChange={(e) => setForm({ ...form, relatedName: e.target.value })}
                      placeholder="e.g. ZootechX Core"
                      className={`mt-1.5 w-full h-10 rounded-xl border px-3 text-xs outline-none ${inputBg}`}
                    />
                  </div>
                </div>

                <div className="pt-3 flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="tail-btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="tail-btn-primary flex items-center gap-2"
                  >
                    {saving ? <RefreshCw size={14} className="animate-spin" /> : <CheckSquare size={14} />}
                    <span>Assign Task</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TASK DETAILS MODAL */}
      <AnimatePresence>
        {viewTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setViewTask(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-xl rounded-3xl border p-6 shadow-2xl ${cardBg}`}
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between gap-3 pb-4 border-b border-inherit">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${priorityStyles[viewTask.priority]?.bg} ${priorityStyles[viewTask.priority]?.text} ${priorityStyles[viewTask.priority]?.border}`}>
                      {viewTask.priority} PRIORITY
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${statusStyles[viewTask.status]?.bg} ${statusStyles[viewTask.status]?.text}`}>
                      {statusStyles[viewTask.status]?.label}
                    </span>
                    {viewTask.related_name && (
                      <span className={`flex items-center gap-1 text-[11px] font-medium ${dark ? "text-zinc-300" : "text-zinc-700"}`}>
                        <Tag size={12} />
                        {viewTask.related_name} ({viewTask.related_type})
                      </span>
                    )}
                  </div>
                  <h3 className={`text-lg font-bold ${dark ? "text-white" : "text-slate-900"}`}>
                    {viewTask.title}
                  </h3>
                </div>
                <button
                  onClick={() => setViewTask(null)}
                  className={`h-8 w-8 rounded-full flex items-center justify-center border transition ${dark ? "border-slate-700 text-slate-400 hover:text-white hover:bg-white/10" : "border-slate-200 text-slate-500 hover:text-black hover:bg-slate-100"}`}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="py-4 space-y-4 max-h-[65vh] overflow-y-auto pr-1">
                {/* Full Description */}
                <div>
                  <label className={`text-[11px] font-bold uppercase tracking-wider ${muted}`}>Full Description</label>
                  <div className={`mt-1.5 p-4 rounded-2xl border text-xs leading-relaxed whitespace-pre-wrap ${dark ? "bg-[#171f30] border-[#222d42] text-slate-200" : "bg-[#fcfaf7] border-[#e5dcd0] text-slate-800"}`}>
                    {viewTask.description || "No description provided."}
                  </div>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className={`p-3.5 rounded-2xl border ${dark ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"}`}>
                    <div className={`text-[10px] uppercase font-bold tracking-wider ${muted} flex items-center gap-1.5`}>
                      <User size={12} className={dark ? "text-zinc-400" : "text-zinc-600"} />
                      Created By
                    </div>
                    <div className={`mt-1.5 font-semibold text-sm ${dark ? "text-white" : "text-slate-900"}`}>
                      {viewTask.created_by_name || "Super Admin"}
                    </div>
                    <div className={`mt-1 text-[10px] font-mono ${muted}`}>
                      Created: {new Date(viewTask.created_at).toLocaleDateString()} at {new Date(viewTask.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  <div className={`p-3.5 rounded-2xl border ${dark ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"}`}>
                    <div className={`text-[10px] uppercase font-bold tracking-wider ${muted} flex items-center gap-1.5`}>
                      <CheckSquare size={12} className="text-indigo-400" />
                      Assigned To
                    </div>
                    <div className={`mt-1.5 font-semibold text-sm ${dark ? "text-white" : "text-slate-900"}`}>
                      {viewTask.assigned_to_name}
                    </div>
                    {viewTask.due_date ? (
                      <div className={`mt-1 text-[10px] font-mono ${muted} flex items-center gap-1`}>
                        <Calendar size={11} />
                        Due: {new Date(viewTask.due_date).toLocaleDateString()}
                      </div>
                    ) : (
                      <div className={`mt-1 text-[10px] ${muted}`}>No due date set</div>
                    )}
                  </div>
                </div>

                {/* Quick Status Update */}
                {canUpdateStatus ? (
                  <div className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${dark ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"}`}>
                    <div>
                      <div className={`text-[11px] font-bold ${dark ? "text-white" : "text-slate-900"}`}>Update Task Status</div>
                      <div className={`text-[11px] ${muted}`}>Move this task across workflow stages</div>
                    </div>
                    <select
                      value={viewTask.status}
                      onChange={(e) => {
                        const newStatus = e.target.value as CompanyTask["status"];
                        handleStatusChange(viewTask, newStatus);
                        setViewTask({ ...viewTask, status: newStatus });
                      }}
                      className={`h-9 px-3 rounded-xl border text-xs font-semibold outline-none cursor-pointer ${inputBg}`}
                    >
                      <option value="TO_DO">To Do</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="REVIEW">Review</option>
                      <option value="BLOCKED">Blocked</option>
                      <option value="COMPLETED">Completed</option>
                    </select>
                  </div>
                ) : (
                  <div className={`p-3 rounded-2xl border text-xs flex items-center justify-between ${dark ? "bg-white/5 border-white/10 text-zinc-400" : "bg-zinc-50 border-zinc-200 text-zinc-600"}`}>
                    <span className="font-medium">Task Status: <span className={`font-semibold ${dark ? "text-white" : "text-black"}`}>{statusStyles[viewTask.status]?.label || viewTask.status}</span></span>
                    <span className="text-[11px] opacity-75">Updated by Assignee ({viewTask.assigned_to_name})</span>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-inherit flex items-center justify-between">
                <span className={`text-[10px] font-mono ${muted}`}>
                  Task ID: {viewTask.id.slice(0, 8)}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setViewTask(null)}
                    className="tail-btn-secondary"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
