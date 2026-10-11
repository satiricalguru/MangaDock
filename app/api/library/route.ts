import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";

const STATUSES = ["reading", "plan", "completed", "favorite"];

export async function GET(req: Request) {
  const user = await getUser();
  if (!user) return Response.json({ signedIn: false });
  const manga = Number(new URL(req.url).searchParams.get("manga"));
  if (manga) {
    const status = (await db().prepare("SELECT status FROM library WHERE user_id = ? AND manga_id = ?").pluck().get(user.id, manga)) ?? null;
    return Response.json({ signedIn: true, status });
  }
  const items = await db()
    .prepare("SELECT manga_id AS mangaId, status, title, cover, added_at AS addedAt FROM library WHERE user_id = ? ORDER BY added_at DESC")
    .all(user.id);
  return Response.json({ signedIn: true, items });
}

export async function POST(req: Request) {
  const user = await getUser();
  // guests keep their history in the browser; nothing to store here
  if (!user) return Response.json({ signedIn: false });
  const b = await req.json().catch(() => null);
  if (!b || !Number.isInteger(b.mangaId)) return Response.json({ error: "bad request" }, { status: 400 });
  if (b.status === null) {
    await db().prepare("DELETE FROM library WHERE user_id = ? AND manga_id = ?").run(user.id, b.mangaId);
  } else if (STATUSES.includes(b.status) && typeof b.title === "string" && typeof b.cover === "string") {
    await db()
      .prepare(
        `INSERT INTO library (user_id, manga_id, status, title, cover, added_at) VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT (user_id, manga_id) DO UPDATE SET status = excluded.status`,
      )
      .run(user.id, b.mangaId, b.status, b.title.slice(0, 300), b.cover.slice(0, 600), Date.now());
  } else {
    return Response.json({ error: "bad status" }, { status: 400 });
  }
  return Response.json({ ok: true });
}
