// Chapter page proxy.
// MangaDex@Home nodes answer 404 to browsers for pages they haven't cached yet, but serve
// server-side clients fine (and that warms their cache). So the reader loads every page
// through here. Per MD@H rules we report each fetch's outcome back to MangaDex.

import "@/lib/dns";

export const dynamic = "force-dynamic";

const UA = "NeonInk/0.2 (free fan site; non-commercial)";
const allowed = (h: string) => h.endsWith(".mangadex.network") || h === "uploads.mangadex.org";

function report(url: string, success: boolean, bytes: number, duration: number, cached: boolean) {
  if (url.includes("uploads.mangadex.org")) return;
  fetch("https://api.mangadex.network/report", {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": UA },
    body: JSON.stringify({ url, success, bytes, duration, cached }),
    signal: AbortSignal.timeout(5000),
  }).catch(() => {});
}

export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("u");
  let target: URL;
  try {
    target = new URL(raw ?? "");
  } catch {
    return new Response("bad url", { status: 400 });
  }
  if (target.protocol !== "https:" || !allowed(target.hostname)) return new Response("host not allowed", { status: 403 });

  for (let attempt = 0; attempt < 3; attempt++) {
    const started = Date.now();
    try {
      const res = await fetch(target, { headers: { "User-Agent": UA }, cache: "no-store", signal: AbortSignal.timeout(20000) });
      const ok = res.ok && (res.headers.get("content-type") ?? "").startsWith("image/");
      if (ok) {
        const body = await res.arrayBuffer();
        report(target.href, true, body.byteLength, Date.now() - started, res.headers.get("x-cache")?.startsWith("HIT") ?? false);
        return new Response(body, {
          headers: {
            "Content-Type": res.headers.get("content-type")!,
            "Cache-Control": "public, max-age=86400, immutable",
          },
        });
      }
      report(target.href, false, 0, Date.now() - started, false);
    } catch {
      report(target.href, false, 0, Date.now() - started, false);
    }
    await new Promise((r) => setTimeout(r, 700 * (attempt + 1)));
  }
  console.error("[page] failed after retries", target.hostname, target.pathname.slice(-40));
  return new Response("page unavailable", { status: 502 });
}
