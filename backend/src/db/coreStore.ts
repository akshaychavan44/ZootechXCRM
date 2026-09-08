import { mkdir, readFile, rename, writeFile } from "fs/promises";
import { randomUUID } from "crypto";
import path from "path";
import bcrypt from "bcryptjs";

export type UserRole = "SUPER_ADMIN" | "SUB_ADMIN" | "SALES" | "DEVELOPER" | "DIGITAL_MARKETING";

export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  department: string;
  is_active: boolean;
  must_change_password: boolean;
  created_at: string;
  updated_at: string;
  last_login_at?: string | null;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  entity: string;
  entity_id: string;
  details: string;
  user_id: string;
  user_name: string;
  created_at: string;
}

export interface SowTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  default_scope: string;
  default_terms: string;
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
  file_name?: string;
}

export interface CompanySettings {
  company_name: string;
  company_logo: string;
  company_email: string;
  company_phone: string;
  company_website: string;
  company_address: string;
  updated_at: string;
  updated_by: string;
}

export interface SowVersionSnapshot {
  version: number;
  version_label: string;
  scope_raw: string;
  rendered_document: string;
  project_value: number;
  payment_terms: string;
  updated_at: string;
  updated_by_name: string;
}

export interface SowEmailRecord {
  id: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  message: string;
  sent_at: string;
  sent_by: string;
}

export interface ScopeOfWork {
  id: string;
  sow_number: string;
  client_id: string;
  client_name: string;
  client_company?: string;
  project_name: string;
  template_id: string;
  template_name: string;
  template_version: number;
  template_version_label: string;
  version: number;
  version_label: string;
  scope_raw: string;
  rendered_document: string;
  project_value: number;
  payment_terms: string;
  timeline_weeks: number;
  status: "Draft" | "Generated" | "Sent" | "Viewed" | "Revised" | "Approved" | "Rejected";
  share_token?: string | null;
  share_expires_at?: string | null;
  prepared_by_name: string;
  created_by_id: string;
  created_at: string;
  updated_at: string;
  versions?: SowVersionSnapshot[];
  email_history?: SowEmailRecord[];
}

export interface DailyDeveloperUpdate {
  id: string;
  developer_id: string;
  developer_name: string;
  completed_today: string;
  in_progress: string;
  pending: string;
  blocked: string;
  tomorrows_plan: string;
  hours_worked: number;
  project_name?: string;
  created_at: string;
}

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

export interface DeveloperIssue {
  id: string;
  developer_id: string;
  developer_name: string;
  title: string;
  description: string;
  project_name: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  type: "BUG" | "FEATURE" | "IMPROVEMENT";
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED";
  created_at: string;
  updated_at: string;
}

export interface PersistentNotification {
  id: string;
  user_id?: string | null;
  title: string;
  message: string;
  is_read: boolean;
  hidden_from_bell?: boolean;
  created_at: string;
}

interface CoreDataStore {
  users: ManagedUser[];
  auditLogs: AuditLogEntry[];
  sows: ScopeOfWork[];
  dailyUpdates: DailyDeveloperUpdate[];
  tasks: CompanyTask[];
  developerIssues: DeveloperIssue[];
  activeTemplate: GlobalSowTemplate;
  templateHistory: GlobalSowTemplate[];
  companySettings: CompanySettings;
  notifications?: PersistentNotification[];
}

import os from "os";

const runtimeDir = process.env.VERCEL ? path.join(os.tmpdir(), "zootechx_runtime") : path.join(process.cwd(), ".runtime");
const storePath = path.join(runtimeDir, "core-store.json");

const initialTemplates: SowTemplate[] = [
  {
    id: "tpl-web",
    name: "Custom Website / Web App",
    category: "Development",
    description: "Production-ready responsive website with Next.js/React frontend, PostgreSQL DB, and API integration.",
    default_scope: "1. UI/UX Architecture and Responsive Frontend Design\n2. Secure REST API and Database Architecture\n3. Authentication, Role-based Access Control and Admin Portal\n4. Performance Optimization, SEO Readiness & Security Hardening\n5. Staging Deployment, QA Testing & Production Launch",
    default_terms: "50% advance on milestone sign-off, 25% on staging review, 25% on final production deployment."
  },
  {
    id: "tpl-mobile",
    name: "Mobile Application (iOS & Android)",
    category: "Development",
    description: "Cross-platform mobile application built with React Native / Flutter.",
    default_scope: "1. Mobile UI/UX Wireframing & Prototyping\n2. Native API Integration & Push Notification Engine\n3. Offline Sync and Local Storage Persistence\n4. App Store & Google Play Store Submission & Approval Support",
    default_terms: "40% upfront deposit, 30% upon Beta release via TestFlight/Internal Track, 30% upon store publishing."
  },
  {
    id: "tpl-offshore",
    name: "Offshore Dedicated Developer Team",
    category: "Staffing / Offshore",
    description: "Monthly dedicated full-stack developers with agile sprint management and daily updates.",
    default_scope: "1. Dedicated full-time senior engineers (40 hrs/week)\n2. Daily standups, transparent Git commits, and milestone demos\n3. Technical architecture oversight and automated testing\n4. Direct communication via Slack, Teams, and ZootechX portal",
    default_terms: "Bi-weekly or monthly retainer invoiced in advance on the 1st of each working cycle."
  },
  {
    id: "tpl-seo",
    name: "SEO & Growth Marketing",
    category: "Marketing",
    description: "Search engine optimization, content strategy, keyword indexing, and conversion tracking.",
    default_scope: "1. Technical SEO Audit, Core Web Vitals & Keyword Research\n2. High-ranking Content Strategy & Backlink Acquisition\n3. Landing Page A/B Testing & Funnel Conversion Optimization\n4. Monthly Performance Analytics & ROI Dashboard",
    default_terms: "Monthly retainer payable at the start of each monthly campaign cycle."
  },
  {
    id: "tpl-custom",
    name: "Custom Enterprise Software",
    category: "Enterprise",
    description: "Custom ERP, CRM, or backend automation engine designed to spec.",
    default_scope: "1. Comprehensive Requirement Specification & Architecture Blueprint\n2. Microservices / Serverless Backend Engine & Relational Schema\n3. Enterprise Security Compliance, Audit Logging & Role Management\n4. SLA-backed 24/7 Monitoring and Dedicated Maintenance",
    default_terms: "30% initial retainer, 40% intermediate milestone delivery, 30% upon final acceptance."
  }
];

const seedUsers: ManagedUser[] = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    name: "ZootechX Super Admin",
    email: "admin@erp.com",
    password_hash: "$2a$12$R.7wK4jA8nI2K1L7x8Jxe.q2B6U9R4o8QeL6kM5xZ7k1G9y8f4K.W", // ChangeMe123!
    role: "SUPER_ADMIN",
    department: "Executive",
    is_active: true,
    must_change_password: false,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    name: "ZootechX Sub Admin",
    email: "subadmin@erp.com",
    password_hash: "$2a$12$R.7wK4jA8nI2K1L7x8Jxe.q2B6U9R4o8QeL6kM5xZ7k1G9y8f4K.W",
    role: "SUB_ADMIN",
    department: "Operations",
    is_active: true,
    must_change_password: false,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "00000000-0000-4000-8000-000000000003",
    name: "ZootechX Sales Lead",
    email: "sales@erp.com",
    password_hash: "$2a$12$R.7wK4jA8nI2K1L7x8Jxe.q2B6U9R4o8QeL6kM5xZ7k1G9y8f4K.W",
    role: "SALES",
    department: "Sales & BD",
    is_active: true,
    must_change_password: false,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "00000000-0000-4000-8000-000000000004",
    name: "ZootechX Growth & Marketing",
    email: "marketing@erp.com",
    password_hash: "$2a$12$R.7wK4jA8nI2K1L7x8Jxe.q2B6U9R4o8QeL6kM5xZ7k1G9y8f4K.W",
    role: "DIGITAL_MARKETING",
    department: "Marketing",
    is_active: true,
    must_change_password: false,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "00000000-0000-4000-8000-000000000005",
    name: "ZootechX Lead Developer",
    email: "dev@erp.com",
    password_hash: "$2a$12$R.7wK4jA8nI2K1L7x8Jxe.q2B6U9R4o8QeL6kM5xZ7k1G9y8f4K.W",
    role: "DEVELOPER",
    department: "Engineering",
    is_active: true,
    must_change_password: false,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z"
  }
];

const seedTasks: CompanyTask[] = [
  {
    id: "task-01",
    title: "Configure Stripe Webhook & Invoicing Engine",
    description: "Wire real-time payment webhook verification with idempotency protection.",
    assigned_to_id: "00000000-0000-4000-8000-000000000005",
    assigned_to_name: "ZootechX Lead Developer",
    related_type: "PROJECT",
    related_name: "ZootechX CRM Core",
    priority: "HIGH",
    status: "IN_PROGRESS",
    due_date: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
    created_by_name: "ZootechX Super Admin",
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "task-02",
    title: "Follow up on Enterprise Mobile SOW",
    description: "Schedule technical walkthrough call with CTO regarding offline sync requirements.",
    assigned_to_id: "00000000-0000-4000-8000-000000000003",
    assigned_to_name: "ZootechX Sales Lead",
    related_type: "LEAD",
    related_name: "Apex Logistics Tech",
    priority: "URGENT",
    status: "TO_DO",
    due_date: new Date().toISOString().slice(0, 10),
    created_by_name: "ZootechX Super Admin",
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "task-03",
    title: "Launch Q3 LinkedIn Software Case Study Creative",
    description: "Export 1080x1350 carousel creative showcasing 10x invoicing performance.",
    assigned_to_id: "00000000-0000-4000-8000-000000000004",
    assigned_to_name: "ZootechX Growth & Marketing",
    related_type: "CAMPAIGN",
    related_name: "B2B Offshore Expansion",
    priority: "MEDIUM",
    status: "REVIEW",
    due_date: new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10),
    created_by_name: "ZootechX Super Admin",
    created_at: new Date(Date.now() - 7200000).toISOString(),
    updated_at: new Date().toISOString()
  }
];

const seedSows: ScopeOfWork[] = [
  {
    id: "sow-101",
    sow_number: "SOW-2026-001",
    client_id: "c-01",
    client_name: "Apex Logistics International",
    project_name: "Global Fleet Tracking & Dispatch Web Portal",
    template_id: "tpl-web",
    template_name: "Custom Website / Web App",
    template_version: 1,
    template_version_label: "v1.0",
    version: 1,
    version_label: "v1.0",
    scope_raw: "1. Real-time GPS Telematics Dashboard with Mapbox GL\n2. Automated Driver Route Optimization Engine\n3. Driver Mobile PWA with Proof-of-Delivery Signatures\n4. Cloud SQL Database Replication and Daily Backup Pipeline",
    rendered_document: `# SCOPE OF WORK (SOW)
## Document Ref: SOW-2026-001

**Client:** Apex Logistics International  
**Project:** Global Fleet Tracking & Dispatch Web Portal  
**Prepared By:** ZootechX Executive Team  
**Date:** March 2026  
**Project Value:** ₹450,000  

---

### 1. Executive Summary & Objective
ZootechX is commissioned to engineer and deploy an enterprise-grade web and mobile dispatch solution for Apex Logistics International, streamlining fleet monitoring and automating real-time dispatch routes.

### 2. Detailed Technical Scope
1. Real-time GPS Telematics Dashboard with Mapbox GL
2. Automated Driver Route Optimization Engine
3. Driver Mobile PWA with Proof-of-Delivery Signatures
4. Cloud SQL Database Replication and Daily Backup Pipeline

### 3. Timeline & Milestones
- **Sprint 1 (Weeks 1-2):** Architecture blueprint, schema migration, and mockups
- **Sprint 2 (Weeks 3-4):** Telematics ingestion API & Mapbox dashboard
- **Sprint 3 (Weeks 5-6):** PWA driver interface & signature uploads
- **Sprint 4 (Weeks 7-8):** Security review, load testing & production handover

### 4. Commercials & Payment Terms
- 50% advance upon project authorization: ₹225,000
- 25% on staging release and acceptance: ₹112,500
- 25% upon final production deployment: ₹112,500

---
*Authorized for ZootechX Offshore Development & Apex Logistics International*`,
    project_value: 450000,
    payment_terms: "50% advance, 25% staging milestone, 25% production rollout.",
    timeline_weeks: 8,
    status: "Approved",
    share_token: "apex-fleet-sow-2026",
    share_expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
    prepared_by_name: "ZootechX Super Admin",
    created_by_id: "00000000-0000-4000-8000-000000000001",
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    updated_at: new Date().toISOString()
  }
];

const seedDailyUpdates: DailyDeveloperUpdate[] = [
  {
    id: "du-01",
    developer_id: "00000000-0000-4000-8000-000000000005",
    developer_name: "ZootechX Lead Developer",
    completed_today: "Implemented AES-256 vault encryption helpers and live notification bell poller with unread badge.",
    in_progress: "Building Scope of Work template generator and daily updates submission form.",
    pending: "Code review for Quotation convert-to-invoice pipeline.",
    blocked: "None at present; API endpoints responding in <25ms.",
    tomorrows_plan: "Complete end-to-end testing of Super Admin user management and developer issue logging.",
    hours_worked: 8,
    project_name: "ZootechX CRM Core",
    created_at: new Date(Date.now() - 14400000).toISOString()
  }
];

const seedAuditLogs: AuditLogEntry[] = [
  {
    id: "audit-01",
    action: "SYSTEM_INITIALIZED",
    entity: "SYSTEM",
    entity_id: "root",
    details: "ZootechX CRM Production Engine started with active role-based security.",
    user_id: "00000000-0000-4000-8000-000000000001",
    user_name: "ZootechX Super Admin",
    created_at: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: "audit-02",
    action: "SOW_APPROVED",
    entity: "SOW",
    entity_id: "sow-101",
    details: "Apex Logistics International approved SOW-2026-001 (₹450,000).",
    user_id: "00000000-0000-4000-8000-000000000001",
    user_name: "ZootechX Super Admin",
    created_at: new Date(Date.now() - 24000000).toISOString()
  }
];

const defaultCompanySettings: CompanySettings = {
  company_name: "ZootechX Offshore Development",
  company_logo: "https://zootechx.ai/logo.png",
  company_email: "contact@zootechx.ai",
  company_phone: "+91 98765 43210",
  company_website: "https://zootechx.ai",
  company_address: "Tech Hub Tower, B-Wing, Mumbai, Maharashtra 400051",
  updated_at: "2026-01-01T00:00:00.000Z",
  updated_by: "ZootechX Super Admin",
};

const defaultSowTemplateContent = `# SCOPE OF WORK & PROJECT AGREEMENT
## Document Reference: {{sow_number}}

**Prepared By:** {{company_name}}  
**Client:** {{client_name}} ({{client_company}})  
**Project Title:** {{project_name}}  
**Service Category:** {{service_name}}  
**Date:** {{date}}  
**Lead Architect:** {{prepared_by}}  
**Engagement Value:** {{project_value}}  
**Estimated Timeline:** {{timeline}}  

---

### 1. Executive Summary & Objective
{{company_name}} is officially commissioned to deliver the **{{project_name}}** solution for **{{client_company}}**. This Scope of Work establishes the technical architecture, operational deliverables, and mutual milestone expectations.

---

### 2. Comprehensive Scope of Work
{{scope_of_work}}

---

### 3. Deliverables & Acceptance Criteria
1. **Architecture & Wireframes:** Database schema blueprints, technical interface diagrams, and wireframe approvals.
2. **Core Implementation:** High-performance, modular source code tracked in version-controlled Git repository.
3. **Quality Assurance & Testing:** Comprehensive unit and end-to-end integration tests on staging environment.
4. **Production Deployment & Warranty:** Zero-downtime release, environment configurations, and 30-day post-launch warranty.

---

### 4. Commercial Terms & Payment Schedule
- **Total Project Value:** {{project_value}}  
- **Payment Schedule:**  
{{payment_terms}}

---

### 5. Terms, Exclusions & Non-Disclosure
- Changes to deliverables not explicitly mentioned in this document will be handled through a formalized Change Request.
- Both parties maintain strict confidentiality regarding project source code, database credentials, and business IP.

---

### 6. Sign-off & Mutual Authorization

**Authorized for {{company_name}}**  
*{{prepared_by}}*  
Email: {{company_email}} | Phone: {{company_phone}} | Web: {{company_website}}  

**Authorized for {{client_company}}**  
*Client Authorized Representative*`;

const defaultActiveTemplate: GlobalSowTemplate = {
  id: "global-sow-tpl-01",
  name: "ZootechX Standard Agency SOW Template",
  version: 1,
  version_label: "v1.0",
  template_content: defaultSowTemplateContent,
  default_terms: "50% advance on milestone sign-off, 25% on staging review, 25% on final production deployment.",
  uploaded_by_id: "00000000-0000-4000-8000-000000000001",
  uploaded_by_name: "ZootechX Super Admin",
  uploaded_at: "2026-01-01T00:00:00.000Z",
  is_active: true,
  file_name: "zootechx-company-sow-v1.0.md"
};

function emptyStore(): CoreDataStore {
  return {
    users: [...seedUsers],
    auditLogs: [...seedAuditLogs],
    sows: [...seedSows],
    dailyUpdates: [...seedDailyUpdates],
    tasks: [...seedTasks],
    developerIssues: [],
    activeTemplate: { ...defaultActiveTemplate },
    templateHistory: [],
    companySettings: { ...defaultCompanySettings },
    notifications: [],
  };
}

async function readStore(): Promise<CoreDataStore> {
  try {
    const raw = await readFile(storePath, "utf8");
    const data = JSON.parse(raw) as Partial<CoreDataStore>;
    return {
      users: Array.isArray(data.users) && data.users.length ? data.users : [...seedUsers],
      auditLogs: Array.isArray(data.auditLogs) ? data.auditLogs : [...seedAuditLogs],
      sows: Array.isArray(data.sows) ? data.sows : [...seedSows],
      dailyUpdates: Array.isArray(data.dailyUpdates) ? data.dailyUpdates : [...seedDailyUpdates],
      tasks: Array.isArray(data.tasks) ? data.tasks : [...seedTasks],
      developerIssues: Array.isArray(data.developerIssues) ? data.developerIssues : [],
      activeTemplate: data.activeTemplate && data.activeTemplate.template_content ? data.activeTemplate : { ...defaultActiveTemplate },
      templateHistory: Array.isArray(data.templateHistory) ? data.templateHistory : [],
      companySettings: data.companySettings && data.companySettings.company_name ? data.companySettings : { ...defaultCompanySettings },
      notifications: Array.isArray(data.notifications) ? data.notifications : [],
    };
  } catch {
    try {
      const defaultPath = path.join(__dirname, "default_data", "core-store.json");
      const defaultRaw = await readFile(defaultPath, "utf8");
      const defaultData = JSON.parse(defaultRaw) as CoreDataStore;
      await saveStore(defaultData).catch(() => {});
      return defaultData;
    } catch {}
    const fresh = emptyStore();
    await saveStore(fresh).catch(() => {});
    return fresh;
  }
}

async function saveStore(store: CoreDataStore): Promise<void> {
  try {
    await mkdir(runtimeDir, { recursive: true });
    const tmp = `${storePath}.tmp`;
    await writeFile(tmp, JSON.stringify(store, null, 2), "utf8");
    await rename(tmp, storePath);
  } catch (err) {
    console.warn("Unable to persist core store to disk:", err);
  }
}

// ----------------- USERS -----------------
export async function listManagedUsers(): Promise<Omit<ManagedUser, "password_hash">[]> {
  const store = await readStore();
  return store.users.map(({ password_hash, ...rest }) => rest);
}

export async function findManagedUserByEmail(email: string): Promise<ManagedUser | undefined> {
  const store = await readStore();
  return store.users.find(u => u.email.toLowerCase() === email.toLowerCase());
}

export async function findManagedUserById(id: string): Promise<ManagedUser | undefined> {
  const store = await readStore();
  return store.users.find(u => u.id === id);
}

export async function createManagedUser(input: {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  department?: string;
}): Promise<Omit<ManagedUser, "password_hash">> {
  const store = await readStore();
  const existing = store.users.find(u => u.email.toLowerCase() === input.email.toLowerCase());
  if (existing) {
    throw new Error("A user account with this email address already exists.");
  }
  const passwordHash = await bcrypt.hash(input.password, 10);
  const now = new Date().toISOString();
  const newUser: ManagedUser = {
    id: randomUUID(),
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    password_hash: passwordHash,
    role: input.role,
    department: input.department?.trim() || "Operations",
    is_active: true,
    must_change_password: true,
    created_at: now,
    updated_at: now
  };
  store.users.unshift(newUser);
  await saveStore(store);
  const { password_hash, ...safeUser } = newUser;
  return safeUser;
}

export async function updateManagedUser(
  id: string,
  updates: Partial<Pick<ManagedUser, "name" | "role" | "department" | "is_active" | "must_change_password">>
): Promise<Omit<ManagedUser, "password_hash">> {
  const store = await readStore();
  const index = store.users.findIndex(u => u.id === id);
  if (index === -1) throw new Error("User not found");
  const current = store.users[index];
  const updated: ManagedUser = {
    ...current,
    ...updates,
    updated_at: new Date().toISOString()
  };
  store.users[index] = updated;
  await saveStore(store);
  const { password_hash, ...safeUser } = updated;
  return safeUser;
}

export async function resetManagedUserPassword(id: string, newPassword: string): Promise<void> {
  const store = await readStore();
  const user = store.users.find(u => u.id === id);
  if (!user) throw new Error("User not found");
  user.password_hash = await bcrypt.hash(newPassword, 10);
  user.must_change_password = true;
  user.updated_at = new Date().toISOString();
  await saveStore(store);
}

export async function deleteManagedUser(id: string): Promise<void> {
  const store = await readStore();
  const user = store.users.find(u => u.id === id);
  if (!user) throw new Error("User not found");
  if (user.role === "SUPER_ADMIN" && store.users.filter(u => u.role === "SUPER_ADMIN" && u.is_active).length <= 1) {
    throw new Error("Cannot delete the primary Super Admin account.");
  }
  store.users = store.users.filter(u => u.id !== id);
  await saveStore(store);
}

// ----------------- AUDIT LOGS -----------------
export async function recordAuditLog(
  action: string,
  entity: string,
  entityId: string,
  details: string,
  userId: string,
  userName: string
): Promise<AuditLogEntry> {
  const store = await readStore();
  const entry: AuditLogEntry = {
    id: randomUUID(),
    action,
    entity,
    entity_id: entityId,
    details,
    user_id: userId,
    user_name: userName,
    created_at: new Date().toISOString()
  };
  store.auditLogs.unshift(entry);
  if (store.auditLogs.length > 500) {
    store.auditLogs = store.auditLogs.slice(0, 500);
  }
  await saveStore(store);
  return entry;
}

export async function listAuditLogs(limit: number = 100): Promise<AuditLogEntry[]> {
  const store = await readStore();
  return store.auditLogs.slice(0, limit);
}

// ----------------- SOW MODULE -----------------
export function listSowTemplates(): SowTemplate[] {
  return initialTemplates;
}

export async function listSows(clientId?: string): Promise<ScopeOfWork[]> {
  const store = await readStore();
  const filtered = clientId ? store.sows.filter(s => s.client_id === clientId) : store.sows;
  return filtered.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export async function getSowById(id: string): Promise<ScopeOfWork | undefined> {
  const store = await readStore();
  return store.sows.find(s => s.id === id || s.sow_number === id);
}

export async function getSowByShareToken(token: string): Promise<ScopeOfWork | undefined> {
  const store = await readStore();
  const sow = store.sows.find(s => s.share_token === token);
  if (!sow) return undefined;
  if (sow.share_expires_at && new Date(sow.share_expires_at) < new Date()) {
    return undefined;
  }
  return sow;
}

// ----------------- GLOBAL SOW TEMPLATE & COMPANY SETTINGS -----------------
export function interpolateSowTemplate(
  templateContent: string,
  variables: {
    company_name: string;
    company_logo: string;
    client_name: string;
    client_company: string;
    project_name: string;
    service_name: string;
    scope_of_work: string;
    prepared_by: string;
    date: string;
    project_value: string;
    timeline: string;
    payment_terms: string;
    company_email: string;
    company_phone: string;
    company_website: string;
    sow_number?: string;
  }
): string {
  let doc = templateContent;
  for (const [key, val] of Object.entries(variables)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, "gi");
    doc = doc.replace(regex, val ?? "");
  }
  return doc;
}

export async function getActiveSowTemplate(): Promise<GlobalSowTemplate> {
  const store = await readStore();
  return store.activeTemplate || defaultActiveTemplate;
}

export async function getSowTemplateHistory(): Promise<GlobalSowTemplate[]> {
  const store = await readStore();
  return store.templateHistory || [];
}

export async function replaceActiveSowTemplate(input: {
  name: string;
  content: string;
  default_terms?: string;
  user_id: string;
  user_name: string;
  file_name?: string;
}): Promise<GlobalSowTemplate> {
  const store = await readStore();
  const prev = store.activeTemplate || defaultActiveTemplate;
  
  store.templateHistory = store.templateHistory || [];
  store.templateHistory.unshift({ ...prev, is_active: false });

  const nextVer = (prev.version || 1) + 1;
  const newTemplate: GlobalSowTemplate = {
    id: randomUUID(),
    name: input.name.trim() || `ZootechX Global SOW Template v${nextVer}.0`,
    version: nextVer,
    version_label: `v${nextVer}.0`,
    template_content: input.content.trim(),
    default_terms: input.default_terms?.trim() || prev.default_terms || "50% advance, 25% staging, 25% production.",
    uploaded_by_id: input.user_id,
    uploaded_by_name: input.user_name,
    uploaded_at: new Date().toISOString(),
    is_active: true,
    file_name: input.file_name || `zootechx-sow-template-v${nextVer}.0.md`,
  };

  store.activeTemplate = newTemplate;
  await saveStore(store);
  return newTemplate;
}

export async function getCompanySettings(): Promise<CompanySettings> {
  const store = await readStore();
  return store.companySettings || defaultCompanySettings;
}

export async function updateCompanySettings(
  settings: Partial<CompanySettings>,
  userId: string,
  userName: string
): Promise<CompanySettings> {
  const store = await readStore();
  const current = store.companySettings || defaultCompanySettings;
  const updated: CompanySettings = {
    ...current,
    ...settings,
    updated_at: new Date().toISOString(),
    updated_by: userName || userId,
  };
  store.companySettings = updated;
  await saveStore(store);
  return updated;
}

export async function createSow(input: {
  clientId: string;
  clientName: string;
  companyName?: string;
  clientCompany?: string;
  projectName: string;
  templateId?: string;
  scopeRaw: string;
  projectValue: number;
  paymentTerms?: string;
  timelineWeeks?: number;
  userId: string;
  userName: string;
}): Promise<ScopeOfWork> {
  const store = await readStore();
  const template = store.activeTemplate || defaultActiveTemplate;
  const company = store.companySettings || defaultCompanySettings;
  const sowNumber = `SOW-${new Date().getFullYear()}-${String(store.sows.length + 1).padStart(3, "0")}`;
  const now = new Date().toISOString();
  const dateStr = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const clientCompany = input.clientCompany || input.companyName || input.clientName;
  const timelineStr = `${input.timelineWeeks || 6} Weeks`;
  const paymentTermsStr = input.paymentTerms || template.default_terms;
  const projectValueFormatted = `₹${Number(input.projectValue || 0).toLocaleString()}`;

  const rendered = interpolateSowTemplate(template.template_content, {
    company_name: company.company_name,
    company_logo: company.company_logo,
    client_name: input.clientName,
    client_company: clientCompany,
    project_name: input.projectName,
    service_name: "Custom Software & Offshore Engineering",
    scope_of_work: input.scopeRaw,
    prepared_by: input.userName,
    date: dateStr,
    project_value: projectValueFormatted,
    timeline: timelineStr,
    payment_terms: paymentTermsStr,
    company_email: company.company_email,
    company_phone: company.company_phone,
    company_website: company.company_website,
    sow_number: sowNumber,
  });

  const sow: ScopeOfWork = {
    id: randomUUID(),
    sow_number: sowNumber,
    client_id: input.clientId,
    client_name: input.clientName,
    client_company: clientCompany,
    project_name: input.projectName,
    template_id: template.id,
    template_name: template.name,
    template_version: template.version,
    template_version_label: template.version_label,
    version: 1,
    version_label: "v1.0",
    scope_raw: input.scopeRaw,
    rendered_document: rendered,
    project_value: input.projectValue,
    payment_terms: paymentTermsStr,
    timeline_weeks: input.timelineWeeks || 6,
    status: "Generated",
    share_token: randomUUID().slice(0, 12),
    share_expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
    prepared_by_name: input.userName,
    created_by_id: input.userId,
    created_at: now,
    updated_at: now,
    versions: [
      {
        version: 1,
        version_label: "v1.0",
        scope_raw: input.scopeRaw,
        rendered_document: rendered,
        project_value: input.projectValue,
        payment_terms: paymentTermsStr,
        updated_at: now,
        updated_by_name: input.userName,
      }
    ],
    email_history: [],
  };

  store.sows.unshift(sow);
  await saveStore(store);
  return sow;
}

export async function updateSow(
  id: string,
  updates: Partial<ScopeOfWork> & { modifierName?: string }
): Promise<ScopeOfWork> {
  const store = await readStore();
  const index = store.sows.findIndex(s => s.id === id);
  if (index === -1) throw new Error("Scope of Work not found");
  const current = store.sows[index];
  const now = new Date().toISOString();

  let nextVersion = current.version || 1;
  let nextVersionLabel = current.version_label || `v${nextVersion}.0`;
  const versions = Array.isArray(current.versions) ? [...current.versions] : [];

  // If the scope, document, or commercial terms changed, bump the SOW version!
  if (
    (updates.scope_raw && updates.scope_raw !== current.scope_raw) ||
    (updates.rendered_document && updates.rendered_document !== current.rendered_document) ||
    (updates.project_value !== undefined && updates.project_value !== current.project_value)
  ) {
    nextVersion = (current.version || 1) + 1;
    nextVersionLabel = `v${nextVersion}.0`;
    versions.push({
      version: nextVersion,
      version_label: nextVersionLabel,
      scope_raw: updates.scope_raw || current.scope_raw,
      rendered_document: updates.rendered_document || current.rendered_document,
      project_value: updates.project_value !== undefined ? updates.project_value : current.project_value,
      payment_terms: updates.payment_terms || current.payment_terms,
      updated_at: now,
      updated_by_name: updates.modifierName || "Staff Member",
    });
  }

  const updated: ScopeOfWork = {
    ...current,
    ...updates,
    version: nextVersion,
    version_label: nextVersionLabel,
    versions,
    updated_at: now,
  };

  store.sows[index] = updated;
  await saveStore(store);
  return updated;
}

export async function recordSowEmailHistory(
  sowId: string,
  emailData: {
    to: string;
    cc?: string;
    bcc?: string;
    subject: string;
    message: string;
    sent_by: string;
  }
): Promise<ScopeOfWork> {
  const store = await readStore();
  const sow = store.sows.find(s => s.id === sowId);
  if (!sow) throw new Error("SOW not found");
  sow.email_history = sow.email_history || [];
  sow.email_history.unshift({
    id: randomUUID(),
    ...emailData,
    sent_at: new Date().toISOString(),
  });
  sow.status = "Sent";
  sow.updated_at = new Date().toISOString();
  await saveStore(store);
  return sow;
}

export async function generateSowShareLink(id: string, validityDays: number = 30): Promise<{ shareToken: string; expiresAt: string }> {
  const store = await readStore();
  const sow = store.sows.find(s => s.id === id);
  if (!sow) throw new Error("SOW not found");
  const shareToken = randomUUID().slice(0, 12);
  const expiresAt = new Date(Date.now() + validityDays * 86400000).toISOString();
  sow.share_token = shareToken;
  sow.share_expires_at = expiresAt;
  sow.updated_at = new Date().toISOString();
  await saveStore(store);
  return { shareToken, expiresAt };
}

export async function revokeSowShareLink(id: string): Promise<void> {
  const store = await readStore();
  const sow = store.sows.find(s => s.id === id);
  if (!sow) throw new Error("SOW not found");
  sow.share_token = null;
  sow.share_expires_at = null;
  sow.updated_at = new Date().toISOString();
  await saveStore(store);
}

// ----------------- DAILY DEVELOPER UPDATES -----------------
export async function listDailyUpdates(developerId?: string): Promise<DailyDeveloperUpdate[]> {
  const store = await readStore();
  return store.dailyUpdates
    .filter(u => !developerId || u.developer_id === developerId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function createDailyUpdate(input: {
  developerId: string;
  developerName: string;
  completedToday: string;
  inProgress: string;
  pending: string;
  blocked: string;
  tomorrowsPlan: string;
  hoursWorked: number;
  projectName?: string;
}): Promise<DailyDeveloperUpdate> {
  const store = await readStore();
  const update: DailyDeveloperUpdate = {
    id: randomUUID(),
    developer_id: input.developerId,
    developer_name: input.developerName,
    completed_today: input.completedToday.trim(),
    in_progress: input.inProgress.trim(),
    pending: input.pending.trim(),
    blocked: input.blocked.trim() || "None",
    tomorrows_plan: input.tomorrowsPlan.trim(),
    hours_worked: Number(input.hoursWorked) || 8,
    project_name: input.projectName || "General Engineering",
    created_at: new Date().toISOString()
  };
  store.dailyUpdates.unshift(update);
  await saveStore(store);
  return update;
}

// ----------------- TASKS -----------------
export async function listTasks(filter?: { assignedToId?: string; status?: string }): Promise<CompanyTask[]> {
  const store = await readStore();
  return store.tasks
    .filter(t => {
      if (filter?.assignedToId && t.assigned_to_id !== filter.assignedToId) return false;
      if (filter?.status && t.status !== filter.status) return false;
      return true;
    })
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export async function createCompanyTask(input: {
  title: string;
  description: string;
  assignedToId: string;
  assignedToName: string;
  relatedType?: CompanyTask["related_type"];
  relatedId?: string | null;
  relatedName?: string | null;
  priority?: CompanyTask["priority"];
  dueDate?: string | null;
  createdByName: string;
}): Promise<CompanyTask> {
  const store = await readStore();
  const now = new Date().toISOString();
  const task: CompanyTask = {
    id: randomUUID(),
    title: input.title.trim(),
    description: input.description.trim(),
    assigned_to_id: input.assignedToId,
    assigned_to_name: input.assignedToName,
    related_type: input.relatedType || "GENERAL",
    related_id: input.relatedId ?? null,
    related_name: input.relatedName ?? null,
    priority: input.priority || "MEDIUM",
    status: "TO_DO",
    due_date: input.dueDate ?? null,
    created_by_name: input.createdByName,
    created_at: now,
    updated_at: now
  };
  store.tasks.unshift(task);
  await saveStore(store);
  return task;
}

export async function updateCompanyTask(
  id: string,
  updates: Partial<Pick<CompanyTask, "title" | "description" | "status" | "priority" | "due_date" | "assigned_to_id" | "assigned_to_name">>
): Promise<CompanyTask> {
  const store = await readStore();
  const index = store.tasks.findIndex(t => t.id === id);
  if (index === -1) throw new Error("Task not found");
  const current = store.tasks[index];
  const updated: CompanyTask = {
    ...current,
    ...updates,
    updated_at: new Date().toISOString()
  };
  store.tasks[index] = updated;
  await saveStore(store);
  return updated;
}

export async function deleteCompanyTask(id: string): Promise<void> {
  const store = await readStore();
  store.tasks = store.tasks.filter(t => t.id !== id);
  await saveStore(store);
}

// ----------------- DEVELOPER ISSUES & BUGS -----------------
export async function listDeveloperIssues(): Promise<DeveloperIssue[]> {
  const store = await readStore();
  return (store.developerIssues || []).slice().sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function createDeveloperIssue(input: {
  developerId: string;
  developerName: string;
  title: string;
  description: string;
  projectName?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  type?: "BUG" | "FEATURE" | "IMPROVEMENT";
}): Promise<DeveloperIssue> {
  const store = await readStore();
  const now = new Date().toISOString();
  const issue: DeveloperIssue = {
    id: `iss-${randomUUID().slice(0, 8)}`,
    developer_id: input.developerId,
    developer_name: input.developerName,
    title: input.title.trim(),
    description: input.description.trim(),
    project_name: input.projectName?.trim() || "General Engineering",
    priority: input.priority || "MEDIUM",
    type: input.type || "BUG",
    status: "OPEN",
    created_at: now,
    updated_at: now,
  };
  if (!Array.isArray(store.developerIssues)) store.developerIssues = [];
  store.developerIssues.unshift(issue);
  await saveStore(store);
  return issue;
}

export async function updateDeveloperIssueStatus(
  id: string,
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED"
): Promise<DeveloperIssue | null> {
  const store = await readStore();
  if (!Array.isArray(store.developerIssues)) store.developerIssues = [];
  const issue = store.developerIssues.find((i) => i.id === id);
  if (!issue) return null;
  issue.status = status;
  issue.updated_at = new Date().toISOString();
  await saveStore(store);
  return issue;
}

// ----------------- NOTIFICATIONS -----------------
export async function listPersistentNotifications(userId?: string, isAdmin?: boolean): Promise<PersistentNotification[]> {
  const store = await readStore();
  const notifs = store.notifications ?? [];
  return notifs
    .filter(n => !n.hidden_from_bell && (isAdmin || !n.user_id || n.user_id === userId))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function createPersistentNotification(title: string, message: string, userId?: string | null): Promise<PersistentNotification> {
  const store = await readStore();
  if (!Array.isArray(store.notifications)) store.notifications = [];
  const notif: PersistentNotification = {
    id: `notif-${Date.now()}-${randomUUID().slice(0, 6)}`,
    user_id: userId || null,
    title,
    message,
    is_read: false,
    hidden_from_bell: false,
    created_at: new Date().toISOString(),
  };
  store.notifications.unshift(notif);
  if (store.notifications.length > 80) store.notifications.pop();
  await saveStore(store);
  return notif;
}

export async function markPersistentNotificationRead(id: string, userId?: string, isAdmin?: boolean): Promise<PersistentNotification | undefined> {
  const store = await readStore();
  const notifs = store.notifications ?? [];
  const target = notifs.find(n => n.id === id && (isAdmin || !n.user_id || n.user_id === userId));
  if (target) {
    target.is_read = true;
    await saveStore(store);
  }
  return target;
}

export async function markAllPersistentNotificationsRead(userId?: string, isAdmin?: boolean): Promise<void> {
  const store = await readStore();
  let changed = false;
  for (const n of store.notifications ?? []) {
    if ((isAdmin || !n.user_id || n.user_id === userId) && !n.is_read) {
      n.is_read = true;
      changed = true;
    }
  }
  if (changed) await saveStore(store);
}

export async function clearReadPersistentNotifications(userId?: string, isAdmin?: boolean): Promise<void> {
  const store = await readStore();
  let changed = false;
  for (const n of store.notifications ?? []) {
    if ((isAdmin || !n.user_id || n.user_id === userId) && n.is_read && !n.hidden_from_bell) {
      n.hidden_from_bell = true;
      changed = true;
    }
  }
  if (changed) await saveStore(store);
}


