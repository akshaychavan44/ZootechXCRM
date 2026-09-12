import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Plus, Search, ExternalLink, Share2, Printer, CheckCircle2,
  AlertCircle, X, RefreshCw, Copy, Check, Eye, Edit3, Trash2, ShieldCheck,
  Calendar, Clock, DollarSign, ArrowUpRight, Sparkles, Wand2, Mail, Send,
  Download, History, User, Building, Phone
} from "lucide-react";
import { apiFetch } from "../lib/api";

export interface ScopeOfWorkVersion {
  version: number;
  version_label: string;
  scope_raw: string;
  rendered_document: string;
  project_value: number;
  payment_terms: string;
  updated_at: string;
  updated_by_name: string;
}

export interface ScopeOfWorkEmail {
  id: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  message: string;
  sent_by: string;
  sent_at: string;
}

export interface ScopeOfWork {
  id: string;
  sow_number: string;
  client_id: string;
  client_name: string;
  client_company?: string | null;
  project_name: string;
  template_id: string;
  template_name: string;
  template_version?: number;
  template_version_label?: string;
  version?: number;
  version_label?: string;
  scope_raw: string;
  rendered_document: string;
  project_value: number;
  payment_terms: string;
  timeline_weeks: number;
  status: "Draft" | "Generated" | "Sent" | "Viewed" | "Revised" | "Approved" | "Rejected";
  share_token?: string | null;
  share_expires_at?: string | null;
  prepared_by_name: string;
  created_at: string;
  updated_at: string;
  versions?: ScopeOfWorkVersion[];
  email_history?: ScopeOfWorkEmail[];
}

export interface GlobalSowTemplate {
  id: string;
  name: string;
  version: number;
  version_label: string;
  template_content: string;
  default_terms: string;
  uploaded_by_id: string;
  uploaded_by_name: string;
  uploaded_at: string;
  is_active: boolean;
}

interface ClientOption {
  id: string;
  name: string;
  company?: string | null;
  email?: string | null;
}

const statusBadge: Record<ScopeOfWork["status"], { bg: string; text: string; border: string }> = {
  Draft: { bg: "bg-slate-500/10", text: "text-slate-400", border: "border-slate-500/20" },
  Generated: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30" },
  Sent: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/30" },
  Viewed: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30" },
  Revised: { bg: "bg-indigo-500/10", text: "text-indigo-400", border: "border-indigo-500/30" },
  Approved: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" },
  Rejected: { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/30" },
};

export default function ScopeOfWorkWorkspace({
  dark = true,
  readOnly = false,
}: {
  dark?: boolean;
  readOnly?: boolean;
}) {
  const [sows, setSows] = useState<ScopeOfWork[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<GlobalSowTemplate | null>(null);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [notice, setNotice] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [previewSow, setPreviewSow] = useState<ScopeOfWork | null>(null);
  const [editSow, setEditSow] = useState<ScopeOfWork | null>(null);
  const [emailModalSow, setEmailModalSow] = useState<ScopeOfWork | null>(null);
  const [shareModalSow, setShareModalSow] = useState<ScopeOfWork | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  // Creation Form
  const [form, setForm] = useState({
    clientId: "",
    clientName: "",
    companyName: "",
    projectName: "",
    scopeRaw: "",
    projectValue: 250000,
    paymentTerms: "50% advance mobilization, 25% on staging deployment, 25% upon final QA & production release.",
    timelineWeeks: 6,
  });

  // Edit Form
  const [editForm, setEditForm] = useState({
    scopeRaw: "",
    projectValue: 0,
    paymentTerms: "",
    timelineWeeks: 6,
  });

  // Email Form
  const [emailForm, setEmailForm] = useState({
    to: "",
    cc: "",
    bcc: "",
    subject: "",
    message: "",
  });

  const showNotification = (message: string, type: "success" | "error" = "success") => {
    setNotice({ message, type });
    setTimeout(() => setNotice(null), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [sowRes, tplRes, clientRes] = await Promise.all([
        apiFetch("/api/sows"),
        apiFetch("/api/sow-template/active"),
        apiFetch("/api/clients"),
      ]);
      const [sowData, tplData, clientData] = await Promise.all([
        sowRes.json(),
        tplRes.json(),
        clientRes.json(),
      ]);

      if (sowRes.ok) setSows(sowData.data || []);
      if (tplRes.ok && tplData.data) {
        setActiveTemplate(tplData.data);
        if (tplData.data.default_terms && !form.scopeRaw) {
          setForm((f) => ({
            ...f,
            paymentTerms: tplData.data.default_terms,
          }));
        }
      }
      if (clientRes.ok) {
        setClients(
          (clientData.data || []).map((c: any) => ({
            id: c.id,
            name: c.name,
            company: c.company || c.name,
            email: c.email || null,
          }))
        );
      }
    } catch {
      showNotification("Unable to fetch Scope of Work records", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleClientSelect = (clientId: string) => {
    const c = clients.find((item) => item.id === clientId);
    if (c) {
      setForm((f) => ({
        ...f,
        clientId: c.id,
        clientName: c.name,
        companyName: c.company || c.name,
      }));
    }
  };

  const handleCreateSow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clientName.trim() || !form.projectName.trim() || !form.scopeRaw.trim()) {
      showNotification("Please specify Client, Project Name, and Scope Description.", "error");
      return;
    }
    setSaving(true);
    try {
      const response = await apiFetch("/api/sows", {
        method: "POST",
        body: JSON.stringify({
          clientId: form.clientId || "client-manual",
          clientName: form.clientName.trim(),
          companyName: form.companyName.trim() || form.clientName.trim(),
          clientCompany: form.companyName.trim() || form.clientName.trim(),
          projectName: form.projectName.trim(),
          scopeRaw: form.scopeRaw.trim(),
          projectValue: Number(form.projectValue) || 0,
          paymentTerms: form.paymentTerms.trim() || activeTemplate?.default_terms,
          timelineWeeks: Number(form.timelineWeeks) || 6,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to generate SOW");
      showNotification(`SOW ${data.data.sow_number} generated successfully!`);
      setShowCreateModal(false);
      setPreviewSow(data.data);
      setForm({
        clientId: "",
        clientName: "",
        companyName: "",
        projectName: "",
        scopeRaw: "",
        projectValue: 250000,
        paymentTerms: activeTemplate?.default_terms || "50% advance mobilization, 25% on staging, 25% on production release.",
        timelineWeeks: 6,
      });
      await loadData();
    } catch (err) {
      showNotification(err instanceof Error ? err.message : "Creation failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenEditModal = (sow: ScopeOfWork) => {
    setEditSow(sow);
    setEditForm({
      scopeRaw: sow.scope_raw,
      projectValue: sow.project_value,
      paymentTerms: sow.payment_terms,
      timelineWeeks: sow.timeline_weeks,
    });
  };

  const handleSaveSowRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSow) return;
    setSaving(true);
    try {
      const res = await apiFetch(`/api/sows/${editSow.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          scope_raw: editForm.scopeRaw,
          project_value: Number(editForm.projectValue),
          payment_terms: editForm.paymentTerms,
          timeline_weeks: Number(editForm.timelineWeeks),
          status: "Revised",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update SOW");
      showNotification(`SOW updated and version bumped to ${data.data.version_label}!`);
      setEditSow(null);
      setPreviewSow(data.data);
      await loadData();
    } catch (err) {
      showNotification(err instanceof Error ? err.message : "Revision failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenEmailModal = (sow: ScopeOfWork) => {
    setEmailModalSow(sow);
    const client = clients.find((c) => c.name === sow.client_name || c.company === sow.client_company);
    setEmailForm({
      to: client?.email || "",
      cc: "sales@zootechx.com",
      bcc: "",
      subject: `[ZootechX] Scope of Work & Commercial Proposal: ${sow.project_name} (${sow.sow_number})`,
      message: `Dear ${sow.client_name},\n\nPlease find attached the comprehensive Scope of Work proposal (${sow.sow_number}) for "${sow.project_name}".\n\nOur offshore engineering team is prepared to commence deployment according to the milestones detailed in the agreement.\n\nWarm regards,\nZootechX Offshore Engineering & Client Success`,
    });
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailModalSow || !emailForm.to.trim() || !emailForm.subject.trim()) {
      showNotification("Please provide recipient email (To) and subject.", "error");
      return;
    }
    setSendingEmail(true);
    try {
      const res = await apiFetch(`/api/sows/${emailModalSow.id}/email`, {
        method: "POST",
        body: JSON.stringify(emailForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to send email");
      showNotification(`SOW ${emailModalSow.sow_number} sent to ${emailForm.to}!`);
      setEmailModalSow(null);
      await loadData();
    } catch (err) {
      showNotification(err instanceof Error ? err.message : "Email dispatch failed", "error");
    } finally {
      setSendingEmail(false);
    }
  };

  const handleStatusUpdate = async (sow: ScopeOfWork, nextStatus: ScopeOfWork["status"]) => {
    try {
      const res = await apiFetch(`/api/sows/${sow.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error("Status update failed");
      showNotification(`${sow.sow_number} marked as ${nextStatus}`);
      await loadData();
    } catch {
      showNotification("Unable to update SOW status", "error");
    }
  };

  const handleGenerateShareLink = async (sow: ScopeOfWork) => {
    try {
      const res = await apiFetch(`/api/sows/${sow.id}/share`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to generate link");
      const updatedSow: ScopeOfWork = {
        ...sow,
        share_token: data.data?.shareToken || data.shareToken,
        share_expires_at: data.data?.expiresAt || data.expiresAt,
      };
      setShareModalSow(updatedSow);
      await loadData();
    } catch {
      showNotification("Failed to generate public share link", "error");
    }
  };

  const getPublicShareUrl = (token: string) => {
    if (typeof window === "undefined") return `/sow/share/${token}`;
    return `${window.location.origin}?sowToken=${token}`;
  };

  const copyToClipboard = (text: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const downloadSowMarkdown = (sow: ScopeOfWork) => {
    const blob = new Blob([sow.rendered_document], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${sow.sow_number}-${sow.project_name.toLowerCase().replace(/[^a-z0-9]/g, "-")}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showNotification("Downloaded SOW Markdown file");
  };

  const filtered = useMemo(() => {
    return sows.filter((sow) => {
      const matchesStatus = statusFilter === "ALL" || sow.status === statusFilter;
      const matchesQuery =
        sow.sow_number.toLowerCase().includes(query.toLowerCase()) ||
        sow.client_name.toLowerCase().includes(query.toLowerCase()) ||
        sow.project_name.toLowerCase().includes(query.toLowerCase()) ||
        (sow.client_company && sow.client_company.toLowerCase().includes(query.toLowerCase()));
      return matchesStatus && matchesQuery;
    });
  }, [sows, statusFilter, query]);

  // Styling Tokens
  const cardBg = dark ? "bg-black border-zinc-800" : "bg-white border-zinc-200";
  const muted = dark ? "text-zinc-400" : "text-zinc-600";
  const inputBg = dark
    ? "bg-[#09090b] border-zinc-800 text-white placeholder:text-zinc-500 focus:border-zinc-500"
    : "bg-white border-zinc-300 text-black placeholder:text-zinc-400 focus:border-black";

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
          <div className="flex items-center gap-2.5">
            <h1 className={`text-2xl font-bold tracking-tight ${dark ? "text-white" : "text-black"}`}>
              Scope of Work (SOW) Engine
            </h1>
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${dark ? "bg-zinc-900 border-zinc-700 text-zinc-300" : "bg-zinc-100 border-zinc-300 text-zinc-800"}`}>
              Company Template: {activeTemplate?.version_label || "v1.0"}
            </span>
          </div>
          <p className={`text-xs mt-1 ${muted}`}>
            Draft, generate, revise, dispatch via email, and securely share commercial client engineering contracts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            title="Refresh list"
            className="tail-btn-secondary flex h-9 w-9 items-center justify-center p-0"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
          {!readOnly && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="tail-btn-primary flex items-center gap-2"
            >
              <Plus size={15} />
              <span>Generate SOW</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards - TailAdmin Metric style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total SOWs", value: sows.length, icon: FileText, bg: "bg-indigo-500/10 text-indigo-500", tag: "Documents" },
          { label: "Approved Agreements", value: sows.filter((s) => s.status === "Approved").length, icon: CheckCircle2, bg: "bg-emerald-500/10 text-emerald-500", tag: "Signed" },
          {
            label: "Pipeline Value",
            value: `₹${sows.reduce((acc, s) => acc + (Number(s.project_value) || 0), 0).toLocaleString()}`,
            icon: ArrowUpRight,
            bg: "bg-blue-500/10 text-blue-500",
            tag: "Commercials",
          },
          { label: "Pending Review", value: sows.filter((s) => ["Generated", "Sent", "Viewed"].includes(s.status)).length, icon: Clock, bg: "bg-amber-500/10 text-amber-500", tag: "Under Review" },
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
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
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

      {/* Filters and Search */}
      <div className="tail-card p-3 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search size={15} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${muted}`} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search SOW #, client, or project..."
            className={`h-9 w-full rounded-xl border pl-9 pr-3 text-xs outline-none ${inputBg}`}
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {["ALL", "Draft", "Generated", "Sent", "Viewed", "Revised", "Approved"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold whitespace-nowrap transition ${
                statusFilter === st
                  ? "bg-indigo-600 text-white shadow-xs font-bold"
                  : `${muted} hover:bg-slate-100 dark:hover:bg-slate-800`
              }`}
            >
              {st === "ALL" ? "All Statuses" : st}
            </button>
          ))}
        </div>
      </div>

      {/* SOW Table */}
      <div className="tail-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-xs">
            <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/40 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
              <tr>
                <th className="p-3.5">Document Ref</th>
                <th className="p-3.5">Client & Project</th>
                <th className="p-3.5">Version</th>
                <th className="p-3.5">Commercial Value</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Share Link</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className={`p-12 text-center text-xs ${muted}`}>
                    No Scope of Work documents found.
                  </td>
                </tr>
              ) : (
                filtered.map((sow) => {
                  const badge = statusBadge[sow.status] || statusBadge.Draft;
                  return (
                    <tr key={sow.id} className={`hover:${dark ? "bg-white/[0.02]" : "bg-black/[0.01]"}`}>
                      <td className={`p-3.5 font-bold mono ${dark ? "text-white" : "text-black"}`}>
                        {sow.sow_number}
                        <div className={`text-[10px] font-normal ${muted}`}>
                          {new Date(sow.created_at).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className={`font-semibold ${dark ? "text-white" : "text-black"}`}>{sow.client_name}</div>
                        <div className={`text-[11px] ${muted}`}>{sow.project_name}</div>
                        {sow.client_company && sow.client_company !== sow.client_name && (
                          <div className={`text-[10px] ${muted}`}>{sow.client_company}</div>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span className={`font-bold font-mono ${dark ? "text-zinc-300" : "text-zinc-700"}`}>{sow.version_label || "v1.0"}</span>
                        <div className={`text-[10px] ${muted}`}>{sow.timeline_weeks} Weeks</div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold mono text-emerald-400">₹{Number(sow.project_value).toLocaleString()}</div>
                        <div className={`text-[10px] truncate max-w-[160px] ${muted}`} title={sow.payment_terms}>
                          {sow.payment_terms}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className="relative group inline-block">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${badge.bg} ${badge.text} ${badge.border}`}>
                            {sow.status}
                          </span>
                        </div>
                      </td>
                      <td className="p-3.5">
                        {sow.share_token ? (
                          <button
                            onClick={() => setShareModalSow(sow)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-400 hover:text-blue-300"
                          >
                            <Share2 size={12} />
                            <span>Active</span>
                          </button>
                        ) : !readOnly ? (
                          <button
                            onClick={() => handleGenerateShareLink(sow)}
                            className={`text-[11px] ${muted} hover:text-black dark:hover:text-white flex items-center gap-1`}
                          >
                            <Share2 size={12} />
                            <span>Generate</span>
                          </button>
                        ) : (
                          <span className={`text-[11px] ${muted}`}>—</span>
                        )}
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            title="Preview Document"
                            onClick={() => setPreviewSow(sow)}
                            className={`p-1.5 rounded-lg border transition ${
                              dark ? "border-zinc-800 hover:bg-white/10 text-white" : "border-zinc-300 hover:bg-black/5 text-black"
                            }`}
                          >
                            <Eye size={13} />
                          </button>
                          {!readOnly && (
                            <>
                              <button
                                title="Revise / Edit SOW"
                                onClick={() => handleOpenEditModal(sow)}
                                className={`p-1.5 rounded-lg border transition ${
                                  dark ? "border-[#222d42] hover:bg-white/5 text-blue-400" : "border-[#eee6da] hover:bg-black/5 text-blue-600"
                                }`}
                              >
                                <Edit3 size={13} />
                              </button>
                              <button
                                title="Send via Email"
                                onClick={() => handleOpenEmailModal(sow)}
                                className={`p-1.5 rounded-lg border transition ${
                                  dark ? "border-[#222d42] hover:bg-purple-500/10 text-purple-400" : "border-[#eee6da] hover:bg-purple-50 text-purple-600"
                                }`}
                              >
                                <Mail size={13} />
                              </button>
                              {sow.status !== "Approved" && (
                                <button
                                  title="Mark Approved"
                                  onClick={() => handleStatusUpdate(sow, "Approved")}
                                  className={`p-1.5 rounded-lg border transition ${
                                    dark ? "border-[#222d42] hover:bg-emerald-500/10 text-emerald-400" : "border-[#eee6da] hover:bg-emerald-50 text-emerald-600"
                                  }`}
                                >
                                  <CheckCircle2 size={13} />
                                </button>
                              )}
                            </>
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

      {/* CREATE SOW MODAL */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl border p-6 shadow-2xl ${cardBg}`}
            >
              <div className="flex items-center justify-between pb-4 border-b border-inherit">
                <div>
                  <h3 className="text-base font-bold">Generate New Scope of Work Proposal</h3>
                  <p className={`text-xs ${muted}`}>
                    Automatically formatted using the company-wide active contract template ({activeTemplate?.version_label || "v1.0"}).
                  </p>
                </div>
                <button onClick={() => setShowCreateModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateSow} className="flex-1 overflow-y-auto space-y-4 py-4 pr-1">
                {/* Client Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Select Existing Client</label>
                    <select
                      value={form.clientId}
                      onChange={(e) => handleClientSelect(e.target.value)}
                      className={`h-10 w-full rounded-xl border px-3 text-xs outline-none ${inputBg}`}
                    >
                      <option value="">-- Or enter client manually --</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.company ? `(${c.company})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Client Contact Name *</label>
                    <input
                      required
                      value={form.clientName}
                      onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                      placeholder="e.g. Sarah Jenkins"
                      className={`h-10 w-full rounded-xl border px-3 text-xs outline-none ${inputBg}`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Client Company / Brand</label>
                    <input
                      value={form.companyName}
                      onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                      placeholder="e.g. Apex Health Global"
                      className={`h-10 w-full rounded-xl border px-3 text-xs outline-none ${inputBg}`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Project Name *</label>
                    <input
                      required
                      value={form.projectName}
                      onChange={(e) => setForm({ ...form, projectName: e.target.value })}
                      placeholder="e.g. Cloud Telehealth Platform"
                      className={`h-10 w-full rounded-xl border px-3 text-xs outline-none ${inputBg}`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Project Value (₹) *</label>
                    <input
                      required
                      type="number"
                      min={0}
                      value={form.projectValue}
                      onChange={(e) => setForm({ ...form, projectValue: Number(e.target.value) })}
                      className={`h-10 w-full rounded-xl border px-3 text-xs outline-none ${inputBg}`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Estimated Timeline (Weeks)</label>
                    <input
                      required
                      type="number"
                      min={1}
                      max={52}
                      value={form.timelineWeeks}
                      onChange={(e) => setForm({ ...form, timelineWeeks: Number(e.target.value) })}
                      className={`h-10 w-full rounded-xl border px-3 text-xs outline-none ${inputBg}`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Scope of Work & Deliverables *</label>
                  <textarea
                    required
                    rows={7}
                    value={form.scopeRaw}
                    onChange={(e) => setForm({ ...form, scopeRaw: e.target.value })}
                    placeholder="Describe the modules, deliverables, offshore development architecture, sprint schedule..."
                    className={`w-full rounded-xl border p-3 text-xs outline-none leading-relaxed ${inputBg}`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Commercial Milestone Payment Terms</label>
                  <input
                    value={form.paymentTerms}
                    onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })}
                    className={`h-10 w-full rounded-xl border px-3 text-xs outline-none ${inputBg}`}
                  />
                </div>

                <div className="pt-3 border-t border-inherit flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="h-9 px-4 rounded-xl border border-inherit text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="h-9 px-5 rounded-xl text-xs font-semibold btn-dark-gradient text-white shadow transition disabled:opacity-50"
                  >
                    {saving ? "Generating SOW..." : "Generate Scope of Work"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT / REVISE MODAL */}
      <AnimatePresence>
        {editSow && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl border p-6 shadow-2xl ${cardBg}`}
            >
              <div className="flex items-center justify-between pb-4 border-b border-inherit">
                <div>
                  <h3 className="text-base font-bold">Revise SOW: {editSow.sow_number}</h3>
                  <p className={`text-xs ${muted}`}>
                    Modifying scope or commercials will automatically bump version to v{(editSow.version || 1) + 1}.0.
                  </p>
                </div>
                <button onClick={() => setEditSow(null)} className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveSowRevision} className="flex-1 overflow-y-auto space-y-4 py-4 pr-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Project Value (₹)</label>
                    <input
                      required
                      type="number"
                      value={editForm.projectValue}
                      onChange={(e) => setEditForm({ ...editForm, projectValue: Number(e.target.value) })}
                      className={`h-10 w-full rounded-xl border px-3 text-xs outline-none ${inputBg}`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Estimated Timeline (Weeks)</label>
                    <input
                      required
                      type="number"
                      value={editForm.timelineWeeks}
                      onChange={(e) => setEditForm({ ...editForm, timelineWeeks: Number(e.target.value) })}
                      className={`h-10 w-full rounded-xl border px-3 text-xs outline-none ${inputBg}`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Scope of Work & Deliverables</label>
                  <textarea
                    required
                    rows={8}
                    value={editForm.scopeRaw}
                    onChange={(e) => setEditForm({ ...editForm, scopeRaw: e.target.value })}
                    className={`w-full rounded-xl border p-3 text-xs outline-none leading-relaxed ${inputBg}`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Commercial Milestone Payment Terms</label>
                  <input
                    value={editForm.paymentTerms}
                    onChange={(e) => setEditForm({ ...editForm, paymentTerms: e.target.value })}
                    className={`h-10 w-full rounded-xl border px-3 text-xs outline-none ${inputBg}`}
                  />
                </div>

                <div className="pt-3 border-t border-inherit flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditSow(null)}
                    className="h-9 px-4 rounded-xl border border-inherit text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="h-9 px-5 rounded-xl text-xs font-semibold btn-dark-gradient text-white shadow transition disabled:opacity-50"
                  >
                    {saving ? "Saving Revision..." : `Publish Revision v${(editSow.version || 1) + 1}.0`}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EMAIL MODAL */}
      <AnimatePresence>
        {emailModalSow && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`relative w-full max-w-xl flex flex-col rounded-3xl border p-6 shadow-2xl ${cardBg}`}
            >
              <div className="flex items-center justify-between pb-4 border-b border-inherit">
                <div className="flex items-center gap-2">
                  <Mail size={18} className="text-purple-400" />
                  <h3 className="text-base font-bold">Email SOW Proposal to Client</h3>
                </div>
                <button onClick={() => setEmailModalSow(null)} className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSendEmail} className="space-y-3 py-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">Recipient Email (To) *</label>
                  <input
                    required
                    type="email"
                    value={emailForm.to}
                    onChange={(e) => setEmailForm({ ...emailForm, to: e.target.value })}
                    placeholder="client@company.com"
                    className={`h-10 w-full rounded-xl border px-3 text-xs outline-none ${inputBg}`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold mb-1">CC Email</label>
                    <input
                      value={emailForm.cc}
                      onChange={(e) => setEmailForm({ ...emailForm, cc: e.target.value })}
                      className={`h-9 w-full rounded-xl border px-3 text-xs outline-none ${inputBg}`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">BCC Email</label>
                    <input
                      value={emailForm.bcc}
                      onChange={(e) => setEmailForm({ ...emailForm, bcc: e.target.value })}
                      className={`h-9 w-full rounded-xl border px-3 text-xs outline-none ${inputBg}`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Subject *</label>
                  <input
                    required
                    value={emailForm.subject}
                    onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                    className={`h-10 w-full rounded-xl border px-3 text-xs outline-none ${inputBg}`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Message Body</label>
                  <textarea
                    rows={5}
                    value={emailForm.message}
                    onChange={(e) => setEmailForm({ ...emailForm, message: e.target.value })}
                    className={`w-full rounded-xl border p-3 text-xs outline-none leading-relaxed ${inputBg}`}
                  />
                </div>

                <div className="pt-3 border-t border-inherit flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEmailModalSow(null)}
                    className="h-9 px-4 rounded-xl border border-inherit text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={sendingEmail}
                    className="h-9 px-5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow"
                  >
                    <Send size={13} />
                    <span>{sendingEmail ? "Dispatching..." : "Send Proposal"}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SHARE MODAL */}
      <AnimatePresence>
        {shareModalSow && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`relative w-full max-w-lg rounded-3xl border p-6 shadow-2xl ${cardBg}`}
            >
              <div className="flex items-center justify-between pb-4 border-b border-inherit">
                <div className="flex items-center gap-2">
                  <Share2 size={18} className="text-blue-400" />
                  <h3 className="text-base font-bold">Client Public SOW Link</h3>
                </div>
                <button onClick={() => setShareModalSow(null)} className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors">
                  <X size={18} />
                </button>
              </div>

              <div className="py-4 space-y-4">
                <p className={`text-xs ${muted}`}>
                  This secure link allows the client to review and inspect the Scope of Work contract in read-only mode without logging in.
                </p>

                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={getPublicShareUrl(shareModalSow.share_token || "")}
                    className={`h-10 flex-1 rounded-xl border px-3 text-xs font-mono outline-none ${inputBg}`}
                  />
                  <button
                    onClick={() => copyToClipboard(getPublicShareUrl(shareModalSow.share_token || ""))}
                    className="h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0"
                  >
                    {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedLink ? "Copied" : "Copy Link"}</span>
                  </button>
                </div>

                {shareModalSow.share_expires_at && (
                  <div className={`text-[11px] ${muted} flex items-center gap-1.5`}>
                    <Clock size={13} />
                    <span>Valid until {new Date(shareModalSow.share_expires_at).toLocaleDateString()} (30-day link)</span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-inherit flex justify-end">
                <button
                  onClick={() => setShareModalSow(null)}
                  className="h-9 px-4 rounded-xl border border-inherit text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PREVIEW SOW DOCUMENT MODAL */}
      <AnimatePresence>
        {previewSow && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl border p-6 shadow-2xl ${cardBg}`}
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-inherit">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center border ${dark ? "bg-zinc-900 border-zinc-700 text-white" : "bg-zinc-100 border-zinc-300 text-black"}`}>
                    <FileText size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold">{previewSow.sow_number}</h3>
                      <span className={`rounded-full px-2 py-0.2 text-[10px] font-bold border ${dark ? "bg-zinc-900 border-zinc-700 text-zinc-300" : "bg-zinc-100 border-zinc-300 text-zinc-800"}`}>
                        {previewSow.version_label || "v1.0"}
                      </span>
                    </div>
                    <div className={`text-xs ${muted}`}>{previewSow.project_name} · {previewSow.client_name}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => downloadSowMarkdown(previewSow)}
                    title="Download Markdown"
                    className={`h-9 px-3 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${dark ? "border-[#222d42] hover:bg-white/5" : "border-[#eee6da] hover:bg-slate-50"}`}
                  >
                    <Download size={13} />
                    <span className="hidden sm:inline">Download</span>
                  </button>

                  <button
                    onClick={() => window.print()}
                    title="Print / Save as PDF"
                    className={`h-9 px-3 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${dark ? "border-[#222d42] hover:bg-white/5" : "border-[#eee6da] hover:bg-slate-50"}`}
                  >
                    <Printer size={13} />
                    <span className="hidden sm:inline">Print / PDF</span>
                  </button>

                  <button onClick={() => setPreviewSow(null)} className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 ml-2 transition-colors">
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Document Body */}
              <div className="flex-1 overflow-y-auto py-5 pr-1 space-y-5 print:p-0">
                {/* Meta summary strip */}
                <div className={`grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl border ${dark ? "bg-[#09090b] border-zinc-800" : "bg-zinc-50 border-zinc-200"}`}>
                  <div>
                    <div className={`text-[10px] uppercase font-bold tracking-wider ${muted}`}>Commercial Value</div>
                    <div className="text-sm font-bold text-emerald-400 mt-0.5">₹{Number(previewSow.project_value).toLocaleString()}</div>
                  </div>
                  <div>
                    <div className={`text-[10px] uppercase font-bold tracking-wider ${muted}`}>Estimated Timeline</div>
                    <div className="text-sm font-semibold mt-0.5">{previewSow.timeline_weeks} Weeks</div>
                  </div>
                  <div>
                    <div className={`text-[10px] uppercase font-bold tracking-wider ${muted}`}>Document Status</div>
                    <div className="text-sm font-semibold mt-0.5">{previewSow.status}</div>
                  </div>
                  <div>
                    <div className={`text-[10px] uppercase font-bold tracking-wider ${muted}`}>Prepared By</div>
                    <div className="text-sm font-semibold mt-0.5">{previewSow.prepared_by_name}</div>
                  </div>
                </div>

                {/* Rendered markdown document */}
                <div className={`p-6 rounded-2xl border ${dark ? "bg-black border-zinc-800 text-zinc-100" : "bg-white border-zinc-200 text-black"}`}>
                  <pre className="text-xs font-mono whitespace-pre-wrap leading-relaxed font-sans">
                    {previewSow.rendered_document}
                  </pre>
                </div>

                {/* Version History if any */}
                {previewSow.versions && previewSow.versions.length > 1 && (
                  <div className={`p-4 rounded-2xl border ${dark ? "bg-[#09090b] border-zinc-800" : "bg-zinc-50 border-zinc-200"}`}>
                    <h4 className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <History size={14} className={dark ? "text-zinc-400" : "text-zinc-600"} />
                      <span>Version Change History</span>
                    </h4>
                    <div className="space-y-1.5 text-xs">
                      {previewSow.versions.map((v) => (
                        <div key={v.version} className="flex items-center justify-between py-1 border-b border-inherit last:border-0">
                          <span className={`font-bold font-mono ${dark ? "text-white" : "text-black"}`}>{v.version_label}</span>
                          <span className={muted}>₹{Number(v.project_value).toLocaleString()}</span>
                          <span className={muted}>{v.updated_by_name}</span>
                          <span className={muted}>{new Date(v.updated_at).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-inherit flex items-center justify-between">
                {!readOnly ? (
                  <button
                    onClick={() => {
                      handleOpenEditModal(previewSow);
                      setPreviewSow(null);
                    }}
                    className={`h-9 px-4 rounded-xl border text-xs font-semibold flex items-center gap-1.5 ${dark ? "border-[#222d42] hover:bg-white/5" : "border-[#eee6da] hover:bg-slate-50"}`}
                  >
                    <Edit3 size={13} />
                    <span>Revise SOW</span>
                  </button>
                ) : (
                  <div className={`text-xs ${muted}`}>
                    Read-Only Document View
                  </div>
                )}

                <div className="flex items-center gap-2">
                  {!readOnly && (
                    <button
                      onClick={() => {
                        handleOpenEmailModal(previewSow);
                        setPreviewSow(null);
                      }}
                      className="h-9 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow"
                    >
                      <Mail size={13} />
                      <span>Email Proposal</span>
                    </button>
                  )}
                  <button
                    onClick={() => setPreviewSow(null)}
                    className="h-9 px-4 rounded-xl border border-inherit text-xs font-semibold"
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
