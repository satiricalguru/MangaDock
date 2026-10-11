import { db } from "./db";
import type { ProgressItem } from "./types";

export function upsertProgress(userId: number, p: ProgressItem) {
  db()
    .prepare(
      `INSERT INTO progress (user_id, manga_id, chapter_id, chapter_num, page, pages, title, cover, updated_at)
       VALUES (@userId, @mangaId, @chapterId, @chapterNum, @page, @pages, @title, @cover, @updatedAt)
       ON CONFLICT (user_id, manga_id) DO UPDATE SET
         chapter_id = excluded.chapter_id, chapter_num = excluded.chapter_num, page = excluded.page, pages = excluded.pages,
         title = excluded.title, cover = excluded.cover, updated_at = excluded.updated_at
       WHERE excluded.updated_at >= progress.updated_at`,
    )
    .run({ userId, ...p, chapterNum: p.chapterNum ?? null });
  db()
    .prepare("INSERT OR IGNORE INTO reads (user_id, manga_id, chapter_id, read_at) VALUES (?, ?, ?, ?)")
    .run(userId, p.mangaId, p.chapterId, p.updatedAt);
}

export function validProgress(b: any): b is ProgressItem {
  return (
    b &&
    Number.isInteger(b.mangaId) &&
    typeof b.chapterId === "string" &&
    /^[0-9a-f-]{36}$/i.test(b.chapterId) &&
    Number.isInteger(b.page) &&
    Number.isInteger(b.pages) &&
    typeof b.title === "string" &&
    typeof b.cover === "string" &&
    b.title.length < 300 &&
    b.cover.length < 600
  );
}

