// Merges a guest's on-device history into their account after they log in.
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import type { InStatement } from "@libsql/client";
import { progressStatements, validProgress } from "@/lib/progress-server";

export async function POST(req: Request) {
  const user = await getUser();
  // guests keep their history in the browser; nothing to store here
  if (!user) return Response.json({ signedIn: false });
  const body = await req.json().catch(() => null);
  const items: unknown[] = Array.isArray(body?.progress) ? body.progress.slice(0, 500) : [];
  const reads: [string, number][] = Array.isArray(body?.reads) ? body.reads.slice(0, 5000) : [];
  const library: any[] = Array.isArray(body?.library) ? body.library.slice(0, 1000) : [];

  const stmts: InStatement[] = [];
  {
    for (const p of items) if (validProgress(p) && Number.isFinite((p as any).updatedAt)) stmts.push(...progressStatements(user.id, p));
    const addRead = db().prepare("INSERT OR IGNORE INTO reads (user_id, manga_id, chapter_id, read_at) VALUES (?, ?, ?, ?)");
    for (const [chapterId, mangaId] of reads) {
      if (typeof chapterId === "string" && Number.isInteger(mangaId)) stmts.push(addRead.bind(user.id, mangaId, chapterId, Date.now()));
    }
    const addLib = db().prepare(
      "INSERT OR IGNORE INTO library (user_id, manga_id, status, title, cover, added_at) VALUES (?, ?, ?, ?, ?, ?)",
    );
    for (const l of library) {
      if (Number.isInteger(l?.mangaId) && ["reading", "plan", "completed", "favorite"].includes(l.status)) {
        stmts.push(addLib.bind(user.id, l.mangaId, l.status, String(l.title).slice(0, 300), String(l.cover).slice(0, 600), l.addedAt ?? Date.now()));
      }
    }
  }
  await db().batch(stmts);
  return Response.json({ ok: true });
}
