import dynamic from "next/dynamic";
import Login from "./components/Login";
import type { SuperAdminSettingsTab } from "./components/SuperAdminSettings";

const SalesDashboard = dynamic(() => import("./components/SalesDashboard"), { ssr: false });
const SubAdminDashboard = dynamic(() => import("./components/SubAdminDashboard"), { ssr: false });
const DeveloperWorkspace = dynamic(() => import("./components/DeveloperWorkspace"), { ssr: false });
const PaymentsWorkspace = dynamic(() => import("./components/PaymentsWorkspace"), { ssr: false });
const CredentialsVault = dynamic(() => import("./components/CredentialsVault"), { ssr: false });
const DigitalMarketingWorkspace = dynamic(() => import("./components/DigitalMarketingWorkspace"), { ssr: false });
const ScopeOfWorkWorkspace = dynamic(() => import("./components/ScopeOfWorkWorkspace"), { ssr: false });
const AuditLogsViewer = dynamic(() => import("./components/AuditLogsViewer"), { ssr: false });
const UniversalTasksWorkspace = dynamic(() => import("./components/UniversalTasksWorkspace"), { ssr: false });
const PublicSowViewer = dynamic(() => import("./components/PublicSowViewer"), { ssr: false });
const SuperAdminSettings = dynamic(() => import("./components/SuperAdminSettings"), { ssr: false });

import { ClientsPage, CreateInvoicePage, DashboardPage, ExpensesPage, FollowUpsPage, InvoicesPage, LeadsPage, PaymentsPage, QuotationsPage } from "./components/pages/CrmPages";
import "./app.css";
import ZootechXLogo from "./components/ZootechXLogo";
import { apiFetch, AuthUser } from "./lib/api";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, UserPlus, BellRing, FileText, Plus, FileQuestion, Users,
  CreditCard, Calculator, Settings, Search, Sun, Moon, Bell, ChevronDown, X, Eye, Menu,
  Phone, MessageCircle, Mail, Calendar, MapPin, Clock,
  Check, AlertCircle, ArrowLeft, Save, Wand2, Sparkles, Bot, Filter, KeyRound,
  Download, Edit3, Trash2, MoreHorizontal, ChevronRight, Briefcase, Home, Store, Factory, LandPlot,
  LogOut, Crown, CheckCircle2, CheckSquare, Shield, Megaphone, ShieldCheck
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell
} from "recharts";

// TYPES
type LeadPriority = "High" | "Medium" | "Low";
type LeadStatus = "New" | "Contacted" | "Follow-up" | "Qualified" | "Negotiation" | "Converted" | "Lost";
type FollowUpType = "Phone Call" | "WhatsApp" | "Email" | "Meeting" | "Site Visit";
type FollowUpStatus = "Scheduled" | "Completed" | "Contacted" | "Converted" | "Rescheduled" | "Cancelled" | "Overdue";

interface Lead {
  id: string; name: string; company: string; email: string; phone: string;
  propertyType: string; location: string; budgetMin: number; budgetMax: number;
  source: string; assignedTo: string; priority: LeadPriority; status: LeadStatus;
  notes: string; nextFollowUp: string; followUpType: FollowUpType; avatar: string;
  createdAt: string; customerId?: string | null; convertedAt?: string | null;
}
interface FollowUp {
  id: string; leadId: string; leadName: string; company: string; property: string;
  type: FollowUpType; date: string; time: string; assignedTo: string;
  priority: LeadPriority; status: FollowUpStatus; notes: string; completedAt?: string | null;
}
interface InvoiceItem { id: string; name: string; hsn: string; qty: number; unit: string; rate: number; discount: number; gst: number; }
interface Invoice {
  id: string; number: string; clientId: string; clientName: string; date: string; dueDate: string;
  placeOfSupply: string; items: InvoiceItem[]; subtotal: number; total: number; gstTotal: number;
  cgst: number; sgst: number; igst: number; status: "Draft" | "Sent" | "Paid" | "Overdue"; amountPaid: number; createdByName?: string | null;
}
interface Client { id: string; businessName: string; name: string; gstin: string; email: string; phone: string; address: string; state: string; creditLimit: number; projects?: Array<{ id: string; title: string; name: string; status: string; category?: string; budget?: number; deadline?: string }>; }
interface Quotation { id: string; clientName: string; amount: number; validUntil: string; status: string; }

type ApiLead = {
  id: string; full_name: string; company: string | null; email: string | null; phone: string | null;
  source: string; notes: string | null; status: string; created_at: string; customer_id?: string | null; converted_at?: string | null;
};

const toLead = (lead: ApiLead): Lead => ({
  id: lead.id, name: lead.full_name, company: lead.company ?? "", email: lead.email ?? "", phone: lead.phone ?? "",
  propertyType: "Commercial", location: "", budgetMin: 0, budgetMax: 0, source: lead.source,
  assignedTo: "", priority: "Medium", status: ({ NEW:"New", CONTACTED:"Contacted", FOLLOW_UP:"Follow-up", INTERESTED:"Qualified", QUOTATION_SENT:"Qualified", NEGOTIATION:"Negotiation", CONVERTED:"Converted", LOST:"Lost" }[lead.status] ?? "New") as LeadStatus, notes: lead.notes ?? "", nextFollowUp: "", customerId:lead.customer_id ?? null, convertedAt:lead.converted_at ?? null,
  followUpType: "Phone Call", avatar: lead.full_name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(),
  createdAt: lead.created_at,
});
type ApiFollowUp = { id: string; lead_id: string | null; lead_name: string; company: string | null; property: string | null; type: string; followup_date: string; followup_time: string | null; assigned_to: string | null; priority: string | null; status: string; notes: string | null; completed_at?: string | null };
const toFollowUp = (followup: ApiFollowUp): FollowUp => ({ id: followup.id, leadId: followup.lead_id ?? "", leadName: followup.lead_name, company: followup.company ?? "", property: followup.property ?? "", type: followup.type as FollowUpType, date: followup.followup_date, time: followup.followup_time ?? "", assignedTo: followup.assigned_to ?? "", priority: (followup.priority as LeadPriority) ?? "Medium", status: followup.status as FollowUpStatus, notes: followup.notes ?? "", completedAt:followup.completed_at ?? null });

type ApiClient = { id: string; name: string; company: string | null; email: string | null; phone: string | null; gst_number: string | null; projects?: Array<{ id: string; title: string; name: string; status: string; category?: string; budget?: number; deadline?: string }> };
const toClient = (client: ApiClient): Client => ({
  id: client.id, businessName: client.company ?? client.name, name: client.name, gstin: client.gst_number ?? "",
  email: client.email ?? "", phone: client.phone ?? "", address: "", state: "27-Maharashtra", creditLimit: 0,
  projects: client.projects ?? [],
});
type ApiQuotation = { quotation_number: string; client_name: string; amount: string | number; valid_until: string; status: string };
const toQuotation = (quotation: ApiQuotation): Quotation => ({ id: quotation.quotation_number, clientName: quotation.client_name, amount: Number(quotation.amount), validUntil: quotation.valid_until.slice(0, 10), status: quotation.status });
const formatNotificationTime = (isoString?: string) => {
  if (!isoString) return "Just now";
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs <= 0 || isNaN(diffMs)) return "Just now";
    const diffSecs = Math.floor(diffMs / 1000);
    if (diffSecs < 60) return "Just now";
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  } catch {
    return "Recently";
  }
};

const getReadNotifIds = (): Set<string> => {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem("zootechx_read_notif_ids");
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
};

const saveReadNotifId = (id: string) => {
  if (typeof window === "undefined") return;
  try {
    const ids = getReadNotifIds();
    ids.add(id);
    localStorage.setItem("zootechx_read_notif_ids", JSON.stringify(Array.from(ids).slice(-300)));
  } catch {}
};

const saveAllReadNotifIds = (idList: string[]) => {
  if (typeof window === "undefined") return;
  try {
    const ids = getReadNotifIds();
    for (const id of idList) ids.add(id);
    localStorage.setItem("zootechx_read_notif_ids", JSON.stringify(Array.from(ids).slice(-300)));
  } catch {}
};

type ApiNotification = { id: string; title: string; message: string; is_read: boolean; created_at: string };
type AppNotification = { id: string; title: string; message: string; text: string; time: string; unread: boolean; createdAt: string };
const toNotification = (notification: ApiNotification): AppNotification => {
  const readIds = getReadNotifIds();
  const isRead = notification.is_read || readIds.has(notification.id);
  return {
    id: notification.id,
    title: notification.title,
    message: notification.message,
    text: `${notification.title}: ${notification.message}`,
    time: formatNotificationTime(notification.created_at),
    unread: !isRead,
    createdAt: notification.created_at,
  };
};
type ApiInvoice = { id: string; invoice_number: string; client_id: string; client_name: string; total: string | number; paid_amount: string | number; due_date: string; created_at: string; created_by_name?: string | null; items?: any[] };
const toInvoice = (invoice: ApiInvoice): Invoice => {
  const hasItems = Array.isArray((invoice as any).items) && (invoice as any).items.length > 0;
  const items: InvoiceItem[] = hasItems
    ? (invoice as any).items.map((it: any, idx: number) => ({
        id: it.id || String(idx + 1),
        name: it.name || "Item",
        hsn: it.hsn || "9983",
        qty: Number(it.qty) || 1,
        unit: it.unit || "Nos",
        rate: Number(it.rate) || 0,
        discount: Number(it.discount) || 0,
        gst: Number(it.gst) ?? 18,
      }))
    : [
        {
          id: "item-1",
          name: "Professional Services",
          hsn: "998313",
          qty: 1,
          unit: "Job",
          rate: Number(invoice.total),
          discount: 0,
          gst: 0,
        },
      ];
  const subtotal = items.reduce((acc, it) => acc + (it.qty * it.rate * (1 - (it.discount || 0) / 100)), 0);
  const gstTotal = items.reduce((acc, it) => acc + (it.qty * it.rate * (1 - (it.discount || 0) / 100) * ((it.gst || 0) / 100)), 0);
  return {
    id: invoice.id,
    number: invoice.invoice_number,
    clientId: invoice.client_id,
    clientName: invoice.client_name || (invoice as any).clientName || "Client",
    date: invoice.created_at ? invoice.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
    dueDate: invoice.due_date ? invoice.due_date.slice(0, 10) : new Date().toISOString().slice(0, 10),
    placeOfSupply: "27-Maharashtra",
    items,
    subtotal: hasItems ? subtotal : Number(invoice.total),
    total: Number(invoice.total),
    gstTotal: hasItems ? gstTotal : 0,
    cgst: hasItems ? gstTotal / 2 : 0,
    sgst: hasItems ? gstTotal / 2 : 0,
    igst: 0,
    status: Number(invoice.paid_amount) >= Number(invoice.total) ? "Paid" : "Sent",
    amountPaid: Number(invoice.paid_amount),
    createdByName: invoice.created_by_name
  };
};
type FinanceExpense = { id: string; title: string; category: string; amount: string | number; expense_date: string | null; payment_method: string | null };
type FinancePayment = { id: string; invoice_number: string; amount: string | number; method: string; created_at: string };

const followUpTimeOptions = Array.from({ length: 24 }, (_, hour) => [0, 30].map(minute => { const suffix = hour < 12 ? "AM" : "PM"; const displayHour = hour % 12 || 12; return `${displayHour}:${String(minute).padStart(2, "0")} ${suffix}`; })).flat();

export default function App() {
  const [sowToken] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("sowToken");
    }
    return null;
  });

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState("");
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("zootechx_theme");
      if (saved) return saved === "dark";
    }
    return true;
  });
  const [currentPage, setCurrentPage] = useState(() => {
    if (typeof window === "undefined") return "dashboard";
    const view = new URLSearchParams(window.location.search).get("view");
    if (view === "users") return "settings";
    return view || "dashboard";
  });
  const [settingsTab, setSettingsTab] = useState<SuperAdminSettingsTab>(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("view") === "users") {
      return "users";
    }
    return "sow-template";
  });
  const navigationReady = useRef(false); const navigationFromHistory = useRef(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [leads, setLeads] = useState<Lead[]>([]);

 

  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [expenses, setExpenses] = useState<FinanceExpense[]>([]);
  const [payments, setPayments] = useState<FinancePayment[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([
  ]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showAddLead, setShowAddLead] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [showCreateClient, setShowCreateClient] = useState(false);
  const [showCreateQuote, setShowCreateQuote] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [followUpFilter, setFollowUpFilter] = useState<string>("All");
  const [newDropdownOpen, setNewDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notificationTab, setNotificationTab] = useState<"unread" | "all">("unread");
  const [showAiChat, setShowAiChat] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [leadViewMode, setLeadViewMode] = useState<"cards" | "table">("cards");
  const [currentTime, setCurrentTime] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    };
    updateTime();
    const timer = setInterval(updateTime, 20000);
    return () => clearInterval(timer);
  }, []);

  const followUpDateRef = useRef<HTMLInputElement>(null);
  const addLeadDateRef = useRef<HTMLInputElement>(null);
  const quoteValidUntilRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const notifContainerRef = useRef<HTMLDivElement>(null);

  // NEW INVOICE FORM STATE
  const [newInvoice, setNewInvoice] = useState<Partial<Invoice> & { placeOfSupply: string }>({
    number:"INV-2026-001",
    date:new Date().toISOString().split("T")[0],
    dueDate:new Date(Date.now()+30*86400000).toISOString().split("T")[0],
    placeOfSupply:"27-Maharashtra",
    items:[{id:"1", name:"", hsn:"", qty:1, unit:"Nos", rate:0, discount:0, gst:18}],
    amountPaid:0,
    clientId:"", clientName:"", status:"Draft"
  });
  const [previewMode, setPreviewMode] = useState(false);

  // ADD LEAD FORM
  const [leadForm, setLeadForm] = useState<Partial<Lead>>({
    propertyType:"Commercial", location:"Tardeo", source:"Website", priority:"Medium", status:"New", followUpType:"Phone Call", assignedTo:"Aarav"
  });
  const [leadFollowUpTime, setLeadFollowUpTime] = useState("10:00 AM");
  const [followUpForm, setFollowUpForm] = useState<Partial<FollowUp>>({ type:"Phone Call", priority:"Medium", assignedTo:"Aarav" });
  const [clientForm, setClientForm] = useState<Partial<Client>>({ state:"27-Maharashtra" });
  const [clientModalError, setClientModalError] = useState<string | null>(null);
  const [clientSubmitting, setClientSubmitting] = useState(false);
  const [quoteForm, setQuoteForm] = useState<Partial<Quotation>>({ status:"Draft" });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // Load theme only. CRM data is always loaded from the authenticated backend.
  useEffect(()=>{
    const savedTheme = localStorage.getItem("zootechx_theme");
    const dark = savedTheme ? savedTheme === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    setIsDark(dark);
    if (dark) {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    }
  },[]);

  // Restore only a server-validated session; never trust a role stored in the browser.
  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem("zootechx_token");
      if (!token) { setAuthChecking(false); return; }
      try {
        const response = await apiFetch("/api/auth/me");
        const data = await response.json();
        if (!response.ok || !data.user) throw new Error("Invalid session");
        const user = data.user as AuthUser;
        localStorage.setItem("zootechx_user", JSON.stringify(user));
        setCurrentUser(user);
        setUserRole(user.role);
        setIsLoggedIn(true);
      } catch {
        localStorage.removeItem("zootechx_token");
        localStorage.removeItem("zootechx_user");
      } finally {
        setAuthChecking(false);
      }
    };
    restoreSession();
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;
    const loadCrmData = async () => {
      try {
        const [leadsResponse, clientsResponse, invoicesResponse, expensesResponse, paymentsResponse, followupsResponse, quotationsResponse, notificationsResponse] = await Promise.all([apiFetch("/api/leads"), apiFetch("/api/clients"), apiFetch("/api/invoices"), apiFetch("/api/expenses"), apiFetch("/api/payments"), apiFetch("/api/followups"), apiFetch("/api/quotations"), apiFetch("/api/notifications")]);
        const leadsData = await leadsResponse.json();
        const clientsData = await clientsResponse.json();
        const invoicesData = await invoicesResponse.json(); const expensesData = await expensesResponse.json(); const paymentsData = await paymentsResponse.json(); const followupsData = await followupsResponse.json(); const quotationsData = await quotationsResponse.json(); const notificationsData = await notificationsResponse.json();
        if (leadsResponse.ok && Array.isArray(leadsData.data)) setLeads(leadsData.data.map(toLead));
        if (clientsResponse.ok && Array.isArray(clientsData.data)) setClients(clientsData.data.map(toClient));
        if (invoicesResponse.ok && Array.isArray(invoicesData.data)) setInvoices(invoicesData.data.map(toInvoice));
        if (expensesResponse.ok && Array.isArray(expensesData.data)) setExpenses(expensesData.data);
        if (paymentsResponse.ok && Array.isArray(paymentsData.data)) setPayments(paymentsData.data);
        if (followupsResponse.ok && Array.isArray(followupsData.data)) setFollowUps(followupsData.data.map(toFollowUp));
        if (quotationsResponse.ok && Array.isArray(quotationsData.data)) setQuotations(quotationsData.data.map(toQuotation));
        if (notificationsResponse.ok && Array.isArray(notificationsData.data)) setNotifications(notificationsData.data.map(toNotification));
      } catch {
        // Leave the CRM lists empty until the backend is available.
      }
    };
    loadCrmData();
  }, [isLoggedIn]);

  // Real-time notification & invoice poller for live CRM events
  useEffect(() => {
    if (!isLoggedIn) return;
    const pollNotifications = async () => {
      try {
        const [response, fuRes, invRes] = await Promise.all([
          apiFetch("/api/notifications"),
          apiFetch("/api/followups"),
          userRole === "SUPER_ADMIN" ? apiFetch("/api/invoices") : Promise.resolve(null),
        ]);
        if (response.ok) {
          const resJson = await response.json();
          if (Array.isArray(resJson.data)) {
            setNotifications(resJson.data.map(toNotification));
          }
        }
        if (fuRes.ok) {
          const fuJson = await fuRes.json();
          if (Array.isArray(fuJson.data)) {
            setFollowUps(fuJson.data.map(toFollowUp));
          }
        }
        if (invRes && invRes.ok) {
          const invJson = await invRes.json();
          if (Array.isArray(invJson.data)) {
            setInvoices(invJson.data.map(toInvoice));
          }
        }
      } catch {}
    };
    const pollInterval = setInterval(pollNotifications, 4000);
    return () => clearInterval(pollInterval);
  }, [isLoggedIn, userRole]);

  // Dismiss notification popover when clicking outside
  useEffect(() => {
    if (!notifOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (notifContainerRef.current && !notifContainerRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [notifOpen]);

  useEffect(()=>{ 
    localStorage.setItem("zootechx_theme", isDark ? "dark" : "light");
    if (isDark) {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    }
  },[isDark]);

  // Keep each workspace destination addressable. The selected screen survives refresh,
  // and browser back/forward now follows the app navigation instead of losing context.
  useEffect(() => {
    const onPopState = () => {
      navigationFromHistory.current = true;
      const view = new URLSearchParams(window.location.search).get("view") || "dashboard";
      if (view === "users") {
        setCurrentPage("settings");
        setSettingsTab("users");
      } else {
        setCurrentPage(view);
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);
  useEffect(() => {
    if (!isLoggedIn || userRole !== "SUPER_ADMIN") return;
    const url = new URL(window.location.href); url.searchParams.set("view", currentPage);
    if (!navigationReady.current) { window.history.replaceState(null, "", url); navigationReady.current = true; return; }
    if (navigationFromHistory.current) { navigationFromHistory.current = false; return; }
    window.history.pushState(null, "", url);
  }, [currentPage, isLoggedIn, userRole]);

  useEffect(() => {
    const closeSearchOnOutsideClick = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) setIsSearchOpen(false);
    };
    document.addEventListener("mousedown", closeSearchOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeSearchOnOutsideClick);
  }, []);

  // Overdue detection
  useEffect(()=>{
    const now = new Date();
    setFollowUps(prev=> prev.map(f=>{
      const fDate = new Date(f.date + " " + f.time);
      if(fDate < now && f.status==="Scheduled") return {...f, status:"Overdue" as FollowUpStatus};
      return f;
    }));
  },[]);

  const toggleTheme = () => {
    setIsDark(prev => {
      const next = !prev;
      localStorage.setItem("zootechx_theme", next ? "dark" : "light");
      if (next) {
        document.documentElement.classList.add("dark");
        document.documentElement.classList.remove("light");
      } else {
        document.documentElement.classList.remove("dark");
        document.documentElement.classList.add("light");
      }
      return next;
    });
  };

  const filteredLeads = useMemo(()=>{
    if(!searchQuery) return leads;
    return leads.filter(l=> `${l.name} ${l.company} ${l.email}`.toLowerCase().includes(searchQuery.toLowerCase()));
  },[leads, searchQuery]);

  const searchMatches = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return { leads:[] as Lead[], followUps:[] as FollowUp[], clients:[] as Client[], invoices:[] as Invoice[] };
    const matches = (value: string) => value.toLowerCase().includes(query);
    return {
      leads: leads.filter(lead => matches(`${lead.name} ${lead.company} ${lead.email} ${lead.phone}`)).slice(0, 3),
      followUps: followUps.filter(followUp => matches(`${followUp.leadName} ${followUp.company} ${followUp.property} ${followUp.type}`)).slice(0, 3),
      clients: clients.filter(client => matches(`${client.businessName} ${client.name} ${client.email} ${client.phone}`)).slice(0, 3),
      invoices: invoices.filter(invoice => matches(`${invoice.number} ${invoice.clientName}`)).slice(0, 3),
    };
  }, [clients, followUps, invoices, leads, searchQuery]);

  const searchResultCount = searchMatches.leads.length + searchMatches.followUps.length + searchMatches.clients.length + searchMatches.invoices.length;
  const bellNotifications = notificationTab === "unread" ? notifications.filter(notification => notification.unread) : notifications;
  const markNotificationRead = async (id: string) => {
    saveReadNotifId(id);
    setNotifications(current => current.map(notification => notification.id === id ? { ...notification, unread: false } : notification));
    await apiFetch(`/api/notifications/${id}/read`, { method: "PATCH" }).catch(() => {});
  };
  const markAllNotificationsRead = async () => {
    const allIds = notifications.map(n => n.id);
    saveAllReadNotifIds(allIds);
    setNotifications(current => current.map(notification => ({ ...notification, unread: false })));
    await apiFetch("/api/notifications/read-all", { method: "POST" }).catch(() => {});
  };
  const clearReadNotifications = async () => {
    setNotifications(current => current.filter(notification => notification.unread));
    await apiFetch("/api/notifications/clear-read", { method: "POST" }).catch(() => {});
  };
  const pushRealtimeNotification = (title: string, message: string) => {
    const item: AppNotification = {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title,
      message,
      text: `${title}: ${message}`,
      time: "Just now",
      unread: true,
      createdAt: new Date().toISOString(),
    };
    setNotifications(prev => [item, ...prev]);
  };
  const handleNotificationClick = (item: AppNotification) => {
    if (item.unread) {
      void markNotificationRead(item.id);
    }
    const txt = `${item.title} ${item.message}`.toLowerCase();
    if (txt.includes("invoice") || txt.includes("inv-") || txt.includes("payment")) {
      setCurrentPage("invoices");
    } else if (txt.includes("sow") || txt.includes("scope")) {
      setCurrentPage("sows");
    } else if (txt.includes("employee") || txt.includes("provisioned") || txt.includes("user")) {
      setSettingsTab("users");
      setCurrentPage("settings");
    } else if (txt.includes("task")) {
      setCurrentPage("tasks");
    } else if (txt.includes("audit")) {
      setCurrentPage("audit-logs");
    } else if (txt.includes("follow-up") || txt.includes("followup")) {
      setCurrentPage("followups");
    } else if (txt.includes("lead")) {
      setCurrentPage("leads");
    } else if (txt.includes("client")) {
      setCurrentPage("clients");
    } else if (txt.includes("quotation") || txt.includes("quote")) {
      setCurrentPage("quotations");
    } else if (txt.includes("project") || txt.includes("developer")) {
      setCurrentPage("developers");
    }
    setNotifOpen(false);
  };

  // Converted records belong in Clients, so all lead counters use active leads.
  const activeLeads = useMemo(() => leads.filter(lead => lead.status !== "Converted"), [leads]);
  const visibleLeads = useMemo(() => filteredLeads.filter(lead => lead.status !== "Converted"), [filteredLeads]);

  const kpis = useMemo(()=> {
    const total = leads.length;
    const totalInvoiced = invoices.reduce((s,i)=> s+i.total,0);
    const pending = invoices.filter(i=> i.status==="Sent").length;
    const overdue = followUps.filter(f=> f.status==="Overdue").length;
    return { total, totalInvoiced, pending, overdue };
  },[leads, invoices, followUps]);

  const pipelineData = useMemo(() => ["New", "Contacted", "Follow-up", "Qualified", "Negotiation", "Converted"].map(name => ({ name, value: leads.filter(lead => lead.status === name).length })), [leads]);
  const revenueData = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(); date.setMonth(date.getMonth() - (5 - index));
      return { key: `${date.getFullYear()}-${date.getMonth()}`, month: date.toLocaleString("en", { month:"short" }), revenue: 0, forecast: 0 };
    });
    invoices.forEach(invoice => {
      const date = new Date(invoice.date);
      const target = months.find(month => month.key === `${date.getFullYear()}-${date.getMonth()}`);
      if (target) target.revenue += invoice.total;
    });
    return months;
  }, [invoices]);
  const statusData = useMemo(() => {
    const colors: Record<Invoice["status"], string> = { Paid:"#10b981", Sent:"#6366f1", Draft:"#94a3b8", Overdue:"#ef4444" };
    return (Object.keys(colors) as Invoice["status"][]).map(name => ({ name, value: invoices.filter(invoice => invoice.status === name).length, color: colors[name] }));
  }, [invoices]);

  const todayFollowUps = followUps.filter(f=> f.date===new Date().toISOString().split("T")[0] && f.status!=="Completed");
  const upcomingFollow = followUps.filter(f=> new Date(f.date) > new Date() && f.status==="Scheduled").length;
  const overdueFollow = followUps.filter(f=> f.status==="Overdue").length;
  const completedFollow = followUps.filter(f=> f.status==="Completed").length;

  const filteredFollowUps = useMemo(()=>{
    if(followUpFilter==="All") return followUps;
    if(followUpFilter==="Today") return followUps.filter(f=> f.date===new Date().toISOString().split("T")[0]);
    if(followUpFilter==="Upcoming") return followUps.filter(f=> new Date(f.date) > new Date() && f.status==="Scheduled");
    return followUps.filter(f=> f.status===followUpFilter);
  },[followUps, followUpFilter]);

  const handleConvertLead = async (lead: Lead) => {
    try {
      const response = await apiFetch(`/api/leads/${lead.id}/convert`, { method:"POST" });
      const data = await response.json();
      if (!response.ok || !data.data) throw new Error(data.message || "Unable to convert lead");
      setLeads(current => current.map(item => item.id === lead.id ? toLead(data.data as ApiLead) : item));
      if (data.client) {
        const client = toClient(data.client as ApiClient);
        setClients(current => current.some(item => item.id === client.id) ? current : [client, ...current]);
      }
      pushRealtimeNotification("Lead Converted", `${lead.name} was successfully converted to an active client`);
      setSelectedLead(null);
    } catch (error) {
      setNotifications(current => [{ id:Date.now().toString(), title:"Action Failed", message:error instanceof Error ? error.message : "Unable to convert lead", text:error instanceof Error ? error.message : "Unable to convert lead", time:"Just now", unread:true, createdAt:new Date().toISOString() }, ...current]);
    }
  };

  const handleLeadStatusChange = async (lead: Lead, status: LeadStatus) => {
    if (status === "Converted") {
      await handleConvertLead(lead);
      return;
    }

    const apiStatus: Record<Exclude<LeadStatus, "Converted">, string> = {
      New: "NEW",
      Contacted: "CONTACTED",
      "Follow-up": "FOLLOW_UP",
      Qualified: "INTERESTED",
      Negotiation: "NEGOTIATION",
      Lost: "LOST",
    };

    try {
      const response = await apiFetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: apiStatus[status] }),
      });
      const data = await response.json();
      if (!response.ok || !data.data) throw new Error(data.message || "Unable to update lead status");
      setLeads(current => current.map(item => item.id === lead.id ? toLead(data.data as ApiLead) : item));
    } catch (error) {
      setNotifications(current => [{ id:Date.now().toString(), title:"Status Update Failed", message:error instanceof Error ? error.message : "Unable to update lead status", text:error instanceof Error ? error.message : "Unable to update lead status", time:"Just now", unread:true, createdAt:new Date().toISOString() }, ...current]);
    }
  };

  const handleCreateQuotation = async () => {
    if (!quoteForm.clientName || !quoteForm.amount) return;
    const client = clients.find(item => item.businessName === quoteForm.clientName);
    try {
      const response = await apiFetch("/api/quotations", {
        method: "POST",
        body: JSON.stringify({ clientId: client?.id, clientName: quoteForm.clientName, amount: quoteForm.amount, validUntil: quoteForm.validUntil || new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0], status: quoteForm.status || "Draft" }),
      });
      const data = await response.json();
      if (!response.ok || !data.data) throw new Error(data.message || "Unable to save quotation");
      const quotation = toQuotation(data.data as ApiQuotation);
      setQuotations(current => [quotation, ...current]);
      pushRealtimeNotification("Quotation Generated", `Quotation #${quotation.id} for ${quotation.clientName} (₹${quotation.amount.toLocaleString()})`);
      setShowCreateQuote(false);
      setQuoteForm({ status:"Draft" });
    } catch (error) {
      setNotifications(current => [{ id:Date.now().toString(), title:"Quote Failed", message:error instanceof Error ? error.message : "Unable to save quotation", text:error instanceof Error ? error.message : "Unable to save quotation", time:"Just now", unread:true, createdAt:new Date().toISOString() }, ...current]);
    }
  };

  const handleCompleteFollowUp = async (followUp: FollowUp) => {
    try {
      const response = await apiFetch(`/api/followups/${followUp.id}/complete`, { method:"POST" });
      const data = await response.json();
      if (!response.ok || !data.data) throw new Error(data.message || "Unable to complete follow-up");
      setFollowUps(current => current.map(item => item.id === followUp.id ? toFollowUp(data.data as ApiFollowUp) : item));
      pushRealtimeNotification("Follow-up Completed", `Follow-up with ${followUp.leadName} completed`);
    } catch (error) {
      setNotifications(current => [{ id:Date.now().toString(), title:"Action Failed", message:error instanceof Error ? error.message : "Unable to complete follow-up", text:error instanceof Error ? error.message : "Unable to complete follow-up", time:"Just now", unread:true, createdAt:new Date().toISOString() }, ...current]);
    }
  };

  const handleUpdateFollowUpStatus = async (followUpId: string, newStatus: string) => {
    setFollowUps(current => current.map(item => item.id === followUpId ? { ...item, status: newStatus as FollowUpStatus } : item));
    try {
      const response = await apiFetch(`/api/followups/${followUpId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await response.json();
      if (!response.ok || !data.data) throw new Error(data.message || "Unable to update follow-up");
      setFollowUps(current => current.map(item => item.id === followUpId ? toFollowUp(data.data as ApiFollowUp) : item));
      pushRealtimeNotification("Follow-up Updated", `Follow-up updated to ${newStatus}`);
    } catch {
      const res = await apiFetch("/api/followups");
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.data)) setFollowUps(json.data.map(toFollowUp));
      }
    }
  };

  const handleDeleteFollowUp = async (followUp: FollowUp) => {
    try {
      const response = await apiFetch(`/api/followups/${followUp.id}`, { method:"DELETE" });
      if (!response.ok) { const data = await response.json(); throw new Error(data.message || "Unable to delete follow-up"); }
      setFollowUps(current => current.filter(item => item.id !== followUp.id));
    } catch (error) {
      setNotifications(current => [{ id:Date.now().toString(), title:"Delete Failed", message:error instanceof Error ? error.message : "Unable to delete follow-up", text:error instanceof Error ? error.message : "Unable to delete follow-up", time:"Just now", unread:true, createdAt:new Date().toISOString() }, ...current]);
    }
  };

  const handleAddLead = async () => {
    if(!leadForm.name || !leadForm.phone) return;
    const newLead: Lead = {
      id:`L${String(leads.length+1).padStart(3,"0")}`,
      name:leadForm.name!, company:leadForm.company||"", email:leadForm.email||"", phone:leadForm.phone!,
      propertyType:leadForm.propertyType||"Commercial", location:leadForm.location||"Tardeo",
      budgetMin:leadForm.budgetMin||0, budgetMax:leadForm.budgetMax||0, source:leadForm.source||"Website",
      assignedTo:leadForm.assignedTo||"Aarav", priority:(leadForm.priority as LeadPriority)||"Medium",
      status:(leadForm.status as LeadStatus)||"New", notes:leadForm.notes||"",
      nextFollowUp:leadForm.nextFollowUp||new Date(Date.now()+86400000).toISOString(),
      followUpType:(leadForm.followUpType as FollowUpType)||"Phone Call",
      avatar:leadForm.name!.split(" ").map(n=> n[0]).join("").slice(0,2).toUpperCase(),
      createdAt:new Date().toISOString()
    };
    let savedLead: Lead;
    try {
      const response = await apiFetch("/api/leads", {
        method: "POST",
        body: JSON.stringify({
          fullName: newLead.name, company: newLead.company || undefined, email: newLead.email || undefined,
          phone: newLead.phone || undefined, source: newLead.source, notes: newLead.notes || undefined,
          status: ({ New:"NEW", Contacted:"CONTACTED", "Follow-up":"FOLLOW_UP", Qualified:"INTERESTED", Negotiation:"NEGOTIATION", Converted:"CONVERTED", Lost:"LOST" }[newLead.status] ?? "NEW"),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to save lead");
      savedLead = toLead(data.data as ApiLead);
      setLeads(current => [savedLead, ...current]);
      pushRealtimeNotification("New Lead Created", `${savedLead.name}${savedLead.company ? ` (${savedLead.company})` : ""} was added to CRM`);
    } catch (error) {
      setNotifications(current => [{ id:Date.now().toString(), title:"Lead Creation Failed", message:error instanceof Error ? error.message : "Unable to save lead", text:error instanceof Error ? error.message : "Unable to save lead", time:"Just now", unread:true, createdAt:new Date().toISOString() }, ...current]);
      return;
    }
    // Auto-create the selected follow-up only after the lead has been persisted.
    if(newLead.nextFollowUp){
      const d = new Date(newLead.nextFollowUp);
      const fu: FollowUp = {
        id:"", leadId:savedLead.id, leadName:newLead.name,
        company:newLead.company, property:`${newLead.propertyType} - ${newLead.location}`,
        type:newLead.followUpType, date:d.toISOString().split("T")[0], time:leadFollowUpTime || "10:00 AM",
        assignedTo:newLead.assignedTo, priority:newLead.priority, status:"Scheduled", notes:`Follow up for ${newLead.name}`
      };
      try {
        const response = await apiFetch("/api/followups", { method:"POST", body:JSON.stringify({ leadId:fu.leadId, leadName:fu.leadName, company:fu.company || undefined, property:fu.property || undefined, type:fu.type, date:fu.date, time:fu.time, assignedTo:fu.assignedTo, priority:fu.priority, status:fu.status, notes:fu.notes }) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Unable to create follow-up");
        const savedFollowUp = toFollowUp(data.data as ApiFollowUp);
        setFollowUps(current => [savedFollowUp, ...current]);
      } catch (error) { setNotifications(current => [{ id:Date.now().toString(), title:"Follow-up Warning", message:error instanceof Error ? error.message : "Lead was saved, but its follow-up could not be created", text:error instanceof Error ? error.message : "Lead was saved, but its follow-up could not be created", time:"Just now", unread:true, createdAt:new Date().toISOString() }, ...current]); }
    }
    setShowAddLead(false);
    setLeadFollowUpTime("10:00 AM");
    setLeadForm({ propertyType:"Commercial", location:"Tardeo", source:"Website", priority:"Medium", status:"New", followUpType:"Phone Call", assignedTo:"Aarav" });
  };

  const handleScheduleFollowUp = async () => {
    if(!followUpForm.leadName) { setNotifications([{ id: Date.now().toString(), title:"Missing Lead", message:"Select a lead before scheduling a follow-up.", text: "Select a lead before scheduling a follow-up.", time: "Just now", unread: true, createdAt:new Date().toISOString() }, ...notifications]); return; }
    const fu: FollowUp = {
      id:`F${String(followUps.length+1).padStart(3,"0")}`, leadId:followUpForm.leadId||"", leadName:followUpForm.leadName!,
      company:followUpForm.company||"", property:followUpForm.property||"", type:(followUpForm.type as FollowUpType)||"Phone Call",
      date:followUpForm.date||new Date().toISOString().split("T")[0], time:followUpForm.time||"10:00 AM",
      assignedTo:followUpForm.assignedTo||"Aarav", priority:(followUpForm.priority as LeadPriority)||"Medium",
      status:"Scheduled", notes:followUpForm.notes||""
    };
    try {
      const response = await apiFetch("/api/followups", { method: "POST", body: JSON.stringify({ leadId: fu.leadId || undefined, leadName: fu.leadName, company: fu.company || undefined, property: fu.property || undefined, type: fu.type, date: fu.date, time: fu.time, assignedTo: fu.assignedTo, priority: fu.priority, status: fu.status, notes: fu.notes || undefined }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.message || "Unable to schedule follow-up");
      const savedFollowUp = toFollowUp(data.data as ApiFollowUp);
      setFollowUps(current => [savedFollowUp, ...current]);
      pushRealtimeNotification("Follow-up Scheduled", `Follow-up with ${fu.leadName} scheduled on ${fu.date}`);
      setShowFollowUpModal(false); setFollowUpForm({ type:"Phone Call", priority:"Medium", assignedTo:"Aarav" });
    } catch (error) { setNotifications([{ id: Date.now().toString(), title:"Schedule Failed", message:error instanceof Error ? error.message : "Unable to schedule follow-up", text: error instanceof Error ? error.message : "Unable to schedule follow-up", time: "Just now", unread: true, createdAt:new Date().toISOString() }, ...notifications]); }
  };

  const handleCreateClient = async () => {
    setClientModalError(null);
    const businessName = (clientForm.businessName || "").trim();
    const contactName = (clientForm.name || "").trim();
    const primaryName = businessName || contactName;

    if (!primaryName) {
      setClientModalError("Please enter a Business Name or Contact Name.");
      return;
    }

    setClientSubmitting(true);
    try {
      const response = await apiFetch("/api/clients", {
        method: "POST",
        body: JSON.stringify({
          name: contactName || businessName,
          company: businessName || contactName,
          businessName: businessName || contactName,
          email: clientForm.email?.trim() || undefined,
          phone: clientForm.phone?.trim() || "N/A",
          gstNumber: clientForm.gstin?.trim() || undefined,
          gstin: clientForm.gstin?.trim() || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to save client");
      const newClient = toClient(data.data);
      setClients(current => [newClient, ...current]);
      pushRealtimeNotification("Client Onboarded", `${newClient.businessName || newClient.name} was added to CRM`);
      setShowCreateClient(false);
      setClientModalError(null);
      setClientForm({ state: "27-Maharashtra" });
      setToastMessage("Client created successfully.");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "Unable to save client";
      setClientModalError(errMsg);
      setToastMessage(`Error: ${errMsg}`);
      setNotifications(current => [{
        id: Date.now().toString(),
        title: "Client Failed",
        message: errMsg,
        text: errMsg,
        time: "Just now",
        unread: true,
        createdAt: new Date().toISOString(),
      }, ...current]);
    } finally {
      setClientSubmitting(false);
    }
  };

  const calculateInvoiceTotals = (items: InvoiceItem[], place: string) => {
    const subtotal = items.reduce((s,it)=> s + (it.qty*it.rate*(1-it.discount/100)),0);
    const gstTotal = items.reduce((s,it)=> s + (it.qty*it.rate*(1-it.discount/100)*it.gst/100),0);
    const isMaharashtra = place.startsWith("27");
    const cgst = isMaharashtra ? gstTotal/2 : 0;
    const sgst = isMaharashtra ? gstTotal/2 : 0;
    const igst = isMaharashtra ? 0 : gstTotal;
    const total = subtotal + gstTotal;
    return { subtotal, gstTotal, cgst, sgst, igst, total };
  };

  const handleSaveInvoice = async (asDraft:boolean=false) => {
    const items = newInvoice.items as InvoiceItem[];
    const calc = calculateInvoiceTotals(items, newInvoice.placeOfSupply||"27-Maharashtra");
    const inv: Invoice = {
      id:`INV${String(invoices.length+1).padStart(2,"0")}`,
      number:newInvoice.number||`INV-2026-${String(invoices.length+1).padStart(3,"0")}`,
      clientId:newInvoice.clientId||"", clientName:newInvoice.clientName||clients[0]?.businessName||"Unknown",
      date:newInvoice.date||new Date().toISOString().split("T")[0],
      dueDate:newInvoice.dueDate||new Date(Date.now()+30*86400000).toISOString().split("T")[0],
      placeOfSupply:newInvoice.placeOfSupply||"27-Maharashtra",
      items, subtotal:calc.subtotal, total:calc.total, gstTotal:calc.gstTotal,
      cgst:calc.cgst, sgst:calc.sgst, igst:calc.igst,
      status: asDraft ? "Draft" : "Sent", amountPaid:newInvoice.amountPaid||0
    };
    try {
      if (!inv.clientId) throw new Error("Choose a client before saving an invoice");
      const response = await apiFetch("/api/invoices", {
        method: "POST",
        body: JSON.stringify({
          invoiceNumber: inv.number,
          clientId: inv.clientId,
          clientName: inv.clientName,
          total: inv.total,
          paidAmount: inv.amountPaid,
          dueDate: new Date(inv.dueDate).toISOString(),
          items: inv.items,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to save invoice");
      setInvoices([{ ...inv, id: data.data.id, createdByName: data.data.created_by_name ?? null }, ...invoices]);
      pushRealtimeNotification("Invoice Created", `Invoice #${inv.number} for ${inv.clientName} (₹${inv.total.toLocaleString()})`);
      setToastMessage(asDraft ? "Invoice draft saved." : "Invoice created successfully.");
    } catch (error) {
      if (error instanceof Error && error.message === "Choose a client before saving an invoice") {
        setNotifications([{ id: Date.now().toString(), title:"Missing Client", message:error.message, text: error.message, time: "Just now", unread: true, createdAt:new Date().toISOString() }, ...notifications]);
        return;
      }
      setInvoices([inv, ...invoices]);
      pushRealtimeNotification("Invoice Saved", `Invoice #${inv.number} for ${inv.clientName} saved`);
      setToastMessage(asDraft ? "Invoice draft saved locally." : "Invoice saved locally.");
      setNotifications([{ id: Date.now().toString(), title:"Saved Locally", message:"Invoice saved locally. It will sync when Neon is available.", text: "Invoice saved locally. It will sync when Neon is available.", time: "Just now", unread: true, createdAt:new Date().toISOString() }, ...notifications]);
    }
    setCurrentPage("invoices");
    setNewInvoice({
      number:`INV-2026-${String(invoices.length+2).padStart(3,"0")}`,
      date:new Date().toISOString().split("T")[0],
      dueDate:new Date(Date.now()+30*86400000).toISOString().split("T")[0],
      placeOfSupply:"27-Maharashtra",
      items:[{id:"1", name:"", hsn:"", qty:1, unit:"Nos", rate:0, discount:0, gst:18}],
      amountPaid:0, clientId:"", clientName:"", status:"Draft"
    });
  };

  // Professional SaaS Theme Palette matching screenshot
  const bgMain = isDark ? "bg-[#090d16]" : "bg-[#f8fafc]";
  const bgCard = isDark ? "bg-[#0f172a] border-slate-800 text-white shadow-sm" : "bg-white border-slate-200/80 text-slate-900 shadow-sm";
  const bgSidebar = "bg-[#0b101b] border-slate-800/80 text-slate-300";
  const textMain = isDark ? "text-slate-100" : "text-slate-900";
  const textMuted = isDark ? "text-slate-400" : "text-slate-500";
  const borderC = isDark ? "border-slate-800" : "border-slate-200/80";
  const inputCls = isDark ? "bg-[#0f172a] border-slate-800 text-white placeholder-slate-500 focus:border-slate-600" : "bg-slate-50/80 border-slate-200 text-slate-900 placeholder-slate-400 shadow-xs focus:border-slate-400";
  const textPrimary = isDark ? "text-slate-100" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-300" : "text-slate-600";
  const bgMuted = isDark ? "bg-slate-800" : "bg-slate-100";
  const pageTitle = ({
    dashboard: "Overview",
    sows: "Scope of Work",
    leads: "Leads",
    followups: "Follow-ups",
    invoices: "Invoices",
    "invoices/new": "Create invoice",
    quotations: "Quotations",
    clients: "Clients",
    developers: "Developers & projects",
    payments: "Payments",
    tasks: "Company tasks",
    users: "Team & Users",
    "audit-logs": "Audit logs",
    vault: "Credentials vault",
    settings: "Admin settings",
  } as Record<string, string>)[currentPage] ?? "Workspace";
  const logout = () => {
    localStorage.removeItem("zootechx_token");
    localStorage.removeItem("zootechx_user");
    setIsLoggedIn(false);
    setUserRole("");
    setCurrentUser(null);
  };
  const exportCsv = (filename: string, rows: Array<Record<string, string | number>>) => {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const content = [headers.join(","), ...rows.map((row) => headers.map((header) => `"${String(row[header] ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([content], { type: "text/csv" }));
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  if (sowToken) {
    return <PublicSowViewer token={sowToken} onBack={() => { window.location.href = "/"; }} />;
  }
if (authChecking) {
  return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Checking your session…</div>;
}
if (!isLoggedIn) {
  return (
    <Login
      onLoginSuccess={(token, user) => {
        setCurrentUser(user as AuthUser);
        setIsLoggedIn(true);
        setUserRole(user.role);
      }}
    />
  );
}
if (userRole === "SALES") {
  return <SalesDashboard onLogout={logout} dark={isDark} onToggleTheme={toggleTheme} currentUser={currentUser} />;
}
if (userRole === "DEVELOPER") {
  return <DeveloperWorkspace onLogout={logout} dark={isDark} onToggleTheme={toggleTheme} currentUser={currentUser} />;
}
if (userRole === "SUB_ADMIN") {
  return (
    <SubAdminDashboard onLogout={logout} dark={isDark} onToggleTheme={toggleTheme} currentUser={currentUser} />
  );
}
if (userRole === "DIGITAL_MARKETING") {
  return (
    <DigitalMarketingWorkspace
      onLogout={logout}
      dark={isDark}
      onToggleTheme={toggleTheme}
      currentUser={currentUser}
    />
  );
}
  return (
    <div className={`luxury-app crm-shell ${isDark ? "dark-theme" : "light-theme"} premium-dashboard h-screen w-screen overflow-hidden font-sans antialiased flex ${bgMain} ${textMain} transition-colors duration-200`}>
      

      {/* SIDEBAR */}
      <aside className={`crm-sidebar w-[260px] shrink-0 ${sidebarOpen ? "hidden lg:flex" : "hidden"} flex-col bg-white dark:bg-[#0c1017] text-slate-700 dark:text-slate-300 border-r border-slate-200/80 dark:border-slate-800 h-screen z-20 select-none transition-all duration-300`}>
        <div className="px-4 py-3.5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <ZootechXLogo variant="full" size="sm" dark={isDark} subtitle="ERP PLATFORM" />
        </div>

        <nav className="crm-navigation flex-1 px-3 py-3 space-y-4 overflow-y-auto" aria-label="Primary navigation">
          {/* MENU */}
          <div>
            <div className="px-3.5 pb-2 text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8] dark:text-slate-500">
              MENU
            </div>
            <div className="space-y-1">
              {[
                { id:"dashboard", label:"Dashboard", icon:LayoutDashboard },
                { id:"leads", label:"Leads Pipeline", icon:UserPlus },
                { id:"followups", label:"Follow-ups", icon:BellRing },
                { id:"invoices", label:"Invoices", icon:FileText },
                { id:"invoices/new", label:"Create Invoice", icon:Plus, isNew:true },
                { id:"payments", label:"Payments", icon:CreditCard },
                { id:"quotations", label:"Quotations", icon:FileQuestion },
                { id:"sows", label:"Scope of Work (SOW)", icon:FileText },
              ].map(item=>{
                const active = currentPage===item.id;
                return (
                  <button key={item.id} onClick={()=> setCurrentPage(item.id)} aria-current={active ? "page" : undefined}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
                      active 
                        ? isDark
                          ? "bg-[#3758F9]/15 text-[#5475F9] font-semibold shadow-xs"
                          : "bg-[#ECF2FE] text-[#3758F9] font-semibold shadow-xs"
                        : isDark
                          ? "text-slate-400 hover:text-white hover:bg-slate-800/60"
                          : "text-[#475467] hover:text-[#1D2939] hover:bg-[#F2F4F7]"
                    }`}>
                    <item.icon size={17} className={active ? (isDark ? "text-[#5475F9]" : "text-[#3758F9]") : (isDark ? "text-slate-400" : "text-[#667085]")} />
                    <span className="flex-1 text-left truncate">{item.label}</span>
                    {item.isNew ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E8F8EE] text-[#059669] dark:bg-emerald-500/10 dark:text-emerald-400">
                        NEW
                      </span>
                    ) : null}
                  </button>
                )
              })}
            </div>
          </div>

          {/* WORKSPACE */}
          <div>
            <div className="px-3.5 pb-2 text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8] dark:text-slate-500">
              WORKSPACE
            </div>
            <div className="space-y-1">
              {[
                { id:"clients", label:"Clients", icon:Users },
                { id:"developers", label:"Developers & Projects", icon:Briefcase },
                { id:"marketing", label:"Marketing", icon:Megaphone },
                { id:"tasks", label:"Company Tasks", icon:CheckSquare },
              ].map(item=>{
                const active = currentPage===item.id;
                return (
                  <button key={item.id} onClick={()=> setCurrentPage(item.id)} aria-current={active ? "page" : undefined}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
                      active 
                        ? isDark
                          ? "bg-[#3758F9]/15 text-[#5475F9] font-semibold shadow-xs"
                          : "bg-[#ECF2FE] text-[#3758F9] font-semibold shadow-xs"
                        : isDark
                          ? "text-slate-400 hover:text-white hover:bg-slate-800/60"
                          : "text-[#475467] hover:text-[#1D2939] hover:bg-[#F2F4F7]"
                    }`}>
                    <item.icon size={17} className={active ? (isDark ? "text-[#5475F9]" : "text-[#3758F9]") : (isDark ? "text-slate-400" : "text-[#667085]")} />
                    <span className="flex-1 text-left truncate">{item.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* ADMINISTRATION */}
          <div>
            <div className="px-3.5 pb-2 text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8] dark:text-slate-500">
              ADMINISTRATION
            </div>
            <div className="space-y-1">
              {[
                { id:"users", label:"Team & Users", icon:ShieldCheck },
                { id:"vault", label:"Credentials Vault", icon:KeyRound },
                { id:"audit-logs", label:"Audit Logs", icon:Shield },
                { id:"settings", label:"Admin Settings", icon:Settings },
              ].map(item=>{
                const active = currentPage===item.id;
                return (
                  <button key={item.id} onClick={()=> setCurrentPage(item.id)} aria-current={active ? "page" : undefined}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
                      active 
                        ? isDark
                          ? "bg-[#3758F9]/15 text-[#5475F9] font-semibold shadow-xs"
                          : "bg-[#ECF2FE] text-[#3758F9] font-semibold shadow-xs"
                        : isDark
                          ? "text-slate-400 hover:text-white hover:bg-slate-800/60"
                          : "text-[#475467] hover:text-[#1D2939] hover:bg-[#F2F4F7]"
                    }`}>
                    <item.icon size={17} className={active ? (isDark ? "text-[#5475F9]" : "text-[#3758F9]") : (isDark ? "text-slate-400" : "text-[#667085]")} />
                    <span className="flex-1 text-left truncate">{item.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </nav>
        <div className="p-3 border-t border-slate-200/80 dark:border-slate-800 space-y-2">
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
            <div className="h-8 w-8 rounded-lg font-bold flex items-center justify-center text-xs shrink-0 bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs">
              {currentUser?.name ? currentUser.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() : "SA"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-bold truncate leading-tight text-slate-900 dark:text-white">{currentUser?.name || "Super Admin"}</p>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              </div>
              <p className="text-[10px] truncate leading-tight text-slate-500 dark:text-slate-400">{currentUser?.email || "root@zootechx"}</p>
            </div>
          </div>
          <button onClick={logout} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition"><LogOut size={15}/><span>Sign out</span></button>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex-1 min-w-0 min-h-0 flex flex-col">
        {/* HEADER - Exact TailAdmin Layout matching demo.tailadmin.com */}
        <header className={`crm-topbar w-full h-[68px] sticky top-0 z-30 flex items-center justify-between gap-4 px-4 sm:px-6 transition-colors duration-200 border-b ${
          isDark
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
              <Search size={16} className={`absolute left-3.5 ${searchQuery ? "text-indigo-500" : "text-slate-400"} transition-colors pointer-events-none`} />
              <input
                value={searchQuery}
                onFocus={() => setIsSearchOpen(true)}
                onChange={(e) => { setSearchQuery(e.target.value); setIsSearchOpen(true); }}
                placeholder="Search or type command..."
                className={`w-full h-10 pl-10 pr-14 rounded-xl border text-sm transition-all outline-none shadow-2xs ${
                  isDark
                    ? "bg-slate-900/90 border-slate-800 text-slate-100 placeholder-slate-500 focus:border-indigo-500/80 focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20"
                    : "bg-slate-50/70 border-slate-200/90 text-slate-900 placeholder-slate-400 hover:bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
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
                <div className={`absolute top-12 left-0 w-full rounded-2xl border shadow-2xl z-30 max-h-[320px] overflow-auto ${bgCard} p-2`}>
                  {searchMatches.leads.length > 0 && <div><div className={`px-2 pt-1 pb-1.5 text-[10px] font-semibold uppercase tracking-widest ${textMuted}`}>Leads</div>{searchMatches.leads.map(lead => <button key={lead.id} onClick={()=> { setSelectedLead(lead); setSearchQuery(""); setIsSearchOpen(false); setCurrentPage("leads"); }} className={`w-full text-left p-2.5 rounded-xl flex items-center gap-3 hover:${isDark?"bg-white/5":"bg-slate-50"}`}><div className="h-8 w-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[11px] font-bold">{lead.avatar}</div><div><div className="text-[13px] font-medium">{lead.name}</div><div className={`text-[11px] ${textMuted}`}>{lead.company || lead.email}</div></div></button>)}</div>}
                  {searchMatches.followUps.length > 0 && <div><div className={`px-2 pt-2 pb-1.5 text-[10px] font-semibold uppercase tracking-widest ${textMuted}`}>Follow-ups</div>{searchMatches.followUps.map(followUp => <button key={followUp.id} onClick={()=> { setSearchQuery(""); setIsSearchOpen(false); setCurrentPage("followups"); }} className={`w-full text-left p-2.5 rounded-xl flex items-center gap-3 hover:${isDark?"bg-white/5":"bg-slate-50"}`}><div className={`h-8 w-8 rounded-xl flex items-center justify-center ${isDark?"bg-white/5":"bg-slate-100"}`}><BellRing size={14}/></div><div><div className="text-[13px] font-medium">{followUp.leadName}</div><div className={`text-[11px] ${textMuted}`}>{followUp.type} · {followUp.company}</div></div></button>)}</div>}
                  {searchMatches.clients.length > 0 && <div><div className={`px-2 pt-2 pb-1.5 text-[10px] font-semibold uppercase tracking-widest ${textMuted}`}>Clients</div>{searchMatches.clients.map(client => <button key={client.id} onClick={()=> { setSearchQuery(""); setIsSearchOpen(false); setCurrentPage("clients"); }} className={`w-full text-left p-2.5 rounded-xl flex items-center gap-3 hover:${isDark?"bg-white/5":"bg-slate-50"}`}><div className="h-8 w-8 rounded-xl bg-emerald-600/10 text-emerald-400 flex items-center justify-center"><Users size={14}/></div><div><div className="text-[13px] font-medium">{client.businessName}</div><div className={`text-[11px] ${textMuted}`}>{client.name || client.email}</div></div></button>)}</div>}
                  {searchMatches.invoices.length > 0 && <div><div className={`px-2 pt-2 pb-1.5 text-[10px] font-semibold uppercase tracking-widest ${textMuted}`}>Invoices</div>{searchMatches.invoices.map(invoice => <button key={invoice.id} onClick={()=> { setSearchQuery(""); setIsSearchOpen(false); setCurrentPage("invoices"); }} className={`w-full text-left p-2.5 rounded-xl flex items-center gap-3 hover:${isDark?"bg-white/5":"bg-slate-50"}`}><div className="h-8 w-8 rounded-xl bg-violet-600/10 text-violet-400 flex items-center justify-center"><FileText size={14}/></div><div><div className="text-[13px] font-medium">{invoice.clientName}</div><div className={`text-[11px] ${textMuted}`}>{invoice.number} · ₹{invoice.total.toLocaleString()}</div></div></button>)}</div>}
                  {searchResultCount===0 && <div className={`p-3 text-[13px] ${textMuted}`}>No matching leads, follow-ups, clients, or invoices</div>}
                </div>
              )}
            </div>
          </div>

          <div className="flex-1" />

          {/* Right: Actions, Theme, Notifications, Profile */}
          <div className="flex items-center gap-3">
            {/* New dropdown */}
            <div className="relative header-new-dropdown">
              <button
                onClick={() => setNewDropdownOpen(!newDropdownOpen)}
                className="h-10 px-3.5 rounded-xl bg-slate-900 hover:bg-black dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm hover:shadow transition-all"
              >
                <Plus size={15} /> <span>New</span>
              </button>
              {newDropdownOpen && (
                <div className={`absolute right-0 top-12 w-60 rounded-2xl border shadow-2xl z-30 p-2 ${bgCard}`}>
                  {[
                    { label:"New Invoice", desc:"Create GST invoice", icon:FileText, action:()=> { setCurrentPage("invoices/new"); setNewDropdownOpen(false);} },
                    { label:"Provision User", desc:"Create sales or team login", icon:Users, action:()=> { setSettingsTab("users"); setCurrentPage("settings"); setNewDropdownOpen(false);} },
                    { label:"New Client", desc:"Add enterprise client", icon:UserPlus, action:()=> { setShowCreateClient(true); setClientModalError(null); setNewDropdownOpen(false);} },
                    { label:"New Lead", desc:"Add potential client", icon:UserPlus, action:()=> { setShowAddLead(true); setNewDropdownOpen(false);} },
                    { label:"Scope of Work", desc:"Draft & send SOW proposal", icon:FileText, action:()=> { setCurrentPage("sows"); setNewDropdownOpen(false);} },
                    { label:"Company Task", desc:"Assign cross-functional task", icon:CheckSquare, action:()=> { setCurrentPage("tasks"); setNewDropdownOpen(false);} },
                    { label:"Admin Settings", desc:"SOW template & company setup", icon:Settings, action:()=> { setCurrentPage("settings"); setNewDropdownOpen(false);} },
                    { label:"Follow Up", desc:"Schedule follow-up", icon:BellRing, action:()=> { setShowFollowUpModal(true); setNewDropdownOpen(false);} },
                    { label:"Store Credential", desc:"Save key or password to vault", icon:KeyRound, action:()=> { setCurrentPage("vault"); setNewDropdownOpen(false);} },
                    { label:"AI Generate Invoice", desc:"Auto from conversation", icon:Wand2, action:()=> { setCurrentPage("invoices/new"); setNewDropdownOpen(false);} },
                  ].map(i=> (
                    <button key={i.label} onClick={i.action} className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left hover:${isDark?"bg-white/5":"bg-slate-100"} transition`}>
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${isDark?"bg-white/10 text-white":"bg-slate-100 text-slate-900 font-bold"}`}><i.icon size={15}/></div>
                      <div><div className="text-[13px] font-semibold">{i.label}</div><div className={`text-[11px] ${textMuted}`}>{i.desc}</div></div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Circular Theme Toggle Button (TailAdmin style) */}
            <button
              onClick={() => toggleTheme()}
              title={isDark ? "Switch to Day Mode" : "Switch to Night Mode"}
              className="h-10 w-10 rounded-full border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 shadow-2xs transition"
            >
              {isDark ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-slate-600" />}
            </button>

            {/* Circular Notification Bell with Orange Dot (TailAdmin style) */}
            <div ref={notifContainerRef} className="relative">
              <button
                onClick={() => { setNotifOpen(!notifOpen); setNotificationTab("unread"); }}
                title="Notifications"
                aria-label="View notifications"
                className="h-10 w-10 rounded-full border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 shadow-2xs relative transition"
              >
                <Bell size={18} />
                {notifications.filter(n => n.unread).length > 0 && (
                  <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#f97316] ring-2 ring-white dark:ring-slate-900" />
                )}
              </button>
              {notifOpen && (
                <div className={`absolute right-0 top-12 w-[360px] rounded-2xl border shadow-2xl z-40 ${bgCard} overflow-hidden`}>
                  <div className={`p-4 border-b ${borderC}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="font-bold text-[14px]">Notifications</div>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          LIVE
                        </span>
                      </div>
                      {notificationTab === "unread" && (
                        <button onClick={() => void markAllNotificationsRead()} className="text-[11px] font-semibold text-indigo-400 hover:underline">
                          Mark all as read
                        </button>
                      )}
                    </div>
                    <div className="mt-3 flex gap-4 text-[12px] font-semibold">
                      <button onClick={() => setNotificationTab("unread")} className={notificationTab === "unread" ? "text-indigo-400 font-bold" : textMuted}>
                        Unread ({notifications.filter(n => n.unread).length})
                      </button>
                      <button onClick={() => setNotificationTab("all")} className={notificationTab === "all" ? "text-indigo-400 font-bold" : textMuted}>
                        All ({notifications.length})
                      </button>
                    </div>
                  </div>
                  <div className="max-h-[360px] overflow-auto">
                    {bellNotifications.map(n => (
                      <div
                        key={n.id}
                        onClick={() => handleNotificationClick(n)}
                        className={`p-3.5 flex gap-3 border-b last:border-0 cursor-pointer transition hover:bg-indigo-500/5 ${borderC} ${
                          n.unread ? (isDark ? "bg-indigo-950/20" : "bg-white") : (isDark ? "bg-[#11111b]" : "bg-slate-50")
                        }`}
                      >
                        <div className={`h-2 w-2 mt-2 rounded-full shrink-0 ${n.unread ? "bg-indigo-500 animate-pulse" : "bg-transparent"}`} />
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-medium leading-snug">{n.text}</div>
                          <div className={`text-[11px] ${textMuted} mt-1 flex items-center justify-between`}>
                            <span>{n.time}</span>
                            {n.unread && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void markNotificationRead(n.id);
                                }}
                                className="text-[11px] text-indigo-400 hover:underline"
                              >
                                Mark as read
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {bellNotifications.length === 0 && (
                      <div className={`p-8 text-center text-[12px] ${textMuted}`}>
                        {notificationTab === "unread" ? "You’re all caught up 🎉" : "No notifications"}
                      </div>
                    )}
                  </div>
                  {notificationTab === "all" && (
                    <div className={`border-t p-3 ${borderC}`}>
                      <button onClick={() => void clearReadNotifications()} className={`w-full text-center text-[11px] font-semibold ${textMuted} hover:text-red-400 transition`}>
                        Clear all read
                      </button>
                    </div>
                  )}
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
                  {currentUser?.name ? currentUser.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() : "SA"}
                </div>
                <span className="hidden sm:inline text-sm font-semibold text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white transition">
                  {currentUser?.name?.split(" ")[0] || "Admin"}
                </span>
                <ChevronDown size={15} className={`text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-transform duration-200 ${userDropdownOpen ? "rotate-180" : ""}`} />
              </button>
              {userDropdownOpen && (
                <div className={`absolute right-0 top-12 w-56 rounded-2xl border shadow-2xl z-30 p-2 ${bgCard}`}>
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{currentUser?.name || "Super Admin"}</p>
                    <p className="text-[11px] text-slate-400 truncate">{currentUser?.email || "root@zootechx"}</p>
                  </div>
                  <button
                    onClick={() => { setCurrentPage("settings"); setUserDropdownOpen(false); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:${isDark ? "bg-white/5" : "bg-slate-100"} transition`}
                  >
                    <Settings size={14} />
                    <span>Account Settings</span>
                  </button>
                  <button
                    onClick={() => { logout(); setUserDropdownOpen(false); }}
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
        <main className={`crm-content flex-1 min-h-0 overflow-y-auto p-4 pb-20 lg:p-6 ${bgMain} ${textMain} transition-colors duration-200`}>
          {/* DASHBOARD */}
          {currentPage==="dashboard" && (
            <DashboardPage>
            <div className="space-y-6 max-w-[1600px] mx-auto dashboard-reference">
              <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .35 }} className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className={`text-2xl lg:text-3xl font-bold tracking-tight ${textPrimary}`}>Business overview</h1>
                  </div>
                  <p className={`mt-1 text-xs ${textMuted}`}>Current lead, follow-up, and billing activity from your CRM.</p>
                </div>
                <button onClick={()=> setShowAddLead(true)} className="flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-semibold text-white shadow-sm shadow-indigo-600/25 transition hover:bg-indigo-700 active:scale-[0.98]"><Plus size={16}/>Add New Lead</button>
              </motion.section>

              {/* KPI Stat Cards - TailAdmin Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {[
                  { label:"Active Pipeline Leads", value:kpis.total, icon:UserPlus, trend:"+12%", positive:true },
                  { label:"Total Invoiced", value:`₹${(kpis.totalInvoiced/100000).toFixed(1)}L`, icon:CreditCard, trend:"+18.4%", positive:true },
                  { label:"Pending Settlements", value:kpis.pending, icon:Clock, trend:"-2.5%", positive:false },
                  { label:"Overdue Actions", value:kpis.overdue, icon:AlertCircle, trend:kpis.overdue>0 ? "Needs action" : "Clear", positive:kpis.overdue===0 },
                ].map(k=> (
                  <div key={k.label} className="tail-card p-5 md:p-6">
                    <div className="tail-metric-icon mb-5">
                      <k.icon size={24} className="text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{k.label}</p>
                    <div className="mt-3 flex items-end justify-between">
                      <h4 className="text-2xl lg:text-3xl font-bold text-slate-800 dark:text-white">{k.value}</h4>
                      <div className="flex items-center gap-1.5">
                        <span className={k.positive ? "tail-badge-success" : "tail-badge-danger"}>{k.trend}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Chart Grid */}
              <div className="grid lg:grid-cols-3 gap-4 md:gap-6">
                <div className="tail-card p-5 sm:p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-sm text-slate-800 dark:text-white">Pipeline Stages</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Lead volume per funnel tier</div>
                    </div>
                    <button onClick={()=> setCurrentPage("leads")} className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">View Leads</button>
                  </div>
                  <div className="h-[210px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={pipelineData} layout="vertical">
                        <defs>
                          <linearGradient id="barPipelineGrad" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#4f46e5" />
                            <stop offset="100%" stopColor="#06b6d4" />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={isDark?"#1e293b":"#f1f5f9"} horizontal={false}/>
                        <XAxis type="number" stroke={isDark?"#64748b":"#94a3b8"} fontSize={11} tickLine={false}/>
                        <YAxis dataKey="name" type="category" width={80} stroke={isDark?"#64748b":"#94a3b8"} fontSize={11} tickLine={false}/>
                        <Tooltip contentStyle={{ backgroundColor: isDark ? "#0f172a" : "#ffffff", borderColor: isDark ? "#1e293b" : "#e2e8f0", borderRadius: "12px", fontSize: "12px" }}/>
                        <Bar dataKey="value" fill="url(#barPipelineGrad)" radius={[0,8,8,0]}/>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="tail-card p-5 sm:p-6">
                  <div className="font-semibold text-sm text-slate-800 dark:text-white mb-0.5">Monthly Invoicing Run-rate</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-4">Revenue billed over trailing months</div>
                  <div className="h-[210px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={revenueData}>
                        <defs>
                          <linearGradient id="revenueAreaGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={isDark?"#1e293b":"#f1f5f9"}/>
                        <XAxis dataKey="month" stroke={isDark?"#64748b":"#94a3b8"} fontSize={11} tickLine={false}/>
                        <YAxis stroke={isDark?"#64748b":"#94a3b8"} fontSize={11} tickLine={false}/>
                        <Tooltip contentStyle={{ backgroundColor: isDark ? "#0f172a" : "#ffffff", borderColor: isDark ? "#1e293b" : "#e2e8f0", borderRadius: "12px", fontSize: "12px" }}/>
                        <Area type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={2.5} fill="url(#revenueAreaGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="tail-card p-5 sm:p-6">
                  <div className="font-semibold text-sm text-slate-800 dark:text-white mb-0.5">Settlement Health</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-4">Paid vs Pending vs Overdue</div>
                  <div className="h-[210px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={statusData} dataKey="value" innerRadius={50} outerRadius={78} paddingAngle={4}>
                          {statusData.map((entry,index)=><Cell key={index} fill={entry.color}/>)}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: isDark ? "#0f172a" : "#ffffff", borderColor: isDark ? "#1e293b" : "#e2e8f0", borderRadius: "12px", fontSize: "12px" }}/>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Lower Section */}
              <div className="grid lg:grid-cols-2 gap-4 md:gap-6">
                <div className="tail-card overflow-hidden">
                  <div className="p-4 sm:p-5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <div className="font-semibold text-sm text-slate-800 dark:text-white">Follow-ups Today ({todayFollowUps.length})</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Immediate high-priority touchpoints</div>
                    </div>
                    <button onClick={()=> setCurrentPage("followups")} className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">View All</button>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {todayFollowUps.slice(0,4).map(f=> (
                      <div key={f.id} className="p-4 flex items-center gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                        <div className="tail-metric-icon !h-9 !w-9 !rounded-xl text-indigo-600 dark:text-indigo-400"><Phone size={14}/></div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-slate-800 dark:text-white truncate">{f.leadName} • {f.type}</div>
                          <div className="text-[11px] text-slate-400 truncate mt-0.5">{f.time} • {f.property}</div>
                        </div>
                        <button onClick={()=> void handleCompleteFollowUp(f)} className="tail-btn-primary !py-1.5 !px-3 !text-[11px]"><Check size={12}/>Done</button>
                      </div>
                    ))}
                    {todayFollowUps.length===0 && <div className="p-10 text-center text-xs text-slate-400">All caught up! No pending follow-ups for today 🎉</div>}
                  </div>
                </div>

                <div className="tail-card overflow-hidden">
                  <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-sm text-slate-800 dark:text-white">Recent Inbound Leads</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Newest opportunities added to CRM</div>
                    </div>
                    <button onClick={()=> setCurrentPage("leads")} className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">View All Leads</button>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {leads.slice(0,4).map(l=> (
                      <div key={l.id} className="p-4 flex items-center gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                        <div className="h-9 w-9 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center justify-center text-xs font-bold shrink-0">{l.avatar}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-slate-800 dark:text-white truncate">{l.name}</div>
                          <div className="text-[11px] text-slate-400 truncate mt-0.5">{l.company || "Individual Client"} • {l.location}</div>
                        </div>
                        <span className={l.status==="New" ? "tail-badge-info" : l.status==="Follow-up" ? "tail-badge-warning" : "tail-badge-success"}>{l.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            </DashboardPage>
          )}

          {/* LEADS */}
          {currentPage==="leads" && (
            <LeadsPage>
            <div className="max-w-[1600px] mx-auto space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">Leads Intelligence</h1>
                  <p className="text-xs mt-1 text-slate-500 dark:text-slate-400">Manage qualified prospects, lead stages, and direct touchpoints.</p>
                </div>
                <div className="flex items-center gap-3">
                  {/* View Mode Toggle */}
                  <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
                    <button
                      onClick={() => setLeadViewMode("cards")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        leadViewMode === "cards" ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs" : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
                      }`}
                    >
                      Cards
                    </button>
                    <button
                      onClick={() => setLeadViewMode("table")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        leadViewMode === "table" ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs" : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
                      }`}
                    >
                      Table
                    </button>
                  </div>

                  <button onClick={() => exportCsv("zootechx-leads.csv", visibleLeads.map((lead) => ({ Name: lead.name, Company: lead.company, Email: lead.email, Phone: lead.phone, Status: lead.status, Source: lead.source })))} className="tail-btn-secondary"><Download size={14}/>Export</button>
                  <button onClick={()=> setShowAddLead(true)} className="tail-btn-primary"><Plus size={16}/>Add Lead</button>
                </div>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {[
                  { label:"Total Prospects", value:activeLeads.length, icon:UserPlus, color:"text-indigo-600 dark:text-indigo-400" },
                  { label:"New Inbound", value:leads.filter(l=> l.status==="New").length, icon:Sparkles, color:"text-blue-600 dark:text-blue-400" },
                  { label:"Follow-ups Today", value:todayFollowUps.length, icon:BellRing, color:"text-amber-600 dark:text-amber-400" },
                  { label:"Converted Clients", value:leads.filter(l=> l.status==="Converted").length, icon:ShieldCheck, color:"text-emerald-600 dark:text-emerald-400" },
                ].map(c=> (
                  <div key={c.label} className="tail-card p-5 md:p-6">
                    <div className="tail-metric-icon mb-4">
                      <c.icon size={22} className={c.color} />
                    </div>
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400">{c.label}</div>
                    <div className="text-2xl lg:text-3xl font-bold mt-1.5 text-slate-800 dark:text-white">{c.value}</div>
                  </div>
                ))}
              </div>

              {/* View Switch: CARDS */}
              {leadViewMode === "cards" && (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {visibleLeads.map(l => (
                    <motion.div
                      key={l.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ y: -3, transition: { duration: 0.2 } }}
                      className={`rounded-3xl border p-5 ${bgCard} shadow-sm hover:shadow-xl hover:border-indigo-500/40 transition-all flex flex-col justify-between`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-10 w-10 shrink-0 rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-cyan-500 text-white flex items-center justify-center text-xs font-bold shadow-md shadow-indigo-600/30">
                              {l.avatar}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className={`font-bold text-sm ${textPrimary} truncate`}>{l.name}</h3>
                              <div className={`text-xs mt-0.5 ${textMuted} truncate`}>{l.company || "Individual Client"}</div>
                            </div>
                          </div>
                          <span className={`shrink-0 inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                            l.priority === "High" ? (isDark ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : "bg-rose-50 text-rose-700 border-rose-200") :
                            l.priority === "Medium" ? (isDark ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-amber-50 text-amber-800 border-amber-200") :
                            (isDark ? "bg-slate-500/10 text-slate-400 border-slate-500/20" : "bg-slate-100 text-slate-700 border-slate-200")
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${
                              l.priority === "High" ? (isDark ? "bg-rose-400" : "bg-rose-600") :
                              l.priority === "Medium" ? (isDark ? "bg-amber-400" : "bg-amber-600") : (isDark ? "bg-slate-400" : "bg-slate-600")
                            }`} />
                            {l.priority}
                          </span>
                        </div>

                        <div className={`mt-4 space-y-1.5 text-xs ${textSecondary}`}>
                          {l.phone && (
                            <div className="flex items-center gap-2 truncate">
                              <Phone size={13} className="text-indigo-400 shrink-0" />
                              <span className="truncate">{l.phone}</span>
                            </div>
                          )}
                          {l.email && (
                            <div className="flex items-center gap-2 truncate">
                              <Mail size={13} className="text-indigo-400 shrink-0" />
                              <span className="truncate">{l.email}</span>
                            </div>
                          )}
                          {l.propertyType && (
                            <div className="flex items-center gap-2 truncate">
                              <Briefcase size={13} className="text-indigo-400 shrink-0" />
                              <span className="truncate">{l.propertyType} • {l.location}</span>
                            </div>
                          )}
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[10px]">
                          {l.source && <span className={`px-2 py-0.5 rounded-lg border ${borderC} ${bgMuted} font-medium`}>{l.source}</span>}
                          {l.assignedTo && <span className={`px-2 py-0.5 rounded-lg border ${borderC} ${bgMuted} font-medium ${textMuted}`}>Rep: {l.assignedTo}</span>}
                        </div>
                      </div>

                      <div className={`mt-4 pt-3 border-t ${borderC} space-y-2`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className={`text-[10px] font-bold uppercase tracking-wider shrink-0 ${textMuted}`}>Stage:</span>
                            <select
                              value={l.status}
                              onChange={e => void handleLeadStatusChange(l, e.target.value as LeadStatus)}
                              className={`h-7 rounded-lg border ${borderC} ${bgMuted} px-2 text-[11px] font-semibold ${textPrimary} outline-none`}
                            >
                              {(["New", "Contacted", "Follow-up", "Qualified", "Negotiation", "Lost", "Converted"] as LeadStatus[]).map(st => (
                                <option key={st} value={st} className={isDark ? "bg-[#121624] text-white" : "bg-white text-slate-900"}>{st}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {l.phone && (
                              <a href={`tel:${l.phone}`} title="Call Lead" className={`h-7 w-7 rounded-lg border ${borderC} flex items-center justify-center ${textSecondary} hover:${textPrimary} hover:${bgMuted} transition`}>
                                <Phone size={12} />
                              </a>
                            )}
                            {l.email && (
                              <a href={`mailto:${l.email}`} title="Email Lead" className={`h-7 w-7 rounded-lg border ${borderC} flex items-center justify-center ${textSecondary} hover:${textPrimary} hover:${bgMuted} transition`}>
                                <Mail size={12} />
                              </a>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-0.5">
                          <button
                            onClick={() => setSelectedLead(l)}
                            title="View Lead Details"
                            className={`h-8 rounded-xl border ${borderC} text-xs font-semibold ${textSecondary} hover:${textPrimary} hover:${bgMuted} transition flex items-center justify-center`}
                          >
                            Details
                          </button>
                          <button
                            onClick={() => void handleConvertLead(l)}
                            title="Convert to Client"
                            className="h-8 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-semibold shadow hover:opacity-95 transition flex items-center justify-center"
                          >
                            Convert
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  {visibleLeads.length === 0 && (
                    <div className={`col-span-full rounded-3xl border border-dashed p-14 text-center ${textMuted}`}>
                      No leads match your filter criteria.
                    </div>
                  )}
                </div>
              )}

              {/* View Switch: TABLE */}
              {leadViewMode === "table" && (
                <div className={`rounded-3xl border overflow-hidden ${bgCard} shadow-sm`}>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1000px] text-xs">
                      <thead className={`border-b ${borderC} ${bgMuted} text-[11px] ${textMuted} uppercase tracking-wider font-bold`}>
                        <tr>
                          <th className="text-left p-3.5">Lead</th>
                          <th className="text-left p-3.5">Company</th>
                          <th className="text-left p-3.5">Contact</th>
                          <th className="text-left p-3.5">Requirement</th>
                          <th className="text-left p-3.5">Source</th>
                          <th className="text-left p-3.5">Assigned</th>
                          <th className="text-left p-3.5">Priority</th>
                          <th className="text-left p-3.5">Status</th>
                          <th className="text-left p-3.5">Actions</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${borderC}`}>
                        {visibleLeads.map(l=> (
                          <tr key={l.id} className={`hover:${bgMuted} transition`}>
                            <td className="p-3.5 flex items-center gap-2">
                              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white flex items-center justify-center text-[11px] font-bold">{l.avatar}</div>
                              <span className={`font-semibold ${textPrimary}`}>{l.name}</span>
                            </td>
                            <td className="p-3.5">{l.company || "—"}</td>
                            <td className="p-3.5">
                              <div>{l.phone || "—"}</div>
                              <div className={`${textMuted} text-[11px] truncate max-w-[140px]`}>{l.email || ""}</div>
                            </td>
                            <td className="p-3.5">{l.propertyType} • {l.location}</td>
                            <td className="p-3.5"><span className={`px-2 py-0.5 rounded-lg ${bgMuted} text-[11px] font-medium`}>{l.source}</span></td>
                            <td className="p-3.5">{l.assignedTo}</td>
                            <td className="p-3.5">
                              <span className={`inline-flex items-center gap-1 font-semibold ${l.priority==="High"?(isDark?"text-rose-400":"text-rose-600"): l.priority==="Medium"?(isDark?"text-amber-400":"text-amber-600"):(isDark?"text-slate-400":"text-slate-600")}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${l.priority==="High"?(isDark?"bg-rose-400":"bg-rose-600"): l.priority==="Medium"?(isDark?"bg-amber-400":"bg-amber-600"):(isDark?"bg-slate-400":"bg-slate-600")}`}/>
                                {l.priority}
                              </span>
                            </td>
                            <td className="p-3.5">
                              <select
                                value={l.status}
                                onChange={e=> void handleLeadStatusChange(l, e.target.value as LeadStatus)}
                                className={`h-7 rounded-lg border ${borderC} ${bgMuted} px-2 text-[11px] font-semibold ${textPrimary} outline-none`}
                              >
                                {(["New", "Contacted", "Follow-up", "Qualified", "Negotiation", "Lost", "Converted"] as LeadStatus[]).map(status => <option key={status} value={status} className={isDark ? "bg-[#121624] text-white" : "bg-white text-slate-900"}>{status}</option>)}
                              </select>
                            </td>
                            <td className="p-3.5 flex items-center gap-1.5">
                              <button onClick={()=> setSelectedLead(l)} title="View Details" className={`h-7 px-2.5 rounded-lg border ${borderC} text-[11px] font-semibold hover:${bgMuted} transition`}>Details</button>
                              <button onClick={()=> void handleConvertLead(l)} className="h-7 px-2.5 rounded-lg bg-emerald-600 text-white text-[11px] font-semibold shadow hover:bg-emerald-500 transition">Convert</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            </LeadsPage>
          )}

          {/* FOLLOW-UPS */}
          {currentPage==="followups" && (
            <FollowUpsPage>
            <div className="max-w-[1600px] mx-auto space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><h1 className={`text-[22px] font-bold ${textPrimary}`}>Follow-ups</h1><p className={`text-[13px] ${textMuted}`}>Stay on top of conversations</p></div>
                <button onClick={()=> setShowFollowUpModal(true)} className="h-9 px-4 rounded-xl btn-dark-gradient text-white text-[13px] font-medium flex items-center gap-2"><Plus size={16}/>Schedule Follow-up</button>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label:"Today", value:todayFollowUps.length },
                  { label:"Upcoming", value:upcomingFollow },
                  { label:"Overdue", value:overdueFollow, danger:true },
                  { label:"Completed", value:completedFollow },
                ].map(c=> (
                  <div key={c.label} className={`rounded-2xl border p-4 ${bgCard} ${c.danger && c.value>0 ? "ring-1 ring-red-500/30" : ""}`}><div className={`text-[11px] ${textMuted} uppercase tracking-widest`}>{c.label}</div><div className={`text-[22px] font-bold mt-1 ${c.danger && c.value>0?"text-red-500":""}`}>{c.value}</div></div>
                ))}
              </div>

              <div className="flex items-center gap-2 overflow-x-auto">
                {["All","Today","Upcoming","Overdue","Completed","Contacted","Converted"].map(tab=> (
                  <button key={tab} onClick={()=> setFollowUpFilter(tab)} className={`h-8 px-3 rounded-full border text-[13px] whitespace-nowrap ${followUpFilter===tab? "bg-slate-900 text-white dark:bg-white dark:text-black border-transparent" : bgCard}`}>{tab}</button>
                ))}
              </div>

              <div className={`rounded-2xl border overflow-hidden ${bgCard}`}>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px]">
                    <thead className={`${isDark?"bg-[#0f0f1a]":"bg-slate-50"} border-b ${borderC} text-[11px] ${textMuted} uppercase tracking-widest`}><tr><th className="text-left p-3">Date</th><th className="text-left p-3">Time</th><th className="text-left p-3">Lead/Client</th><th className="text-left p-3">Property</th><th className="text-left p-3">Type</th><th className="text-left p-3">Assigned</th><th className="text-left p-3">Priority</th><th className="text-left p-3">Status</th><th className="text-left p-3">Actions</th></tr></thead>
                    <tbody className={`divide-y ${borderC}`}>
                      {filteredFollowUps.map(f=> (
                        <tr key={f.id} className={`hover:${isDark?"bg-[#1a1a2e]":"bg-slate-50"}`}>
                          <td className="p-3 text-[13px]">{f.date}</td>
                          <td className="p-3 text-[13px]">{f.time}</td>
                          <td className="p-3 text-[13px] font-medium">{f.leadName}<div className={`text-[11px] ${textMuted}`}>{f.company}</div></td>
                          <td className="p-3 text-[12px]">{f.property}</td>
                          <td className="p-3 text-[12px] flex items-center gap-1"><span className={`h-6 w-6 rounded-lg flex items-center justify-center ${isDark?"bg-[#23233a]":"bg-slate-100"}`}>{f.type==="Phone Call"?<Phone size={12}/>: f.type==="WhatsApp"?<MessageCircle size={12}/>: f.type==="Email"?<Mail size={12}/>:<Calendar size={12}/>}</span>{f.type}</td>
                          <td className="p-3 text-[12px]">{f.assignedTo}</td>
                          <td className="p-3 text-[11px]">{f.priority}</td>
                          <td className="p-3">
                            <select
                              value={f.status}
                              onChange={(e) => void handleUpdateFollowUpStatus(f.id, e.target.value)}
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
                              <option value="Scheduled" className={isDark ? "bg-[#121826] text-white" : "bg-white text-black"}>Scheduled</option>
                              <option value="Contacted" className={isDark ? "bg-[#121826] text-white" : "bg-white text-black"}>Contacted</option>
                              <option value="Completed" className={isDark ? "bg-[#121826] text-white" : "bg-white text-black"}>Completed</option>
                              <option value="Converted" className={isDark ? "bg-[#121826] text-white" : "bg-white text-black"}>Converted</option>
                              <option value="Rescheduled" className={isDark ? "bg-[#121826] text-white" : "bg-white text-black"}>Rescheduled</option>
                              <option value="Cancelled" className={isDark ? "bg-[#121826] text-white" : "bg-white text-black"}>Cancelled</option>
                              <option value="Overdue" className={isDark ? "bg-[#121826] text-white" : "bg-white text-black"}>Overdue</option>
                            </select>
                          </td>
                          <td className="p-3 flex gap-1">
                            {f.status !== "Completed" && (
                              <button onClick={()=> void handleCompleteFollowUp(f)} className="h-7 px-2 rounded-lg bg-emerald-600 text-white text-[11px]">Complete</button>
                            )}
                            <button onClick={()=> void handleDeleteFollowUp(f)} className={`h-7 w-7 rounded-lg border flex items-center justify-center ${bgCard}`} title="Delete follow-up"><Trash2 size={12}/></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            </FollowUpsPage>
          )}

          {/* INVOICES LIST */}
          {currentPage==="invoices" && (
            <InvoicesPage>
            <div className="max-w-[1600px] mx-auto space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className={`text-2xl font-bold tracking-tight ${textPrimary}`}>Invoices & Billing</h1>
                  <p className={`text-xs mt-1 ${textMuted} flex items-center gap-2`}><Sparkles size={12} className="text-violet-400"/>Automated tax calculations, client settlements, and reconciliation.</p>
                </div>
                <div className="flex items-center gap-2.5">
                  <button onClick={() => exportCsv("zootechx-invoices.csv", invoices.map((invoice) => ({ Invoice: invoice.number, Client: invoice.clientName, Date: invoice.date, Total: invoice.total, Status: invoice.status })))} className={`h-10 px-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${bgCard} hover:${bgMuted} transition`}><Download size={14}/>Export</button>
                  <button onClick={()=> setCurrentPage("invoices/new")} className="h-10 px-4 rounded-xl btn-dark-gradient text-white text-xs font-semibold flex items-center gap-2 shadow hover:opacity-95 transition"><Plus size={16}/>Create Invoice</button>
                </div>
              </div>

              {/* Invoices Summary Strip */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label:"Total Invoiced", value: `₹${(invoices.reduce((s,i)=> s + (Number(i.total)||0), 0)).toLocaleString()}`, color: textPrimary },
                  { label:"Paid Settlements", value: `₹${(invoices.reduce((s,i)=> s + (i.status === "Paid" ? Number(i.total) : (Number(i.amountPaid)||0)), 0)).toLocaleString()}`, color: isDark ? "text-emerald-400" : "text-emerald-600 font-bold" },
                  { label:"Pending Collection", value: `₹${Math.max(0, invoices.reduce((s,i)=> s + (i.status === "Paid" ? 0 : (Number(i.total) - (Number(i.amountPaid)||0))), 0)).toLocaleString()}`, color: isDark ? "text-amber-400" : "text-amber-600" },
                  { label:"Overdue Invoices", value: invoices.filter(i=> i.status === "Overdue").length, color: isDark ? "text-rose-400" : "text-rose-600" },
                ].map(stat => (
                  <div key={stat.label} className={`rounded-3xl border p-4 lg:p-5 ${bgCard} shadow-sm`}>
                    <div className={`text-[11px] font-bold uppercase tracking-wider ${textMuted}`}>{stat.label}</div>
                    <div className={`text-2xl lg:text-3xl font-bold mt-1.5 mono ${stat.color}`}>{stat.value}</div>
                  </div>
                ))}
              </div>

              <div className={`rounded-3xl border overflow-hidden ${bgCard} shadow-sm`}>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[850px] text-xs">
                    <thead className={`border-b ${borderC} ${bgMuted} text-[11px] ${textMuted} uppercase tracking-wider font-bold`}>
                      <tr>
                        <th className="text-left p-3.5">Invoice No</th>
                        <th className="text-left p-3.5">Client</th>
                        <th className="text-left p-3.5">Issue Date</th>
                        <th className="text-right p-3.5">Total Amount</th>
                        <th className="text-right p-3.5">Tax (GST)</th>
                        <th className="text-left p-3.5">Payment Status</th>
                        {userRole === "SUPER_ADMIN" && <th className="text-left p-3.5">Issued By</th>}
                        <th className="text-left p-3.5">Actions</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${borderC}`}>
                      {invoices.map(inv=> (
                        <tr key={inv.id} className={`hover:${isDark ? "bg-white/5" : "bg-zinc-50"} transition`}>
                          <td className={`p-3.5 font-bold mono ${isDark ? "text-white" : "text-black"}`}>{inv.number}</td>
                          <td className={`p-3.5 font-medium ${textPrimary}`}>
                            {inv.clientName && inv.clientName !== "Client"
                              ? inv.clientName
                              : clients.find((c) => c.id === inv.clientId)?.businessName ||
                                clients.find((c) => c.id === inv.clientId)?.name ||
                                inv.clientName ||
                                "Client"}
                          </td>
                          <td className={`p-3.5 font-mono ${textMuted}`}>{inv.date}</td>
                          <td className={`p-3.5 text-right font-bold font-mono ${textPrimary}`}>₹{inv.total.toLocaleString()}</td>
                          <td className={`p-3.5 text-right font-mono ${textMuted}`}>₹{inv.gstTotal.toLocaleString()}</td>
                          <td className="p-3.5">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                              inv.status==="Paid"
                                ? (isDark ? "bg-white/10 text-white border-white/20" : "bg-black text-white border-black") :
                              inv.status==="Sent"?"bg-cyan-500/10 text-cyan-400 border-cyan-500/20":
                              inv.status==="Overdue"?"bg-rose-500/10 text-rose-400 border-rose-500/20":
                              "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            }`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${
                                inv.status==="Paid" ? (isDark ? "bg-white" : "bg-white") :
                                inv.status==="Sent"?"bg-cyan-400":
                                inv.status==="Overdue"?"bg-rose-400":
                                "bg-amber-400"
                              }`} />
                              {inv.status}
                            </span>
                          </td>
                          {userRole === "SUPER_ADMIN" && <td className={`p-3.5 ${textMuted}`}>{inv.createdByName || "System"}</td>}
                          <td className="p-3.5 flex items-center gap-1.5">
                            <button onClick={()=> setPreviewInvoice(inv)} title="Preview / Print" className={`h-8 px-2.5 rounded-xl border ${borderC} text-xs font-semibold hover:${bgMuted} transition flex items-center gap-1`}><Eye size={13}/> Preview</button>
                            <button onClick={()=> { setNewInvoice({...inv, items:inv.items}); setCurrentPage("invoices/new"); }} title="Edit Invoice" className={`h-8 w-8 rounded-xl border ${borderC} flex items-center justify-center ${textSecondary} hover:${textPrimary} hover:${bgMuted} transition`}><Edit3 size={13}/></button>
                          </td>
                        </tr>
                      ))}
                      {invoices.length === 0 && (
                        <tr>
                          <td colSpan={userRole === "SUPER_ADMIN" ? 8 : 7} className={`p-14 text-center text-xs ${textMuted}`}>
                            No invoices generated yet. Click "Create Invoice" to start billing.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            </InvoicesPage>
          )}

          {/* CREATE NEW INVOICE PAGE - DEDICATED */}
          {currentPage==="invoices/new" && (
            <CreateInvoicePage>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, ease: "easeOut" }}
              className="max-w-[1600px] mx-auto"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <div className="flex items-center gap-3">
                  <button onClick={()=> setCurrentPage("invoices")} aria-label="Back to invoices" className={`h-10 w-10 rounded-xl border flex items-center justify-center transition-transform hover:-translate-x-0.5 ${bgCard}`}><ArrowLeft size={16}/></button>
                  <div><h1 className={`text-[22px] font-bold tracking-tight ${textPrimary}`}>Create invoice</h1><p className={`text-[13px] ${textMuted}`}>Add customer details, items, and payment terms.</p></div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={()=> handleSaveInvoice(true)} className={`h-10 px-4 rounded-xl border text-[13px] font-medium transition-all hover:-translate-y-0.5 hover:shadow-sm ${bgCard}`}><Save size={14} className="inline mr-1.5"/>Save draft</button>
                  <button onClick={()=> setPreviewMode(!previewMode)} className={`h-10 px-4 rounded-xl border text-[13px] font-medium transition-all hover:-translate-y-0.5 hover:shadow-sm ${bgCard}`}><Eye size={14} className="inline mr-1.5"/>{previewMode?"Edit invoice":"Preview"}</button>
                  <button onClick={()=> handleSaveInvoice(false)} className="h-10 px-4 rounded-xl btn-dark-gradient text-white text-[13px] font-medium flex items-center gap-2 transition-all hover:-translate-y-0.5 hover:shadow-lg"><Save size={14}/>Save & send</button>
                </div>
              </div>

              {previewMode ? (
                <motion.div initial={{ opacity: 0, scale: 0.985 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.24 }} className={`rounded-2xl border p-6 lg:p-8 max-w-[800px] mx-auto ${isDark?"bg-white text-black":"bg-white text-black"} shadow-xl`}>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3"><ZootechXLogo variant="full" size="md" /><div><div className="text-[11px] text-zinc-500">AI-powered systems studio • GSTIN: 27ABCDE1234F1Z5</div><div className="text-[11px] text-zinc-500">Mumbai, Maharashtra • zootechx.ai</div></div></div>
                    <div className="text-right"><div className="text-[20px] font-bold">TAX INVOICE</div><div className="mono text-[12px] mt-1">{newInvoice.number}</div></div>
                  </div>
                  <div className="grid grid-cols-2 gap-6 mt-6 text-[12px]">
                    <div><div className="font-semibold">Bill To</div><div className="mt-1 font-medium">{newInvoice.clientName||"Select client"}</div><div className="text-slate-500">{clients.find(c=> c.id===newInvoice.clientId)?.address||"Address"}</div><div className="text-slate-500">State: {newInvoice.placeOfSupply}</div></div>
                    <div className="text-right"><div>Invoice Date: {newInvoice.date}</div><div>Due Date: {newInvoice.dueDate}</div><div>Place of Supply: {newInvoice.placeOfSupply}</div></div>
                  </div>
                  <table className="w-full mt-6 text-[12px] border"><thead className="bg-slate-100"><tr><th className="p-2 text-left">Item</th><th className="p-2">HSN</th><th className="p-2 text-center">Qty</th><th className="p-2 text-right">Rate</th><th className="p-2 text-center">GST%</th><th className="p-2 text-right">Amount</th></tr></thead><tbody>{(newInvoice.items as InvoiceItem[]).map(it=> (<tr key={it.id} className="border-t"><td className="p-2">{it.name||"—"}</td><td className="p-2">{it.hsn}</td><td className="p-2 text-center">{it.qty}</td><td className="p-2 text-right">₹{it.rate}</td><td className="p-2 text-center">{it.gst}%</td><td className="p-2 text-right">₹{(it.qty*it.rate*(1-it.discount/100)*(1+it.gst/100)).toFixed(0)}</td></tr>))}</tbody></table>
                  <div className="flex justify-end mt-4"><div className="w-[260px] text-[12px] space-y-1">
                    {(() => { const calc = calculateInvoiceTotals(newInvoice.items as InvoiceItem[], newInvoice.placeOfSupply||""); return (<><div className="flex justify-between"><span>Subtotal</span><span>₹{calc.subtotal.toFixed(0)}</span></div><div className="flex justify-between"><span>CGST</span><span>₹{calc.cgst.toFixed(0)}</span></div><div className="flex justify-between"><span>SGST</span><span>₹{calc.sgst.toFixed(0)}</span></div><div className="flex justify-between"><span>IGST</span><span>₹{calc.igst.toFixed(0)}</span></div><div className="flex justify-between font-bold border-t pt-1 mt-1"><span>Grand Total</span><span>₹{calc.total.toFixed(0)}</span></div></>); })()}
                  </div></div>
                  <div className="mt-8 flex justify-between items-end"><div className="text-[11px] text-slate-500">Amount in words: {(() => { const t = calculateInvoiceTotals(newInvoice.items as InvoiceItem[], newInvoice.placeOfSupply||"").total; return `${t.toLocaleString()} Rupees Only`; })()}<div className="mt-4">Terms: Payment within 15 days • Late fee 1.5%</div></div><div className="text-center"><div className="h-12 w-24 border-b border-slate-400"/><div className="text-[11px] mt-1">Authorized Signature</div></div></div>
                </motion.div>
              ) : (
                <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
                  {/* LEFT */}
                  <div className="space-y-4">
                    <div className={`rounded-2xl border p-5 lg:p-6 shadow-sm ${bgCard}`}>
                      <div className="mb-5"><div className="font-semibold text-[15px]">Invoice details</div><div className={`mt-1 text-[12px] ${textMuted}`}>Set the document number, dates, customer, and tax location.</div></div>
                      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
                        <div><label className={`text-[11px] ${textMuted}`}>Invoice Number</label><input value={newInvoice.number} onChange={e=> setNewInvoice({...newInvoice, number:e.target.value})} className={`mt-1 w-full h-9 rounded-xl border px-3 text-[13px] mono ${inputCls}`}/></div>
                        <div><label className={`text-[11px] ${textMuted}`}>Invoice Date</label><input type="date" value={newInvoice.date} onChange={e=> setNewInvoice({...newInvoice, date:e.target.value})} className={`mt-1 w-full h-9 rounded-xl border px-3 text-[13px] ${inputCls}`}/></div>
                        <div><label className={`text-[11px] ${textMuted}`}>Due Date</label><input type="date" value={newInvoice.dueDate} onChange={e=> setNewInvoice({...newInvoice, dueDate:e.target.value})} className={`mt-1 w-full h-9 rounded-xl border px-3 text-[13px] ${inputCls}`}/></div>
                        <div><label className={`text-[11px] ${textMuted}`}>Place of Supply</label><select value={newInvoice.placeOfSupply} onChange={e=> setNewInvoice({...newInvoice, placeOfSupply:e.target.value})} className={`mt-1 w-full h-9 rounded-xl border px-3 text-[13px] ${inputCls}`}><option>27-Maharashtra</option><option>29-Karnataka</option><option>07-Delhi</option><option>09-Uttar Pradesh</option><option>24-Gujarat</option><option>36-Telangana</option></select></div>
                        <div className="sm:col-span-2 xl:col-span-4"><label className={`text-[11px] ${textMuted}`}>Customer *</label><select value={newInvoice.clientId} onChange={e=> { const c = clients.find(x=> x.id===e.target.value); setNewInvoice({...newInvoice, clientId:e.target.value, clientName:c?.businessName||""}); }} className={`mt-1 w-full h-10 rounded-xl border px-3 text-[13px] ${inputCls}`}><option value="">Select client</option>{clients.map(c=> <option key={c.id} value={c.id}>{c.businessName}</option>)}</select></div>
                      </div>
                    </div>

                    <div className={`rounded-2xl border p-5 lg:p-6 shadow-sm ${bgCard}`}>
                      <div className="mb-5"><div className="font-semibold text-[15px]">Line items</div><div className={`mt-1 text-[12px] ${textMuted}`}>Add the products or services you are billing for.</div></div>
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[700px]">
                          <thead className={`text-[11px] ${textMuted} uppercase tracking-widest border-b ${borderC}`}><tr><th className="text-left p-2 font-medium">Item</th><th className="text-left p-2 font-medium">HSN/SAC</th><th className="text-left p-2 font-medium">Qty</th><th className="text-left p-2 font-medium">Unit</th><th className="text-left p-2 font-medium">Rate</th><th className="text-left p-2 font-medium">Disc%</th><th className="text-left p-2 font-medium">GST%</th><th className="text-left p-2 font-medium">Amount</th><th className="p-2"></th></tr></thead>
                          <tbody>
                            {(newInvoice.items as InvoiceItem[]).map((it, idx)=> (
                              <tr key={it.id} className={`border-b ${borderC}`}>
                                <td className="p-2"><input value={it.name} onChange={e=> { const items=[...(newInvoice.items as InvoiceItem[])]; items[idx].name=e.target.value; if(e.target.value.toLowerCase().includes("broker")) items[idx].hsn="9972"; else if(e.target.value.toLowerCase().includes("consult")) items[idx].hsn="9983"; setNewInvoice({...newInvoice, items}); }} placeholder="Item name" className={`w-full h-8 rounded-lg border px-2 text-[13px] ${inputCls}`}/></td>
                                <td className="p-2"><input value={it.hsn} onChange={e=> { const items=[...(newInvoice.items as InvoiceItem[])]; items[idx].hsn=e.target.value; setNewInvoice({...newInvoice, items}); }} className={`w-[80px] h-8 rounded-lg border px-2 text-[12px] mono ${inputCls}`}/></td>
                                <td className="p-2"><input type="number" value={it.qty} onChange={e=> { const items=[...(newInvoice.items as InvoiceItem[])]; items[idx].qty=Number(e.target.value); setNewInvoice({...newInvoice, items}); }} className={`w-[60px] h-8 rounded-lg border px-2 text-[12px] ${inputCls}`}/></td>
                                <td className="p-2"><select value={it.unit} onChange={e=> { const items=[...(newInvoice.items as InvoiceItem[])]; items[idx].unit=e.target.value; setNewInvoice({...newInvoice, items}); }} className={`h-8 rounded-lg border px-1 text-[12px] ${inputCls}`}><option>Nos</option><option>Sqft</option><option>Hours</option></select></td>
                                <td className="p-2"><input type="number" value={it.rate} onChange={e=> { const items=[...(newInvoice.items as InvoiceItem[])]; items[idx].rate=Number(e.target.value); setNewInvoice({...newInvoice, items}); }} className={`w-[90px] h-8 rounded-lg border px-2 text-[12px] ${inputCls}`}/></td>
                                <td className="p-2"><input type="number" value={it.discount} onChange={e=> { const items=[...(newInvoice.items as InvoiceItem[])]; items[idx].discount=Number(e.target.value); setNewInvoice({...newInvoice, items}); }} className={`w-[50px] h-8 rounded-lg border px-2 text-[12px] ${inputCls}`}/></td>
                                <td className="p-2"><select value={it.gst} onChange={e=> { const items=[...(newInvoice.items as InvoiceItem[])]; items[idx].gst=Number(e.target.value); setNewInvoice({...newInvoice, items}); }} className={`h-8 rounded-lg border px-1 text-[12px] ${inputCls}`}><option value={0}>0%</option><option value={5}>5%</option><option value={12}>12%</option><option value={18}>18%</option><option value={28}>28%</option></select></td>
                                <td className="p-2 text-[13px] font-medium mono">₹{(it.qty*it.rate*(1-it.discount/100)*(1+it.gst/100)).toFixed(0)}</td>
                                <td className="p-2"><button onClick={()=> { if((newInvoice.items as InvoiceItem[]).length>1) setNewInvoice({...newInvoice, items:(newInvoice.items as InvoiceItem[]).filter((_,i)=> i!==idx)}); }} className={`h-7 w-7 rounded-lg border flex items-center justify-center ${bgCard}`}><X size={12}/></button></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <button onClick={()=> setNewInvoice({...newInvoice, items:[...(newInvoice.items as InvoiceItem[]), {id:Date.now().toString(), name:"", hsn:"", qty:1, unit:"Nos", rate:0, discount:0, gst:18}]})} className={`mt-4 h-9 px-3.5 rounded-xl border text-[12px] font-medium flex items-center gap-1.5 transition-all hover:-translate-y-0.5 hover:shadow-sm ${bgCard}`}><Plus size={13}/>Add line item</button>
                    </div>

                    <div className={`rounded-2xl border p-5 shadow-sm ${bgCard}`}>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div><label className={`text-[11px] ${textMuted}`}>Notes</label><textarea placeholder="Notes for client…" className={`mt-1 w-full h-20 rounded-xl border p-3 text-[13px] ${inputCls}`}/></div>
                        <div><label className={`text-[11px] ${textMuted}`}>Terms & Conditions</label><textarea defaultValue="Payment within 15 days. Late fee 1.5% per month. GST as applicable." className={`mt-1 w-full h-20 rounded-xl border p-3 text-[13px] ${inputCls}`}/></div>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT STICKY */}
                  <div className="space-y-4 xl:sticky xl:top-[80px] self-start">
                    <div className={`rounded-2xl border p-5 shadow-sm ${bgCard}`}>
                      <div className="font-semibold text-[15px] mb-1">Invoice total</div>
                      <div className={`text-[12px] mb-4 ${textMuted}`}>Updates automatically as you edit.</div>
                      {(() => {
                        const calc = calculateInvoiceTotals(newInvoice.items as InvoiceItem[], newInvoice.placeOfSupply||"");
                        const balance = calc.total - (newInvoice.amountPaid||0);
                        return (
                          <div className="space-y-2 text-[13px]">
                            <div className="flex justify-between"><span className={textMuted}>Subtotal</span><span className="font-medium mono">₹{calc.subtotal.toFixed(2)}</span></div>
                            <div className="flex justify-between"><span className={textMuted}>CGST</span><span className="font-medium mono">₹{calc.cgst.toFixed(2)}</span></div>
                            <div className="flex justify-between"><span className={textMuted}>{calc.igst>0?"IGST":"SGST"}</span><span className="font-medium mono">₹{(calc.igst>0?calc.igst:calc.sgst).toFixed(2)}</span></div>
                            <div className={`flex justify-between pt-3 border-t ${borderC} font-bold text-[15px]`}><span>Grand total</span><span className="mono">₹{calc.total.toFixed(2)}</span></div>
                            <div className="pt-2 space-y-2">
                              <div className="flex justify-between text-[12px]"><span className={textMuted}>Amount Paid</span><input type="number" value={newInvoice.amountPaid} onChange={e=> setNewInvoice({...newInvoice, amountPaid:Number(e.target.value)})} className={`w-[100px] h-7 rounded-lg border px-2 text-[12px] mono ${inputCls}`}/></div>
                              <div className="flex justify-between font-semibold"><span>Balance Due</span><span className={`mono ${balance>0?"text-amber-600":"text-emerald-600"}`}>₹{balance.toFixed(2)}</span></div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    <div className={`rounded-2xl border p-5 shadow-sm ${bgCard}`}>
                      <div className="font-semibold text-[13px] mb-2">Client Info</div>
                      {newInvoice.clientId ? (
                        <div className="text-[12px] space-y-1">
                          <div className="font-medium">{clients.find(c=> c.id===newInvoice.clientId)?.businessName}</div>
                          <div className={textMuted}>{clients.find(c=> c.id===newInvoice.clientId)?.email}</div>
                          <div className={textMuted}>{clients.find(c=> c.id===newInvoice.clientId)?.phone}</div>
                          <div className={textMuted}>GSTIN: {clients.find(c=> c.id===newInvoice.clientId)?.gstin||"Not provided"}</div>
                        </div>
                      ) : <div className={`text-[12px] ${textMuted}`}>Select a customer to auto-fill details</div>}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
            </CreateInvoicePage>
          )}

          {/* QUOTATIONS */}
          {currentPage==="quotations" && (
            <QuotationsPage>
            <div className="max-w-[1600px] mx-auto space-y-4">
              <div className="flex items-center justify-between"><div><h1 className={`text-[22px] font-bold ${textPrimary}`}>Quotations</h1><p className={`text-[13px] ${textMuted}`}>Manage quotes</p></div><button onClick={()=> setShowCreateQuote(true)} className="h-9 px-4 rounded-xl btn-dark-gradient text-white text-[13px] font-medium flex items-center gap-2"><Plus size={16}/>Create Quotation</button></div>
              <div className={`rounded-2xl border overflow-hidden ${bgCard}`}><table className="w-full"><thead className={`${isDark?"bg-[#0f0f1a]":"bg-slate-50"} border-b ${borderC} text-[11px] ${textMuted} uppercase tracking-widest`}><tr><th className="text-left p-3">Quote ID</th><th className="text-left p-3">Client</th><th className="text-left p-3">Amount</th><th className="text-left p-3">Valid Until</th><th className="text-left p-3">Status</th><th className="text-left p-3">Actions</th></tr></thead><tbody className={`divide-y ${borderC}`}>{quotations.map(q=> <tr key={q.id}><td className="p-3 mono text-[13px]">{q.id}</td><td className="p-3 text-[13px]">{q.clientName}</td><td className="p-3 font-semibold">₹{q.amount.toLocaleString()}</td><td className="p-3 text-[12px]">{q.validUntil}</td><td className="p-3"><span className={`text-[11px] px-2 py-1 rounded-full border ${q.status==="Sent"?"bg-blue-500/10 text-blue-600":"bg-slate-500/10 text-slate-600"}`}>{q.status}</span></td><td className="p-3 flex gap-1"><button onClick={async ()=> {
  try {
    const res = await apiFetch(`/api/quotations/${q.id}/convert-to-invoice`, { method: "POST" });
    const data = await res.json();
    if (res.ok && data.data) {
      const newInv = toInvoice(data.data);
      setInvoices(prev => [newInv, ...prev.filter(x => x.id !== newInv.id)]);
      setQuotations(prev => prev.map(item => item.id === q.id ? { ...item, status: "Converted" } : item));
      pushRealtimeNotification("Quotation Converted", `Quotation converted to Invoice #${newInv.number}`);
      setToastMessage(`Converted to Invoice #${newInv.number} successfully.`);
      setCurrentPage("invoices");
      return;
    }
  } catch {
    // fallback
  }
  const c = clients.find(x=> x.businessName.toLowerCase()===q.clientName.toLowerCase() || x.name.toLowerCase()===q.clientName.toLowerCase());
  setNewInvoice({
    number: `INV-2026-${String(invoices.length+1).padStart(3,"0")}`,
    date: new Date().toISOString().split("T")[0],
    dueDate: new Date(Date.now()+30*86400000).toISOString().split("T")[0],
    placeOfSupply: "27-Maharashtra",
    items: [{id:"1", name:`Services for ${q.clientName}`, hsn:"9972", qty:1, unit:"Nos", rate:q.amount/1.18, discount:0, gst:18}],
    amountPaid: 0,
    clientId: c?.id || (clients[0]?.id || ""),
    clientName: q.clientName,
    status: "Draft"
  });
  setCurrentPage("invoices/new");
}} className="h-7 px-2 rounded-lg bg-indigo-600 text-white text-[11px]">Convert to Invoice</button></td></tr>)}</tbody></table></div>
            </div>
            </QuotationsPage>
          )}

          {/* CLIENTS */}
          {currentPage==="clients" && (
            <ClientsPage>
            <div className="max-w-[1600px] mx-auto space-y-4">
              <div className="flex items-center justify-between"><div><h1 className={`text-[22px] font-bold ${textPrimary}`}>Clients</h1><p className={`text-[13px] ${textMuted}`}>Manage your clients</p></div><button onClick={()=> setShowCreateClient(true)} className="h-9 px-4 rounded-xl btn-dark-gradient text-white text-[13px] font-medium flex items-center gap-2"><Plus size={16}/>Add Client</button></div>
              <div className={`rounded-2xl border overflow-hidden ${bgCard}`}><div className="overflow-x-auto"><table className="w-full min-w-[700px]"><thead className={`${isDark?"bg-[#0f0f1a]":"bg-slate-50"} border-b ${borderC} text-[11px] ${textMuted} uppercase tracking-widest`}><tr><th className="text-left p-3">Business</th><th className="text-left p-3">Contact</th><th className="text-left p-3">GSTIN</th><th className="text-left p-3">State</th><th className="text-left p-3">Projects</th></tr></thead><tbody className={`divide-y ${borderC}`}>{clients.map(c=> <tr key={c.id}><td className="p-3"><div className="font-medium text-[13px]">{c.businessName}</div><div className={`text-[11px] ${textMuted}`}>{c.name}</div></td><td className="p-3 text-[12px]"><div>{c.email}</div><div className={textMuted}>{c.phone}</div></td><td className="p-3 mono text-[11px]">{c.gstin||"—"}</td><td className="p-3 text-[12px]">{c.state}</td><td className="p-3 text-[12px]">{c.projects && c.projects.length > 0 ? <div className="flex flex-wrap gap-1.5">{c.projects.map(p => <span key={p.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">{p.title || p.name} <span className="font-bold opacity-80">({p.status})</span></span>)}</div> : <span className={`text-[11px] ${textMuted}`}>No active projects</span>}</td></tr>)}</tbody></table></div></div>
            </div>
            </ClientsPage>
          )}

          {currentPage==="developers" && <DeveloperWorkspace admin embedded dark={isDark} />}
          {currentPage==="marketing" && <DigitalMarketingWorkspace admin embedded dark={isDark} />}

          {currentPage === "payments" && <PaymentsPage><PaymentsWorkspace dark={isDark} role={userRole}/></PaymentsPage>}

          {currentPage === "vault" && (
            <div className="max-w-[1600px] mx-auto w-full">
              <CredentialsVault dark={isDark} />
            </div>
          )}

          {currentPage === "sows" && (
            <div className="max-w-[1600px] mx-auto w-full">
              <ScopeOfWorkWorkspace dark={isDark} />
            </div>
          )}

          {currentPage === "tasks" && (
            <div className="max-w-[1600px] mx-auto w-full">
              <UniversalTasksWorkspace dark={isDark} canCreate={true} canUpdateStatus={true} />
            </div>
          )}

          {currentPage === "audit-logs" && (
            <div className="max-w-[1600px] mx-auto w-full">
              <AuditLogsViewer dark={isDark} />
            </div>
          )}

          {(currentPage === "settings" || currentPage === "users") && (
            <div className="max-w-[1600px] mx-auto w-full">
              <SuperAdminSettings dark={isDark} initialTab={currentPage === "users" ? "users" : settingsTab} />
            </div>
          )}
        </main>
      </div>

      {/* FLOATING TOAST (Auto-dismisses after 3 seconds) */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-emerald-600 text-white font-medium text-xs shadow-xl shadow-emerald-600/30"
          >
            <CheckCircle2 size={16} />
            <span>{toastMessage}</span>
            <button onClick={() => setToastMessage(null)} className="ml-2 opacity-70 hover:opacity-100">
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MOBILE SIDEBAR BOTTOM */}
      <div className={`crm-mobile-nav lg:hidden fixed bottom-0 left-0 right-0 z-30 border-t flex justify-around py-2 ${isDark?"bg-[#0f0f1a] border-[#23233a]":"bg-white border-slate-200"}`}>
        {[
          { id:"dashboard", icon:LayoutDashboard },
          { id:"leads", icon:UserPlus },
          { id:"invoices", icon:FileText },
          { id:"clients", icon:Users },
        ].map(it=> (
          <button key={it.id} onClick={()=> setCurrentPage(it.id)} className={`h-10 w-10 rounded-xl flex items-center justify-center ${currentPage===it.id?"bg-slate-900 text-white dark:bg-white dark:text-black":""}`}><it.icon size={18}/></button>
        ))}
      </div>

      {/* ADD LEAD MODAL */}
      {showAddLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={()=> setShowAddLead(false)}/>
          <div className={`relative w-full max-w-[640px] rounded-2xl border shadow-2xl max-h-[90vh] overflow-auto ${bgCard}`}>
            <div className={`sticky top-0 p-5 border-b ${borderC} flex items-center justify-between backdrop-blur-xl ${isDark?"bg-[#14141f]/90":"bg-white/90"}`}><div><div className="font-bold text-[16px]">Add New Lead</div><div className={`text-[12px] ${textMuted}`}>Potential client details</div></div><button onClick={()=> setShowAddLead(false)} className={`h-8 w-8 rounded-xl border flex items-center justify-center ${bgCard}`}><X size={16}/></button></div>
            <div className="p-5 space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <div><label className="text-[11px] font-medium">Full Name *</label><input value={leadForm.name||""} onChange={e=> setLeadForm({...leadForm, name:e.target.value})} className={`mt-1 w-full h-9 rounded-xl border px-3 text-[13px] ${inputCls}`}/></div>
                <div><label className="text-[11px] font-medium">Company</label><input value={leadForm.company||""} onChange={e=> setLeadForm({...leadForm, company:e.target.value})} className={`mt-1 w-full h-9 rounded-xl border px-3 text-[13px] ${inputCls}`}/></div>
                <div><label className="text-[11px] font-medium">Email</label><input value={leadForm.email||""} onChange={e=> setLeadForm({...leadForm, email:e.target.value})} className={`mt-1 w-full h-9 rounded-xl border px-3 text-[13px] ${inputCls}`}/></div>
                <div><label className="text-[11px] font-medium">Phone *</label><input value={leadForm.phone||""} onChange={e=> setLeadForm({...leadForm, phone:e.target.value})} className={`mt-1 w-full h-9 rounded-xl border px-3 text-[13px] ${inputCls}`}/></div>
                <div><label className="text-[11px] font-medium">Property Type</label><select value={leadForm.propertyType} onChange={e=> setLeadForm({...leadForm, propertyType:e.target.value})} className={`mt-1 w-full h-9 rounded-xl border px-3 text-[13px] ${inputCls}`}><option>Residential</option><option>Commercial</option><option>Office</option><option>Retail</option><option>Industrial</option><option>Land</option></select></div>
                <div><label className="text-[11px] font-medium">Location</label><select value={leadForm.location} onChange={e=> setLeadForm({...leadForm, location:e.target.value})} className={`mt-1 w-full h-9 rounded-xl border px-3 text-[13px] ${inputCls}`}><option>Mumbai</option><option>Thane</option><option>Navi Mumbai</option><option>Andheri</option><option>Bandra</option><option>Tardeo</option><option>Worli</option><option>Lower Parel</option><option>Vashi</option><option>Other</option></select></div>
                <div><label className="text-[11px] font-medium">Budget Min</label><input type="number" value={leadForm.budgetMin||""} onChange={e=> setLeadForm({...leadForm, budgetMin:Number(e.target.value)})} className={`mt-1 w-full h-9 rounded-xl border px-3 text-[13px] ${inputCls}`}/></div>
                <div><label className="text-[11px] font-medium">Budget Max</label><input type="number" value={leadForm.budgetMax||""} onChange={e=> setLeadForm({...leadForm, budgetMax:Number(e.target.value)})} className={`mt-1 w-full h-9 rounded-xl border px-3 text-[13px] ${inputCls}`}/></div>
                <div><label className="text-[11px] font-medium">Source</label><select value={leadForm.source} onChange={e=> setLeadForm({...leadForm, source:e.target.value})} className={`mt-1 w-full h-9 rounded-xl border px-3 text-[13px] ${inputCls}`}><option>Website</option><option>Referral</option><option>Walk-in</option><option>Phone</option><option>WhatsApp</option><option>LinkedIn</option><option>Instagram</option><option>Advertisement</option><option>Other</option></select></div>
                <div><label className="text-[11px] font-medium">Assigned To</label><select value={leadForm.assignedTo} onChange={e=> setLeadForm({...leadForm, assignedTo:e.target.value})} className={`mt-1 w-full h-9 rounded-xl border px-3 text-[13px] ${inputCls}`}><option>Aarav</option><option>Priya</option><option>Rohan</option></select></div>
                <div><label className="text-[11px] font-medium">Priority</label><select value={leadForm.priority} onChange={e=> setLeadForm({...leadForm, priority:e.target.value as any})} className={`mt-1 w-full h-9 rounded-xl border px-3 text-[13px] ${inputCls}`}><option>High</option><option>Medium</option><option>Low</option></select></div>
                <div><label className="text-[11px] font-medium">Status</label><select value={leadForm.status} onChange={e=> setLeadForm({...leadForm, status:e.target.value as any})} className={`mt-1 w-full h-9 rounded-xl border px-3 text-[13px] ${inputCls}`}><option>New</option><option>Contacted</option><option>Follow-up</option><option>Qualified</option><option>Negotiation</option><option>Converted</option><option>Lost</option></select></div>
              </div>
              <div><label className="text-[11px] font-medium">Notes</label><textarea value={leadForm.notes||""} onChange={e=> setLeadForm({...leadForm, notes:e.target.value})} className={`mt-1 w-full h-20 rounded-xl border p-3 text-[13px] ${inputCls}`}/></div>
              <div className={`p-3 rounded-xl border border-amber-500/30 ${isDark?"bg-amber-500/10":"bg-amber-50"}`}>
                <div className="text-[11px] font-semibold text-amber-600 flex items-center gap-1"><Calendar size={12}/>Next Follow-up</div>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <input type="date" value={leadForm.nextFollowUp? new Date(leadForm.nextFollowUp).toISOString().split("T")[0] : ""} onChange={e=> setLeadForm({...leadForm, nextFollowUp:new Date(e.target.value).toISOString()})} className={`w-full h-9 rounded-xl border px-2 text-[12px] ${inputCls}`}/>
                  <select value={leadForm.followUpType} onChange={e=> setLeadForm({...leadForm, followUpType:e.target.value as any})} className={`h-9 rounded-xl border px-2 text-[12px] ${inputCls}`}><option>Phone Call</option><option>WhatsApp</option><option>Email</option><option>Meeting</option><option>Site Visit</option></select>
                  <select value={leadFollowUpTime} onChange={e=> setLeadFollowUpTime(e.target.value)} className={`h-9 rounded-xl border px-2 text-[12px] ${inputCls}`}>
                    {followUpTimeOptions.map(time => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button onClick={handleAddLead} className="w-full h-10 rounded-xl btn-dark-gradient text-white font-medium text-[13px]">Save Lead + Create Follow-up</button>
            </div>
          </div>
        </div>
      )}

      {/* FOLLOW-UP MODAL */}
      {showFollowUpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={()=> setShowFollowUpModal(false)}/>
          <div className={`relative w-full max-w-[520px] rounded-2xl border shadow-2xl ${bgCard}`}>
            <div className={`p-5 border-b ${borderC} flex items-center justify-between`}><div className="font-bold text-[16px]">Schedule Follow-up</div><button onClick={()=> setShowFollowUpModal(false)} className={`h-8 w-8 rounded-xl border flex items-center justify-center ${bgCard}`}><X size={16}/></button></div>
            <div className="p-5 space-y-3">
              <div><label className="text-[11px] font-medium">Lead / Client</label><select value={followUpForm.leadId||""} onChange={e=> { const value = e.target.value; const l = leads.find(x=> x.id===value); const c = value.startsWith("client:") ? clients.find(x=> x.id===value.slice(7)) : undefined; setFollowUpForm({...followUpForm, leadId:value, leadName:c?.name||l?.name||"", company:c?.businessName||l?.company||"", property:c ? "" : `${l?.propertyType} - ${l?.location}`}); }} className={`mt-1 w-full h-9 rounded-xl border px-3 text-[13px] ${inputCls}`}><option value="">Select lead or client</option><optgroup label="Leads">{leads.map(l=> <option key={l.id} value={l.id}>{l.name} - {l.company}</option>)}</optgroup><optgroup label="Clients">{clients.map(c=> <option key={c.id} value={`client:${c.id}`}>{c.businessName}{c.name && c.name!==c.businessName ? ` - ${c.name}` : ""}</option>)}</optgroup></select></div>
              <div className="grid grid-cols-2 gap-3"><div><label className="text-[11px] font-medium">Type</label><select value={followUpForm.type} onChange={e=> setFollowUpForm({...followUpForm, type:e.target.value as any})} className={`mt-1 w-full h-9 rounded-xl border px-3 text-[13px] ${inputCls}`}><option>Phone Call</option><option>WhatsApp</option><option>Email</option><option>Meeting</option><option>Site Visit</option></select></div><div><label className="text-[11px] font-medium">Priority</label><select value={followUpForm.priority} onChange={e=> setFollowUpForm({...followUpForm, priority:e.target.value as any})} className={`mt-1 w-full h-9 rounded-xl border px-3 text-[13px] ${inputCls}`}><option>High</option><option>Medium</option><option>Low</option></select></div></div>
              <div className="grid grid-cols-2 gap-3"><div><label className="text-[11px] font-medium">Date</label><input type="date" value={followUpForm.date||""} onChange={e=> setFollowUpForm({...followUpForm, date:e.target.value})} className={`mt-1 w-full h-9 rounded-xl border px-3 text-[13px] ${inputCls}`}/></div><div><label className="text-[11px] font-medium">Time</label><select value={followUpForm.time||"10:00 AM"} onChange={e=> setFollowUpForm({...followUpForm, time:e.target.value})} className={`mt-1 w-full h-9 rounded-xl border px-3 text-[13px] ${inputCls}`}>{followUpTimeOptions.map(time => <option key={time} value={time}>{time}</option>)}</select></div></div>
              <div><label className="text-[11px] font-medium">Assigned To</label><select value={followUpForm.assignedTo} onChange={e=> setFollowUpForm({...followUpForm, assignedTo:e.target.value})} className={`mt-1 w-full h-9 rounded-xl border px-3 text-[13px] ${inputCls}`}><option>Aarav</option><option>Priya</option><option>Rohan</option></select></div>
              <div><label className="text-[11px] font-medium">Notes</label><textarea value={followUpForm.notes||""} onChange={e=> setFollowUpForm({...followUpForm, notes:e.target.value})} className={`mt-1 w-full h-20 rounded-xl border p-3 text-[13px] ${inputCls}`}/></div>
              <div className={`p-2.5 rounded-xl border text-[11px] ${isDark?"bg-[#1c1c2e]":"bg-slate-50"} ${borderC}`}>Reminder: 15 min before • Auto notification</div>
              <button onClick={handleScheduleFollowUp} className="w-full h-10 rounded-xl btn-dark-gradient text-white font-medium text-[13px]">Schedule Follow-up</button>
            </div>
          </div>
        </div>
      )}

      {/* CLIENT MODAL */}
      {showCreateClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={()=> { setShowCreateClient(false); setClientModalError(null); }}/>
          <div className={`relative w-full max-w-[520px] rounded-2xl border shadow-2xl ${bgCard}`}>
            <div className={`p-5 border-b ${borderC} flex items-center justify-between`}>
              <div>
                <div className="font-bold text-[16px]">Add Client</div>
                <p className={`text-[11px] ${textMuted}`}>Create an enterprise client record in CRM</p>
              </div>
              <button onClick={()=> { setShowCreateClient(false); setClientModalError(null); }} className={`h-8 w-8 rounded-xl border flex items-center justify-center ${bgCard}`}><X size={16}/></button>
            </div>
            <div className="p-5 space-y-3">
              {clientModalError && (
                <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs flex items-center gap-2">
                  <span className="font-semibold">Error:</span> {clientModalError}
                </div>
              )}
              <div>
                <label className="text-[11px] font-medium">Business / Company Name *</label>
                <input
                  value={clientForm.businessName||""}
                  onChange={e=> { setClientModalError(null); setClientForm({...clientForm, businessName:e.target.value}); }}
                  placeholder="e.g. Acme Global Logistics"
                  className={`mt-1 w-full h-9 rounded-xl border px-3 text-[13px] ${inputCls}`}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium">Contact Person Name</label>
                  <input
                    value={clientForm.name||""}
                    onChange={e=> { setClientModalError(null); setClientForm({...clientForm, name:e.target.value}); }}
                    placeholder="e.g. John Doe"
                    className={`mt-1 w-full h-9 rounded-xl border px-3 text-[13px] ${inputCls}`}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium">GSTIN (Optional)</label>
                  <input
                    value={clientForm.gstin||""}
                    onChange={e=> setClientForm({...clientForm, gstin:e.target.value})}
                    placeholder="27ABCDE1234F1Z5"
                    className={`mt-1 w-full h-9 rounded-xl border px-3 text-[13px] mono ${inputCls}`}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium">Email (Optional)</label>
                  <input
                    type="email"
                    value={clientForm.email||""}
                    onChange={e=> setClientForm({...clientForm, email:e.target.value})}
                    placeholder="billing@company.com"
                    className={`mt-1 w-full h-9 rounded-xl border px-3 text-[13px] ${inputCls}`}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium">Phone (Optional)</label>
                  <input
                    value={clientForm.phone||""}
                    onChange={e=> setClientForm({...clientForm, phone:e.target.value})}
                    placeholder="+91 98765 43210"
                    className={`mt-1 w-full h-9 rounded-xl border px-3 text-[13px] ${inputCls}`}
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-medium">Billing Address (Optional)</label>
                <input
                  value={clientForm.address||""}
                  onChange={e=> setClientForm({...clientForm, address:e.target.value})}
                  placeholder="Street, City, Pin"
                  className={`mt-1 w-full h-9 rounded-xl border px-3 text-[13px] ${inputCls}`}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium">State</label>
                  <select
                    value={clientForm.state}
                    onChange={e=> setClientForm({...clientForm, state:e.target.value})}
                    className={`mt-1 w-full h-9 rounded-xl border px-3 text-[13px] ${inputCls}`}
                  >
                    <option>27-Maharashtra</option>
                    <option>29-Karnataka</option>
                    <option>07-Delhi</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-medium">Credit Limit (₹)</label>
                  <input
                    type="number"
                    value={clientForm.creditLimit||""}
                    onChange={e=> setClientForm({...clientForm, creditLimit:Number(e.target.value)})}
                    placeholder="0"
                    className={`mt-1 w-full h-9 rounded-xl border px-3 text-[13px] ${inputCls}`}
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleCreateClient}
                disabled={clientSubmitting}
                className="w-full h-10 rounded-xl btn-dark-gradient text-white font-medium text-[13px] hover:opacity-95 transition disabled:opacity-50"
              >
                {clientSubmitting ? "Saving Client..." : "Save Client"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUOTE MODAL */}
      {showCreateQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={()=> setShowCreateQuote(false)}/>
          <div className={`relative w-full max-w-[480px] rounded-2xl border shadow-2xl ${bgCard}`}>
            <div className={`p-5 border-b ${borderC} flex items-center justify-between`}><div className="font-bold">Create Quotation</div><button onClick={()=> setShowCreateQuote(false)} className={`h-8 w-8 rounded-xl border flex items-center justify-center ${bgCard}`}><X size={16}/></button></div>
            <div className="p-5 space-y-3">
              <div><label className="text-[11px] font-medium">Customer</label><select value={quoteForm.clientName||""} onChange={e=> setQuoteForm({...quoteForm, clientName:e.target.value})} className={`mt-1 w-full h-9 rounded-xl border px-3 text-[13px] ${inputCls}`}><option value="">Select client</option>{clients.map(c=> <option key={c.id} value={c.businessName}>{c.businessName}</option>)}</select></div>
              <div><label className="text-[11px] font-medium">Amount</label><input type="number" value={quoteForm.amount||""} onChange={e=> setQuoteForm({...quoteForm, amount:Number(e.target.value)})} className={`mt-1 w-full h-9 rounded-xl border px-3 text-[13px] ${inputCls}`}/></div>
              <div className="grid grid-cols-2 gap-3"><div><label className="text-[11px] font-medium">Valid Until</label><input ref={quoteValidUntilRef} type="date" value={quoteForm.validUntil||""} onChange={e=> setQuoteForm({...quoteForm, validUntil:e.target.value})} className={`mt-1 w-full h-9 rounded-xl border px-3 text-[13px] ${inputCls}`}/></div><div><label className="text-[11px] font-medium">Status</label><select value={quoteForm.status} onChange={e=> setQuoteForm({...quoteForm, status:e.target.value})} className={`mt-1 w-full h-9 rounded-xl border px-3 text-[13px] ${inputCls}`}><option>Draft</option><option>Sent</option><option>Accepted</option></select></div></div>
              <button onClick={()=> void handleCreateQuotation()} className="w-full h-10 rounded-xl btn-dark-gradient text-white font-medium text-[13px]">Save Quotation</button>
            </div>
          </div>
        </div>
      )}

      {/* LEAD DRAWER */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={()=> setSelectedLead(null)}/>
          <div className={`relative w-full max-w-[380px] h-full border-l shadow-2xl overflow-auto ${bgCard}`}>
            <div className={`p-5 border-b ${borderC} flex items-center justify-between sticky top-0 ${isDark?"bg-[#14141f]":"bg-white"}`}><div className="font-bold">Lead Details</div><button onClick={()=> setSelectedLead(null)} className={`h-8 w-8 rounded-xl border flex items-center justify-center ${bgCard}`}><X size={16}/></button></div>
            <div className="p-5 space-y-5">
              <div className="flex items-center gap-3"><div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 text-white flex items-center justify-center font-bold">{selectedLead.avatar}</div><div><div className="font-bold">{selectedLead.name}</div><div className={`text-[12px] ${textMuted}`}>{selectedLead.company}</div></div></div>
              <div className={`rounded-xl border p-3 ${isDark?"bg-[#1c1c2e]":"bg-slate-50"} ${borderC} space-y-2 text-[13px]`}><div className="font-semibold text-[12px]">Contact</div><div className="flex items-center gap-2"><Mail size={14} className={textMuted}/>{selectedLead.email}</div><div className="flex items-center gap-2"><Phone size={14} className={textMuted}/>{selectedLead.phone}</div><div className="flex items-center gap-2"><MapPin size={14} className={textMuted}/>{selectedLead.location}</div></div>
              <div className={`rounded-xl border p-3 ${borderC} space-y-2 text-[13px]`}><div className="font-semibold text-[12px]">Property Interest</div><div className="flex gap-2 flex-wrap"><span className={`px-2 py-1 rounded-full text-[11px] border ${bgCard}`}>{selectedLead.propertyType}</span><span className={`px-2 py-1 rounded-full text-[11px] border ${bgCard}`}>{selectedLead.location}</span><span className={`px-2 py-1 rounded-full text-[11px] border ${bgCard}`}>₹{selectedLead.budgetMin/100000}L - ₹{selectedLead.budgetMax/100000}L</span></div><div className={`text-[12px] ${textMuted}`}>{selectedLead.notes}</div></div>
              <div><div className="font-semibold text-[12px] mb-2">Activity Timeline</div><div className="space-y-2">{[
                { t:"Lead created", d:selectedLead.createdAt },
                { t:`Status: ${selectedLead.status}`, d:new Date().toISOString() },
                { t:`Next: ${selectedLead.followUpType}`, d:selectedLead.nextFollowUp }
              ].map((a,i)=> <div key={i} className="flex gap-3"><div className="h-6 w-6 rounded-full bg-indigo-600/10 text-indigo-600 flex items-center justify-center"><Clock size={12}/></div><div><div className="text-[12px] font-medium">{a.t}</div><div className={`text-[11px] ${textMuted}`}>{new Date(a.d).toLocaleString()}</div></div></div>)}</div></div>
              <div className="grid grid-cols-2 gap-2"><button onClick={() => window.location.href = `tel:${selectedLead.phone}`} className={`h-9 rounded-xl border text-[12px] flex items-center justify-center gap-1 ${bgCard}`}><Phone size={14}/>Call</button><button onClick={() => window.open(`https://wa.me/${selectedLead.phone.replace(/\D/g, "")}`, "_blank", "noopener,noreferrer")} className={`h-9 rounded-xl border text-[12px] flex items-center justify-center gap-1 ${bgCard}`}><MessageCircle size={14}/>WhatsApp</button><button onClick={() => window.location.href = `mailto:${selectedLead.email}`} className={`h-9 rounded-xl border text-[12px] flex items-center justify-center gap-1 ${bgCard}`}><Mail size={14}/>Email</button><button onClick={()=> { setShowFollowUpModal(true); setFollowUpForm({ leadId:selectedLead.id, leadName:selectedLead.name, company:selectedLead.company, property:`${selectedLead.propertyType} - ${selectedLead.location}`, type:"Phone Call", priority:selectedLead.priority, assignedTo:selectedLead.assignedTo }); }} className={`h-9 rounded-xl border text-[12px] flex items-center justify-center gap-1 ${bgCard}`}><Calendar size={14}/>Follow-up</button></div>
              <button onClick={()=> void handleConvertLead(selectedLead)} className="w-full h-10 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-medium text-[13px]">Convert to Client</button>
            </div>
          </div>
        </div>
      )}

      {/* INVOICE PREVIEW */}
      {previewInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={()=> setPreviewInvoice(null)}/>
          <div className={`relative w-full max-w-[800px] rounded-2xl border shadow-2xl max-h-[90vh] overflow-auto bg-white text-black p-6`}>
            <div className="flex justify-between items-start"><div className="flex items-center gap-3"><ZootechXLogo variant="full" size="md" /><div><div className="text-[11px] text-zinc-500">GSTIN: 27ABCDE1234F1Z5 • Mumbai</div></div></div><button onClick={()=> setPreviewInvoice(null)} className="h-8 w-8 rounded-xl border flex items-center justify-center bg-white"><X size={16}/></button></div>
            <div className="mt-6 grid grid-cols-2 gap-6 text-[12px]"><div><div className="font-semibold">Bill To</div><div className="font-medium mt-1">{previewInvoice.clientName}</div><div className="text-slate-500">Place: {previewInvoice.placeOfSupply}</div></div><div className="text-right"><div>Invoice: {previewInvoice.number}</div><div>Date: {previewInvoice.date}</div><div>Due: {previewInvoice.dueDate}</div></div></div>
            <table className="w-full mt-6 text-[12px] border"><thead className="bg-slate-100"><tr><th className="p-2 text-left">Item</th><th className="p-2 text-center">Qty</th><th className="p-2 text-right">Rate</th><th className="p-2 text-right">Amount</th></tr></thead><tbody>{previewInvoice.items.map(it=> <tr key={it.id} className="border-t"><td className="p-2">{it.name}</td><td className="p-2 text-center">{it.qty}</td><td className="p-2 text-right">₹{it.rate}</td><td className="p-2 text-right">₹{it.qty*it.rate}</td></tr>)}</tbody></table>
            <div className="flex justify-end mt-4"><div className="w-[200px] text-[12px] space-y-1"><div className="flex justify-between"><span>Subtotal</span><span>₹{previewInvoice.subtotal}</span></div><div className="flex justify-between"><span>GST</span><span>₹{previewInvoice.gstTotal}</span></div><div className="flex justify-between font-bold border-t pt-1"><span>Total</span><span>₹{previewInvoice.total}</span></div></div></div>
          </div>
        </div>
      )}

      {/* Click outside handlers */}
      {newDropdownOpen && <div className="fixed inset-0 z-10" onClick={()=> setNewDropdownOpen(false)}/>}
      {notifOpen && <div className="fixed inset-0 z-10" onClick={()=> setNotifOpen(false)}/>}
    </div>
  );
}
