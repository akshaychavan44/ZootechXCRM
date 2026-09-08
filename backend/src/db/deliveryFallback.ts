import { mkdir, readFile, rename, writeFile } from "fs/promises";
import { randomUUID } from "crypto";
import path from "path";

export type FallbackDeveloper = { id: string; name: string; email: string; password_hash: string; role: "DEVELOPER"; created_at: string };
export type FallbackProject = { id: string; name: string; client_name: string | null; description: string | null; status: string; priority: string; due_date: string | null; assigned_developer_id: string; created_by_id: string; created_at: string; updated_at: string };
export type FallbackUpdate = { id: string; project_id: string; author_id: string; message: string; progress: number; created_at: string };
type DeliveryStore = { developers: FallbackDeveloper[]; projects: FallbackProject[]; updates: FallbackUpdate[] };

import os from "os";

const runtimeDir = process.env.VERCEL ? path.join(os.tmpdir(), "zootechx_runtime") : path.join(process.cwd(), ".runtime");
const storePath = path.join(runtimeDir, "delivery-fallback.json");
const empty = (): DeliveryStore => ({ developers: [], projects: [], updates: [] });

async function readStore(): Promise<DeliveryStore> {
  try {
    return JSON.parse(await readFile(storePath, "utf8")) as DeliveryStore;
  } catch {
    try {
      const defaultPath = path.join(__dirname, "default_data", "delivery-fallback.json");
      const defaultData = JSON.parse(await readFile(defaultPath, "utf8")) as DeliveryStore;
      await saveStore(defaultData).catch(() => {});
      return defaultData;
    } catch {}
    return empty();
  }
}
async function saveStore(store: DeliveryStore): Promise<void> {
  try {
    await mkdir(runtimeDir, { recursive: true });
    const temporary = `${storePath}.tmp`;
    await writeFile(temporary, JSON.stringify(store, null, 2), "utf8");
    await rename(temporary, storePath);
  } catch (err) {
    console.warn("Unable to persist delivery store to disk:", err);
  }
}

export async function findFallbackDeveloper(value: string): Promise<FallbackDeveloper | undefined> {
  const store = await readStore();
  return store.developers.find(developer => developer.email === value.toLowerCase() || developer.id === value);
}
export async function createFallbackDeveloper(name: string, email: string, passwordHash: string): Promise<FallbackDeveloper> {
  const store = await readStore();
  if (store.developers.some(developer => developer.email === email.toLowerCase())) throw new Error("A developer with this email already exists");
  const developer: FallbackDeveloper = { id: randomUUID(), name, email: email.toLowerCase(), password_hash: passwordHash, role: "DEVELOPER", created_at: new Date().toISOString() };
  store.developers.unshift(developer); await saveStore(store); return developer;
}
export async function removeFallbackDeveloper(developerId: string): Promise<void> {
  const store = await readStore();
  if (store.projects.some(project => project.assigned_developer_id === developerId)) throw new Error("Reassign this developer's projects before removing the account");
  const next = store.developers.filter(developer => developer.id !== developerId);
  if (next.length === store.developers.length) throw new Error("Developer not found");
  store.developers = next; await saveStore(store);
}
export async function createFallbackProject(input: Omit<FallbackProject, "id" | "created_at" | "updated_at">): Promise<FallbackProject> {
  const store = await readStore();
  if (!store.developers.some(developer => developer.id === input.assigned_developer_id)) throw new Error("Assigned developer does not exist");
  const now = new Date().toISOString(); const project: FallbackProject = { ...input, id: randomUUID(), created_at: now, updated_at: now };
  store.projects.unshift(project); await saveStore(store); return project;
}
export async function listFallbackProjects(user: { id: string; role: string }): Promise<Array<FallbackProject & { developer_name?: string; progress: number }>> {
  const store = await readStore();
  return store.projects.filter(project => user.role !== "DEVELOPER" || project.assigned_developer_id === user.id).sort((a, b) => b.updated_at.localeCompare(a.updated_at)).map(project => ({ ...project, developer_name: store.developers.find(developer => developer.id === project.assigned_developer_id)?.name, progress: store.updates.filter(update => update.project_id === project.id).sort((a, b) => b.created_at.localeCompare(a.created_at))[0]?.progress ?? (project.status === "COMPLETED" ? 100 : 0) }));
}
export async function listFallbackUpdates(projectId: string): Promise<Array<FallbackUpdate & { author_name?: string }>> {
  const store = await readStore();
  return store.updates.filter(update => update.project_id === projectId).sort((a, b) => b.created_at.localeCompare(a.created_at)).map(update => ({ ...update, author_name: store.developers.find(developer => developer.id === update.author_id)?.name ?? "Super Admin" }));
}
export async function fallbackProject(projectId: string): Promise<FallbackProject | undefined> { return (await readStore()).projects.find(project => project.id === projectId); }
export async function addFallbackUpdate(projectId: string, authorId: string, message: string, progress: number): Promise<FallbackUpdate> {
  const store = await readStore(); const project = store.projects.find(item => item.id === projectId); if (!project) throw new Error("Project not found");
  const now = new Date().toISOString(); const update: FallbackUpdate = { id: randomUUID(), project_id: projectId, author_id: authorId, message, progress, created_at: now };
  project.status = progress === 100 ? "COMPLETED" : progress > 0 ? "IN_PROGRESS" : project.status; project.updated_at = now;
  store.updates.unshift(update); await saveStore(store); return update;
}
export async function setFallbackProjectStatus(projectId: string, status: string): Promise<FallbackProject> {
  const store = await readStore(); const project = store.projects.find(item => item.id === projectId); if (!project) throw new Error("Project not found");
  project.status = status; project.updated_at = new Date().toISOString(); await saveStore(store); return project;
}
export async function fallbackDeveloperOverview() {
  const store = await readStore();
  return store.developers.map(developer => {
    const work = store.projects.filter(project => project.assigned_developer_id === developer.id);
    const latestProgress = work.map(project => store.updates.filter(update => update.project_id === project.id).sort((a, b) => b.created_at.localeCompare(a.created_at))[0]?.progress ?? (project.status === "COMPLETED" ? 100 : 0));
    const activity = [...work.map(project => project.updated_at), ...store.updates.filter(update => update.author_id === developer.id).map(update => update.created_at)].sort().at(-1) ?? null;
    return { id: developer.id, name: developer.name, email: developer.email, role: developer.role, created_at: developer.created_at, assigned_projects: work.length, completed_projects: work.filter(project => project.status === "COMPLETED").length, active_projects: work.filter(project => ["PLANNING", "IN_PROGRESS"].includes(project.status)).length, average_progress: latestProgress.length ? Math.round(latestProgress.reduce((sum, value) => sum + value, 0) / latestProgress.length) : 0, last_activity_at: activity };
  }).sort((a, b) => (b.last_activity_at ?? "").localeCompare(a.last_activity_at ?? ""));
}
