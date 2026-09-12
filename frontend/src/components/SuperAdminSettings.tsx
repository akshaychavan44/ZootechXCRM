import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Building2, Users, ShieldCheck, Mail, History,
  Upload, Download, Eye, RefreshCw, CheckCircle2, AlertCircle,
  Save, Globe, Phone, MapPin, ExternalLink, Code, Sparkles, X, ChevronRight, Lock
} from "lucide-react";
import { apiFetch } from "../lib/api";
import UsersManagement from "./UsersManagement";
import AuditLogsViewer from "./AuditLogsViewer";

interface GlobalSowTemplate {
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
  file_name?: string;
}

interface CompanySettings {
  company_name: string;
  company_logo: string;
  company_email: string;
  company_phone: string;
  company_website: string;
  company_address: string;
  updated_at?: string;
  updated_by?: string;
}

export type SuperAdminSettingsTab = "sow-template" | "company-info" | "users" | "permissions" | "email" | "audit";

export default function SuperAdminSettings({
  dark = true,
  initialTab = "sow-template",
}: {
  dark?: boolean;
  initialTab?: SuperAdminSettingsTab;
}) {
  const [activeTab, setActiveTab] = useState<SuperAdminSettingsTab>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [activeTemplate, setActiveTemplate] = useState<GlobalSowTemplate | null>(null);
  const [templateHistory, setTemplateHistory] = useState<GlobalSowTemplate[]>([]);
  const [companySettings, setCompanySettings] = useState<CompanySettings>({
    company_name: "ZootechX Technologies Pvt. Ltd.",
    company_logo: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=120&auto=format&fit=crop&q=80",
    company_email: "sales@zootechx.com",
    company_phone: "+91 98765 43210",
    company_website: "https://zootechx.ai",
    company_address: "Tech Park, Cyber Hub, Bengaluru, Karnataka, India - 560103",
  });

  const [loading, setLoading] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [notice, setNotice] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Modals
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [previewContentModal, setPreviewContentModal] = useState<string | null>(null);
  const [replaceForm, setReplaceForm] = useState({
    name: "ZootechX Global Scope of Work Template",
    content: "",
    default_terms: "50% advance mobilization, 25% on staging deployment, 25% upon final QA & production release.",
    file_name: "company-sow-template.md",
  });

  const showNotification = (message: string, type: "success" | "error" = "success") => {
    setNotice({ message, type });
    setTimeout(() => setNotice(null), 3500);
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [tplRes, histRes, compRes] = await Promise.all([
        apiFetch("/api/sow-template/active"),
        apiFetch("/api/sow-template/history"),
        apiFetch("/api/company-settings"),
      ]);

      if (tplRes.ok) {
        const tplData = await tplRes.json();
        setActiveTemplate(tplData.data);
        if (tplData.data?.template_content) {
          setReplaceForm((prev) => ({
            ...prev,
            content: tplData.data.template_content,
            default_terms: tplData.data.default_terms || prev.default_terms,
          }));
        }
      }

      if (histRes.ok) {
        const histData = await histRes.json();
        setTemplateHistory(histData.data || []);
      }

      if (compRes.ok) {
        const compData = await compRes.json();
        if (compData.data) {
          setCompanySettings(compData.data);
        }
      }
    } catch {
      showNotification("Failed to load settings from server", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const handleSaveCompanySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await apiFetch("/api/company-settings", {
        method: "PUT",
        body: JSON.stringify(companySettings),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save company settings");
      setCompanySettings(data.data);
      showNotification("Company information updated successfully!");
    } catch (err) {
      showNotification(err instanceof Error ? err.message : "Error saving company info", "error");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleReplaceTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replaceForm.content.trim()) {
      showNotification("Template content cannot be empty", "error");
      return;
    }
    setSavingTemplate(true);
    try {
      const res = await apiFetch("/api/sow-template/replace", {
        method: "POST",
        body: JSON.stringify(replaceForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to replace template");
      setActiveTemplate(data.data);
      setShowReplaceModal(false);
      showNotification(`Company SOW Template successfully updated to ${data.data.version_label}!`);
      void loadAll();
    } catch (err) {
      showNotification(err instanceof Error ? err.message : "Error replacing template", "error");
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setReplaceForm((prev) => ({
          ...prev,
          content,
          file_name: file.name,
        }));
        showNotification(`Loaded ${file.name} into editor`);
      }
    };
    reader.readAsText(file);
  };

  const handleDownloadActiveTemplate = () => {
    if (!activeTemplate) return;
    const blob = new Blob([activeTemplate.template_content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = activeTemplate.file_name || `zootechx-sow-template-${activeTemplate.version_label}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showNotification("Downloaded active template markdown file");
  };

  // Pure Black & Pure White Luxury Design System
  const bgCard = dark ? "bg-black border-zinc-800 text-white" : "bg-white border-zinc-200 text-black shadow-sm";
  const inputBg = dark ? "bg-[#09090b] border-zinc-800 text-white placeholder-zinc-500 focus:border-zinc-500" : "bg-white border-zinc-300 text-black placeholder-zinc-400 focus:border-black";
  const mutedText = dark ? "text-zinc-400" : "text-zinc-600";
  const borderC = dark ? "border-zinc-800" : "border-zinc-200";

  const supportedTokens = [
    { token: "{{company_name}}", desc: "ZootechX Technologies Pvt. Ltd." },
    { token: "{{company_logo}}", desc: "Company branding logo URL" },
    { token: "{{client_name}}", desc: "Client contact person" },
    { token: "{{client_company}}", desc: "Client company or business name" },
    { token: "{{project_name}}", desc: "Target project/deliverable title" },
    { token: "{{service_name}}", desc: "Custom Software & Offshore Engineering" },
    { token: "{{scope_of_work}}", desc: "Pasted scope breakdown & deliverables" },
    { token: "{{project_value}}", desc: "Formatted commercial value (e.g. ₹2,50,000)" },
    { token: "{{timeline}}", desc: "Calculated duration (e.g. 6 Weeks)" },
    { token: "{{payment_terms}}", desc: "Commercial milestone schedule" },
    { token: "{{company_email}}", desc: "Official inquiries email" },
    { token: "{{company_phone}}", desc: "Official hotline phone" },
    { token: "{{company_website}}", desc: "Official website domain" },
    { token: "{{sow_number}}", desc: "Unique reference code (e.g. SOW-2026-001)" },
    { token: "{{date}}", desc: "Full calendar generation date" },
  ];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto w-full pb-16">
      {/* NOTICE TOAST */}
      <AnimatePresence>
        {notice && (
          <motion.div
            initial={{ opacity: 0, y: -15, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.96 }}
            className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 rounded-2xl px-5 py-3 text-xs font-semibold shadow-2xl border backdrop-blur-xl ${
              notice.type === "success"
                ? dark ? "bg-[#17261d] border-emerald-500/40 text-emerald-300" : "bg-emerald-50 border-emerald-300 text-emerald-900"
                : dark ? "bg-[#2b161b] border-rose-500/40 text-rose-300" : "bg-rose-50 border-rose-300 text-rose-900"
            }`}
          >
            {notice.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{notice.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOP HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className={`text-2xl font-bold tracking-tight ${dark ? "text-white" : "text-[#1c1917]"}`}>
              Super Admin Enterprise Settings
            </h1>
            <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-0.5 text-[11px] font-bold text-amber-400">
              Root Authority
            </span>
          </div>
          <p className={`text-xs mt-1 ${mutedText}`}>
            Manage global SOW legal contract template, corporate profile, team accounts, and platform governance.
          </p>
        </div>

        <button
          onClick={() => void loadAll()}
          title="Refresh settings"
          className={`flex h-9 w-9 items-center justify-center rounded-xl border transition ${
            dark ? "border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-white" : "border-zinc-300 bg-white text-black hover:bg-zinc-100"
          }`}
        >
          <RefreshCw size={15} className={loading ? "animate-spin text-white" : ""} />
        </button>
      </div>

      {/* TABS NAVIGATION */}
      <div className={`flex flex-wrap items-center gap-1.5 border-b pb-3 ${borderC}`}>
        {[
          { id: "sow-template", label: "Global SOW Template", icon: FileText },
          { id: "company-info", label: "Company Profile", icon: Building2 },
          { id: "users", label: "Employee Accounts", icon: Users },
          { id: "permissions", label: "Roles & Permissions", icon: ShieldCheck },
          { id: "email", label: "Email Notifications", icon: Mail },
          { id: "audit", label: "Security Audit Trail", icon: History },
        ].map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                active
                  ? dark
                    ? "bg-white text-black shadow-sm font-bold"
                    : "btn-dark-gradient text-white shadow-sm font-bold"
                  : `${mutedText} hover:${dark ? "bg-white/5 text-white" : "bg-black/5 text-black"}`
              }`}
            >
              <tab.icon size={15} className={active ? (dark ? "text-black" : "text-white") : ""} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: GLOBAL SOW TEMPLATE */}
      {activeTab === "sow-template" && (
        <div className="space-y-6">
          {/* Active Template Card */}
          <div className={`rounded-3xl border p-6 lg:p-7 ${bgCard}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-inherit">
              <div className="flex items-center gap-3.5">
                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center border ${
                  dark ? "bg-zinc-900 border-zinc-700 text-white" : "bg-zinc-100 border-zinc-300 text-black"
                }`}>
                  <FileText size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold">
                      {activeTemplate?.name || "ZootechX Global Scope of Work Template"}
                    </h3>
                    <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400">
                      Active: {activeTemplate?.version_label || "v1.0"}
                    </span>
                  </div>
                  <p className={`text-xs mt-0.5 ${mutedText}`}>
                    Single company-wide template. Automatically inherited whenever Sub-Admin or Sales generates a Scope of Work.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreviewContentModal(activeTemplate?.template_content || "")}
                  className={`h-9 px-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition ${
                    dark ? "border-[#222d42] bg-white/5 hover:bg-white/10" : "border-[#eee6da] bg-white hover:bg-slate-50"
                  }`}
                >
                  <Eye size={14} />
                  <span>Preview</span>
                </button>

                <button
                  onClick={handleDownloadActiveTemplate}
                  className={`h-9 px-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition ${
                    dark ? "border-[#222d42] bg-white/5 hover:bg-white/10" : "border-[#eee6da] bg-white hover:bg-slate-50"
                  }`}
                >
                  <Download size={14} />
                  <span>Download (.md)</span>
                </button>

                <button
                  onClick={() => setShowReplaceModal(true)}
                  className="h-9 px-4 rounded-xl text-xs font-semibold flex items-center gap-2 btn-dark-gradient text-white shadow-md transition"
                >
                  <Upload size={14} />
                  <span>Upload / Replace Template</span>
                </button>
              </div>
            </div>

            {/* Template Metadata Details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5">
              <div className={`p-4 rounded-2xl border ${borderC} ${dark ? "bg-white/[0.02]" : "bg-zinc-50"}`}>
                <div className={`text-[11px] uppercase tracking-wider font-semibold ${mutedText}`}>Version Number</div>
                <div className={`text-base font-bold mt-1 ${dark ? "text-white" : "text-black"}`}>
                  {activeTemplate?.version_label || "v1.0"} (Active)
                </div>
              </div>

              <div className={`p-4 rounded-2xl border ${borderC} ${dark ? "bg-white/[0.02]" : "bg-[#fcfaf7]"}`}>
                <div className={`text-[11px] uppercase tracking-wider font-semibold ${mutedText}`}>Last Updated</div>
                <div className="text-sm font-semibold mt-1">
                  {activeTemplate?.uploaded_at ? new Date(activeTemplate.uploaded_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Initial System Version"}
                </div>
              </div>

              <div className={`p-4 rounded-2xl border ${borderC} ${dark ? "bg-white/[0.02]" : "bg-[#fcfaf7]"}`}>
                <div className={`text-[11px] uppercase tracking-wider font-semibold ${mutedText}`}>Managed By</div>
                <div className="text-sm font-semibold mt-1">
                  {activeTemplate?.uploaded_by_name || "Super Admin"} (Exclusive)
                </div>
              </div>
            </div>

            {/* Supported Template Placeholders Cheatsheet */}
            <div className="mt-6 pt-5 border-t border-inherit">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={15} className={dark ? "text-white" : "text-black"} />
                <h4 className="text-xs font-bold uppercase tracking-wider">
                  Supported Template Dynamic Interpolation Tokens
                </h4>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                {supportedTokens.map((t) => (
                  <div
                    key={t.token}
                    className={`p-2.5 rounded-xl border text-[11px] ${borderC} ${dark ? "bg-[#09090b]" : "bg-zinc-50"}`}
                  >
                    <code className={`font-mono font-bold block text-[11px] ${dark ? "text-white" : "text-black"}`}>{t.token}</code>
                    <span className={`text-[10px] mt-0.5 block leading-tight ${mutedText}`}>{t.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Archived Version History */}
          <div className={`rounded-3xl border p-6 ${bgCard}`}>
            <h3 className="text-base font-bold mb-1 flex items-center gap-2">
              <History size={16} className={dark ? "text-zinc-400" : "text-zinc-600"} />
              <span>Template Version History</span>
            </h3>
            <p className={`text-xs mb-4 ${mutedText}`}>
              Previous company templates are archived automatically. Existing client SOWs remain locked to their creation version.
            </p>

            {templateHistory.length === 0 ? (
              <div className={`p-8 text-center rounded-2xl border border-dashed text-xs ${mutedText}`}>
                No prior template versions archived. Current version is the baseline.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className={`border-b ${borderC} text-[11px] font-bold uppercase tracking-wider ${mutedText}`}>
                    <tr>
                      <th className="text-left py-2.5 px-3">Version</th>
                      <th className="text-left py-2.5 px-3">Template Name</th>
                      <th className="text-left py-2.5 px-3">Updated At</th>
                      <th className="text-left py-2.5 px-3">Uploaded By</th>
                      <th className="text-right py-2.5 px-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-inherit">
                    {templateHistory.map((hist) => (
                      <tr key={hist.id} className={`hover:${dark ? "bg-white/5" : "bg-slate-50"}`}>
                        <td className="py-3 px-3 font-bold font-mono text-emerald-400">{hist.version_label}</td>
                        <td className="py-3 px-3 font-medium">{hist.name}</td>
                        <td className={`py-3 px-3 ${mutedText}`}>
                          {new Date(hist.uploaded_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </td>
                        <td className="py-3 px-3">{hist.uploaded_by_name}</td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => setPreviewContentModal(hist.template_content)}
                            className="text-xs font-semibold text-indigo-400 hover:underline inline-flex items-center gap-1"
                          >
                            <Eye size={12} />
                            <span>View Snapshot</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: COMPANY INFORMATION */}
      {activeTab === "company-info" && (
        <form onSubmit={handleSaveCompanySettings} className={`rounded-3xl border p-6 lg:p-8 space-y-6 ${bgCard}`}>
          <div>
            <h3 className="text-lg font-bold">Company Profile & SOW Header Information</h3>
            <p className={`text-xs mt-1 ${mutedText}`}>
              These details are automatically placed inside generated Scope of Work documents, client proposals, and invoices.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold mb-1.5">Official Company Name</label>
              <input
                required
                value={companySettings.company_name}
                onChange={(e) => setCompanySettings({ ...companySettings, company_name: e.target.value })}
                placeholder="e.g. ZootechX Technologies Pvt. Ltd."
                className={`h-10 w-full rounded-xl border px-3.5 text-xs outline-none ${inputBg}`}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5">Company Logo URL</label>
              <input
                value={companySettings.company_logo}
                onChange={(e) => setCompanySettings({ ...companySettings, company_logo: e.target.value })}
                placeholder="https://..."
                className={`h-10 w-full rounded-xl border px-3.5 text-xs outline-none ${inputBg}`}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5">Official Inquiries Email</label>
              <input
                required
                type="email"
                value={companySettings.company_email}
                onChange={(e) => setCompanySettings({ ...companySettings, company_email: e.target.value })}
                placeholder="sales@zootechx.com"
                className={`h-10 w-full rounded-xl border px-3.5 text-xs outline-none ${inputBg}`}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5">Official Hotline Phone</label>
              <input
                required
                value={companySettings.company_phone}
                onChange={(e) => setCompanySettings({ ...companySettings, company_phone: e.target.value })}
                placeholder="+91 98765 43210"
                className={`h-10 w-full rounded-xl border px-3.5 text-xs outline-none ${inputBg}`}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5">Website URL</label>
              <input
                required
                value={companySettings.company_website}
                onChange={(e) => setCompanySettings({ ...companySettings, company_website: e.target.value })}
                placeholder="https://zootechx.ai"
                className={`h-10 w-full rounded-xl border px-3.5 text-xs outline-none ${inputBg}`}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5">Headquarters Physical Address</label>
              <input
                required
                value={companySettings.company_address}
                onChange={(e) => setCompanySettings({ ...companySettings, company_address: e.target.value })}
                placeholder="Tech Park, Cyber Hub, Bengaluru, India"
                className={`h-10 w-full rounded-xl border px-3.5 text-xs outline-none ${inputBg}`}
              />
            </div>
          </div>

          <div className="pt-4 border-t border-inherit flex items-center justify-between">
            <div className={`text-[11px] ${mutedText}`}>
              {companySettings.updated_at ? `Last saved on ${new Date(companySettings.updated_at).toLocaleString()}` : "Preset default settings"}
            </div>

            <button
              type="submit"
              disabled={savingSettings}
              className="h-10 px-5 rounded-xl text-xs font-semibold flex items-center gap-2 btn-dark-gradient text-white shadow-md transition disabled:opacity-50"
            >
              <Save size={15} />
              <span>{savingSettings ? "Saving Settings..." : "Save Company Information"}</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: USER PROVISIONING */}
      {activeTab === "users" && (
        <div className="space-y-4">
          <div className={`p-4 rounded-2xl border ${borderC} ${dark ? "bg-amber-500/10 text-amber-300" : "bg-amber-50 text-amber-900"} text-xs flex items-center gap-2`}>
            <Lock size={15} className="shrink-0 text-amber-400" />
            <span>
              <strong>Private Provisioning Policy:</strong> Public user registration is permanently disabled. Only Super Admin can invite, provision, and reset passwords for team members.
            </span>
          </div>
          <UsersManagement dark={dark} />
        </div>
      )}

      {/* TAB 4: ROLES & PERMISSIONS MATRIX */}
      {activeTab === "permissions" && (
        <div className={`rounded-3xl border p-6 lg:p-8 space-y-6 ${bgCard}`}>
          <div>
            <h3 className="text-lg font-bold">Organizational Roles & Access Control Matrix</h3>
            <p className={`text-xs mt-1 ${mutedText}`}>
              Strict RBAC enforcement across all API routes and frontend views.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className={`border-b ${borderC} text-[11px] uppercase tracking-wider ${mutedText} font-bold`}>
                <tr>
                  <th className="text-left py-3 px-3">Module / Capability</th>
                  <th className="text-center py-3 px-2 text-amber-400 font-bold">Super Admin</th>
                  <th className="text-center py-3 px-2 text-purple-400 font-bold">Sub Admin</th>
                  <th className="text-center py-3 px-2 text-blue-400 font-bold">Sales</th>
                  <th className="text-center py-3 px-2 text-emerald-400 font-bold">Developer</th>
                  <th className="text-center py-3 px-2 text-pink-400 font-bold">Marketing</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-inherit">
                {[
                  { name: "Manage Global Company SOW Template", sa: "Full (Exclusive)", sub: "Read Only", sl: "Read Only", dev: "No Access", mkt: "No Access" },
                  { name: "Create Employee Accounts & Passwords", sa: "Full (Exclusive)", sub: "No Access", sl: "No Access", dev: "No Access", mkt: "No Access" },
                  { name: "Generate SOW Proposal for Client", sa: "Full", sub: "Full", sl: "Full", dev: "No Access", mkt: "No Access" },
                  { name: "Invoices & Revenue Financials", sa: "Full", sub: "Full", sl: "Read Only", dev: "No Access", mkt: "No Access" },
                  { name: "Lead CRM & Follow-ups Pipeline", sa: "Full", sub: "Full", sl: "Full", dev: "No Access", mkt: "No Access" },
                  { name: "Company Task Tracker", sa: "Full", sub: "Full", sl: "Assigned Only", dev: "Assigned Only", mkt: "Assigned Only" },
                  { name: "Developer Projects & Daily Updates", sa: "Full", sub: "Full", sl: "No Access", dev: "Work Mode", mkt: "No Access" },
                  { name: "Client Marketing & Mockups", sa: "Full", sub: "No Access", sl: "No Access", dev: "No Access", mkt: "Full" },
                  { name: "System Audit Logs", sa: "Full", sub: "No Access", sl: "No Access", dev: "No Access", mkt: "No Access" },
                  { name: "Credentials & Secret Vault", sa: "Full", sub: "Full", sl: "No Access", dev: "Vault View", mkt: "No Access" },
                ].map((row, idx) => (
                  <tr key={idx} className={`hover:${dark ? "bg-white/5" : "bg-slate-50"}`}>
                    <td className="py-3 px-3 font-semibold">{row.name}</td>
                    <td className="py-3 px-2 text-center text-amber-400 font-semibold">{row.sa}</td>
                    <td className="py-3 px-2 text-center text-purple-400">{row.sub}</td>
                    <td className="py-3 px-2 text-center text-blue-400">{row.sl}</td>
                    <td className="py-3 px-2 text-center text-emerald-400">{row.dev}</td>
                    <td className="py-3 px-2 text-center text-pink-400">{row.mkt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: EMAIL SETTINGS */}
      {activeTab === "email" && (
        <div className={`rounded-3xl border p-6 lg:p-8 space-y-6 ${bgCard}`}>
          <div>
            <h3 className="text-lg font-bold">Email & Client Notification Dispatcher</h3>
            <p className={`text-xs mt-1 ${mutedText}`}>
              Configure outbound email parameters used when delivering Scope of Work documents or invoices to clients.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold mb-1.5">Sender Display Name</label>
              <input
                defaultValue="ZootechX Client Relations"
                className={`h-10 w-full rounded-xl border px-3.5 text-xs outline-none ${inputBg}`}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5">Reply-To Address</label>
              <input
                defaultValue={companySettings.company_email}
                className={`h-10 w-full rounded-xl border px-3.5 text-xs outline-none ${inputBg}`}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold mb-1.5">Default Email Dispatch Disclaimer / Signature</label>
              <textarea
                rows={3}
                defaultValue="Confidentiality Note: This transmission and any attachments are intended solely for the designated recipient and may contain proprietary offshore engineering specifications."
                className={`w-full rounded-xl border p-3 text-xs outline-none ${inputBg}`}
              />
            </div>
          </div>

          <div className="pt-4 border-t border-inherit flex justify-end">
            <button
              type="button"
              onClick={() => showNotification("Email dispatcher preferences updated")}
              className="h-10 px-5 rounded-xl text-xs font-semibold flex items-center gap-2 btn-dark-gradient text-white shadow-md"
            >
              <Save size={15} />
              <span>Save Email Configuration</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 6: AUDIT TRAIL */}
      {activeTab === "audit" && (
        <AuditLogsViewer dark={dark} />
      )}

      {/* REPLACE TEMPLATE MODAL */}
      <AnimatePresence>
        {showReplaceModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl border p-6 shadow-2xl ${bgCard}`}
            >
              <div className="flex items-center justify-between pb-4 border-b border-inherit">
                <div>
                  <h3 className="text-base font-bold">Replace Company SOW Template</h3>
                  <p className={`text-xs ${mutedText}`}>
                    This will increment version to v{(activeTemplate?.version || 1) + 1}.0 and archive current template.
                  </p>
                </div>
                <button onClick={() => setShowReplaceModal(false)} className="text-slate-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleReplaceTemplate} className="flex-1 overflow-y-auto space-y-4 py-4 pr-1">
                <div>
                  <label className="block text-xs font-semibold mb-1">Template Display Name</label>
                  <input
                    required
                    value={replaceForm.name}
                    onChange={(e) => setReplaceForm({ ...replaceForm, name: e.target.value })}
                    className={`h-10 w-full rounded-xl border px-3 text-xs outline-none ${inputBg}`}
                  />
                </div>

                <div className="flex items-center gap-3">
                  <label className={`cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-semibold ${dark ? "border-zinc-800 bg-white/5 hover:bg-white/10" : "border-zinc-300 bg-white"}`}>
                    <Upload size={14} className={dark ? "text-white" : "text-black"} />
                    <span>Upload .md or .txt File</span>
                    <input type="file" accept=".md,.txt" onChange={handleFileUpload} className="hidden" />
                  </label>
                  {replaceForm.file_name && (
                    <span className={`text-xs ${mutedText}`}>Current file: {replaceForm.file_name}</span>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold">Template Markdown Content (with tokens)</label>
                    <span className={`text-[10px] ${mutedText}`}>Supports Markdown & Tokens</span>
                  </div>
                  <textarea
                    required
                    rows={12}
                    value={replaceForm.content}
                    onChange={(e) => setReplaceForm({ ...replaceForm, content: e.target.value })}
                    placeholder="# Scope of Work Proposal..."
                    className={`w-full rounded-xl border p-3 text-xs font-mono outline-none ${inputBg}`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Default Commercial Payment Terms</label>
                  <input
                    value={replaceForm.default_terms}
                    onChange={(e) => setReplaceForm({ ...replaceForm, default_terms: e.target.value })}
                    className={`h-10 w-full rounded-xl border px-3 text-xs outline-none ${inputBg}`}
                  />
                </div>

                <div className="pt-3 border-t border-inherit flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowReplaceModal(false)}
                    className="h-9 px-4 rounded-xl border border-inherit text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingTemplate}
                    className="h-9 px-5 rounded-xl text-xs font-semibold btn-dark-gradient text-white shadow transition disabled:opacity-50"
                  >
                    {savingTemplate ? "Publishing..." : `Publish as Version v${(activeTemplate?.version || 1) + 1}.0`}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PREVIEW TEMPLATE CONTENT MODAL */}
      <AnimatePresence>
        {previewContentModal !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`relative w-full max-w-3xl max-h-[85vh] flex flex-col rounded-3xl border p-6 shadow-2xl ${bgCard}`}
            >
              <div className="flex items-center justify-between pb-4 border-b border-inherit">
                <div className="flex items-center gap-2">
                  <FileText size={18} className={dark ? "text-white" : "text-black"} />
                  <h3 className="text-base font-bold">Template Source & Token Inspection</h3>
                </div>
                <button onClick={() => setPreviewContentModal(null)} className="text-slate-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-4">
                <pre className={`p-4 rounded-2xl text-xs font-mono whitespace-pre-wrap leading-relaxed border ${borderC} ${dark ? "bg-[#0a0e17] text-slate-200" : "bg-[#faf6ee] text-slate-800"}`}>
                  {previewContentModal}
                </pre>
              </div>

              <div className="pt-3 border-t border-inherit flex justify-end">
                <button
                  onClick={() => setPreviewContentModal(null)}
                  className="h-9 px-5 rounded-xl bg-indigo-600 text-xs font-semibold text-white"
                >
                  Close Preview
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
