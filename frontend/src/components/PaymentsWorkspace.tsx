import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays, Plus, Search, X, CheckCircle2, Clock,
  AlertCircle, CreditCard, ArrowUpRight, Filter, RefreshCw
} from "lucide-react";
import { apiFetch } from "../lib/api";

type Summary = {
  invoice_id: string;
  invoice_number: string;
  invoice_total: string | number;
  client_name: string;
  client_company: string | null;
  due_date: string;
  total_paid: string | number;
  payment_method: string | null;
  latest_payment_date: string | null;
  invoice_created_by_name: string | null;
  payment_created_by_name: string | null;
};

type Invoice = {
  id: string;
  invoice_number: string;
  client_name: string;
  total: string | number;
};

const money = (value: number) =>
  `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export default function PaymentsWorkspace({
  dark = true,
  role,
}: {
  dark?: boolean;
  role: string;
}) {
  const [rows, setRows] = useState<Summary[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    invoiceId: "",
    amount: "",
    method: "UPI",
    paymentDate: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  const load = async () => {
    setLoading(true);
    try {
      const [summaryResponse, invoiceResponse] = await Promise.all([
        apiFetch("/api/payments/summary"),
        apiFetch("/api/invoices"),
      ]);
      const [summaryData, invoiceData] = await Promise.all([
        summaryResponse.json(),
        invoiceResponse.json(),
      ]);
      if (!summaryResponse.ok)
        throw new Error(summaryData.message || "Unable to load payments");
      setRows(summaryData.data ?? []);
      setInvoices(invoiceData.data ?? []);
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Unable to load payments"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const enriched = useMemo(() => {
    return rows.map((row) => {
      const total = Number(row.invoice_total);
      const paid = Number(row.total_paid);
      const remaining = Math.max(total - paid, 0);
      const overdue =
        remaining > 0 && new Date(row.due_date) < new Date(new Date().toDateString());
      const paymentStatus =
        remaining === 0 ? "Paid" : paid > 0 ? "Partially Paid" : "Unpaid";
      return {
        ...row,
        total,
        paid,
        remaining,
        overdue,
        paymentStatus,
        client: row.client_company || row.client_name,
      };
    });
  }, [rows]);

  const filtered = useMemo(() => {
    return enriched.filter(
      (row) =>
        (status === "ALL" || row.paymentStatus === status) &&
        `${row.invoice_number} ${row.client}`
          .toLowerCase()
          .includes(query.toLowerCase())
    );
  }, [enriched, status, query]);

  const stats = useMemo(
    () => ({
      invoiced: enriched.reduce((sum, row) => sum + row.total, 0),
      received: enriched.reduce((sum, row) => sum + row.paid, 0),
      due: enriched.reduce((sum, row) => sum + row.remaining, 0),
      overdue: enriched
        .filter((row) => row.overdue)
        .reduce((sum, row) => sum + row.remaining, 0),
    }),
    [enriched]
  );

  const selectedInvoice = invoices.find((inv) => inv.id === form.invoiceId);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setNotice("");
    setSaving(true);
    try {
      const response = await apiFetch("/api/payments", {
        method: "POST",
        body: JSON.stringify({
          invoiceId: form.invoiceId,
          amount: Number(form.amount),
          method: form.method,
          paymentDate: form.paymentDate,
          notes: form.notes || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to record payment");
      setOpen(false);
      setForm({
        invoiceId: "",
        amount: "",
        method: "UPI",
        paymentDate: new Date().toISOString().slice(0, 10),
        notes: "",
      });
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to record payment");
    } finally {
      setSaving(false);
    }
  };  const cardBg = dark ? "bg-[#0f172a] border-slate-800 text-slate-100 shadow-sm" : "bg-white border-slate-200/80 text-slate-900 shadow-sm";
  const inputBg = dark ? "bg-[#090d16] border-slate-800 text-slate-100 placeholder-slate-500 focus:border-slate-600" : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-slate-400";
  const muted = dark ? "text-slate-400" : "text-slate-500";
  const showCreatedBy = role === "SUPER_ADMIN";

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Payments Hub</h1>
          <p className={`text-xs mt-1 ${muted}`}>
            Real-time tracking of client invoices, settlements, and outstanding balances.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void load()}
            title="Refresh payments"
            className="tail-btn-secondary flex h-9 w-9 items-center justify-center p-0"
          >
            <RefreshCw size={14} className={loading ? "animate-spin text-indigo-400" : muted} />
          </button>
          <button
            onClick={() => {
              setNotice("");
              setOpen(true);
            }}
            className="tail-btn-primary flex items-center gap-1.5"
          >
            <Plus size={15} />
            <span>Record Payment</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards matching TailAdmin Metric style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Invoiced", value: stats.invoiced, icon: CreditCard, bg: "bg-indigo-500/10 text-indigo-500", tag: "Invoiced" },
          { label: "Total Collected", value: stats.received, icon: CheckCircle2, bg: "bg-emerald-500/10 text-emerald-500", tag: "Settled" },
          { label: "Pending Balance", value: stats.due, icon: Clock, bg: "bg-amber-500/10 text-amber-500", tag: "Due" },
          { label: "Overdue Balance", value: stats.overdue, icon: AlertCircle, bg: "bg-rose-500/10 text-rose-500", tag: "Overdue" },
        ].map((item) => (
          <div key={item.label} className="tail-card p-5 flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {item.label}
              </span>
              <h4 className="mt-2 text-2xl font-bold font-mono text-slate-900 dark:text-white">
                {money(Number(item.value))}
              </h4>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                  <ArrowUpRight size={13} /> Realtime
                </span>
                <span>• Live Ledger</span>
              </div>
            </div>
            <div className={`tail-metric-icon ${item.bg}`}>
              <item.icon size={22} />
            </div>
          </div>
        ))}
      </div>

      {/* Filters & Search Bar */}
      <div className="tail-card p-3 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search size={15} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${muted}`} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by client or invoice number..."
            className={`h-9 w-full rounded-xl border pl-9 pr-3 text-xs outline-none ${inputBg}`}
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          {["ALL", "Paid", "Partially Paid", "Unpaid"].map((st) => (
            <button
              key={st}
              onClick={() => setStatus(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                status === st
                  ? "bg-indigo-600 text-white shadow-xs font-bold"
                  : `${muted} hover:bg-slate-100 dark:hover:bg-slate-800`
              }`}
            >
              {st === "ALL" ? "All Statuses" : st}
            </button>
          ))}
        </div>
      </div>

      {/* Notice Banner */}
      {notice && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs font-semibold text-rose-500 dark:text-rose-400 flex items-center justify-between">
          <span>{notice}</span>
          <button onClick={() => setNotice("")} className="opacity-70 hover:opacity-100">
            <X size={15} />
          </button>
        </div>
      )}

      {/* Payments Table */}
      <div className="tail-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full text-xs">
            <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/40 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
              <tr>
                <th className="p-3.5 text-left">Invoice No</th>
                <th className="p-3.5 text-left">Client Name</th>
                <th className="p-3.5 text-right">Invoice Total</th>
                <th className="p-3.5 text-right">Settled Amount</th>
                <th className="p-3.5 text-right">Balance Due</th>
                <th className="p-3.5 text-left">Payment Method</th>
                <th className="p-3.5 text-left">Settlement Status</th>
                <th className="p-3.5 text-left">Payment Date</th>
                {showCreatedBy && <th className="p-3.5 text-left">Recorded By</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filtered.map((row) => (
                <tr key={row.invoice_id} className="hover:bg-white/5 transition">
                  <td className="p-3.5 font-bold font-mono text-indigo-400">{row.invoice_number}</td>
                  <td className="p-3.5 font-medium">{row.client}</td>
                  <td className="p-3.5 text-right font-mono font-semibold">{money(row.total)}</td>
                  <td className="p-3.5 text-right font-mono font-semibold text-emerald-400">
                    {money(row.paid)}
                  </td>
                  <td className="p-3.5 text-right font-mono font-semibold">
                    {row.remaining > 0 ? (
                      <span className="text-amber-400">{money(row.remaining)}</span>
                    ) : (
                      <span className="text-slate-500">₹0.00</span>
                    )}
                  </td>
                  <td className="p-3.5">
                    <span className="rounded-lg bg-white/5 px-2 py-1 text-[11px] font-mono">
                      {row.payment_method || "UPI"}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                        row.paymentStatus === "Paid"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : row.paymentStatus === "Partially Paid"
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          row.paymentStatus === "Paid"
                            ? "bg-emerald-400"
                            : row.paymentStatus === "Partially Paid"
                            ? "bg-amber-400"
                            : "bg-rose-400"
                        }`}
                      />
                      {row.paymentStatus}
                    </span>
                  </td>
                  <td className="p-3.5 font-mono text-slate-400">
                    {row.latest_payment_date
                      ? new Date(row.latest_payment_date).toLocaleDateString()
                      : "—"}
                  </td>
                  {showCreatedBy && (
                    <td className="p-3.5 text-slate-400">
                      {row.payment_created_by_name ||
                        row.invoice_created_by_name ||
                        "Super Admin"}
                    </td>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={showCreatedBy ? 9 : 8} className={`p-14 text-center text-xs ${muted}`}>
                    No payments found matching the selected criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !saving && setOpen(false)}
              className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className={`relative w-full max-w-lg rounded-3xl border p-6 shadow-2xl ${cardBg}`}
            >
              <div className="flex items-center justify-between border-b border-inherit pb-4 mb-4">
                <div>
                  <h2 className="text-base font-bold">Record Client Payment</h2>
                  <p className={`text-xs mt-0.5 ${muted}`}>
                    Credit client balance and automatically update invoice status.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-xl p-1.5 text-slate-400 hover:text-white transition"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${muted}`}>
                    Select Target Invoice *
                  </label>
                  <select
                    required
                    value={form.invoiceId}
                    onChange={(e) => setForm({ ...form, invoiceId: e.target.value })}
                    className={`h-11 w-full rounded-xl border px-3 text-xs outline-none focus:border-indigo-500 ${inputBg}`}
                  >
                    <option value="">Choose an invoice...</option>
                    {invoices.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoice_number} · {inv.client_name} ({money(Number(inv.total))})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedInvoice && (
                  <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-3 text-xs">
                    <div className="flex justify-between">
                      <span className={muted}>Client:</span>
                      <span className="font-bold text-white">{selectedInvoice.client_name}</span>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className={muted}>Invoice Total:</span>
                      <span className="font-mono font-bold text-indigo-400">
                        {money(Number(selectedInvoice.total))}
                      </span>
                    </div>
                  </div>
                )}

                <div>
                  <label className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${muted}`}>
                    Amount Received (₹) *
                  </label>
                  <input
                    required
                    min="0.01"
                    step="0.01"
                    type="number"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    placeholder="e.g. 25000"
                    className={`h-11 w-full rounded-xl border px-3 text-xs outline-none focus:border-indigo-500 ${inputBg}`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${muted}`}>
                      Payment Channel
                    </label>
                    <select
                      value={form.method}
                      onChange={(e) => setForm({ ...form, method: e.target.value })}
                      className={`h-11 w-full rounded-xl border px-3 text-xs outline-none focus:border-indigo-500 ${inputBg}`}
                    >
                      <option>UPI</option>
                      <option>Bank Transfer</option>
                      <option>Cheque</option>
                      <option>Cash</option>
                    </select>
                  </div>

                  <div>
                    <label className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${muted}`}>
                      Payment Date
                    </label>
                    <input
                      required
                      type="date"
                      value={form.paymentDate}
                      onChange={(e) => setForm({ ...form, paymentDate: e.target.value })}
                      className={`h-11 w-full rounded-xl border px-3 text-xs outline-none focus:border-indigo-500 ${inputBg}`}
                    />
                  </div>
                </div>

                <div>
                  <label className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${muted}`}>
                    Reference / Transaction Note
                  </label>
                  <textarea
                    rows={2}
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="UTR number, transaction id, or cheque details..."
                    className={`w-full rounded-xl border p-3 text-xs outline-none focus:border-indigo-500 ${inputBg}`}
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="tail-btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !form.invoiceId}
                    className="tail-btn-primary"
                  >
                    {saving ? "Recording..." : "Confirm & Settle Payment"}
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
