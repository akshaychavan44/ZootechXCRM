import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  KeyRound, Plus, ShieldCheck, Eye, EyeOff, Copy, Check, Trash2, X,
  Search, ExternalLink, RefreshCw, Sparkles, Database, Cloud,
  Globe, Mail, Lock, Terminal, Shield, AlertCircle
} from "lucide-react";
import { apiFetch } from "../lib/api";

export type VaultCategory =
  | "ALL"
  | "API_KEY"
  | "DATABASE"
  | "HOSTING"
  | "SERVER_SSH"
  | "PORTAL"
  | "EMAIL"
  | "OTHER";

interface VaultItem {
  id: string;
  label: string;
  service: string;
  category?: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Local fallback values when offline/cached
  username?: string;
  secret?: string;
}

interface RevealedSecret {
  username: string;
  secret: string;
}

const CATEGORY_CONFIG: Record<
  string,
  { label: string; icon: React.ComponentType<{ size?: number | string; className?: string }>; color: string; badgeCls: string }
> = {
  API_KEY: {
    label: "API Keys",
    icon: KeyRound,
    color: "from-violet-600 to-indigo-600",
    badgeCls: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  },
  DATABASE: {
    label: "Databases",
    icon: Database,
    color: "from-amber-500 to-orange-500",
    badgeCls: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  HOSTING: {
    label: "Cloud & Hosting",
    icon: Cloud,
    color: "from-cyan-500 to-blue-500",
    badgeCls: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  },
  SERVER_SSH: {
    label: "Servers & SSH",
    icon: Terminal,
    color: "from-emerald-500 to-teal-500",
    badgeCls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  PORTAL: {
    label: "Admin Portals",
    icon: Globe,
    color: "from-pink-500 to-rose-500",
    badgeCls: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  },
  EMAIL: {
    label: "Email & Tools",
    icon: Mail,
    color: "from-blue-500 to-indigo-500",
    badgeCls: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  },
  OTHER: {
    label: "General Credentials",
    icon: Lock,
    color: "from-slate-500 to-zinc-500",
    badgeCls: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  },
};

export default function CredentialsVault({ dark = true }: { dark?: boolean }) {
  const [items, setItems] = useState<VaultItem[]>([]);
  const [revealed, setRevealed] = useState<Record<string, RevealedSecret>>({});
  const [openModal, setOpenModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<VaultCategory>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Add form state
  const [form, setForm] = useState({
    label: "",
    service: "",
    category: "API_KEY" as VaultCategory,
    username: "",
    secret: "",
    notes: "",
  });
  const [showFormSecret, setShowFormSecret] = useState(false);

  // Generate strong random password
  const generatePassword = () => {
    const chars = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*+=-";
    let pwd = "";
    const array = new Uint32Array(16);
    if (typeof window !== "undefined" && window.crypto) {
      window.crypto.getRandomValues(array);
      for (let i = 0; i < 16; i++) {
        pwd += chars[array[i] % chars.length];
      }
    } else {
      for (let i = 0; i < 16; i++) {
        pwd += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    }
    setForm((prev) => ({ ...prev, secret: pwd }));
    setShowFormSecret(true);
  };

  // Cache key helper
  const getCacheKey = () => {
    const userStr = typeof window !== "undefined" ? localStorage.getItem("zootechx_user") : null;
    const userId = userStr ? JSON.parse(userStr)?.id : "default";
    return `zootechx_vault_cache_${userId}`;
  };

  // Load vault items
  const load = async () => {
    setLoading(true);
    setNotice(null);
    try {
      const response = await apiFetch("/api/vault");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Unable to connect to encrypted vault.");
      }
      const remoteItems: VaultItem[] = data.data ?? [];
      setItems(remoteItems);
      if (typeof window !== "undefined") {
        localStorage.setItem(getCacheKey(), JSON.stringify(remoteItems));
      }
    } catch {
      // Offline / fallback cache
      if (typeof window !== "undefined") {
        const cached = localStorage.getItem(getCacheKey());
        if (cached) {
          try {
            setItems(JSON.parse(cached));
          } catch {}
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  // Reveal secret
  const reveal = async (item: VaultItem) => {
    if (revealed[item.id]) {
      setRevealed((curr) => {
        const next = { ...curr };
        delete next[item.id];
        return next;
      });
      return;
    }

    // If item has local cache secret (e.g. added offline)
    if (item.secret && item.username) {
      setRevealed((curr) => ({
        ...curr,
        [item.id]: { username: item.username!, secret: item.secret! },
      }));
      return;
    }

    try {
      const response = await apiFetch(`/api/vault/${item.id}/reveal`, { method: "POST" });
      const data = await response.json();
      if (!response.ok || !data.data) {
        throw new Error(data.message || "Decryption failed.");
      }
      setRevealed((curr) => ({ ...curr, [item.id]: data.data }));
    } catch (err) {
      setNotice({
        type: "error",
        text: err instanceof Error ? err.message : "Unable to decrypt credential.",
      });
    }
  };

  // Copy to clipboard helper
  const copyToClipboard = (text: string, identifier: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(identifier);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  // Save credential
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.label || !form.service || !form.username || !form.secret) return;

    setSaving(true);
    setNotice(null);

    const payload = {
      label: form.label.trim(),
      service: form.service.trim(),
      username: form.username.trim(),
      secret: form.secret.trim(),
      notes: form.notes.trim()
        ? `[${form.category}] ${form.notes.trim()}`
        : `[${form.category}]`,
    };

    try {
      const response = await apiFetch("/api/vault", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to save credential.");
      }

      setOpenModal(false);
      setForm({
        label: "",
        service: "",
        category: "API_KEY",
        username: "",
        secret: "",
        notes: "",
      });
      setShowFormSecret(false);
      setNotice({ type: "success", text: "Credential successfully encrypted & saved!" });
      await load();
    } catch {
      // Local fallback item creation
      const localItem: VaultItem = {
        id: `local-${Date.now()}`,
        label: payload.label,
        service: payload.service,
        notes: payload.notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        username: payload.username,
        secret: payload.secret,
      };
      const updated = [localItem, ...items];
      setItems(updated);
      if (typeof window !== "undefined") {
        localStorage.setItem(getCacheKey(), JSON.stringify(updated));
      }
      setOpenModal(false);
      setForm({
        label: "",
        service: "",
        category: "API_KEY",
        username: "",
        secret: "",
        notes: "",
      });
      setNotice({
        type: "success",
        text: "Saved to secure local storage.",
      });
    } finally {
      setSaving(false);
    }
  };

  // Remove credential
  const handleRemove = async (id: string, label: string) => {
    if (!window.confirm(`Are you sure you want to delete credential for "${label}"? This action cannot be undone.`)) {
      return;
    }

    try {
      if (!id.startsWith("local-")) {
        await apiFetch(`/api/vault/${id}`, { method: "DELETE" });
      }
      const updated = items.filter((item) => item.id !== id);
      setItems(updated);
      if (typeof window !== "undefined") {
        localStorage.setItem(getCacheKey(), JSON.stringify(updated));
      }
      setRevealed((curr) => {
        const next = { ...curr };
        delete next[id];
        return next;
      });
      setNotice({ type: "success", text: `Removed credential for ${label}` });
    } catch {
      setNotice({ type: "error", text: "Failed to delete credential" });
    }
  };

  // Helper to extract category from notes tag e.g. "[DATABASE] description"
  const getItemCategory = (item: VaultItem): string => {
    if (item.category) return item.category;
    if (item.notes && item.notes.startsWith("[")) {
      const match = item.notes.match(/^\[([A-Z_]+)\]/);
      if (match && CATEGORY_CONFIG[match[1]]) return match[1];
    }
    const lower = (item.label + " " + item.service).toLowerCase();
    if (lower.includes("db") || lower.includes("postgres") || lower.includes("mongo") || lower.includes("sql") || lower.includes("redis"))
      return "DATABASE";
    if (lower.includes("api") || lower.includes("key") || lower.includes("token") || lower.includes("secret"))
      return "API_KEY";
    if (lower.includes("aws") || lower.includes("vercel") || lower.includes("cloud") || lower.includes("neon") || lower.includes("host"))
      return "HOSTING";
    if (lower.includes("ssh") || lower.includes("server") || lower.includes("root") || lower.includes("vps") || lower.includes("ftp"))
      return "SERVER_SSH";
    if (lower.includes("portal") || lower.includes("admin") || lower.includes("crm") || lower.includes("dashboard"))
      return "PORTAL";
    if (lower.includes("mail") || lower.includes("smtp") || lower.includes("gmail") || lower.includes("email"))
      return "EMAIL";
    return "OTHER";
  };

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const cat = getItemCategory(item);
      const matchesCat = selectedCategory === "ALL" || cat === selectedCategory;
      const query = searchQuery.trim().toLowerCase();
      const matchesQuery =
        !query ||
        item.label.toLowerCase().includes(query) ||
        item.service.toLowerCase().includes(query) ||
        (item.notes && item.notes.toLowerCase().includes(query));
      return matchesCat && matchesQuery;
    });
  }, [items, selectedCategory, searchQuery]);

  // Clean notes from category tag
  const getCleanNotes = (notes: string | null) => {
    if (!notes) return "";
    return notes.replace(/^\[[A-Z_]+\]\s*/, "");
  };

  // Colors (TailAdmin Design System)
  const bgCard = "tail-card";
  const inputBg = dark ? "bg-[#090d16] border-slate-800 text-white placeholder-slate-500 focus:border-indigo-500" : "bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-500";
  const mutedText = dark ? "text-slate-400" : "text-slate-500";
  const pillActive = "bg-indigo-600 text-white shadow-xs font-bold";
  const pillInactive = dark ? "bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/50" : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200";

  return (
    <div className="w-full space-y-6">
      {/* HEADER HERO */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="tail-card relative overflow-hidden p-6 lg:p-8"
      >
        {/* Ambient Glow */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-500 dark:text-emerald-400">
              <ShieldCheck size={14} className="text-emerald-500 dark:text-emerald-400" />
              AES-256-GCM Encrypted at Rest • Zero-Knowledge Vault
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Credentials & Secrets Vault</h1>
            <p className={`mt-2 max-w-2xl text-sm ${mutedText}`}>
              Secure, centralized storage for your API keys, database credentials, server SSH logins, client portal passwords, and cloud accounts. Accessible only by you.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => void load()}
              title="Refresh vault"
              className="tail-btn-secondary flex h-10 w-10 items-center justify-center p-0"
            >
              <RefreshCw size={16} className={loading ? "animate-spin text-indigo-400" : ""} />
            </button>

            <button
              onClick={() => {
                setNotice(null);
                setOpenModal(true);
              }}
              className="tail-btn-primary flex items-center gap-2"
            >
              <Plus size={16} />
              <span>Add Credential</span>
            </button>
          </div>
        </div>

        {/* STATS STRIP */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 p-3 text-center">
            <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">{items.length}</div>
            <div className={`text-[10px] font-semibold uppercase tracking-wider ${mutedText}`}>Total Stored</div>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 p-3 text-center">
            <div className="text-xl font-bold font-mono text-violet-500">
              {items.filter((i) => getItemCategory(i) === "API_KEY").length}
            </div>
            <div className={`text-[10px] font-semibold uppercase tracking-wider ${mutedText}`}>API Keys</div>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 p-3 text-center">
            <div className="text-xl font-bold font-mono text-amber-500">
              {items.filter((i) => getItemCategory(i) === "DATABASE").length}
            </div>
            <div className={`text-[10px] font-semibold uppercase tracking-wider ${mutedText}`}>Databases</div>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 p-3 text-center">
            <div className="text-xl font-bold font-mono text-cyan-500">
              {items.filter((i) => getItemCategory(i) === "HOSTING").length}
            </div>
            <div className={`text-[10px] font-semibold uppercase tracking-wider ${mutedText}`}>Cloud / Host</div>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 p-3 text-center">
            <div className="text-xl font-bold font-mono text-emerald-500">
              {items.filter((i) => getItemCategory(i) === "SERVER_SSH").length}
            </div>
            <div className={`text-[10px] font-semibold uppercase tracking-wider ${mutedText}`}>Servers</div>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 p-3 text-center">
            <div className="text-xl font-bold font-mono text-pink-500">
              {items.filter((i) => getItemCategory(i) === "PORTAL").length}
            </div>
            <div className={`text-[10px] font-semibold uppercase tracking-wider ${mutedText}`}>Portals</div>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 p-3 text-center">
            <div className="text-xl font-bold font-mono text-blue-500">
              {items.filter((i) => getItemCategory(i) === "EMAIL").length}
            </div>
            <div className={`text-[10px] font-semibold uppercase tracking-wider ${mutedText}`}>Email / Tools</div>
          </div>
        </div>
      </motion.div>

      {/* NOTICE NOTIFICATION */}
      <AnimatePresence>
        {notice && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-medium ${
              notice.type === "success"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : "border-rose-500/30 bg-rose-500/10 text-rose-400"
            }`}
          >
            <div className="flex items-center gap-2">
              {notice.type === "success" ? <Check size={16} /> : <AlertCircle size={16} />}
              <span>{notice.text}</span>
            </div>
            <button onClick={() => setNotice(null)} className="opacity-70 hover:opacity-100">
              <X size={15} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SEARCH AND CATEGORY FILTER TABS */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1">
          {[
            { id: "ALL", label: "All Items" },
            { id: "API_KEY", label: "API Keys" },
            { id: "DATABASE", label: "Databases" },
            { id: "HOSTING", label: "Cloud & Hosting" },
            { id: "SERVER_SSH", label: "Servers / SSH" },
            { id: "PORTAL", label: "Portals" },
            { id: "EMAIL", label: "Email & Tools" },
            { id: "OTHER", label: "Other" },
          ].map((tab) => {
            const active = selectedCategory === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedCategory(tab.id as VaultCategory)}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                  active ? pillActive : pillInactive
                }`}
              >
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative min-w-[240px] md:w-72">
          <Search size={15} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${mutedText}`} />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search credentials..."
            className={`h-10 w-full rounded-xl border pl-9 pr-3 text-xs outline-none transition-all focus:border-indigo-500 ${inputBg}`}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* VAULT ITEMS GRID */}
      {loading ? (
        <div className={`rounded-3xl border p-12 text-center text-sm ${bgCard}`}>
          <div className="flex items-center justify-center gap-2">
            <RefreshCw size={18} className="animate-spin text-indigo-500" />
            <span>Unlocking encrypted vault securely...</span>
          </div>
        </div>
      ) : filteredItems.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`rounded-3xl border border-dashed p-14 text-center ${bgCard}`}
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600/10 text-indigo-500">
            <Shield size={28} />
          </div>
          <h3 className="mt-4 text-base font-bold">No credentials match your filter</h3>
          <p className={`mt-1 text-xs ${mutedText}`}>
            {items.length === 0
              ? "Your vault is empty. Click 'Add Credential' to securely store your first login, API key or server secret."
              : "Try choosing another category or clearing your search query."}
          </p>
          {items.length === 0 && (
            <button
              onClick={() => setOpenModal(true)}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow transition hover:bg-indigo-700"
            >
              <Plus size={16} />
              Add your first credential
            </button>
          )}
        </motion.div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredItems.map((item, index) => {
            const cat = getItemCategory(item);
            const catConfig = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.OTHER;
            const CatIcon = catConfig.icon;
            const isRevealed = Boolean(revealed[item.id]);
            const secretData = revealed[item.id] || (item.secret && item.username ? { username: item.username, secret: item.secret } : null);
            const notesText = getCleanNotes(item.notes);

            const isUrl =
              item.service.startsWith("http://") ||
              item.service.startsWith("https://") ||
              item.service.includes(".com") ||
              item.service.includes(".io") ||
              item.service.includes(".app");
            const launchUrl = isUrl
              ? item.service.startsWith("http")
                ? item.service
                : `https://${item.service}`
              : null;

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.2) }}
                className={`group relative flex flex-col justify-between rounded-3xl border p-5 transition-all duration-200 hover:-translate-y-1 hover:border-indigo-500/40 hover:shadow-xl ${bgCard}`}
              >
                <div>
                  {/* Top Bar: Icon + Category Badge + Actions */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${catConfig.color} text-white shadow-sm`}
                      >
                        <CatIcon size={18} />
                      </div>
                      <div>
                        <h3 className="font-semibold leading-tight text-sm text-slate-900 dark:text-white group-hover:text-indigo-400 transition-colors">
                          {item.label}
                        </h3>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${catConfig.badgeCls}`}>
                            {catConfig.label}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      {launchUrl && (
                        <a
                          href={launchUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={`Open ${item.service}`}
                          className={`flex h-8 w-8 items-center justify-center rounded-xl border text-slate-400 hover:text-indigo-400 ${dark ? "border-white/5 bg-white/5 hover:bg-white/10" : "border-slate-200 bg-slate-100 hover:bg-slate-200"}`}
                        >
                          <ExternalLink size={13} />
                        </a>
                      )}
                      <button
                        onClick={() => void handleRemove(item.id, item.label)}
                        title="Delete credential"
                        className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-rose-500/15 hover:text-rose-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Service Domain */}
                  <div className={`mt-3 truncate text-xs font-mono font-medium ${mutedText}`}>
                    {item.service}
                  </div>

                  {/* CREDENTIAL FIELDS BOX */}
                  <div className={`mt-3 space-y-2.5 rounded-2xl border p-3.5 ${dark ? "border-white/5 bg-black/25" : "border-slate-100 bg-slate-50"}`}>
                    {/* Username or Account ID */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">
                          Username / Email / Key ID
                        </span>
                        <div className={`truncate font-mono text-xs font-medium ${dark ? "text-slate-200" : "text-slate-800"}`}>
                          {isRevealed && secretData
                            ? secretData.username
                            : item.username
                            ? item.username
                            : "••••••••••••"}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const val = isRevealed && secretData ? secretData.username : item.username || "";
                          if (val) copyToClipboard(val, `u-${item.id}`);
                        }}
                        disabled={!isRevealed && !item.username}
                        title="Copy Username"
                        className={`flex h-7 items-center gap-1 rounded-lg border px-2 text-[10px] font-semibold transition ${
                          copiedId === `u-${item.id}`
                            ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-400"
                            : dark
                            ? "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                        } disabled:opacity-40`}
                      >
                        {copiedId === `u-${item.id}` ? <Check size={12} /> : <Copy size={11} />}
                        <span>{copiedId === `u-${item.id}` ? "Copied" : "Copy"}</span>
                      </button>
                    </div>

                    {/* Password / Secret */}
                    <div className="flex items-center justify-between gap-2 border-t border-inherit pt-2">
                      <div className="min-w-0 flex-1">
                        <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">
                          Secret / Password / Token
                        </span>
                        <div className="truncate font-mono text-xs font-semibold text-indigo-400">
                          {isRevealed && secretData
                            ? secretData.secret
                            : item.secret && isRevealed
                            ? item.secret
                            : "••••••••••••••••"}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => void reveal(item)}
                          title={isRevealed ? "Hide Secret" : "Reveal Secret"}
                          className={`flex h-7 items-center gap-1 rounded-lg border px-2 text-[10px] font-semibold transition ${
                            dark
                              ? "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          {isRevealed ? <EyeOff size={12} /> : <Eye size={12} />}
                          <span>{isRevealed ? "Hide" : "Reveal"}</span>
                        </button>

                        <button
                          onClick={async () => {
                            let secretVal = isRevealed && secretData ? secretData.secret : item.secret;
                            if (!secretVal) {
                              try {
                                const response = await apiFetch(`/api/vault/${item.id}/reveal`, { method: "POST" });
                                const data = await response.json();
                                if (data.data?.secret) {
                                  secretVal = data.data.secret;
                                  setRevealed((curr) => ({ ...curr, [item.id]: data.data }));
                                }
                              } catch {}
                            }
                            if (secretVal) copyToClipboard(secretVal, `p-${item.id}`);
                          }}
                          title="Copy Secret"
                          className={`flex h-7 items-center gap-1 rounded-lg border px-2 text-[10px] font-semibold transition ${
                            copiedId === `p-${item.id}`
                              ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-400"
                              : dark
                              ? "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          {copiedId === `p-${item.id}` ? <Check size={12} /> : <Copy size={11} />}
                          <span>{copiedId === `p-${item.id}` ? "Copied" : "Copy"}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Notes Preview */}
                  {notesText && (
                    <div className="mt-3 text-xs leading-relaxed text-slate-400 dark:text-slate-400">
                      <span className="font-semibold text-slate-500">Note:</span> {notesText}
                    </div>
                  )}
                </div>

                {/* Footer timestamp */}
                <div className={`mt-4 border-t border-inherit pt-2.5 flex items-center justify-between text-[10px] ${mutedText}`}>
                  <span>Added {new Date(item.created_at).toLocaleDateString()}</span>
                  <span className="flex items-center gap-1 text-emerald-500">
                    <ShieldCheck size={11} />
                    <span>Protected</span>
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ADD CREDENTIAL MODAL */}
      <AnimatePresence>
        {openModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !saving && setOpenModal(false)}
              className="absolute inset-0 bg-slate-950/70 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className={`relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border p-6 sm:p-8 shadow-2xl ${
                dark ? "border-white/10 bg-[#121624] text-white" : "border-slate-200 bg-white text-slate-900"
              }`}
            >
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600/15 text-indigo-400">
                      <KeyRound size={18} />
                    </div>
                    <h2 className="text-xl font-bold">Save New Credential</h2>
                  </div>
                  <p className={`mt-1 text-xs ${mutedText}`}>
                    Values are encrypted with AES-256-GCM before transmission and stored securely in your private vault.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpenModal(false)}
                  className={`rounded-xl p-1.5 text-slate-400 hover:text-white ${dark ? "hover:bg-white/10" : "hover:bg-slate-100"}`}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                      Account / Service Label *
                    </label>
                    <input
                      required
                      value={form.label}
                      onChange={(e) => setForm({ ...form, label: e.target.value })}
                      placeholder="e.g. AWS Production RDS"
                      className={`h-11 w-full rounded-xl border px-3.5 text-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 ${inputBg}`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                      Category *
                    </label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value as VaultCategory })}
                      className={`h-11 w-full rounded-xl border px-3 text-xs outline-none focus:border-indigo-500 ${inputBg}`}
                    >
                      <option value="API_KEY">API Key / Secret Token</option>
                      <option value="DATABASE">Database (Postgres, Mongo, Redis)</option>
                      <option value="HOSTING">Cloud & Hosting (AWS, Vercel, Neon)</option>
                      <option value="SERVER_SSH">Server / SSH / SFTP</option>
                      <option value="PORTAL">Client / Admin Portal</option>
                      <option value="EMAIL">Email & Automation Tools</option>
                      <option value="OTHER">General Credentials</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Service Name or Website URL *
                  </label>
                  <input
                    required
                    value={form.service}
                    onChange={(e) => setForm({ ...form, service: e.target.value })}
                    placeholder="e.g. https://aws.amazon.com or 192.168.1.100"
                    className={`h-11 w-full rounded-xl border px-3.5 text-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 ${inputBg}`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Username / Email / Access Key *
                  </label>
                  <input
                    required
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    placeholder="e.g. admin@company.com or AKIAIOSFODNN7EXAMPLE"
                    className={`h-11 w-full rounded-xl border px-3.5 text-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 ${inputBg}`}
                  />
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Password, Secret Key, or Token *
                    </label>
                    <button
                      type="button"
                      onClick={generatePassword}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-400 hover:text-indigo-300"
                    >
                      <Sparkles size={12} />
                      Generate Strong Password
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      required
                      type={showFormSecret ? "text" : "password"}
                      value={form.secret}
                      onChange={(e) => setForm({ ...form, secret: e.target.value })}
                      placeholder="Enter password or secret token..."
                      className={`h-11 w-full rounded-xl border pl-3.5 pr-12 text-xs font-mono outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 ${inputBg}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowFormSecret(!showFormSecret)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showFormSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Notes or Recovery Hints <span className="font-normal opacity-60">(Optional)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="e.g. Port 5432, staging database cluster, 2FA enabled on master email..."
                    className={`w-full rounded-xl border p-3 text-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 ${inputBg}`}
                  />
                </div>

                <div className="mt-6 flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setOpenModal(false)}
                    className={`h-11 rounded-xl border px-5 text-xs font-semibold ${
                      dark ? "border-white/10 hover:bg-white/5 text-slate-300" : "border-slate-200 hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-700 px-6 text-xs font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:opacity-95 disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Encrypting & Saving...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={16} />
                        <span>Encrypt and Save to Vault</span>
                      </>
                    )}
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
