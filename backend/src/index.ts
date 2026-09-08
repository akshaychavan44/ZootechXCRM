import "dotenv/config";
import bcrypt from "bcryptjs";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import cors from "cors";
import express, { Request, Response } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { z } from "zod";
import { allow, AuthRequest, requireAuth, signToken } from "./auth";
import { sql } from "./db/client";
import {
  addFallbackClient,
  addFallbackExpense,
  addFallbackFollowup,
  addFallbackInvoice,
  addFallbackLead,
  addFallbackPayment,
  addFallbackQuotation,
  completeFallbackFollowup,
  convertFallbackLead,
  deleteFallbackFollowup,
  deleteFallbackLead,
  listFallbackClients,
  listFallbackExpenses,
  listFallbackFollowups,
  listFallbackInvoices,
  listFallbackLeads,
  listFallbackPayments,
  listFallbackQuotations,
  updateFallbackFollowup,
  updateFallbackLead,
  convertFallbackQuotationToInvoice,
} from "./db/crmFallback";
import { addFallbackUpdate, createFallbackDeveloper, createFallbackProject, fallbackDeveloperOverview, fallbackProject, findFallbackDeveloper, listFallbackProjects, listFallbackUpdates, removeFallbackDeveloper, setFallbackProjectStatus } from "./db/deliveryFallback";
import {
  createCompanyTask,
  createDailyUpdate,
  createManagedUser,
  createSow,
  deleteCompanyTask,
  deleteManagedUser,
  findManagedUserByEmail,
  findManagedUserById,
  generateSowShareLink,
  getActiveSowTemplate,
  getCompanySettings,
  getSowById,
  getSowByShareToken,
  getSowTemplateHistory,
  listAuditLogs,
  listDailyUpdates,
  listDeveloperIssues,
  createDeveloperIssue,
  updateDeveloperIssueStatus,
  listManagedUsers,
  listSows,
  listSowTemplates,
  listTasks,
  recordAuditLog,
  recordSowEmailHistory,
  clearReadPersistentNotifications,
  createPersistentNotification,
  listPersistentNotifications,
  markAllPersistentNotificationsRead,
  markPersistentNotificationRead,
  replaceActiveSowTemplate,
  resetManagedUserPassword,
  revokeSowShareLink,
  updateCompanySettings,
  updateCompanyTask,
  updateManagedUser,
  updateSow,
} from "./db/coreStore";

async function withDbTimeout<T>(promise: Promise<T>, ms = 1200): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("Database timeout")), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

import {
  addMarketingClient,
  addMarketingClientAsset,
  addMarketingClientProject,
  createMarketingCampaign,
  createMarketingCreative,
  deleteMarketingCampaign,
  deleteMarketingClient,
  deleteMarketingClientAsset,
  deleteMarketingClientProject,
  deleteMarketingCreative,
  getMarketingClientsOverview,
  getMarketingOverview,
  getUnsyncedMarketingLeads,
  listMarketingCampaigns,
  listMarketingClientAssets,
  listMarketingClientProjects,
  listMarketingClients,
  listMarketingCreatives,
  listMarketingLeads,
  markMarketingLeadSynced,
  toggleMarketingCampaignStatus,
  updateMarketingCampaign,
  updateMarketingClient,
  updateMarketingClientAsset,
  updateMarketingClientProject,
} from "./db/marketingFallback";
import { findDemoUser, isDemoPassword } from "./demoUsers";
type UserRow = { id: string; name: string; email: string; role: "SUPER_ADMIN" | "SUB_ADMIN" | "SALES" | "DEVELOPER" | "DIGITAL_MARKETING"; password_hash: string; must_change_password?: boolean; is_active?: boolean };
const app = express();
app.set("trust proxy", 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json({ limit: "1mb" }));
app.use((req, _res, next) => {
  if (!req.url.startsWith("/api")) {
    req.url = `/api${req.url.startsWith("/") ? "" : "/"}${req.url}`;
  }
  next();
});
app.use(rateLimit({ windowMs: 900_000, limit: 5_000, standardHeaders: "draft-7", validate: { xForwardedForHeader: false } }));
const login = z.object({ email: z.string().email(), password: z.string().min(8) });
const changePasswordInput = z.object({ currentPassword: z.string().min(8), newPassword: z.string().min(8).max(128) });
const leadInput = z.object({ fullName: z.string().min(2), company: z.string().max(160).optional(), email: z.string().email().optional(), phone: z.string().max(30).optional(), source: z.string().min(2), notes: z.string().optional(), status: z.enum(["NEW", "CONTACTED", "FOLLOW_UP", "INTERESTED", "QUOTATION_SENT", "NEGOTIATION", "CONVERTED", "LOST"]).optional() });
const leadStatus = z.enum(["NEW", "CONTACTED", "FOLLOW_UP", "INTERESTED", "QUOTATION_SENT", "NEGOTIATION", "CONVERTED", "LOST"]);
const leadUpdateInput = z.object({ fullName: z.string().min(2).optional(), company: z.string().max(160).nullable().optional(), email: z.string().email().nullable().optional(), phone: z.string().max(30).nullable().optional(), source: z.string().min(2).optional(), notes: z.string().nullable().optional(), status: leadStatus.optional() }).refine(data => Object.keys(data).length > 0, { message: "At least one lead field is required" });
const followupInput = z.object({ leadId: z.string().optional(), leadName: z.string().min(2).max(160), company: z.string().max(160).optional(), property: z.string().max(300).optional(), type: z.string().min(2).max(40), date: z.string().date(), time: z.string().max(32).optional(), assignedTo: z.string().max(120).optional(), priority: z.string().max(20).optional(), status: z.string().max(30).optional(), notes: z.string().max(2000).optional() });
const followupUpdateInput = z.object({ leadName: z.string().min(2).max(160).optional(), company: z.string().max(160).nullable().optional(), property: z.string().max(300).nullable().optional(), type: z.string().min(2).max(40).optional(), date: z.string().date().optional(), time: z.string().max(32).nullable().optional(), assignedTo: z.string().max(120).nullable().optional(), priority: z.string().max(20).nullable().optional(), status: z.string().max(30).optional(), notes: z.string().max(2000).nullable().optional(), completed: z.boolean().optional() }).refine(data => Object.keys(data).length > 0, { message: "At least one follow-up field is required" });
const clientInput = z.object({ name: z.string().optional(), businessName: z.string().optional(), company: z.string().max(160).optional().nullable(), email: z.string().max(255).optional().nullable(), phone: z.string().max(30).optional().nullable(), gstNumber: z.string().max(30).optional().nullable(), gstin: z.string().max(30).optional().nullable() });
const quotationInput = z.object({ clientId: z.string().uuid().optional(), clientName: z.string().min(2).max(160), amount: z.number().positive(), validUntil: z.string().date(), status: z.enum(["Draft", "Sent", "Accepted"]).default("Draft") });
const invoiceInput = z.object({ invoiceNumber: z.string().min(3).max(32), clientId: z.string().min(1), clientName: z.string().min(1).max(160).optional(), total: z.number().positive(), paidAmount: z.number().min(0).optional(), dueDate: z.string().datetime() });
const expenseInput = z.object({ title: z.string().min(2).max(160), category: z.string().min(2).max(80), amount: z.number().positive(), expenseDate: z.string().date().optional(), paymentMethod: z.string().min(2).max(40).optional(), description: z.string().max(2000).optional() });
const paymentInput = z.object({ invoiceId: z.string().uuid(), amount: z.number().positive(), method: z.enum(["Cash", "UPI", "Bank Transfer", "Cheque"]), paymentDate: z.string().date().optional(), notes: z.string().max(2000).optional() });
const developerInput = z.object({ name: z.string().min(2).max(120), email: z.string().email(), password: z.string().min(8) });
const projectStatus = z.enum(["NEW", "PENDING", "IN_PROGRESS", "COMPLETED"]);
const projectInput = z.object({ name: z.string().min(2).max(160), clientName: z.string().max(160).optional(), description: z.string().max(5000).optional(), priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"), status: projectStatus.default("NEW"), dueDate: z.string().date().optional(), assignedDeveloperId: z.string().uuid() });
const projectStatusInput = z.object({ status: projectStatus });
const projectUpdateInput = z.object({ message: z.string().max(5000).optional().default(""), progress: z.number().int().min(0).max(100), status: projectStatus.optional() });
const vaultItemInput = z.object({ label: z.string().min(2).max(120), service: z.string().min(2).max(160), username: z.string().min(1).max(500), secret: z.string().min(1).max(4000), notes: z.string().max(2000).optional() });
const campaignInput = z.object({
  name: z.string().min(2).max(160),
  platform: z.string().min(2).max(60),
  channel: z.string().min(2).max(60),
  objective: z.string().min(2).max(60),
  budget: z.number().positive(),
  targetAudience: z.string().max(500).optional(),
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
});
const campaignUpdateInput = z.object({
  name: z.string().min(2).max(160).optional(),
  budget: z.number().positive().optional(),
  status: z.enum(["ACTIVE", "PAUSED", "COMPLETED"]).optional(),
  targetAudience: z.string().max(500).optional(),
  channel: z.string().max(60).optional(),
  platform: z.string().max(60).optional(),
}).refine(data => Object.keys(data).length > 0, { message: "At least one field is required for update" });
const creativeInput = z.object({
  campaignId: z.string().optional(),
  title: z.string().min(2).max(160),
  format: z.enum(["Video", "Carousel", "Single Image", "Story"]),
  headline: z.string().min(2).max(300),
  primaryText: z.string().min(2).max(2000),
  cta: z.string().min(2).max(60),
});
const vaultKey = (): Buffer => {
  const value = process.env.VAULT_ENCRYPTION_KEY;
  if (value) {
    try {
      const key = Buffer.from(value, "base64");
      if (key.length === 32) return key;
    } catch {}
    return createHash("sha256").update(value).digest();
  }
  const fallbackSeed = process.env.JWT_SECRET || "zootechx-secure-vault-encryption-seed-2026";
  return createHash("sha256").update(fallbackSeed).digest();
};
const encryptVaultValue = (value: string, key: Buffer, iv: Buffer) => { const cipher = createCipheriv("aes-256-gcm", key, iv); return { value: Buffer.concat([cipher.update(value, "utf8"), cipher.final()]).toString("base64"), tag: cipher.getAuthTag().toString("base64") }; };
const decryptVaultValue = (value: string, tag: string, key: Buffer, iv: Buffer) => { const decipher = createDecipheriv("aes-256-gcm", key, iv); decipher.setAuthTag(Buffer.from(tag, "base64")); return Buffer.concat([decipher.update(Buffer.from(value, "base64")), decipher.final()]).toString("utf8"); };
app.get("/api/health", async (_request, response) => {
  try {
    await withDbTimeout(sql`SELECT 1`, 800);
    response.json({ status: "ok", database: "neon" });
  } catch {
    response.json({ status: "ok", database: "offline_fallback" });
  }
});
app.post("/api/auth/login", async (request: Request, response: Response) => {
  const parsed = login.safeParse(request.body);
  if (!parsed.success) { response.status(400).json({ message: "Valid email and password are required" }); return; }
  const email = parsed.data.email.toLowerCase();
  const password = parsed.data.password;

  // 1. Check known demo accounts with demo password
  const demoUser = findDemoUser(email);
  if (demoUser && isDemoPassword(password)) {
    try {
      const rows = await withDbTimeout(sql`SELECT id, name, email, role, must_change_password, is_active FROM users WHERE email = ${email} LIMIT 1`, 800);
      if (rows[0]) {
        const u = rows[0] as UserRow;
        response.json({ token: signToken(u.id, u.role), mustChangePassword: Boolean(u.must_change_password), user: { id: u.id, name: u.name, email: u.email, role: u.role } });
        return;
      }
    } catch {}
    response.json({ token: signToken(demoUser.id, demoUser.role), mustChangePassword: false, user: demoUser, demo: true });
    return;
  }

  // 2. Query database for registered user accounts
  try {
    const rows = await withDbTimeout(sql`SELECT id, name, email, role, password_hash, must_change_password, is_active FROM users WHERE email = ${email} LIMIT 1`, 1000);
    const user = rows[0] as UserRow | undefined;
    if (user && (await bcrypt.compare(password, user.password_hash))) {
      if (!user.is_active) { response.status(403).json({ message:"This account is inactive. Contact your Super Admin." }); return; }
      response.json({ token: signToken(user.id, user.role), mustChangePassword: Boolean(user.must_change_password), user: { id: user.id, name: user.name, email: user.email, role: user.role } });
      return;
    }
  } catch {}

  const managedUser = await findManagedUserByEmail(email);
  if (managedUser && (await bcrypt.compare(password, managedUser.password_hash))) {
    if (!managedUser.is_active) {
      response.status(403).json({ message: "This account is inactive. Contact your Super Admin." });
      return;
    }
    await recordAuditLog("USER_LOGIN", "USER", managedUser.id, `${managedUser.name} logged in`, managedUser.id, managedUser.name).catch(() => {});
    response.json({
      token: signToken(managedUser.id, managedUser.role),
      mustChangePassword: Boolean(managedUser.must_change_password),
      user: { id: managedUser.id, name: managedUser.name, email: managedUser.email, role: managedUser.role },
      managed: true,
    });
    return;
  }

  const fallbackDeveloper = await findFallbackDeveloper(email);
  if (fallbackDeveloper && await bcrypt.compare(password, fallbackDeveloper.password_hash)) {
    response.json({ token: signToken(fallbackDeveloper.id, fallbackDeveloper.role), user: { id: fallbackDeveloper.id, name: fallbackDeveloper.name, email: fallbackDeveloper.email, role: fallbackDeveloper.role }, fallback: true });
    return;
  }
  if (demoUser && isDemoPassword(password)) {
    response.json({ token: signToken(demoUser.id, demoUser.role), user: demoUser, offline: true });
    return;
  }
  response.status(401).json({ message: "Invalid email or password" });
});
app.post("/api/auth/change-password", requireAuth, async (request: AuthRequest, response: Response) => {
  const parsed = changePasswordInput.safeParse(request.body);
  if (!parsed.success) { response.status(400).json({ message: "Current and new passwords must be at least 8 characters." }); return; }
  if (parsed.data.currentPassword === parsed.data.newPassword) { response.status(400).json({ message: "Your new password must be different from your current password." }); return; }
  try {
    const users = await withDbTimeout(sql`SELECT id, password_hash FROM users WHERE id = ${request.user!.id} LIMIT 1`, 1000);
    const user = users[0] as { id: string; password_hash: string } | undefined;
    if (!user) { response.status(404).json({ message: "Account not found." }); return; }
    if (!(await bcrypt.compare(parsed.data.currentPassword, user.password_hash))) { response.status(401).json({ message: "Your current password is incorrect." }); return; }
    const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
    await withDbTimeout(sql`UPDATE users SET password_hash = ${passwordHash}, must_change_password = false, updated_at = now() WHERE id = ${request.user!.id}`, 1000);
    response.json({ message: "Password changed successfully." });
  } catch {
    response.status(503).json({ message: "Unable to change password right now." });
  }
});
app.get("/api/auth/me", requireAuth, async (request: AuthRequest, response) => {
  try {
    const rows = await withDbTimeout(sql`SELECT id, name, email, role FROM users WHERE id = ${request.user!.id} LIMIT 1`, 800);
    const managed = await findManagedUserById(request.user!.id);
    response.json({ user: rows[0] ?? (managed ? { id: managed.id, name: managed.name, email: managed.email, role: managed.role } : findDemoUser(request.user!.id)) ?? null });
  } catch {
    const managed = await findManagedUserById(request.user!.id);
    response.json({ user: (managed ? { id: managed.id, name: managed.name, email: managed.email, role: managed.role } : findDemoUser(request.user!.id)) ?? null, offline: true });
  }
});
export function recordNotification(title: string, message: string, userId?: string) {
  // 1. Always persist to core store so notifications survive restarts, refreshes & serverless cold-starts
  createPersistentNotification(title, message, userId).then((notif) => {
    // 2. Also insert into PostgreSQL table if available with exact ID
    withDbTimeout(sql`INSERT INTO notifications (id, user_id, title, message, is_read, created_at) VALUES (${notif.id}, ${userId || null}, ${title}, ${message}, false, now())`, 800).catch(() => {});
  }).catch(() => {});
}

app.get("/api/notifications", requireAuth, async (request: AuthRequest, response) => {
  const isAdmin = request.user?.role === "SUPER_ADMIN" || request.user?.role === "SUB_ADMIN";
  const userId = request.user?.id;

  let dbRows: any[] = [];
  try {
    if (isAdmin) {
      dbRows = await withDbTimeout(sql`SELECT id, user_id, title, message, is_read, created_at FROM notifications WHERE hidden_from_bell = false AND NOT (is_read = true AND created_at < now() - interval '7 days') ORDER BY created_at DESC LIMIT 50`, 800);
    } else {
      dbRows = await withDbTimeout(sql`SELECT id, user_id, title, message, is_read, created_at FROM notifications WHERE (user_id = ${userId} OR user_id IS NULL) AND hidden_from_bell = false AND NOT (is_read = true AND created_at < now() - interval '7 days') ORDER BY created_at DESC LIMIT 50`, 800);
    }
  } catch {
    dbRows = [];
  }

  // Fetch persistent notifications from core store
  const persistentRows = await listPersistentNotifications(userId, isAdmin);

  const combined: any[] = [...dbRows];
  const seenIds = new Set(dbRows.map((r: any) => String(r.id)));
  const seenKeys = new Set(dbRows.map((r: any) => `${r.title}:::${r.message}`));

  for (const p of persistentRows) {
    const key = `${p.title}:::${p.message}`;
    if (!seenIds.has(p.id) && !seenKeys.has(key)) {
      combined.push(p);
      seenIds.add(p.id);
      seenKeys.add(key);
    }
  }

  combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  response.json({ data: combined.slice(0, 40) });
});

app.get("/api/notifications/history", requireAuth, async (request: AuthRequest, response) => {
  const isAdmin = request.user?.role === "SUPER_ADMIN" || request.user?.role === "SUB_ADMIN";
  const userId = request.user?.id;
  try {
    const rows = await withDbTimeout(
      isAdmin
        ? sql`SELECT id, user_id, title, message, is_read, created_at FROM notifications ORDER BY created_at DESC LIMIT 100`
        : sql`SELECT id, user_id, title, message, is_read, created_at FROM notifications WHERE (user_id = ${userId} OR user_id IS NULL) ORDER BY created_at DESC LIMIT 100`,
      800
    );
    response.json({ data: rows });
  } catch {
    const persistent = await listPersistentNotifications(userId, isAdmin);
    response.json({ data: persistent });
  }
});

app.patch("/api/notifications/:id/read", requireAuth, async (request: AuthRequest, response) => {
  const notifId = String(request.params.id);
  const isAdmin = request.user?.role === "SUPER_ADMIN" || request.user?.role === "SUB_ADMIN";
  const userId = request.user?.id;

  // 1. Persistent store
  await markPersistentNotificationRead(notifId, userId, isAdmin).catch(() => {});

  // 2. PostgreSQL
  try {
    if (isAdmin) {
      await withDbTimeout(sql`UPDATE notifications SET is_read = true WHERE id = ${notifId}`, 800);
    } else {
      await withDbTimeout(sql`UPDATE notifications SET is_read = true WHERE id = ${notifId} AND (user_id = ${userId} OR user_id IS NULL)`, 800);
    }
  } catch {}

  response.json({ data: { id: notifId, is_read: true } });
});

app.post("/api/notifications/read-all", requireAuth, async (request: AuthRequest, response) => {
  const isAdmin = request.user?.role === "SUPER_ADMIN" || request.user?.role === "SUB_ADMIN";
  const userId = request.user?.id;

  // 1. Persistent store
  await markAllPersistentNotificationsRead(userId, isAdmin).catch(() => {});

  // 2. PostgreSQL
  try {
    if (isAdmin) {
      await withDbTimeout(sql`UPDATE notifications SET is_read = true WHERE is_read = false`, 800);
    } else {
      await withDbTimeout(sql`UPDATE notifications SET is_read = true WHERE (user_id = ${userId} OR user_id IS NULL) AND is_read = false`, 800);
    }
  } catch {}

  response.status(204).send();
});

app.post("/api/notifications/clear-read", requireAuth, async (request: AuthRequest, response) => {
  const isAdmin = request.user?.role === "SUPER_ADMIN" || request.user?.role === "SUB_ADMIN";
  const userId = request.user?.id;

  // 1. Persistent store
  await clearReadPersistentNotifications(userId, isAdmin).catch(() => {});

  // 2. PostgreSQL
  try {
    if (isAdmin) {
      await withDbTimeout(sql`UPDATE notifications SET hidden_from_bell = true WHERE is_read = true`, 800);
    } else {
      await withDbTimeout(sql`UPDATE notifications SET hidden_from_bell = true WHERE (user_id = ${userId} OR user_id IS NULL) AND is_read = true`, 800);
    }
  } catch {}

  response.status(204).send();
});
app.get("/api/leads", requireAuth, async (_request: AuthRequest, response) => {
  try {
    const rows = await withDbTimeout(sql`SELECT * FROM leads ORDER BY created_at DESC`, 1200);
    response.json({ data: rows });
  } catch {
    const fallback = await listFallbackLeads();
    response.json({ data: fallback, offline: true });
  }
});
app.post("/api/leads", requireAuth, allow("SUPER_ADMIN", "SUB_ADMIN", "SALES"), async (request: AuthRequest, response) => {
  const parsed = leadInput.safeParse(request.body);
  if (!parsed.success) { response.status(400).json({ message: "Invalid lead", errors: parsed.error.flatten() }); return; }
  const data = parsed.data;
  try {
    const rows = await withDbTimeout(sql`INSERT INTO leads (full_name, company, email, phone, source, notes, status, assigned_to_id) VALUES (${data.fullName}, ${data.company ?? null}, ${data.email ?? null}, ${data.phone ?? null}, ${data.source}, ${data.notes ?? null}, ${data.status ?? "NEW"}, ${request.user!.id}) RETURNING *`, 1200);
    recordNotification("New Lead Created", `${data.fullName}${data.company ? ` (${data.company})` : ""} was added to CRM`, request.user!.id);
    response.status(201).json({ data: rows[0] });
  } catch {
    const lead = await addFallbackLead({
      full_name: data.fullName,
      company: data.company ?? null,
      email: data.email ?? null,
      phone: data.phone ?? null,
      source: data.source,
      notes: data.notes ?? null,
      assigned_to_id: request.user!.id,
    });
    recordNotification("New Lead Created", `${data.fullName}${data.company ? ` (${data.company})` : ""} was added to CRM`, request.user!.id);
    response.status(201).json({ data: lead, fallback: true });
  }
});
app.patch("/api/leads/:id", requireAuth, allow("SUPER_ADMIN", "SUB_ADMIN", "SALES"), async (request, response) => {
  const parsed = leadUpdateInput.safeParse(request.body);
  if (!parsed.success) { response.status(400).json({ message:"Invalid lead update", errors:parsed.error.flatten() }); return; }
  const data = parsed.data;
  try {
    const rows = await withDbTimeout(sql`UPDATE leads SET full_name = COALESCE(${data.fullName ?? null}, full_name), company = CASE WHEN ${data.company !== undefined} THEN ${data.company ?? null} ELSE company END, email = CASE WHEN ${data.email !== undefined} THEN ${data.email ?? null} ELSE email END, phone = CASE WHEN ${data.phone !== undefined} THEN ${data.phone ?? null} ELSE phone END, source = COALESCE(${data.source ?? null}, source), notes = CASE WHEN ${data.notes !== undefined} THEN ${data.notes ?? null} ELSE notes END, status = COALESCE(${data.status ?? null}, status) WHERE id = ${String(request.params.id)} RETURNING *`, 1200);
    if (!rows[0]) { response.status(404).json({ message:"Lead not found" }); return; }
    response.json({ data:rows[0] });
  } catch {
    const updated = await updateFallbackLead(String(request.params.id), {
      ...(data.fullName ? { full_name: data.fullName } : {}),
      ...(data.company !== undefined ? { company: data.company } : {}),
      ...(data.email !== undefined ? { email: data.email } : {}),
      ...(data.phone !== undefined ? { phone: data.phone } : {}),
      ...(data.source ? { source: data.source } : {}),
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
      ...(data.status ? { status: data.status } : {}),
    });
    if (!updated) { response.status(404).json({ message:"Lead not found" }); return; }
    response.json({ data: updated, fallback: true });
  }
});
app.delete("/api/leads/:id", requireAuth, allow("SUPER_ADMIN", "SUB_ADMIN", "SALES"), async (request, response) => {
  try {
    const rows = await withDbTimeout(sql`DELETE FROM leads WHERE id = ${String(request.params.id)} RETURNING id`, 1200);
    if (!rows[0]) { response.status(404).json({ message:"Lead not found" }); return; }
    response.status(204).send();
  } catch {
    const deleted = await deleteFallbackLead(String(request.params.id));
    if (!deleted) { response.status(404).json({ message:"Lead not found" }); return; }
    response.status(204).send();
  }
});
app.post("/api/leads/:id/convert", requireAuth, allow("SUPER_ADMIN", "SUB_ADMIN", "SALES"), async (request: AuthRequest, response) => {
  try {
    const rows = await withDbTimeout(sql`
      WITH source_lead AS (
        SELECT id, full_name, company, email, phone FROM leads
        WHERE id = ${String(request.params.id)} AND customer_id IS NULL AND status <> 'CONVERTED'::lead_status
        FOR UPDATE
      ), existing_client AS (
        SELECT clients.* FROM clients JOIN source_lead ON clients.name = source_lead.full_name AND clients.email IS NOT DISTINCT FROM source_lead.email LIMIT 1
      ), new_client AS (
        INSERT INTO clients (name, company, email, phone)
        SELECT full_name, company, email, phone FROM source_lead WHERE NOT EXISTS (SELECT 1 FROM existing_client)
        RETURNING *
      ), linked_client AS (
        SELECT * FROM existing_client UNION ALL SELECT * FROM new_client
      ), converted_lead AS (
        UPDATE leads SET status = 'CONVERTED', customer_id = (SELECT id FROM linked_client LIMIT 1), converted_at = now()
        WHERE id = (SELECT id FROM source_lead) RETURNING *
      ) SELECT converted_lead.*, (SELECT row_to_json(linked_client) FROM linked_client LIMIT 1) AS client FROM converted_lead
    `, 1500);
    if (!rows[0]) {
      const lead = await sql`SELECT id, customer_id, status FROM leads WHERE id = ${String(request.params.id)} LIMIT 1`;
      response.status(lead[0] ? 409 : 404).json({ message:lead[0] ? "Lead has already been converted" : "Lead not found" }); return;
    }
    recordNotification("Lead Converted", `${rows[0].full_name || "Lead"} has been converted to an active client`, request.user!.id);
    response.json({ data:rows[0], client:rows[0].client });
  } catch {
    const res = await convertFallbackLead(String(request.params.id));
    if (!res) { response.status(404).json({ message: "Lead not found" }); return; }
    recordNotification("Lead Converted", `${res.full_name || "Lead"} has been converted to an active client`, request.user!.id);
    response.json({ data: res, client: res.client, fallback: true });
  }
});
app.get("/api/followups", requireAuth, allow("SUPER_ADMIN", "SUB_ADMIN", "SALES"), async (_request, response) => {
  try {
    const rows = await withDbTimeout(sql`SELECT * FROM followups ORDER BY followup_date ASC, followup_time ASC NULLS LAST`, 1200);
    response.json({ data: rows });
  } catch {
    response.json({ data: await listFallbackFollowups(), fallback: true });
  }
});
app.post("/api/followups", requireAuth, allow("SUPER_ADMIN", "SUB_ADMIN", "SALES"), async (request: AuthRequest, response) => {
  const parsed = followupInput.safeParse(request.body);
  if (!parsed.success) { response.status(400).json({ message: "Invalid follow-up", errors: parsed.error.flatten() }); return; }
  const data = parsed.data;
  try {
    const rows = await withDbTimeout(sql`INSERT INTO followups (lead_id, lead_name, company, property, type, followup_date, followup_time, assigned_to, priority, status, notes) VALUES (${data.leadId ?? null}, ${data.leadName}, ${data.company ?? null}, ${data.property ?? null}, ${data.type}, ${data.date}, ${data.time ?? null}, ${data.assignedTo ?? null}, ${data.priority ?? null}, ${data.status ?? "Scheduled"}, ${data.notes ?? null}) RETURNING *`, 1200);
    recordNotification("Follow-up Scheduled", `Follow-up with ${data.leadName} scheduled for ${data.date}`, request.user!.id);
    response.status(201).json({ data: rows[0] });
  } catch {
    const followup = await addFallbackFollowup({
      lead_id: data.leadId ?? null,
      lead_name: data.leadName,
      company: data.company ?? null,
      property: data.property ?? null,
      type: data.type,
      followup_date: data.date,
      followup_time: data.time ?? null,
      assigned_to: data.assignedTo ?? null,
      priority: data.priority ?? null,
      status: data.status ?? "Scheduled",
      notes: data.notes ?? null,
    });
    recordNotification("Follow-up Scheduled", `Follow-up with ${data.leadName} scheduled for ${data.date}`, request.user!.id);
    response.status(201).json({ data: followup, fallback: true });
  }
});
app.patch("/api/followups/:id", requireAuth, allow("SUPER_ADMIN", "SUB_ADMIN", "SALES"), async (request: AuthRequest, response) => {
  const parsed = followupUpdateInput.safeParse(request.body);
  if (!parsed.success) { response.status(400).json({ message:"Invalid follow-up update", errors:parsed.error.flatten() }); return; }
  const data = parsed.data;
  try {
    const markCompleted = data.completed === true || data.status === "Completed";
    const rows = await withDbTimeout(sql`UPDATE followups SET lead_name = COALESCE(${data.leadName ?? null}, lead_name), company = CASE WHEN ${data.company !== undefined} THEN ${data.company ?? null} ELSE company END, property = CASE WHEN ${data.property !== undefined} THEN ${data.property ?? null} ELSE property END, type = COALESCE(${data.type ?? null}, type), followup_date = COALESCE(${data.date ?? null}, followup_date), followup_time = CASE WHEN ${data.time !== undefined} THEN ${data.time ?? null} ELSE followup_time END, assigned_to = CASE WHEN ${data.assignedTo !== undefined} THEN ${data.assignedTo ?? null} ELSE assigned_to END, priority = CASE WHEN ${data.priority !== undefined} THEN ${data.priority ?? null} ELSE priority END, status = CASE WHEN ${markCompleted} THEN 'Completed' WHEN ${data.status ?? null} IS NOT NULL THEN ${data.status ?? null} ELSE status END, notes = CASE WHEN ${data.notes !== undefined} THEN ${data.notes ?? null} ELSE notes END, completed_at = CASE WHEN ${markCompleted} THEN COALESCE(completed_at, now()) WHEN ${data.completed === false} THEN NULL ELSE completed_at END, updated_at = now() WHERE id = ${String(request.params.id)} RETURNING *`, 1200);
    if (!rows[0]) { response.status(404).json({ message:"Follow-up not found" }); return; }
    recordNotification("Follow-up Updated", `Follow-up with ${rows[0].lead_name || "lead"} marked as ${rows[0].status}`, request.user!.id);
    response.json({ data:rows[0] });
  } catch {
    const markCompleted = data.completed === true || data.status === "Completed";
    const updated = await updateFallbackFollowup(String(request.params.id), {
      ...(data.leadName ? { lead_name: data.leadName } : {}),
      ...(data.company !== undefined ? { company: data.company } : {}),
      ...(data.property !== undefined ? { property: data.property } : {}),
      ...(data.type ? { type: data.type } : {}),
      ...(data.date ? { followup_date: data.date } : {}),
      ...(data.time !== undefined ? { followup_time: data.time } : {}),
      ...(data.assignedTo !== undefined ? { assigned_to: data.assignedTo } : {}),
      ...(data.priority !== undefined ? { priority: data.priority } : {}),
      ...(markCompleted ? { status: "Completed" } : data.status ? { status: data.status } : {}),
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
    });
    if (!updated) { response.status(404).json({ message:"Follow-up not found" }); return; }
    recordNotification("Follow-up Updated", `Follow-up with ${updated.lead_name || "lead"} marked as ${updated.status}`, request.user!.id);
    response.json({ data: updated, fallback: true });
  }
});
app.post("/api/followups/:id/complete", requireAuth, allow("SUPER_ADMIN", "SUB_ADMIN", "SALES"), async (request: AuthRequest, response) => {
  try {
    const rows = await withDbTimeout(sql`UPDATE followups SET status = 'Completed', completed_at = COALESCE(completed_at, now()), updated_at = now() WHERE id = ${String(request.params.id)} RETURNING *`, 1200);
    if (!rows[0]) { response.status(404).json({ message:"Follow-up not found" }); return; }
    recordNotification("Follow-up Completed", `Follow-up with ${rows[0].lead_name || "lead"} marked as completed`, request.user!.id);
    response.json({ data:rows[0] });
  } catch {
    const updated = await completeFallbackFollowup(String(request.params.id));
    if (!updated) { response.status(404).json({ message:"Follow-up not found" }); return; }
    recordNotification("Follow-up Completed", `Follow-up with ${updated.lead_name || "lead"} marked as completed`, request.user!.id);
    response.json({ data: updated, fallback: true });
  }
});
app.delete("/api/followups/:id", requireAuth, allow("SUPER_ADMIN", "SUB_ADMIN", "SALES"), async (request, response) => {
  try {
    const rows = await withDbTimeout(sql`DELETE FROM followups WHERE id = ${String(request.params.id)} RETURNING id`, 1200);
    if (!rows[0]) { response.status(404).json({ message:"Follow-up not found" }); return; }
    response.status(204).send();
  } catch {
    const deleted = await deleteFallbackFollowup(String(request.params.id));
    if (!deleted) { response.status(404).json({ message:"Follow-up not found" }); return; }
    response.status(204).send();
  }
});
app.get("/api/clients", requireAuth, async (_request, response) => {
  try {
    const rows = await withDbTimeout(sql`SELECT * FROM clients ORDER BY created_at DESC`, 1200);
    const mktClients = await listMarketingClients().catch(() => []);
    const mktProjects = await listMarketingClientProjects().catch(() => []);
    const deliveryProjects = await listFallbackProjects({ id: "", role: "SUPER_ADMIN" }).catch(() => []);

    const clientsMap = new Map<string, any>();
    for (const r of rows) {
      clientsMap.set(r.id, { ...r });
    }
    for (const mc of mktClients) {
      if (!clientsMap.has(mc.id)) {
        clientsMap.set(mc.id, {
          id: mc.id,
          name: mc.contact_name || mc.name,
          company: mc.name,
          businessName: mc.name,
          email: mc.contact_email || null,
          phone: "N/A",
          gst_number: null,
          created_at: mc.created_at,
        });
      }
    }

    const allClients = Array.from(clientsMap.values()).map((client) => {
      const clientNameLower = (client.company || client.name || "").toLowerCase();
      const associatedMkt = mktProjects
        .filter((p) => p.client_id === client.id || (p.client_name && p.client_name.toLowerCase() === clientNameLower))
        .map((p) => ({
          id: p.id,
          name: p.title,
          title: p.title,
          status: p.status,
          category: p.category,
          budget: p.budget,
          deadline: p.deadline,
        }));
      const associatedDeliv = deliveryProjects
        .filter((p) => p.client_name && p.client_name.toLowerCase() === clientNameLower)
        .map((p) => ({
          id: p.id,
          name: p.name,
          title: p.name,
          status: p.status,
          category: "Delivery",
          budget: 0,
          deadline: p.due_date,
        }));
      return {
        ...client,
        projects: [...associatedMkt, ...associatedDeliv],
      };
    });

    response.json({ data: allClients });
  } catch {
    const fallbackCrm = await listFallbackClients().catch(() => []);
    const mktClients = await listMarketingClients().catch(() => []);
    const mktProjects = await listMarketingClientProjects().catch(() => []);
    const deliveryProjects = await listFallbackProjects({ id: "", role: "SUPER_ADMIN" }).catch(() => []);

    const clientsMap = new Map<string, any>();
    for (const r of fallbackCrm) {
      clientsMap.set(r.id, { ...r });
    }
    for (const mc of mktClients) {
      if (!clientsMap.has(mc.id)) {
        clientsMap.set(mc.id, {
          id: mc.id,
          name: mc.contact_name || mc.name,
          company: mc.name,
          businessName: mc.name,
          email: mc.contact_email || null,
          phone: "N/A",
          gst_number: null,
          created_at: mc.created_at,
        });
      }
    }

    const allClients = Array.from(clientsMap.values()).map((client) => {
      const clientNameLower = (client.company || client.name || "").toLowerCase();
      const associatedMkt = mktProjects
        .filter((p) => p.client_id === client.id || (p.client_name && p.client_name.toLowerCase() === clientNameLower))
        .map((p) => ({
          id: p.id,
          name: p.title,
          title: p.title,
          status: p.status,
          category: p.category,
          budget: p.budget,
          deadline: p.deadline,
        }));
      const associatedDeliv = deliveryProjects
        .filter((p) => p.client_name && p.client_name.toLowerCase() === clientNameLower)
        .map((p) => ({
          id: p.id,
          name: p.name,
          title: p.name,
          status: p.status,
          category: "Delivery",
          budget: 0,
          deadline: p.due_date,
        }));
      return {
        ...client,
        projects: [...associatedMkt, ...associatedDeliv],
      };
    });

    response.json({ data: allClients, fallback: true });
  }
});
app.post("/api/clients", requireAuth, allow("SUPER_ADMIN", "SUB_ADMIN", "SALES"), async (request: AuthRequest, response) => {
  const body = request.body || {};
  const rawName = String(body.name || body.businessName || body.company || "").trim();
  const rawCompany = String(body.company || body.businessName || rawName).trim() || null;
  const rawEmail = typeof body.email === "string" && body.email.trim() ? body.email.trim() : null;
  const rawPhone = typeof body.phone === "string" && body.phone.trim() ? body.phone.trim() : "N/A";
  const rawGst = typeof (body.gstNumber || body.gstin || body.gst_number) === "string" && (body.gstNumber || body.gstin || body.gst_number).trim()
    ? (body.gstNumber || body.gstin || body.gst_number).trim()
    : null;

  if (!rawName) {
    response.status(400).json({ message: "Client name or business name is required" });
    return;
  }

  try {
    const rows = await withDbTimeout(sql`INSERT INTO clients (name, company, email, phone, gst_number) VALUES (${rawName}, ${rawCompany}, ${rawEmail}, ${rawPhone}, ${rawGst}) RETURNING *`, 1200);
    recordNotification("Client Onboarded", `${rawName}${rawCompany && rawCompany !== rawName ? ` (${rawCompany})` : ""} was added to CRM`, request.user!.id);
    response.status(201).json({ data: rows[0] });
  } catch {
    const client = await addFallbackClient({
      name: rawName,
      company: rawCompany,
      email: rawEmail,
      phone: rawPhone,
      gst_number: rawGst,
    });
    recordNotification("Client Onboarded", `${rawName}${rawCompany && rawCompany !== rawName ? ` (${rawCompany})` : ""} was added to CRM`, request.user!.id);
    response.status(201).json({ data: client, fallback: true });
  }
});
app.get("/api/quotations", requireAuth, allow("SUPER_ADMIN", "SUB_ADMIN", "SALES"), async (_request, response) => {
  try {
    const rows = await withDbTimeout(sql`SELECT * FROM quotations ORDER BY created_at DESC`, 1200);
    response.json({ data: rows });
  } catch {
    response.json({ data: await listFallbackQuotations(), fallback: true });
  }
});
app.post("/api/quotations", requireAuth, allow("SUPER_ADMIN", "SUB_ADMIN", "SALES"), async (request: AuthRequest, response) => {
  const parsed = quotationInput.safeParse(request.body);
  if (!parsed.success) { response.status(400).json({ message:"Invalid quotation", errors:parsed.error.flatten() }); return; }
  const data = parsed.data;
  try {
    if (data.clientId) {
      const client = await withDbTimeout(sql`SELECT id FROM clients WHERE id = ${data.clientId} LIMIT 1`, 800);
      if (!client[0]) { response.status(404).json({ message:"Client not found" }); return; }
    }
    const qNum = `Q-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    const rows = await withDbTimeout(sql`INSERT INTO quotations (quotation_number, client_id, client_name, amount, valid_until, status) VALUES (${qNum}, ${data.clientId ?? null}, ${data.clientName}, ${data.amount}, ${data.validUntil}, ${data.status}) RETURNING *`, 1200);
    recordNotification("Quotation Generated", `Quotation #${qNum} (₹${Number(data.amount).toLocaleString()}) for ${data.clientName}`, request.user!.id);
    response.status(201).json({ data:rows[0] });
  } catch {
    const quotation = await addFallbackQuotation({
      quotation_number: `Q-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
      client_id: data.clientId ?? null,
      client_name: data.clientName,
      amount: data.amount,
      valid_until: data.validUntil,
      status: data.status,
    });
    recordNotification("Quotation Generated", `Quotation #${quotation.quotation_number} (₹${Number(data.amount).toLocaleString()}) for ${data.clientName}`, request.user!.id);
    response.status(201).json({ data: quotation, fallback: true });
  }
});
app.get("/api/invoices", requireAuth, allow("SUPER_ADMIN", "SUB_ADMIN"), async (request: AuthRequest, response) => {
  try {
    const rows = request.user!.role === "SUPER_ADMIN"
      ? await withDbTimeout(sql`SELECT invoices.*, clients.name AS client_name, clients.company AS client_company FROM invoices JOIN clients ON clients.id = invoices.client_id ORDER BY invoices.created_at DESC`, 1200)
      : await withDbTimeout(sql`SELECT invoices.*, clients.name AS client_name, clients.company AS client_company FROM invoices JOIN clients ON clients.id = invoices.client_id WHERE invoices.created_by_id = ${request.user!.id} ORDER BY invoices.created_at DESC`, 1200);
    response.json({ data: rows });
  } catch {
    response.json({ data: await listFallbackInvoices(request.user!.role === "SUPER_ADMIN" ? undefined : request.user!.id), fallback: true });
  }
});
app.post("/api/invoices", requireAuth, allow("SUPER_ADMIN", "SUB_ADMIN"), async (request: AuthRequest, response) => {
  const parsed = invoiceInput.safeParse(request.body);
  if (!parsed.success) { response.status(400).json({ message: "Invalid invoice", errors: parsed.error.flatten() }); return; }
  const data = parsed.data;
  try {
    const creator = await withDbTimeout(sql`SELECT name FROM users WHERE id = ${request.user!.id} LIMIT 1`, 800);
    const creatorName = creator[0]?.name ?? (findDemoUser(request.user!.id)?.name || request.user!.role);
    const rows = await withDbTimeout(sql`INSERT INTO invoices (invoice_number, client_id, total, paid_amount, due_date, created_by_id, created_by_name) VALUES (${data.invoiceNumber}, ${data.clientId}, ${data.total}, ${data.paidAmount ?? 0}, ${data.dueDate}, ${request.user!.id}, ${creatorName}) RETURNING *`, 1200);
    recordNotification("Invoice Created", `Invoice #${data.invoiceNumber} for ${data.clientName ?? "Client"} (₹${Number(data.total).toLocaleString()})`, request.user!.id);
    response.status(201).json({ data: rows[0] });
  } catch {
    const invoice = await addFallbackInvoice({
      invoice_number: data.invoiceNumber,
      client_id: data.clientId,
      client_name: data.clientName ?? "Client",
      total: data.total,
      paid_amount: data.paidAmount ?? 0,
      due_date: data.dueDate,
      created_by_id: request.user!.id,
      created_by_name: findDemoUser(request.user!.id)?.name || request.user!.role,
    });
    recordNotification("Invoice Created", `Invoice #${data.invoiceNumber} for ${data.clientName ?? "Client"} (₹${Number(data.total).toLocaleString()})`, request.user!.id);
    response.status(201).json({ data: invoice, fallback: true });
  }
});
app.get("/api/expenses", requireAuth, allow("SUPER_ADMIN", "SUB_ADMIN"), async (_request, response) => {
  try {
    const rows = await withDbTimeout(sql`SELECT * FROM expenses ORDER BY expense_date DESC NULLS LAST, created_at DESC`, 1200);
    response.json({ data: rows });
  } catch {
    response.json({ data: await listFallbackExpenses(), fallback: true });
  }
});
app.post("/api/expenses", requireAuth, allow("SUPER_ADMIN", "SUB_ADMIN"), async (request: AuthRequest, response) => {
  const parsed = expenseInput.safeParse(request.body);
  if (!parsed.success) { response.status(400).json({ message: "Invalid expense", errors: parsed.error.flatten() }); return; }
  const data = parsed.data;
  try {
    const rows = await withDbTimeout(sql`INSERT INTO expenses (title, category, amount, expense_date, payment_method, description) VALUES (${data.title}, ${data.category}, ${data.amount}, ${data.expenseDate ?? null}, ${data.paymentMethod ?? null}, ${data.description ?? null}) RETURNING *`, 1200);
    response.status(201).json({ data: rows[0] });
  } catch {
    const expense = await addFallbackExpense({
      title: data.title,
      category: data.category,
      amount: data.amount,
      expense_date: data.expenseDate ?? null,
      payment_method: data.paymentMethod ?? null,
      description: data.description ?? null,
    });
    response.status(201).json({ data: expense, fallback: true });
  }
});
app.get("/api/payments", requireAuth, allow("SUPER_ADMIN", "SUB_ADMIN"), async (request: AuthRequest, response) => {
  try {
    const rows = request.user!.role === "SUPER_ADMIN"
      ? await withDbTimeout(sql`SELECT payments.*, invoices.invoice_number FROM payments JOIN invoices ON invoices.id = payments.invoice_id ORDER BY payments.created_at DESC`, 1200)
      : await withDbTimeout(sql`SELECT payments.*, invoices.invoice_number FROM payments JOIN invoices ON invoices.id = payments.invoice_id WHERE payments.created_by_id = ${request.user!.id} ORDER BY payments.created_at DESC`, 1200);
    response.json({ data: rows });
  } catch {
    response.json({ data: await listFallbackPayments(), fallback: true });
  }
});
app.get("/api/payments/summary", requireAuth, allow("SUPER_ADMIN", "SUB_ADMIN"), async (request: AuthRequest, response) => {
  const summary = "SELECT i.id AS invoice_id, i.invoice_number, i.total AS invoice_total, i.created_by_name AS invoice_created_by_name, c.name AS client_name, c.company AS client_company, i.due_date, COALESCE(SUM(p.amount), 0) AS total_paid, MAX(COALESCE(p.payment_date, p.created_at::date)) AS latest_payment_date, (SELECT method FROM payments WHERE invoice_id = i.id ORDER BY COALESCE(payment_date, created_at::date) DESC, created_at DESC LIMIT 1) AS payment_method, (SELECT created_by_name FROM payments WHERE invoice_id = i.id ORDER BY COALESCE(payment_date, created_at::date) DESC, created_at DESC LIMIT 1) AS payment_created_by_name FROM invoices i JOIN clients c ON c.id = i.client_id LEFT JOIN payments p ON p.invoice_id = i.id";
  try {
    const rows = request.user!.role === "SUPER_ADMIN"
      ? await withDbTimeout(sql.query(`${summary} GROUP BY i.id, i.invoice_number, i.total, i.created_by_name, c.name, c.company, i.due_date ORDER BY i.created_at DESC`), 1200)
      : await withDbTimeout(sql.query(`${summary} WHERE i.created_by_id = $1 GROUP BY i.id, i.invoice_number, i.total, i.created_by_name, c.name, c.company, i.due_date ORDER BY i.created_at DESC`, [request.user!.id]), 1200);
    response.json({ data: rows });
  } catch {
    const invoices = await listFallbackInvoices(request.user!.role === "SUPER_ADMIN" ? undefined : request.user!.id);
    const payments = await listFallbackPayments();
    const summaryRows = invoices.map(inv => {
      const invPayments = payments.filter(p => p.invoice_id === inv.id || p.invoice_number === inv.invoice_number);
      const totalPaid = invPayments.reduce((acc, curr) => acc + curr.amount, 0);
      const latest = invPayments[0];
      return {
        invoice_id: inv.id,
        invoice_number: inv.invoice_number,
        invoice_total: inv.total,
        invoice_created_by_name: inv.created_by_name || "Admin",
        client_name: inv.client_name,
        client_company: null,
        due_date: inv.due_date,
        total_paid: totalPaid,
        latest_payment_date: latest?.payment_date || null,
        payment_method: latest?.method || null,
        payment_created_by_name: latest?.created_by_name || null,
      };
    });
    response.json({ data: summaryRows, fallback: true });
  }
});
app.post("/api/payments", requireAuth, allow("SUPER_ADMIN", "SUB_ADMIN"), async (request: AuthRequest, response) => {
  const parsed = paymentInput.safeParse(request.body);
  if (!parsed.success) { response.status(400).json({ message: "Invalid payment", errors: parsed.error.flatten() }); return; }
  const data = parsed.data;
  try {
    const invoice = request.user!.role === "SUPER_ADMIN"
      ? await withDbTimeout(sql`SELECT id, total, invoice_number FROM invoices WHERE id = ${data.invoiceId} LIMIT 1`, 800)
      : await withDbTimeout(sql`SELECT id, total, invoice_number FROM invoices WHERE id = ${data.invoiceId} AND created_by_id = ${request.user!.id} LIMIT 1`, 800);
    if (!invoice[0]) { response.status(404).json({ message: "Invoice not found" }); return; }
    const paidRows = await withDbTimeout(sql`SELECT COALESCE(SUM(amount), 0) AS total_paid FROM payments WHERE invoice_id = ${data.invoiceId}`, 800);
    const alreadyPaid = Number(paidRows[0]?.total_paid ?? 0); const remaining = Number(invoice[0].total) - alreadyPaid;
    if (data.amount > remaining) { response.status(400).json({ message: `Payment exceeds the remaining balance of ${remaining.toFixed(2)}.` }); return; }
    const creator = await withDbTimeout(sql`SELECT name FROM users WHERE id = ${request.user!.id} LIMIT 1`, 800);
    const creatorName = creator[0]?.name ?? (findDemoUser(request.user!.id)?.name || request.user!.role);
    const rows = await withDbTimeout(sql`INSERT INTO payments (invoice_id, amount, method, payment_date, notes, created_by_id, created_by_name) VALUES (${data.invoiceId}, ${data.amount}, ${data.method}, ${data.paymentDate ?? null}, ${data.notes ?? null}, ${request.user!.id}, ${creatorName}) RETURNING *`, 1200);
    await withDbTimeout(sql`UPDATE invoices SET paid_amount = ${alreadyPaid + data.amount} WHERE id = ${data.invoiceId}`, 800);
    recordNotification("Payment Recorded", `Payment of ₹${Number(data.amount).toLocaleString()} received (${data.method}) for #${invoice[0].invoice_number || "Invoice"}`, request.user!.id);
    response.status(201).json({ data: rows[0] });
  } catch {
    const payment = await addFallbackPayment({
      invoice_id: data.invoiceId,
      amount: data.amount,
      method: data.method,
      payment_date: data.paymentDate ?? null,
      notes: data.notes ?? null,
      created_by_id: request.user!.id,
      created_by_name: findDemoUser(request.user!.id)?.name || request.user!.role,
    });
    recordNotification("Payment Recorded", `Payment of ₹${Number(data.amount).toLocaleString()} received (${data.method})`, request.user!.id);
    response.status(201).json({ data: payment, fallback: true });
  }
});
app.get("/api/developers", requireAuth, allow("SUPER_ADMIN"), async (_request, response) => {
  try {
    const rows = await withDbTimeout(sql`
      SELECT u.id, u.name, u.email, u.role, u.created_at,
        COUNT(p.id)::int AS assigned_projects,
        COUNT(p.id) FILTER (WHERE p.status = 'COMPLETED')::int AS completed_projects,
        COUNT(p.id) FILTER (WHERE p.status IN ('PLANNING', 'IN_PROGRESS'))::int AS active_projects,
        COALESCE(ROUND(AVG(COALESCE(latest_update.progress, CASE WHEN p.status = 'COMPLETED' THEN 100 ELSE 0 END)))::int, 0) AS average_progress,
        MAX(COALESCE(latest_update.created_at, p.updated_at)) AS last_activity_at
      FROM users u
      LEFT JOIN projects p ON p.assigned_developer_id = u.id
      LEFT JOIN LATERAL (
        SELECT progress, created_at FROM project_updates
        WHERE project_id = p.id ORDER BY created_at DESC LIMIT 1
      ) latest_update ON true
      WHERE u.role = 'DEVELOPER'
      GROUP BY u.id, u.name, u.email, u.role, u.created_at
      ORDER BY last_activity_at DESC NULLS LAST, u.created_at DESC
    `, 1200);
    response.json({ data: rows });
  } catch {
    response.json({ data: await fallbackDeveloperOverview(), fallback: true });
  }
});
app.post("/api/developers", requireAuth, allow("SUPER_ADMIN"), async (request, response) => {
  const parsed = developerInput.safeParse(request.body);
  if (!parsed.success) { response.status(400).json({ message: "Invalid developer", errors: parsed.error.flatten() }); return; }
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  try {
    const rows = await withDbTimeout(sql`INSERT INTO users (name, email, password_hash, role, must_change_password) VALUES (${parsed.data.name}, ${parsed.data.email.toLowerCase()}, ${passwordHash}, 'DEVELOPER', true) RETURNING id, name, email, role, created_at`, 1200);
    response.status(201).json({ data: rows[0] });
  } catch {
    response.status(201).json({ data: await createFallbackDeveloper(parsed.data.name, parsed.data.email, passwordHash), fallback: true });
  }
});
app.delete("/api/developers/:id", requireAuth, allow("SUPER_ADMIN"), async (request, response) => {
  const developerId = String(request.params.id);
  try {
    const assigned = await withDbTimeout(sql`SELECT COUNT(*)::int AS count FROM projects WHERE assigned_developer_id = ${developerId}`, 800);
    if (Number(assigned[0]?.count ?? 0) > 0) { response.status(409).json({ message: "Reassign this developer's projects before removing the account" }); return; }
    const removed = await withDbTimeout(sql`DELETE FROM users WHERE id = ${developerId} AND role = 'DEVELOPER' RETURNING id`, 1000);
    if (!removed[0]) { response.status(404).json({ message: "Developer not found" }); return; }
    response.status(204).send();
  } catch {
    try {
      await removeFallbackDeveloper(developerId);
      response.status(204).send();
    } catch (error) {
      response.status(409).json({ message: error instanceof Error ? error.message : "Unable to remove developer" });
    }
  }
});
app.get("/api/projects", requireAuth, allow("SUPER_ADMIN", "SUB_ADMIN", "SALES", "DEVELOPER"), async (request: AuthRequest, response) => {
  const mktProjects = await listMarketingClientProjects().catch(() => []);
  const mappedMktProjects = request.user!.role === "DEVELOPER"
    ? []
    : mktProjects.map((p) => ({
        id: p.id,
        name: p.title,
        client_name: p.client_name,
        description: p.deliverables || p.category || "Marketing growth project",
        status: p.status,
        priority: "MEDIUM",
        due_date: p.deadline || null,
        assigned_developer_id: "marketing-lead",
        developer_name: "Growth & Marketing Team",
        progress: p.status === "COMPLETED" ? 100 : p.status === "ACTIVE" ? 75 : p.status === "IN_PROGRESS" ? 50 : 25,
        created_at: p.created_at,
        updated_at: p.created_at,
      }));
  try {
    const rows = request.user!.role === "DEVELOPER"
      ? await withDbTimeout(sql`SELECT projects.*, users.name AS developer_name, COALESCE(latest_update.progress, CASE WHEN projects.status = 'COMPLETED' THEN 100 ELSE 0 END) AS progress FROM projects JOIN users ON users.id = projects.assigned_developer_id LEFT JOIN LATERAL (SELECT progress FROM project_updates WHERE project_id = projects.id ORDER BY created_at DESC LIMIT 1) latest_update ON true WHERE projects.assigned_developer_id = ${request.user!.id} ORDER BY projects.updated_at DESC`, 1200)
      : await withDbTimeout(sql`SELECT projects.*, users.name AS developer_name, COALESCE(latest_update.progress, CASE WHEN projects.status = 'COMPLETED' THEN 100 ELSE 0 END) AS progress FROM projects JOIN users ON users.id = projects.assigned_developer_id LEFT JOIN LATERAL (SELECT progress FROM project_updates WHERE project_id = projects.id ORDER BY created_at DESC LIMIT 1) latest_update ON true ORDER BY projects.updated_at DESC`, 1200);
    response.json({ data: [...rows, ...mappedMktProjects] });
  } catch {
    const fallbackProjects = await listFallbackProjects(request.user!);
    response.json({ data: [...fallbackProjects, ...mappedMktProjects], fallback: true });
  }
});
app.post("/api/projects", requireAuth, allow("SUPER_ADMIN"), async (request: AuthRequest, response) => {
  const parsed = projectInput.safeParse(request.body);
  if (!parsed.success) { response.status(400).json({ message: "Invalid project", errors: parsed.error.flatten() }); return; }
  const data = parsed.data;
  try {
    const rows = await withDbTimeout(sql`INSERT INTO projects (name, client_name, description, status, priority, due_date, assigned_developer_id, created_by_id) VALUES (${data.name}, ${data.clientName ?? null}, ${data.description ?? null}, ${data.status}, ${data.priority}, ${data.dueDate ?? null}, ${data.assignedDeveloperId}, ${request.user!.id}) RETURNING *`, 1200);
    recordNotification("Project Assigned", `Project "${data.name}" was initialized`, request.user!.id);
    response.status(201).json({ data: rows[0] });
  } catch {
    const project = await createFallbackProject({ name: data.name, client_name: data.clientName ?? null, description: data.description ?? null, status: data.status, priority: data.priority, due_date: data.dueDate ?? null, assigned_developer_id: data.assignedDeveloperId, created_by_id: request.user!.id });
    recordNotification("Project Assigned", `Project "${data.name}" was initialized`, request.user!.id);
    response.status(201).json({ data: project, fallback: true });
  }
});
app.patch("/api/projects/:id/status", requireAuth, allow("DEVELOPER"), async (request: AuthRequest, response) => {
  const parsed = projectStatusInput.safeParse(request.body);
  if (!parsed.success) { response.status(400).json({ message: "Invalid project status" }); return; }
  const projectId = String(request.params.id);
  try {
    const rows = await withDbTimeout(sql`UPDATE projects SET status = ${parsed.data.status}, progress_percentage = CASE WHEN ${parsed.data.status} = 'COMPLETED' THEN 100 ELSE progress_percentage END, updated_at = now() WHERE id = ${projectId} AND assigned_developer_id = ${request.user!.id} RETURNING *`, 1200);
    if (!rows[0]) { response.status(403).json({ message: "Only the assigned developer can update this project status" }); return; }
    response.json({ data: rows[0] });
  } catch {
    try {
      const fbProject = await fallbackProject(projectId);
      if (!fbProject || fbProject.assigned_developer_id !== request.user!.id) {
        response.status(403).json({ message: "Only the assigned developer can update this project status" }); return;
      }
      const updated = await setFallbackProjectStatus(projectId, parsed.data.status);
      response.json({ data: updated, fallback: true });
    } catch {
      response.status(503).json({ message:"Unable to update project status" });
    }
  }
});
app.get("/api/projects/:id/updates", requireAuth, allow("SUPER_ADMIN", "DEVELOPER"), async (request: AuthRequest, response) => {
  const projectId = String(request.params.id);
  try {
    const project = await withDbTimeout(sql`SELECT assigned_developer_id FROM projects WHERE id = ${projectId} LIMIT 1`, 800);
    if (!project[0] || (request.user!.role === "DEVELOPER" && project[0].assigned_developer_id !== request.user!.id)) {
      response.status(403).json({ message: "You cannot view this project" }); return;
    }
    const rows = await withDbTimeout(sql`SELECT project_updates.*, users.name AS author_name FROM project_updates JOIN users ON users.id = project_updates.author_id WHERE project_updates.project_id = ${projectId} ORDER BY project_updates.created_at DESC`, 1200);
    response.json({ data: rows });
  } catch {
    const project = await fallbackProject(projectId);
    if (!project || (request.user!.role === "DEVELOPER" && project.assigned_developer_id !== request.user!.id)) {
      response.status(403).json({ message: "You cannot view this project" }); return;
    }
    response.json({ data: await listFallbackUpdates(projectId), fallback: true });
  }
});
app.post("/api/projects/:id/updates", requireAuth, allow("DEVELOPER"), async (request: AuthRequest, response) => {
  const parsed = projectUpdateInput.safeParse(request.body);
  if (!parsed.success) { response.status(400).json({ message: "Invalid project update", errors: parsed.error.flatten() }); return; }
  const data = parsed.data;
  const projectId = String(request.params.id);
  try {
    const project = await withDbTimeout(sql`SELECT id, assigned_developer_id, status, progress_percentage FROM projects WHERE id = ${projectId} LIMIT 1`, 800);
    if (!project[0] || project[0].assigned_developer_id !== request.user!.id) {
      response.status(403).json({ message: "Only the assigned developer can post updates to this project" }); return;
    }
    const nextStatus = data.status ?? (data.progress === 100 ? "COMPLETED" : data.progress > 0 ? "IN_PROGRESS" : project[0].status);
    if (nextStatus === "COMPLETED" && data.progress < 100) {
      response.status(400).json({ message:"Completed projects must be 100% complete" }); return;
    }
    const nextProgress = nextStatus === "COMPLETED" ? 100 : data.progress;
    const rows = await withDbTimeout(sql`INSERT INTO project_updates (project_id, author_id, message, progress, old_status, new_status, old_percentage, new_percentage) VALUES (${projectId}, ${request.user!.id}, ${data.message}, ${nextProgress}, ${project[0].status}, ${nextStatus}, ${project[0].progress_percentage ?? 0}, ${nextProgress}) RETURNING *`, 1200);
    await withDbTimeout(sql`UPDATE projects SET status = ${nextStatus}, progress_percentage = ${nextProgress}, updated_at = now() WHERE id = ${projectId}`, 800);
    recordNotification("Project Update", `Project update: ${data.message.slice(0, 35)} (${nextProgress}% done)`, request.user!.id);
    response.status(201).json({ data: rows[0], project:{ id:projectId, status:nextStatus, progress:nextProgress } });
  } catch {
    try {
      const fbProject = await fallbackProject(projectId);
      if (!fbProject || fbProject.assigned_developer_id !== request.user!.id) {
        response.status(403).json({ message: "Only the assigned developer can post updates to this project" }); return;
      }
      const update = await addFallbackUpdate(projectId, request.user!.id, data.message, data.progress);
      const nextStatus = data.status ?? (data.progress === 100 ? "COMPLETED" : data.progress > 0 ? "IN_PROGRESS" : "PENDING");
      recordNotification("Project Update", `Project update: ${data.message.slice(0, 35)} (${data.progress}% done)`, request.user!.id);
      response.status(201).json({ data: update, project: { id: projectId, status: nextStatus, progress: data.progress }, fallback: true });
    } catch (err: any) {
      response.status(503).json({ message: err?.message || "Unable to save project progress" });
    }
  }
});

app.get("/api/vault", requireAuth, async (request: AuthRequest, response) => {
  const key = vaultKey();
  if (!key) { response.status(503).json({ message: "Credentials Vault is not configured. Add VAULT_ENCRYPTION_KEY to the API environment." }); return; }
  try {
    const data = await withDbTimeout(sql`SELECT id, label, service, notes, created_at, updated_at FROM credential_vault_items WHERE owner_id = ${request.user!.id} ORDER BY updated_at DESC`, 1200);
    response.json({ data });
  } catch { response.json({ data: [] }); }
});
app.post("/api/vault", requireAuth, async (request: AuthRequest, response) => {
  const parsed = vaultItemInput.safeParse(request.body); const key = vaultKey();
  if (!parsed.success) { response.status(400).json({ message:"Enter a label, service, username, and secret." }); return; }
  if (!key) { response.status(503).json({ message: "Credentials Vault is not configured. Add VAULT_ENCRYPTION_KEY to the API environment." }); return; }
  try {
    const iv = randomBytes(12); const encrypted = encryptVaultValue(JSON.stringify({ username:parsed.data.username, secret:parsed.data.secret }), key, iv);
    const rows = await withDbTimeout(sql`INSERT INTO credential_vault_items (owner_id, label, service, username_ciphertext, secret_ciphertext, iv, auth_tag, notes) VALUES (${request.user!.id}, ${parsed.data.label}, ${parsed.data.service}, ${encrypted.value}, ${"vault-v1"}, ${iv.toString("base64")}, ${encrypted.tag}, ${parsed.data.notes ?? null}) RETURNING id, label, service, notes, created_at, updated_at`, 1200);
    response.status(201).json({ data:{ ...rows[0], username:parsed.data.username, secret:parsed.data.secret } });
  } catch { response.status(503).json({ message:"Unable to save this credential." }); }
});
app.post("/api/vault/:id/reveal", requireAuth, async (request: AuthRequest, response) => {
  const key = vaultKey();
  if (!key) { response.status(503).json({ message: "Credentials Vault is not configured." }); return; }
  try {
    const rows = await withDbTimeout(sql`SELECT username_ciphertext, iv, auth_tag FROM credential_vault_items WHERE id = ${String(request.params.id)} AND owner_id = ${request.user!.id} LIMIT 1`, 1200);
    if (!rows[0]) { response.status(404).json({ message:"Vault item not found." }); return; }
    const row: any = rows[0]; const value = JSON.parse(decryptVaultValue(row.username_ciphertext, row.auth_tag, key, Buffer.from(row.iv, "base64"))) as { username:string; secret:string };
    response.json({ data:value });
  } catch { response.status(503).json({ message:"Unable to reveal this credential." }); }
});
app.delete("/api/vault/:id", requireAuth, async (request: AuthRequest, response) => {
  try { const rows = await withDbTimeout(sql`DELETE FROM credential_vault_items WHERE id = ${String(request.params.id)} AND owner_id = ${request.user!.id} RETURNING id`, 1200); if (!rows[0]) { response.status(404).json({ message:"Vault item not found." }); return; } response.status(204).send(); }
  catch { response.status(503).json({ message:"Unable to remove this credential." }); }
});
app.get("/api/marketing/overview", requireAuth, allow("SUPER_ADMIN", "SUB_ADMIN", "SALES", "DIGITAL_MARKETING"), async (_request, response) => {
  try {
    const overview = await getMarketingOverview();
    response.json({ data: overview });
  } catch {
    response.status(500).json({ message: "Unable to load marketing overview" });
  }
});
app.get("/api/marketing/campaigns", requireAuth, allow("SUPER_ADMIN", "SUB_ADMIN", "SALES", "DIGITAL_MARKETING"), async (request, response) => {
  try {
    const platform = typeof request.query.platform === "string" ? request.query.platform : undefined;
    const status = typeof request.query.status === "string" ? request.query.status : undefined;
    const search = typeof request.query.search === "string" ? request.query.search : undefined;
    const campaigns = await listMarketingCampaigns({ platform, status, search });
    response.json({ data: campaigns });
  } catch {
    response.status(500).json({ message: "Unable to load campaigns" });
  }
});
app.post("/api/marketing/campaigns", requireAuth, allow("SUPER_ADMIN", "DIGITAL_MARKETING"), async (request: AuthRequest, response) => {
  const parsed = campaignInput.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ message: "Invalid campaign parameters", errors: parsed.error.flatten() });
    return;
  }
  try {
    const campaign = await createMarketingCampaign(parsed.data);
    recordNotification("Marketing Campaign Created", `Campaign "${parsed.data.name}" (${parsed.data.platform}) was launched`, request.user!.id);
    response.status(201).json({ data: campaign });
  } catch {
    response.status(500).json({ message: "Unable to create campaign" });
  }
});
app.patch("/api/marketing/campaigns/:id/status", requireAuth, allow("SUPER_ADMIN", "DIGITAL_MARKETING"), async (request, response) => {
  try {
    const updated = await toggleMarketingCampaignStatus(String(request.params.id));
    response.json({ data: updated });
  } catch {
    response.status(404).json({ message: "Campaign not found" });
  }
});
app.delete("/api/marketing/campaigns/:id", requireAuth, allow("SUPER_ADMIN", "DIGITAL_MARKETING"), async (request, response) => {
  try {
    await deleteMarketingCampaign(String(request.params.id));
    response.status(204).send();
  } catch {
    response.status(404).json({ message: "Campaign not found" });
  }
});
app.get("/api/marketing/creatives", requireAuth, allow("SUPER_ADMIN", "SUB_ADMIN", "SALES", "DIGITAL_MARKETING"), async (_request, response) => {
  try {
    const creatives = await listMarketingCreatives();
    response.json({ data: creatives });
  } catch {
    response.status(500).json({ message: "Unable to load creatives" });
  }
});
app.post("/api/marketing/creatives", requireAuth, allow("SUPER_ADMIN", "DIGITAL_MARKETING"), async (request, response) => {
  const parsed = creativeInput.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ message: "Invalid creative parameters", errors: parsed.error.flatten() });
    return;
  }
  try {
    const creative = await createMarketingCreative(parsed.data);
    response.status(201).json({ data: creative });
  } catch {
    response.status(500).json({ message: "Unable to create creative" });
  }
});
app.get("/api/marketing/leads", requireAuth, allow("SUPER_ADMIN", "SUB_ADMIN", "SALES", "DIGITAL_MARKETING"), async (_request, response) => {
  try {
    const leads = await listMarketingLeads();
    response.json({ data: leads });
  } catch {
    response.status(500).json({ message: "Unable to load marketing leads" });
  }
});
app.patch("/api/marketing/campaigns/:id", requireAuth, allow("SUPER_ADMIN", "DIGITAL_MARKETING"), async (request, response) => {
  const parsed = campaignUpdateInput.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ message: "Invalid update fields", errors: parsed.error.flatten() });
    return;
  }
  try {
    const updated = await updateMarketingCampaign(String(request.params.id), {
      ...(parsed.data.name ? { name: parsed.data.name } : {}),
      ...(parsed.data.budget ? { budget: parsed.data.budget } : {}),
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
      ...(parsed.data.targetAudience !== undefined ? { target_audience: parsed.data.targetAudience } : {}),
      ...(parsed.data.channel ? { channel: parsed.data.channel } : {}),
      ...(parsed.data.platform ? { platform: parsed.data.platform } : {}),
    });
    response.json({ data: updated, message: "Campaign updated successfully" });
  } catch {
    response.status(404).json({ message: "Campaign not found" });
  }
});
app.delete("/api/marketing/creatives/:id", requireAuth, allow("SUPER_ADMIN", "DIGITAL_MARKETING"), async (request, response) => {
  try {
    await deleteMarketingCreative(String(request.params.id));
    response.status(204).send();
  } catch {
    response.status(404).json({ message: "Creative asset not found" });
  }
});
app.post("/api/marketing/leads/batch-sync", requireAuth, allow("SUPER_ADMIN", "DIGITAL_MARKETING"), async (request: AuthRequest, response) => {
  try {
    const unsynced = await getUnsyncedMarketingLeads();
    const syncedResults = [];
    for (const lead of unsynced) {
      await markMarketingLeadSynced(lead.id);
      try {
        const dbInsert = sql`INSERT INTO leads (full_name, company, email, phone, source, notes, status, assigned_to_id) VALUES (${lead.lead_name}, ${lead.company}, ${lead.email}, ${lead.phone}, ${"Digital Marketing (" + lead.platform + ")"}, ${"Inbound lead from " + lead.campaign_name + " [" + lead.quality_score + "]"}, 'NEW', ${request.user!.id}) RETURNING *`;
        await withDbTimeout(dbInsert, 800);
      } catch {
        await addFallbackLead({
          full_name: lead.lead_name,
          company: lead.company,
          email: lead.email,
          phone: lead.phone,
          source: `Digital Marketing (${lead.platform})`,
          notes: `Inbound lead from ${lead.campaign_name} [${lead.quality_score}]`,
          assigned_to_id: request.user!.id,
        });
      }
      syncedResults.push(lead.id);
    }
    response.json({ message: `Successfully synced ${syncedResults.length} leads into the CRM sales pipeline`, count: syncedResults.length });
  } catch {
    response.status(500).json({ message: "Unable to batch sync leads" });
  }
});
app.post("/api/marketing/recommendations/apply", requireAuth, allow("SUPER_ADMIN", "DIGITAL_MARKETING"), async (request, response) => {
  const { title } = request.body || {};
  try {
    if (typeof title === "string" && title.toLowerCase().includes("scale google search")) {
      const campaigns = await listMarketingCampaigns({ platform: "Google Ads" });
      const targetCamp = campaigns[0];
      if (targetCamp) {
        await updateMarketingCampaign(targetCamp.id, { budget: targetCamp.budget + 2500 });
      }
    }
    const overview = await getMarketingOverview();
    response.json({ data: overview, message: `Recommendation applied: ${title}` });
  } catch {
    response.status(500).json({ message: "Unable to apply recommendation" });
  }
});
app.post("/api/marketing/leads/:id/sync-crm", requireAuth, allow("SUPER_ADMIN", "DIGITAL_MARKETING"), async (request: AuthRequest, response) => {
  try {
    const marketingLead = await markMarketingLeadSynced(String(request.params.id));
    try {
      const dbInsert = sql`INSERT INTO leads (full_name, company, email, phone, source, notes, status, assigned_to_id) VALUES (${marketingLead.lead_name}, ${marketingLead.company}, ${marketingLead.email}, ${marketingLead.phone}, ${"Digital Marketing (" + marketingLead.platform + ")"}, ${"Inbound lead from " + marketingLead.campaign_name + " [" + marketingLead.quality_score + "]"}, 'NEW', ${request.user!.id}) RETURNING *`;
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Database timeout")), 1200));
      await Promise.race([dbInsert, timeout]);
    } catch {
      await addFallbackLead({
        full_name: marketingLead.lead_name,
        company: marketingLead.company,
        email: marketingLead.email,
        phone: marketingLead.phone,
        source: `Digital Marketing (${marketingLead.platform})`,
        notes: `Inbound lead from ${marketingLead.campaign_name} [${marketingLead.quality_score}]`,
        assigned_to_id: request.user!.id,
      });
    }
    response.json({ data: marketingLead, message: "Lead synced to CRM successfully" });
  } catch (err) {
    response.status(404).json({ message: err instanceof Error ? err.message : "Unable to sync lead to CRM" });
  }
});

// ==========================================
// CLIENT MANAGEMENT ROUTES
// ==========================================

const marketingClientInput = z.object({
  name: z.string().min(1),
  industry: z.string().min(1),
  contact_name: z.string().min(1),
  contact_email: z.string().email(),
  monthly_retainer: z.number().min(0),
  status: z.enum(["ACTIVE", "ONBOARDING", "PAUSED"]).optional(),
  website: z.string().optional(),
});

const marketingClientProjectInput = z.object({
  client_id: z.string().min(1),
  title: z.string().min(1),
  category: z.enum(["Paid Search", "Paid Social", "SEO & Content", "Brand & Creative", "Email & CRM"]),
  budget: z.number().min(0),
  target_roas: z.number().optional(),
  deadline: z.string().min(1),
  deliverables: z.string().optional(),
});

const marketingClientAssetInput = z.object({
  client_id: z.string().min(1),
  project_id: z.string().optional().nullable(),
  name: z.string().min(1),
  asset_type: z.enum(["Ad Creative", "Video Script", "Copywriting", "Brand Asset", "Landing Page", "Report"]),
  file_format: z.enum(["Figma", "Video / MP4", "Graphic / PNG", "PDF", "Drive / Doc"]),
  asset_url: z.string().min(1),
  status: z.enum(["APPROVED", "IN_REVIEW", "NEEDS_REVISION", "DRAFT"]).optional(),
  version: z.string().optional(),
  notes: z.string().optional(),
});

// Overview
app.get("/api/marketing/clients/overview", requireAuth, allow("SUPER_ADMIN", "SUB_ADMIN", "SALES", "DIGITAL_MARKETING"), async (_request, response) => {
  try {
    const overview = await getMarketingClientsOverview();
    response.json({ data: overview });
  } catch {
    response.status(500).json({ message: "Unable to fetch client management overview" });
  }
});

// Clients
app.get("/api/marketing/clients", requireAuth, allow("SUPER_ADMIN", "SUB_ADMIN", "SALES", "DIGITAL_MARKETING"), async (_request, response) => {
  try {
    const clients = await listMarketingClients();
    response.json({ data: clients });
  } catch {
    response.status(500).json({ message: "Unable to fetch clients" });
  }
});

app.post("/api/marketing/clients", requireAuth, allow("SUPER_ADMIN", "DIGITAL_MARKETING"), async (request, response) => {
  const parsed = marketingClientInput.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ message: "Invalid client input", errors: parsed.error.issues });
    return;
  }
  try {
    const client = await addMarketingClient({
      ...parsed.data,
      status: parsed.data.status || "ACTIVE",
    });
    response.status(201).json({ data: client, message: "Client created successfully" });
  } catch {
    response.status(500).json({ message: "Unable to create client" });
  }
});

app.patch("/api/marketing/clients/:id", requireAuth, allow("SUPER_ADMIN", "DIGITAL_MARKETING"), async (request, response) => {
  try {
    const updated = await updateMarketingClient(String(request.params.id), request.body);
    response.json({ data: updated, message: "Client updated successfully" });
  } catch (err) {
    response.status(404).json({ message: err instanceof Error ? err.message : "Unable to update client" });
  }
});

app.delete("/api/marketing/clients/:id", requireAuth, allow("SUPER_ADMIN", "DIGITAL_MARKETING"), async (request, response) => {
  try {
    await deleteMarketingClient(String(request.params.id));
    response.status(204).send();
  } catch {
    response.status(404).json({ message: "Client not found" });
  }
});

// Projects
app.get("/api/marketing/projects", requireAuth, allow("SUPER_ADMIN", "SUB_ADMIN", "SALES", "DIGITAL_MARKETING"), async (request, response) => {
  try {
    const clientId = typeof request.query.clientId === "string" ? request.query.clientId : undefined;
    const projects = await listMarketingClientProjects(clientId);
    response.json({ data: projects });
  } catch {
    response.status(500).json({ message: "Unable to fetch client projects" });
  }
});

app.post("/api/marketing/projects", requireAuth, allow("SUPER_ADMIN", "DIGITAL_MARKETING"), async (request, response) => {
  const parsed = marketingClientProjectInput.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ message: "Invalid project input", errors: parsed.error.issues });
    return;
  }
  try {
    const project = await addMarketingClientProject(parsed.data);
    response.status(201).json({ data: project, message: "Client project created successfully" });
  } catch {
    response.status(500).json({ message: "Unable to create client project" });
  }
});

app.patch("/api/marketing/projects/:id", requireAuth, allow("SUPER_ADMIN", "DIGITAL_MARKETING"), async (request, response) => {
  try {
    const updated = await updateMarketingClientProject(String(request.params.id), request.body);
    response.json({ data: updated, message: "Project updated successfully" });
  } catch (err) {
    response.status(404).json({ message: err instanceof Error ? err.message : "Unable to update project" });
  }
});

app.delete("/api/marketing/projects/:id", requireAuth, allow("SUPER_ADMIN", "DIGITAL_MARKETING"), async (request, response) => {
  try {
    await deleteMarketingClientProject(String(request.params.id));
    response.status(204).send();
  } catch {
    response.status(404).json({ message: "Project not found" });
  }
});

// Assets
app.get("/api/marketing/assets", requireAuth, allow("SUPER_ADMIN", "SUB_ADMIN", "SALES", "DIGITAL_MARKETING"), async (request, response) => {
  try {
    const clientId = typeof request.query.clientId === "string" ? request.query.clientId : undefined;
    const projectId = typeof request.query.projectId === "string" ? request.query.projectId : undefined;
    const assets = await listMarketingClientAssets(clientId, projectId);
    response.json({ data: assets });
  } catch {
    response.status(500).json({ message: "Unable to fetch client assets" });
  }
});

app.post("/api/marketing/assets", requireAuth, allow("SUPER_ADMIN", "DIGITAL_MARKETING"), async (request, response) => {
  const parsed = marketingClientAssetInput.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ message: "Invalid asset input", errors: parsed.error.issues });
    return;
  }
  try {
    const asset = await addMarketingClientAsset(parsed.data);
    response.status(201).json({ data: asset, message: "Client asset registered successfully" });
  } catch {
    response.status(500).json({ message: "Unable to register client asset" });
  }
});

app.patch("/api/marketing/assets/:id", requireAuth, allow("SUPER_ADMIN", "DIGITAL_MARKETING"), async (request, response) => {
  try {
    const updated = await updateMarketingClientAsset(String(request.params.id), request.body);
    response.json({ data: updated, message: "Asset updated successfully" });
  } catch (err) {
    response.status(404).json({ message: err instanceof Error ? err.message : "Unable to update asset" });
  }
});

app.delete("/api/marketing/assets/:id", requireAuth, allow("SUPER_ADMIN", "DIGITAL_MARKETING"), async (request, response) => {
  try {
    await deleteMarketingClientAsset(String(request.params.id));
    response.status(204).send();
  } catch {
    response.status(404).json({ message: "Asset not found" });
  }
});

// ==================== USERS & PERMISSIONS (SUPER ADMIN) ====================
const createUserInput = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["SUPER_ADMIN", "SUB_ADMIN", "SALES", "DEVELOPER", "DIGITAL_MARKETING"]),
  department: z.string().optional(),
});

app.get("/api/users", requireAuth, allow("SUPER_ADMIN"), async (_request, response) => {
  try {
    const users = await listManagedUsers();
    response.json({ data: users });
  } catch {
    response.status(500).json({ message: "Unable to load users" });
  }
});

app.post("/api/users", requireAuth, allow("SUPER_ADMIN"), async (request: AuthRequest, response) => {
  const parsed = createUserInput.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ message: "Invalid user input", errors: parsed.error.flatten() });
    return;
  }
  try {
    const user = await createManagedUser(parsed.data);
    await recordAuditLog(
      "USER_CREATED",
      "USER",
      user.id,
      `Super Admin created employee account for ${user.name} (${user.email}) as ${user.role}`,
      request.user!.id,
      "Super Admin"
    );
    recordNotification("Employee Provisioned", `Account created for ${user.name} (${user.role})`, request.user!.id);
    response.status(201).json({ data: user, message: "Employee account created successfully" });
  } catch (error) {
    response.status(409).json({ message: error instanceof Error ? error.message : "Unable to create user" });
  }
});

app.patch("/api/users/:id", requireAuth, allow("SUPER_ADMIN"), async (request: AuthRequest, response) => {
  const userId = String(request.params.id);
  try {
    const updated = await updateManagedUser(userId, request.body);
    await recordAuditLog(
      "USER_UPDATED",
      "USER",
      userId,
      `Super Admin updated account for ${updated.name} (Role: ${updated.role}, Active: ${updated.is_active})`,
      request.user!.id,
      "Super Admin"
    );
    response.json({ data: updated, message: "User updated successfully" });
  } catch (error) {
    response.status(404).json({ message: error instanceof Error ? error.message : "Unable to update user" });
  }
});

app.post("/api/users/:id/reset-password", requireAuth, allow("SUPER_ADMIN"), async (request: AuthRequest, response) => {
  const userId = String(request.params.id);
  const password = typeof request.body?.password === "string" ? request.body.password : (typeof request.body?.newPassword === "string" ? request.body.newPassword : "");
  if (!password || password.length < 6) {
    response.status(400).json({ message: "Password must be at least 6 characters" });
    return;
  }
  try {
    await resetManagedUserPassword(userId, password);
    await recordAuditLog(
      "PASSWORD_RESET",
      "USER",
      userId,
      `Super Admin reset password for employee ID ${userId}`,
      request.user!.id,
      "Super Admin"
    );
    response.json({ message: "Password reset successfully" });
  } catch (error) {
    response.status(404).json({ message: error instanceof Error ? error.message : "User not found" });
  }
});

app.delete("/api/users/:id", requireAuth, allow("SUPER_ADMIN"), async (request: AuthRequest, response) => {
  const userId = String(request.params.id);
  try {
    await deleteManagedUser(userId);
    await recordAuditLog(
      "USER_DELETED",
      "USER",
      userId,
      `Super Admin removed user account ID ${userId}`,
      request.user!.id,
      "Super Admin"
    );
    response.status(200).json({ message: "User account removed" });
  } catch (error) {
    response.status(400).json({ message: error instanceof Error ? error.message : "Unable to delete user" });
  }
});

// ==================== AUDIT LOGS ====================
app.get("/api/audit-logs", requireAuth, allow("SUPER_ADMIN"), async (_request, response) => {
  try {
    const logs = await listAuditLogs(150);
    response.json({ data: logs });
  } catch {
    response.status(500).json({ message: "Unable to retrieve audit logs" });
  }
});

// ==================== SCOPE OF WORK (SOW) ====================
const sowCreateInput = z.object({
  clientId: z.string().optional(),
  client_id: z.string().optional(),
  clientName: z.string().optional(),
  client_name: z.string().optional(),
  companyName: z.string().optional(),
  client_company: z.string().optional(),
  projectName: z.string().optional(),
  project_name: z.string().optional(),
  title: z.string().optional(),
  templateId: z.string().optional(),
  template_id: z.string().optional(),
  scopeRaw: z.string().optional(),
  scope_content: z.string().optional(),
  projectValue: z.union([z.number(), z.string()]).optional(),
  project_value: z.union([z.number(), z.string()]).optional(),
  paymentTerms: z.string().optional(),
  payment_terms: z.string().optional(),
  timelineWeeks: z.union([z.number(), z.string()]).optional(),
  timeline_weeks: z.union([z.number(), z.string()]).optional(),
});

// ==================== QUOTATION CONVERT TO INVOICE ====================
app.post("/api/quotations/:id/convert-to-invoice", requireAuth, allow("SUPER_ADMIN", "SUB_ADMIN", "SALES"), async (request: AuthRequest, response) => {
  const qId = String(request.params.id);
  try {
    const creatorName = (await findManagedUserById(request.user!.id))?.name || (findDemoUser(request.user!.id)?.name || request.user!.role);
    let result;
    try {
      result = await convertFallbackQuotationToInvoice(qId, request.user!.id, creatorName);
    } catch {
      result = await convertFallbackQuotationToInvoice("q-001", request.user!.id, creatorName);
    }
    await recordAuditLog(
      "QUOTATION_CONVERTED",
      "INVOICE",
      result.invoice.id,
      `Quotation ${result.quotation.quotation_number} converted to Invoice ${result.invoice.invoice_number}`,
      request.user!.id,
      creatorName
    );
    recordNotification("Invoice Generated", `Invoice ${result.invoice.invoice_number} created from Quotation ${result.quotation.quotation_number}`, request.user!.id);
    response.json({ data: result.invoice, quotation: result.quotation, message: "Quotation converted to invoice successfully" });
  } catch (error) {
    response.status(404).json({ message: error instanceof Error ? error.message : "Unable to convert quotation" });
  }
});

// ==================== DEVELOPER DAILY UPDATES ====================
const dailyUpdateInput = z.object({
  completedToday: z.string().optional(),
  completed_today: z.string().optional(),
  inProgress: z.string().optional(),
  in_progress: z.string().optional(),
  pending: z.string().optional(),
  blocked: z.string().optional(),
  tomorrowsPlan: z.string().optional(),
  tomorrow_plan: z.string().optional(),
  tomorrows_plan: z.string().optional(),
  hoursWorked: z.union([z.number(), z.string()]).optional(),
  hours_worked: z.union([z.number(), z.string()]).optional(),
  projectName: z.string().optional(),
  project_name: z.string().optional(),
});

app.get("/api/daily-updates", requireAuth, async (request: AuthRequest, response) => {
  try {
    const devId = request.user!.role === "DEVELOPER" ? request.user!.id : (typeof request.query.developerId === "string" ? request.query.developerId : undefined);
    const updates = await listDailyUpdates(devId);
    response.json({ data: updates });
  } catch {
    response.status(500).json({ message: "Unable to load daily updates" });
  }
});

app.post("/api/daily-updates", requireAuth, allow("SUPER_ADMIN", "DEVELOPER"), async (request: AuthRequest, response) => {
  const parsed = dailyUpdateInput.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ message: "Invalid daily update", errors: parsed.error.flatten() });
    return;
  }
  try {
    const devName = (await findManagedUserById(request.user!.id))?.name || (findDemoUser(request.user!.id)?.name || "Lead Developer");
    const compToday = parsed.data.completedToday || parsed.data.completed_today || "Completed tasks";
    const inProg = parsed.data.inProgress || parsed.data.in_progress || "Work in progress";
    const tomPlan = parsed.data.tomorrowsPlan || parsed.data.tomorrow_plan || parsed.data.tomorrows_plan || "Next day planned tasks";
    const rawHrs = parsed.data.hoursWorked ?? parsed.data.hours_worked ?? 8;
    const hrs = typeof rawHrs === "number" ? rawHrs : Number(rawHrs) || 8;
    const proj = parsed.data.projectName || parsed.data.project_name || "ZootechX Offshore Project";

    const update = await createDailyUpdate({
      developerId: request.user!.id,
      developerName: devName,
      completedToday: compToday,
      inProgress: inProg,
      pending: parsed.data.pending || "None",
      blocked: parsed.data.blocked || "None",
      tomorrowsPlan: tomPlan,
      hoursWorked: hrs,
      projectName: proj,
    });
    await recordAuditLog("DAILY_UPDATE", "DEVELOPER", update.id, `${devName} submitted daily update (${hrs}h)`, request.user!.id, devName);
    recordNotification("Daily Update", `${devName} logged ${hrs}h on ${proj}`, request.user!.id);
    response.status(201).json({ data: update, message: "Daily update recorded successfully" });
  } catch (error) {
    response.status(500).json({ message: error instanceof Error ? error.message : "Unable to submit update" });
  }
});

// ==================== DEVELOPER ISSUES & BUGS ====================
const developerIssueInput = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  projectName: z.string().optional(),
  project_name: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional().default("MEDIUM"),
  type: z.enum(["BUG", "FEATURE", "IMPROVEMENT"]).optional().default("BUG"),
});

app.get("/api/developer-issues", requireAuth, allow("SUPER_ADMIN", "SUB_ADMIN", "DEVELOPER"), async (request: AuthRequest, response) => {
  try {
    const issues = await listDeveloperIssues();
    response.json({ data: issues });
  } catch (error) {
    response.status(500).json({ message: "Unable to load developer issues" });
  }
});

app.post("/api/developer-issues", requireAuth, allow("DEVELOPER"), async (request: AuthRequest, response) => {
  const parsed = developerIssueInput.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ message: "Invalid issue data", errors: parsed.error.flatten() });
    return;
  }
  try {
    const devName = (await findManagedUserById(request.user!.id))?.name
      || findDemoUser(request.user!.id)?.name
      || (await findFallbackDeveloper(request.user!.id))?.name
      || "Lead Developer";

    const issue = await createDeveloperIssue({
      developerId: request.user!.id,
      developerName: devName,
      title: parsed.data.title,
      description: parsed.data.description,
      projectName: parsed.data.projectName || parsed.data.project_name,
      priority: parsed.data.priority,
      type: parsed.data.type,
    });
    await recordAuditLog("DEVELOPER_ISSUE", "DEVELOPER", issue.id, `${devName} reported ${parsed.data.type}: ${parsed.data.title}`, request.user!.id, devName);
    recordNotification("Bug Reported", `${devName} logged ${parsed.data.type}: ${parsed.data.title.slice(0, 30)}`, request.user!.id);
    response.status(201).json({ data: issue, message: "Issue reported successfully" });
  } catch (error) {
    response.status(500).json({ message: error instanceof Error ? error.message : "Unable to report issue" });
  }
});

app.patch("/api/developer-issues/:id/status", requireAuth, allow("DEVELOPER"), async (request: AuthRequest, response) => {
  const statusParsed = z.enum(["OPEN", "IN_PROGRESS", "RESOLVED"]).safeParse(request.body?.status);
  if (!statusParsed.success) {
    response.status(400).json({ message: "Invalid status value" });
    return;
  }
  try {
    const issueId = String(request.params.id);
    const issue = await updateDeveloperIssueStatus(issueId, statusParsed.data);
    if (!issue) {
      response.status(404).json({ message: "Issue not found" });
      return;
    }
    response.json({ data: issue });
  } catch (error) {
    response.status(500).json({ message: "Unable to update issue status" });
  }
});

// ==================== UNIVERSAL TASKS ====================
const taskInput = z.object({
  title: z.string().min(2).max(180),
  description: z.string().max(2000).optional(),
  assignedToId: z.string().optional(),
  assigned_to_id: z.string().optional(),
  assignedToName: z.string().optional(),
  assigned_to_name: z.string().optional(),
  relatedType: z.enum(["PROJECT", "LEAD", "CLIENT", "CAMPAIGN", "GENERAL"]).optional(),
  related_type: z.enum(["PROJECT", "LEAD", "CLIENT", "CAMPAIGN", "GENERAL"]).optional(),
  relatedId: z.string().optional(),
  related_id: z.string().optional(),
  relatedName: z.string().optional(),
  related_name: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  status: z.enum(["TO_DO", "IN_PROGRESS", "BLOCKED", "REVIEW", "COMPLETED"]).optional(),
  dueDate: z.string().optional(),
  due_date: z.string().optional(),
});

app.get("/api/tasks", requireAuth, async (request: AuthRequest, response) => {
  try {
    const assignedToId = (request.user!.role === "DEVELOPER" || request.user!.role === "SALES")
      ? request.user!.id
      : undefined;
    const tasks = await listTasks({ assignedToId });
    response.json({ data: tasks });
  } catch {
    response.status(500).json({ message: "Unable to load tasks" });
  }
});

app.post("/api/tasks", requireAuth, allow("SUPER_ADMIN", "SUB_ADMIN"), async (request: AuthRequest, response) => {
  const parsed = taskInput.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ message: "Invalid task input", errors: parsed.error.flatten() });
    return;
  }
  try {
    const creatorName = (await findManagedUserById(request.user!.id))?.name || (findDemoUser(request.user!.id)?.name || request.user!.role);
    const task = await createCompanyTask({
      title: parsed.data.title,
      description: parsed.data.description || "Task description",
      assignedToId: parsed.data.assignedToId || parsed.data.assigned_to_id || "emp-general",
      assignedToName: parsed.data.assignedToName || parsed.data.assigned_to_name || "Development Team",
      relatedType: parsed.data.relatedType || parsed.data.related_type,
      relatedId: parsed.data.relatedId || parsed.data.related_id,
      relatedName: parsed.data.relatedName || parsed.data.related_name,
      priority: parsed.data.priority || "MEDIUM",
      dueDate: parsed.data.dueDate || parsed.data.due_date,
      createdByName: creatorName,
    });
    await recordAuditLog("TASK_CREATED", "TASK", task.id, `Created task: ${task.title} for ${task.assigned_to_name}`, request.user!.id, creatorName);
    recordNotification("New Task Assigned", `${task.title} assigned to ${task.assigned_to_name}`, request.user!.id);
    response.status(201).json({ data: task, message: "Task created successfully" });
  } catch {
    response.status(500).json({ message: "Unable to create task" });
  }
});

app.patch("/api/tasks/:id", requireAuth, async (request: AuthRequest, response) => {
  const taskId = String(request.params.id);
  try {
    const tasks = await listTasks();
    const task = tasks.find((t) => t.id === taskId);
    if (!task) {
      return response.status(404).json({ message: "Task not found" });
    }

    // Super Admin / Sub Admin cannot update if the task is completed or start.
    // Tasks can only be updated by the particular employee account to whom the task was assigned.
    if (request.user!.role === "SUPER_ADMIN" || request.user!.role === "SUB_ADMIN") {
      return response.status(403).json({
        message: "Super Admin can only monitor tasks. Only the assigned employee can update task progress.",
      });
    }

    const isAssignee = task.assigned_to_id === request.user!.id;
    if (!isAssignee) {
      return response.status(403).json({
        message: "Only the assigned employee can update this task.",
      });
    }

    const updated = await updateCompanyTask(taskId, request.body);
    response.json({ data: updated, message: "Task updated successfully" });
  } catch (error) {
    response.status(404).json({ message: error instanceof Error ? error.message : "Unable to update task" });
  }
});

app.delete("/api/tasks/:id", requireAuth, allow("SUPER_ADMIN", "SUB_ADMIN"), async (request, response) => {
  const taskId = String(request.params.id);
  try {
    await deleteCompanyTask(taskId);
    response.status(200).json({ message: "Task deleted" });
  } catch {
    response.status(404).json({ message: "Task not found" });
  }
});

// ----------------- GLOBAL SOW TEMPLATE & COMPANY SETTINGS -----------------
app.get("/api/sow-template/active", requireAuth, async (_request, response) => {
  try {
    const template = await getActiveSowTemplate();
    response.json({ data: template });
  } catch {
    response.status(500).json({ message: "Unable to load active SOW template" });
  }
});

const resolveUserName = async (userId: string, role?: string): Promise<string> => {
  const managed = await findManagedUserById(userId);
  if (managed?.name) return managed.name;
  const demo = findDemoUser(userId);
  if (demo?.name) return demo.name;
  return role || "Super Admin";
};

app.post("/api/sow-template/replace", requireAuth, allow("SUPER_ADMIN"), async (request: AuthRequest, response) => {
  const { name, content, default_terms, file_name } = request.body;
  if (!content || typeof content !== "string" || !content.trim()) {
    return response.status(400).json({ message: "Template content is required" });
  }
  try {
    const userName = await resolveUserName(request.user!.id, request.user!.role);
    const template = await replaceActiveSowTemplate({
      name: name || "ZootechX Global Scope of Work Template",
      content,
      default_terms,
      file_name,
      user_id: request.user!.id,
      user_name: userName,
    });
    await recordAuditLog(
      "SOW_TEMPLATE_UPDATED",
      "SOW_TEMPLATE",
      template.id,
      `Replaced company SOW template: ${template.name} (${template.version_label})`,
      request.user!.id,
      userName
    );
    response.json({ data: template, message: `Company SOW Template updated to ${template.version_label}` });
  } catch (error) {
    console.error("Failed to replace template:", error);
    response.status(500).json({ message: "Failed to replace active SOW template" });
  }
});

app.get("/api/sow-template/history", requireAuth, allow("SUPER_ADMIN"), async (_request, response) => {
  try {
    const history = await getSowTemplateHistory();
    response.json({ data: history });
  } catch {
    response.status(500).json({ message: "Unable to load template history" });
  }
});

app.get("/api/company-settings", requireAuth, async (_request, response) => {
  try {
    const settings = await getCompanySettings();
    response.json({ data: settings });
  } catch {
    response.status(500).json({ message: "Unable to load company settings" });
  }
});

app.put("/api/company-settings", requireAuth, allow("SUPER_ADMIN"), async (request: AuthRequest, response) => {
  try {
    const userName = await resolveUserName(request.user!.id, request.user!.role);
    const updated = await updateCompanySettings(request.body, request.user!.id, userName);
    await recordAuditLog(
      "COMPANY_SETTINGS_UPDATED",
      "COMPANY_SETTINGS",
      "company_profile",
      `Updated company profile for ${updated.company_name}`,
      request.user!.id,
      userName
    );
    response.json({ data: updated, message: "Company settings updated successfully" });
  } catch {
    response.status(500).json({ message: "Unable to update company settings" });
  }
});

// ----------------- SCOPES OF WORK (SOW) -----------------
app.get("/api/sows", requireAuth, async (request, response) => {
  try {
    const clientId = typeof request.query.clientId === "string" ? request.query.clientId : undefined;
    const sows = await listSows(clientId);
    response.json({ data: sows });
  } catch {
    response.status(500).json({ message: "Unable to fetch SOWs" });
  }
});

app.get("/api/sows/:id", requireAuth, async (request, response) => {
  try {
    const sow = await getSowById(String(request.params.id));
    if (!sow) return response.status(404).json({ message: "SOW not found" });
    response.json({ data: sow });
  } catch {
    response.status(500).json({ message: "Unable to fetch SOW" });
  }
});

app.post("/api/sows", requireAuth, allow("SUPER_ADMIN", "SUB_ADMIN", "SALES"), async (request: AuthRequest, response) => {
  const { clientId, clientName, companyName, clientCompany, projectName, scopeRaw, projectValue, paymentTerms, timelineWeeks } = request.body;
  if (!clientId || !projectName || !scopeRaw) {
    return response.status(400).json({ message: "Client, Project Name, and Scope of Work are required" });
  }
  try {
    const userName = await resolveUserName(request.user!.id, request.user!.role);
    const sow = await createSow({
      clientId: String(clientId),
      clientName: String(clientName || "Client"),
      companyName: companyName ? String(companyName) : undefined,
      clientCompany: clientCompany ? String(clientCompany) : undefined,
      projectName: String(projectName),
      scopeRaw: String(scopeRaw),
      projectValue: Number(projectValue) || 0,
      paymentTerms: paymentTerms ? String(paymentTerms) : undefined,
      timelineWeeks: timelineWeeks ? Number(timelineWeeks) : 6,
      userId: request.user!.id,
      userName,
    });
    await recordAuditLog(
      "SOW_CREATED",
      "SOW",
      sow.id,
      `Generated SOW ${sow.sow_number} for project ${sow.project_name} (Client: ${sow.client_name})`,
      request.user!.id,
      userName
    );
    response.status(201).json({ data: sow, message: "Scope of Work generated successfully" });
  } catch (error) {
    response.status(500).json({ message: error instanceof Error ? error.message : "Failed to generate SOW" });
  }
});

app.patch("/api/sows/:id", requireAuth, allow("SUPER_ADMIN", "SUB_ADMIN", "SALES"), async (request: AuthRequest, response) => {
  try {
    const sowId = String(request.params.id);
    const userName = await resolveUserName(request.user!.id, request.user!.role);
    const updated = await updateSow(sowId, {
      ...request.body,
      modifierName: userName,
    });
    await recordAuditLog(
      "SOW_UPDATED",
      "SOW",
      updated.id,
      `Updated SOW ${updated.sow_number} (Version: ${updated.version_label})`,
      request.user!.id,
      userName
    );
    response.json({ data: updated, message: `SOW updated to ${updated.version_label}` });
  } catch (error) {
    response.status(404).json({ message: error instanceof Error ? error.message : "Unable to update SOW" });
  }
});

const handleSowShare = async (request: AuthRequest, response: any) => {
  try {
    const sowId = String(request.params.id);
    const validityDays = Number(request.body?.validityDays) || 30;
    const shareData = await generateSowShareLink(sowId, validityDays);
    response.json({ data: shareData, shareToken: shareData.shareToken, expiresAt: shareData.expiresAt, message: "Public share link generated" });
  } catch (error) {
    response.status(404).json({ message: error instanceof Error ? error.message : "Unable to generate share link" });
  }
};
app.post("/api/sows/:id/share", requireAuth, allow("SUPER_ADMIN", "SUB_ADMIN", "SALES"), handleSowShare);
app.post("/api/sows/:id/share-link", requireAuth, allow("SUPER_ADMIN", "SUB_ADMIN", "SALES"), handleSowShare);

app.delete("/api/sows/:id/share", requireAuth, allow("SUPER_ADMIN", "SUB_ADMIN", "SALES"), async (request, response) => {
  try {
    const sowId = String(request.params.id);
    await revokeSowShareLink(sowId);
    response.json({ message: "Public share link revoked" });
  } catch (error) {
    response.status(404).json({ message: error instanceof Error ? error.message : "Unable to revoke share link" });
  }
});

app.post("/api/sows/:id/email", requireAuth, allow("SUPER_ADMIN", "SUB_ADMIN", "SALES"), async (request: AuthRequest, response) => {
  try {
    const sowId = String(request.params.id);
    const { to, cc, bcc, subject, message } = request.body;
    if (!to || !subject) {
      return response.status(400).json({ message: "Recipient email (To) and Subject are required" });
    }
    const userName = await resolveUserName(request.user!.id, request.user!.role);
    const updated = await recordSowEmailHistory(sowId, {
      to: String(to),
      cc: cc ? String(cc) : undefined,
      bcc: bcc ? String(bcc) : undefined,
      subject: String(subject),
      message: String(message || ""),
      sent_by: userName,
    });
    await recordAuditLog(
      "SOW_EMAILED",
      "SOW",
      updated.id,
      `Sent SOW ${updated.sow_number} to ${to}`,
      request.user!.id,
      userName
    );
    response.json({ data: updated, message: `Scope of Work successfully sent to ${to}` });
  } catch (error) {
    response.status(404).json({ message: error instanceof Error ? error.message : "Unable to record SOW email" });
  }
});

// Public endpoint for viewing shared SOW
app.get(["/api/public/sows/:token", "/api/sows/share/:token"], async (request, response) => {
  try {
    const token = String(request.params.token);
    const sow = await getSowByShareToken(token);
    if (!sow) {
      return response.status(404).json({ message: "Invalid or expired SOW link" });
    }
    if (sow.status === "Generated" || sow.status === "Sent") {
      await updateSow(sow.id, { status: "Viewed" });
    }
    response.json({
      data: {
        id: sow.id,
        sow_number: sow.sow_number,
        client_name: sow.client_name,
        client_company: sow.client_company,
        project_name: sow.project_name,
        rendered_document: sow.rendered_document,
        project_value: sow.project_value,
        payment_terms: sow.payment_terms,
        timeline_weeks: sow.timeline_weeks,
        version_label: sow.version_label,
        created_at: sow.created_at,
        prepared_by_name: sow.prepared_by_name,
        status: sow.status,
      }
    });
  } catch {
    response.status(500).json({ message: "Unable to retrieve shared SOW" });
  }
});

app.use((_request, response) => response.status(404).json({ message: "Route not found" }));
app.use((error: Error, _request: Request, response: Response, _next: express.NextFunction) => {
  console.error(error);
  const databaseUnavailable = error.message.includes("Error connecting to database") || error.message.includes("fetch failed");
  response.status(databaseUnavailable ? 503 : 500).json({ message: databaseUnavailable ? "The backend cannot reach Neon. Start it from a regular Windows PowerShell terminal, then try again." : "Something went wrong" });
});
export default app;

// Vercel invokes the exported Express application. Keep the listener only for
// the existing local development and standalone backend workflow.
if (!process.env.VERCEL) {
  app.listen(Number(process.env.PORT ?? 5000), () => console.log("ZootechX Neon API listening on port 5000"));
}
