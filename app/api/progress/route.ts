import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { upsertProgress, validProgress } from "@/lib/progress-server";

const SELECT = `SELECT manga_id AS mangaId, chapter_id AS chapterId, chapter_num AS chapterNum, page, pages, title, cover, updated_at AS updatedAt FROM progress`;

export async function GET(req: Request) {
  const user = await getUser();
  if (!user) return Response.json({ signedIn: false });
  const manga = Number(new URL(req.url).searchParams.get("manga"));
  if (manga) {
    const progress = db().prepare(`${SELECT} WHERE user_id = ? AND manga_id = ?`).get(user.id, manga) ?? null;
    const reads = db().prepare("SELECT chapter_id FROM reads WHERE user_id = ? AND manga_id = ?").pluck().all(user.id, manga);
    return Response.json({ signedIn: true, progress, reads });
  }
  const items = db().prepare(`${SELECT} WHERE user_id = ? ORDER BY updated_at DESC LIMIT 60`).all(user.id);
  return Response.json({ signedIn: true, items });
}

export async function POST(req: Request) {
  const user = await getUser();
  // guests keep their history in the browser; nothing to store here
  if (!user) return Response.json({ signedIn: false });
  const body = await req.json().catch(() => null);
  if (!validProgress(body)) return Response.json({ error: "bad progress" }, { status: 400 });
  upsertProgress(user.id, { ...body, updatedAt: Date.now() });
  return Response.json({ ok: true });
}
