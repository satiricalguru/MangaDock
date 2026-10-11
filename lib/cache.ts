// Small server-side cache shared by every API client.
// - Fresh hits are served from memory, so a page never makes the same API call twice.
// - Concurrent callers share one in-flight request.
// - If an API fails, the last good value is served instead of an empty page.

import "./dns";

type Entry = { value: unknown; at: number };
const g = globalThis as unknown as { __niCache?: Map<string, Entry>; __niInflight?: Map<string, Promise<unknown>> };
const store = (g.__niCache ??= new Map());
const inflight = (g.__niInflight ??= new Map());

export async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as T;
  const running = inflight.get(key);
  if (running) return running as Promise<T>;

  const p = fn()
    .then((value) => {
      store.set(key, { value, at: Date.now() });
      if (store.size > 2000) store.delete(store.keys().next().value!);
      return value;
    })
    .catch((err) => {
      if (hit) return hit.value as T; // stale is better than nothing
      throw err;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** fetch with retries on rate limits, server errors and network failures. */
export async function fetchRetry(url: string, init: RequestInit = {}, tries = 3, timeoutMs = 10000): Promise<Response> {
  let lastErr: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(timeoutMs) });
      if (res.status !== 429 && res.status < 500) return res;
      lastErr = new Error(`${res.status} from ${new URL(url).host}`);
      const retryAfter = Number(res.headers.get("retry-after"));
      await sleep(Math.min(retryAfter ? retryAfter * 1000 : 600 * 2 ** i, 4000));
    } catch (err) {
      lastErr = err;
      await sleep(400 * 2 ** i);
    }
  }
  throw lastErr;
}
