// Same-origin image proxy so WebGL can use cover art as textures without CORS issues.
// Only proxies hosts on the allowlist. Also serves MangaDex covers, which can't be hotlinked.

import { fetchRetry } from "@/lib/cache";

const ALLOWED = new Set(["s4.anilist.co", "img.anili.st", "uploads.mangadex.org"]);

export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("u");
  if (!raw) return new Response("missing u", { status: 400 });
  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return new Response("bad url", { status: 400 });
  }
  if (target.protocol !== "https:" || !ALLOWED.has(target.hostname)) {
    return new Response("host not allowed", { status: 403 });
  }
  // image servers sometimes drop the connection; retry, and answer 502 rather than crash
  const upstream = await fetchRetry(target.href, { headers: { "User-Agent": "NeonInk/0.2" } }, 3, 15000).catch(() => null);
  if (!upstream?.ok || !upstream.body) return new Response("upstream error", { status: 502 });
  return new Response(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") ?? "image/jpeg",
      "Cache-Control": "public, max-age=86400, s-maxage=604800, immutable",
    },
  });
}
