import type { UIMessage } from "ai";

export interface ChatThread {
  id: string;
  title: string;
  industry: string;
  country: string;
  updatedAt: number;
  messages: UIMessage[];
}

const STORAGE_KEY = "launchpad-threads";

export function generateThreadId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `thread-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function readThreads(): ChatThread[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (t): t is ChatThread =>
        t && typeof t.id === "string" && Array.isArray(t.messages),
    );
  } catch {
    return [];
  }
}

export function writeThreads(threads: ChatThread[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(threads));
}

export function getThread(id: string): ChatThread | undefined {
  return readThreads().find((t) => t.id === id);
}

export function createThread(industry: string, country: string): ChatThread {
  const thread: ChatThread = {
    id: generateThreadId(),
    title: `${industry} · ${country}`,
    industry,
    country,
    updatedAt: Date.now(),
    messages: [],
  };
  writeThreads([thread, ...readThreads()]);
  return thread;
}

export function saveThreadMessages(id: string, messages: UIMessage[]) {
  const threads = readThreads();
  const index = threads.findIndex((t) => t.id === id);
  if (index === -1) return;
  const existing: ChatThread = threads[index];
  const updated: ChatThread = {
    id: existing.id,
    title: existing.title,
    industry: existing.industry,
    country: existing.country,
    messages,
    updatedAt: Date.now(),
  };
  threads[index] = updated;
  writeThreads(threads);
}

export function deleteThread(id: string) {
  writeThreads(readThreads().filter((t) => t.id !== id));
}
