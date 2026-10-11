"use client";

// Reading progress and library, client side.
// Everything is written to this browser first (so guests get history too),
// then sent to the account when someone is signed in.

import type { LibraryItem, LibraryStatus, ProgressItem } from "./types";

const K = { progress: "ni:progress", reads: "ni:reads", library: "ni:library", synced: "ni:synced" };

function load<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "") ?? fallback;
  } catch {
    return fallback;
  }
}
function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or blocked; the account copy still works
  }
}

export function saveProgress(p: Omit<ProgressItem, "updatedAt">, beacon = false) {
  const item = { ...p, updatedAt: Date.now() };
  const all = load<Record<string, ProgressItem>>(K.progress, {});
  all[p.mangaId] = item;
  save(K.progress, all);
  const reads = load<Record<string, number>>(K.reads, {});
  reads[p.chapterId] = p.mangaId;
  save(K.reads, reads);
  const body = JSON.stringify(p);
  if (beacon && navigator.sendBeacon) navigator.sendBeacon("/api/progress", new Blob([body], { type: "application/json" }));
  else fetch("/api/progress", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
}

export async function getContinue(): Promise<{ signedIn: boolean; items: ProgressItem[] }> {
  const local = Object.values(load<Record<string, ProgressItem>>(K.progress, {})).sort((a, b) => b.updatedAt - a.updatedAt);
  try {
    const r = await fetch("/api/progress", { cache: "no-store" }).then((x) => x.json());
    if (r.signedIn) return { signedIn: true, items: r.items };
  } catch {}
  return { signedIn: false, items: local };
}

export async function getMangaState(mangaId: number): Promise<{ progress: ProgressItem | null; reads: Set<string>; status: LibraryStatus | null }> {
  try {
    const [p, l] = await Promise.all([
      fetch(`/api/progress?manga=${mangaId}`, { cache: "no-store" }).then((x) => x.json()),
      fetch(`/api/library?manga=${mangaId}`, { cache: "no-store" }).then((x) => x.json()),
    ]);
    if (p.signedIn) return { progress: p.progress, reads: new Set(p.reads), status: l.status };
  } catch {}
  const reads = load<Record<string, number>>(K.reads, {});
  return {
    progress: load<Record<string, ProgressItem>>(K.progress, {})[mangaId] ?? null,
    reads: new Set(Object.keys(reads).filter((c) => reads[c] === mangaId)),
    status: load<Record<string, LibraryItem>>(K.library, {})[mangaId]?.status ?? null,
  };
}

export async function setLibrary(mangaId: number, status: LibraryStatus | null, title: string, cover: string) {
  const all = load<Record<string, LibraryItem>>(K.library, {});
  if (status) all[mangaId] = { mangaId, status, title, cover, addedAt: all[mangaId]?.addedAt ?? Date.now() };
  else delete all[mangaId];
  save(K.library, all);
  await fetch("/api/library", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mangaId, status, title, cover }), keepalive: true }).catch(() => {});
}

export async function getLibrary(): Promise<{ signedIn: boolean; items: LibraryItem[] }> {
  try {
    const r = await fetch("/api/library", { cache: "no-store" }).then((x) => x.json());
    if (r.signedIn) return { signedIn: true, items: r.items };
  } catch {}
  return { signedIn: false, items: Object.values(load<Record<string, LibraryItem>>(K.library, {})).sort((a, b) => b.addedAt - a.addedAt) };
}

/** After login: push this device's guest history into the account, once per user. */
export async function syncToAccount(userId: number) {
  if (load<number[]>(K.synced, []).includes(userId)) return;
  const reads = load<Record<string, number>>(K.reads, {});
  const res = await fetch("/api/progress/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      progress: Object.values(load<Record<string, ProgressItem>>(K.progress, {})),
      reads: Object.entries(reads),
      library: Object.values(load<Record<string, LibraryItem>>(K.library, {})),
    }),
  }).catch(() => null);
  if (res?.ok) save(K.synced, [...load<number[]>(K.synced, []), userId]);
}

export function progressHref(p: Pick<ProgressItem, "chapterId" | "mangaId" | "page">) {
  return `/read/${p.chapterId}?m=${p.mangaId}${p.page > 0 ? `&p=${p.page}` : ""}`;
}
