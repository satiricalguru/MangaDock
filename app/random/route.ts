import { redirect } from "next/navigation";
import { randomManga } from "@/lib/anilist";

export const dynamic = "force-dynamic";

export async function GET() {
  const m = await randomManga().catch(() => null);
  redirect(m ? `/manga/${m.id}` : "/browse?sort=POPULARITY_DESC");
}
