import { mkdir, readFile, rename, writeFile } from "fs/promises";
import { randomUUID } from "crypto";
import path from "path";

export type LocalLead = { id: string; full_name: string; company: string | null; email: string | null; phone: string | null; source: string; status: string; notes: string | null; assigned_to_id: string | null; created_at: string };
export type LocalFollowup = { id: string; lead_id: string | null; lead_name: string; company: string | null; property: string | null; type: string; followup_date: string; followup_time: string | null; assigned_to: string | null; priority: string | null; status: string; notes: string | null; created_at: string };
export type LocalClient = { id: string; name: string; company: string | null; email: string | null; phone: string | null; gst_number: string | null; created_at: string };
export type LocalInvoice = { id: string; invoice_number: string; client_id: string; client_name: string; total: number; paid_amount: number; due_date: string; created_by_id?: string; created_by_name?: string; created_at: string };
export type LocalExpense = { id: string; title: string; category: string; amount: number; expense_date: string | null; payment_method: string | null; description: string | null; created_at: string };
export type LocalPayment = { id: string; invoice_id: string; invoice_number?: string; amount: number; method: string; payment_date: string | null; notes: string | null; created_by_id?: string; created_by_name?: string; created_at: string };
export type LocalQuotation = { id: string; quotation_number: string; client_id: string | null; client_name: string; amount: number; valid_until: string; status: string; created_at: string };

type Store = {
  leads: LocalLead[];
  followups: LocalFollowup[];
  clients: LocalClient[];
  invoices: LocalInvoice[];
  expenses: LocalExpense[];
  payments: LocalPayment[];
  quotations: LocalQuotation[];
};

import os from "os";

const runtimeDir = process.env.VERCEL ? path.join(os.tmpdir(), "zootechx_runtime") : path.join(process.cwd(), ".runtime");
const file = path.join(runtimeDir, "crm-fallback.json");

const read = async (): Promise<Store> => {
  try {
    const data = JSON.parse(await readFile(file, "utf8")) as Partial<Store>;
    return {
      leads: data.leads ?? [],
      followups: data.followups ?? [],
      clients: data.clients ?? [],
      invoices: data.invoices ?? [],
      expenses: data.expenses ?? [
        { id: "exp-001", title: "AWS Cloud & Neon Infrastructure", category: "Operations", amount: 14500, expense_date: new Date().toISOString().slice(0, 10), payment_method: "Corporate Card", description: "Monthly cloud hosting & database tier", created_at: new Date().toISOString() }
      ],
      payments: data.payments ?? [],
      quotations: data.quotations ?? [
        { id: "q-001", quotation_number: "Q-2026-001", client_id: null, client_name: "Mehta Group", amount: 185000, valid_until: "2026-09-30", status: "Sent", created_at: new Date().toISOString() }
      ],
    };
  } catch {
    try {
      const defaultPath = path.join(__dirname, "default_data", "crm-fallback.json");
      const defaultData = JSON.parse(await readFile(defaultPath, "utf8")) as Partial<Store>;
      const initial: Store = {
        leads: defaultData.leads ?? [],
        followups: defaultData.followups ?? [],
        clients: defaultData.clients ?? [],
        invoices: defaultData.invoices ?? [],
        expenses: defaultData.expenses ?? [],
        payments: defaultData.payments ?? [],
        quotations: defaultData.quotations ?? [],
      };
      await save(initial).catch(() => {});
      return initial;
    } catch {}
    return {
      leads: [],
      followups: [],
      clients: [],
      invoices: [],
      expenses: [
        { id: "exp-001", title: "AWS Cloud & Neon Infrastructure", category: "Operations", amount: 14500, expense_date: new Date().toISOString().slice(0, 10), payment_method: "Corporate Card", description: "Monthly cloud hosting & database tier", created_at: new Date().toISOString() }
      ],
      payments: [],
      quotations: [
        { id: "q-001", quotation_number: "Q-2026-001", client_id: null, client_name: "Mehta Group", amount: 185000, valid_until: "2026-09-30", status: "Sent", created_at: new Date().toISOString() }
      ],
    };
  }
};

const save = async (store: Store) => {
  try {
    await mkdir(runtimeDir, { recursive: true });
    const temp = `${file}.tmp`;
    await writeFile(temp, JSON.stringify(store, null, 2));
    await rename(temp, file);
  } catch (err) {
    console.warn("Unable to persist crm store to disk:", err);
  }
};

export const listFallbackLeads = async () => (await read()).leads;
export async function addFallbackLead(input: Omit<LocalLead, "id" | "status" | "created_at">) {
  const store = await read();
  const lead: LocalLead = { ...input, id: randomUUID(), status: "NEW", created_at: new Date().toISOString() };
  store.leads.unshift(lead);
  await save(store);
  return lead;
}

export const listFallbackFollowups = async () => (await read()).followups.sort((a, b) => a.followup_date.localeCompare(b.followup_date));
export async function addFallbackFollowup(input: Omit<LocalFollowup, "id" | "created_at">) {
  const store = await read();
  const followup: LocalFollowup = { ...input, id: randomUUID(), created_at: new Date().toISOString() };
  store.followups.unshift(followup);
  await save(store);
  return followup;
}

export const listFallbackClients = async () => (await read()).clients;
export async function addFallbackClient(input: Omit<LocalClient, "id" | "created_at">) {
  const store = await read();
  const client: LocalClient = { ...input, id: randomUUID(), created_at: new Date().toISOString() };
  store.clients.unshift(client);
  await save(store);
  return client;
}

export const listFallbackInvoices = async (createdById?: string) =>
  (await read()).invoices.filter((invoice) => !createdById || invoice.created_by_id === createdById);
export async function addFallbackInvoice(input: Omit<LocalInvoice, "id" | "created_at">) {
  const store = await read();
  const invoice: LocalInvoice = { ...input, id: randomUUID(), created_at: new Date().toISOString() };
  store.invoices.unshift(invoice);
  await save(store);
  return invoice;
}

export const listFallbackExpenses = async () => (await read()).expenses;
export async function addFallbackExpense(input: Omit<LocalExpense, "id" | "created_at">) {
  const store = await read();
  const expense: LocalExpense = { ...input, id: randomUUID(), created_at: new Date().toISOString() };
  store.expenses.unshift(expense);
  await save(store);
  return expense;
}

export const listFallbackPayments = async () => (await read()).payments;
export async function addFallbackPayment(input: Omit<LocalPayment, "id" | "created_at">) {
  const store = await read();
  const payment: LocalPayment = { ...input, id: randomUUID(), created_at: new Date().toISOString() };
  store.payments.unshift(payment);
  // Also update paid_amount in invoice if matched
  const inv = store.invoices.find((i) => i.id === input.invoice_id || i.invoice_number === input.invoice_number);
  if (inv) {
    inv.paid_amount = Number(inv.paid_amount || 0) + Number(input.amount);
  }
  await save(store);
  return payment;
}

export const listFallbackQuotations = async () => (await read()).quotations;
export async function addFallbackQuotation(input: Omit<LocalQuotation, "id" | "created_at">) {
  const store = await read();
  const quotation: LocalQuotation = { ...input, id: randomUUID(), created_at: new Date().toISOString() };
  store.quotations.unshift(quotation);
  await save(store);
  return quotation;
}

export async function updateFallbackLead(id: string, updates: Partial<LocalLead>) {
  const store = await read();
  const index = store.leads.findIndex((l) => l.id === id);
  if (index === -1) return null;
  store.leads[index] = { ...store.leads[index], ...updates };
  await save(store);
  return store.leads[index];
}

export async function deleteFallbackLead(id: string) {
  const store = await read();
  const initialLength = store.leads.length;
  store.leads = store.leads.filter((l) => l.id !== id);
  if (store.leads.length !== initialLength) {
    await save(store);
    return true;
  }
  return false;
}

export async function convertFallbackLead(id: string) {
  const store = await read();
  const lead = store.leads.find((l) => l.id === id);
  if (!lead) return null;
  lead.status = "CONVERTED";
  let client = store.clients.find((c) => c.name.toLowerCase() === lead.full_name.toLowerCase());
  if (!client) {
    client = {
      id: randomUUID(),
      name: lead.full_name,
      company: lead.company,
      email: lead.email,
      phone: lead.phone ?? "N/A",
      gst_number: null,
      created_at: new Date().toISOString()
    };
    store.clients.unshift(client);
  }
  await save(store);
  return { ...lead, client };
}

export async function updateFallbackFollowup(id: string, updates: Partial<LocalFollowup>) {
  const store = await read();
  const index = store.followups.findIndex((f) => f.id === id);
  if (index === -1) return null;
  store.followups[index] = { ...store.followups[index], ...updates };
  await save(store);
  return store.followups[index];
}

export async function completeFallbackFollowup(id: string) {
  const store = await read();
  const index = store.followups.findIndex((f) => f.id === id);
  if (index === -1) return null;
  store.followups[index].status = "Completed";
  await save(store);
  return store.followups[index];
}

export async function deleteFallbackFollowup(id: string) {
  const store = await read();
  const initialLength = store.followups.length;
  store.followups = store.followups.filter((f) => f.id !== id);
  if (store.followups.length !== initialLength) {
    await save(store);
    return true;
  }
  return false;
}

export async function convertFallbackQuotationToInvoice(id: string, creatorId: string, creatorName: string) {
  const store = await read();
  const quote = store.quotations.find((q) => q.id === id || q.quotation_number === id);
  if (!quote) throw new Error("Quotation not found");
  quote.status = "CONVERTED";

  let clientId = quote.client_id;
  if (!clientId) {
    const existingClient = store.clients.find((c) => c.name.toLowerCase() === quote.client_name.toLowerCase());
    if (existingClient) {
      clientId = existingClient.id;
    } else {
      const newClient: LocalClient = {
        id: randomUUID(),
        name: quote.client_name,
        company: quote.client_name,
        email: null,
        phone: "N/A",
        gst_number: null,
        created_at: new Date().toISOString(),
      };
      store.clients.unshift(newClient);
      clientId = newClient.id;
    }
  }

  const invoiceNumber = `INV-${new Date().getFullYear()}-${String(store.invoices.length + 1).padStart(3, "0")}`;
  const invoice: LocalInvoice = {
    id: randomUUID(),
    invoice_number: invoiceNumber,
    client_id: clientId,
    client_name: quote.client_name,
    total: quote.amount,
    paid_amount: 0,
    due_date: quote.valid_until || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    created_by_id: creatorId,
    created_by_name: creatorName,
    created_at: new Date().toISOString(),
  };
  store.invoices.unshift(invoice);
  await save(store);
  return { quotation: quote, invoice };
}

