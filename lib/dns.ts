import dns from "node:dns";

const MANGADEX_HOSTS = new Set([
  "api.mangadex.org",
  "uploads.mangadex.org",
  "mangadex.org",
]);

// Official MangaDex anycast / load-balancer IPs
const DEFAULT_MANGADEX_IPS = ["45.129.229.2", "45.129.229.1"];

const ipCache = new Map<string, { ips: string[]; expires: number }>();

async function resolveDoH(hostname: string): Promise<string[] | null> {
  const providers = [
    `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}&type=A`,
    `https://dns.google/resolve?name=${encodeURIComponent(hostname)}&type=A`,
  ];

  for (const url of providers) {
    try {
      const res = await fetch(url, {
        headers: { accept: "application/dns-json" },
        signal: AbortSignal.timeout(3000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      if (!data.Answer) continue;
      const ips = (data.Answer as Array<{ type: number; data: string }>)
        .filter((a) => a.type === 1 && !a.data.startsWith("0.") && !a.data.startsWith("127."))
        .map((a) => a.data);
      if (ips.length > 0) return ips;
    } catch {
      // try next provider
    }
  }
  return null;
}

function isSinkholeAddress(address: unknown): boolean {
  if (typeof address === "string") {
    return address === "0.0.0.0" || address === "127.0.0.1" || address.startsWith("0.");
  }
  if (Array.isArray(address)) {
    return address.some(
      (a: { address?: string }) =>
        a?.address === "0.0.0.0" || a?.address === "127.0.0.1" || a?.address?.startsWith("0."),
    );
  }
  return false;
}

const g = globalThis as unknown as { __dnsFallbackInitialized?: boolean };

export function setupDnsFallback() {
  if (g.__dnsFallbackInitialized || typeof window !== "undefined") return;
  g.__dnsFallbackInitialized = true;

  const origLookup = dns.lookup;

  // @ts-expect-error - overriding node dns lookup with compatible signature
  dns.lookup = function (
    hostname: string,
    options: dns.LookupOptions | number | ((err: NodeJS.ErrnoException | null, address: string | dns.LookupAddress[], family?: number) => void),
    callback?: (err: NodeJS.ErrnoException | null, address: string | dns.LookupAddress[], family?: number) => void,
  ) {
    let cb: (err: NodeJS.ErrnoException | null, address: any, family?: number) => void;
    let opts: dns.LookupOptions = {};

    if (typeof options === "function") {
      cb = options;
    } else if (typeof options === "number") {
      opts = { family: options };
      cb = callback!;
    } else {
      opts = options || {};
      cb = callback!;
    }

    const isTarget = MANGADEX_HOSTS.has(hostname) || (typeof hostname === "string" && hostname.endsWith(".mangadex.org"));

    if (!isTarget) {
      // @ts-expect-error - passthrough
      return origLookup.apply(dns, arguments);
    }

    // Try standard system lookup first
    (origLookup as any).call(dns, hostname, opts, (err: NodeJS.ErrnoException | null, address: any, family?: number) => {
      const sinkholed = !err && isSinkholeAddress(address);

      if (!err && !sinkholed) {
        // Legitimate DNS response
        if (opts.all) {
          return cb(null, address);
        }
        return cb(null, address, family);
      }

      // If blocked or sinkholed to 0.0.0.0, use fallback IPs
      const cached = ipCache.get(hostname);
      const fallbackIps = cached && cached.expires > Date.now() ? cached.ips : DEFAULT_MANGADEX_IPS;

      // Asynchronously refresh cache via DoH if expired
      if (!cached || cached.expires <= Date.now()) {
        resolveDoH(hostname)
          .then((freshIps) => {
            if (freshIps && freshIps.length > 0) {
              ipCache.set(hostname, { ips: freshIps, expires: Date.now() + 60 * 60_000 });
            }
          })
          .catch(() => {});
      }

      if (opts.all) {
        return cb(
          null,
          fallbackIps.map((ip) => ({ address: ip, family: 4 })),
        );
      }
      return cb(null, fallbackIps[0], 4);
    });
  };
}

// Auto-initialize on import in Node runtime
if (typeof window === "undefined") {
  setupDnsFallback();
}
