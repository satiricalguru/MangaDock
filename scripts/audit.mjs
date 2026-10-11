// UI audit: screenshots every page on desktop and phone, and logs console errors,
// failed requests, horizontal overflow and small tap targets.
// Usage: node scripts/audit.mjs [baseURL]   (output in .audit/)
import { chromium, devices } from "playwright";
import fs from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:3000";
const OUT = ".audit";
fs.mkdirSync(OUT, { recursive: true });
const report = [];

const VIEWPORTS = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  phone: { ...devices["iPhone 13"], deviceScaleFactor: 2 },
};

async function findPaths(page) {
  await page.goto(`${BASE}/browse?sort=POPULARITY_DESC`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('main a[href^="/manga/"]', { timeout: 30000 });
  const hrefs = await page.$$eval('main a[href^="/manga/"]', (as) => [...new Set(as.map((a) => a.getAttribute("href")))].slice(0, 15));
  for (const h of hrefs) {
    await page.goto(BASE + h, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => !document.querySelector("#chapters .animate-pulse"), null, { timeout: 45000 }).catch(() => {});
    const ch = await page.$eval('#chapters a[href^="/read/"]', (a) => a.getAttribute("href")).catch(() => null);
    if (ch) return { title: h, read: ch };
  }
  return { title: hrefs[0], read: null };
}

async function audit(page, name, vp, url, { steps = 3, before } = {}) {
  const errors = [];
  const onConsole = (m) => m.type() === "error" && errors.push(m.text().slice(0, 200));
  const onPageErr = (e) => errors.push("pageerror " + e.message.slice(0, 200));
  const onFail = (r) => !/_next\/webpack-hmr|favicon/.test(r.url()) && errors.push(`requestfailed ${r.url().slice(0, 120)} ${r.failure()?.errorText}`);
  const onResp = (r) => r.status() >= 400 && errors.push(`HTTP ${r.status()} ${r.url().slice(0, 120)}`);
  page.on("console", onConsole); page.on("pageerror", onPageErr); page.on("requestfailed", onFail); page.on("response", onResp);
  const t0 = Date.now();
  await page.goto(BASE + url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  const loadMs = Date.now() - t0;
  if (before) await before(page);
  await page.waitForTimeout(1200);
  const metrics = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const overflow = [...document.querySelectorAll("body *")]
      .filter((el) => { const r = el.getBoundingClientRect(); return r.right > vw + 2 && r.width > 0 && getComputedStyle(el).position !== "fixed" && !el.closest(".overflow-x-auto,.marquee,[class*=overflow-x]"); })
      .slice(0, 6).map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)} right=${Math.round(el.getBoundingClientRect().right)}`);
    const small = [...document.querySelectorAll("a,button,input,summary")]
      .filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (r.height < 32 || r.width < 32) && getComputedStyle(el).visibility !== "hidden"; })
      .slice(0, 8).map((el) => `${el.tagName.toLowerCase()} "${(el.innerText || el.getAttribute("aria-label") || "").trim().slice(0, 30)}" ${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`);
    const imgsNoAlt = document.querySelectorAll("img:not([alt])").length;
    const broken = [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && i.src).length;
    return { docW: document.documentElement.scrollWidth, vw, screens: +(document.body.scrollHeight / innerHeight).toFixed(1), overflow, small, imgsNoAlt, broken, h1: document.querySelector("h1")?.innerText?.slice(0, 60) };
  });
  const total = await page.evaluate(() => document.body.scrollHeight);
  const shots = [];
  for (let i = 0; i < steps; i++) {
    const y = Math.round((total - (vp.viewport?.height ?? 844)) * (steps === 1 ? 0 : i / (steps - 1)));
    await page.evaluate((y) => (window.__lenis ? window.__lenis.scrollTo(y, { immediate: true }) : window.scrollTo(0, y)), y);
    await page.waitForTimeout(900);
    const f = `${OUT}/${name}-${i}.jpg`;
    await page.screenshot({ path: f, type: "jpeg", quality: 60 });
    shots.push(f);
  }
  page.off("console", onConsole); page.off("pageerror", onPageErr); page.off("requestfailed", onFail); page.off("response", onResp);
  report.push({ name, url, loadMs, ...metrics, errors: [...new Set(errors)].slice(0, 10), shots });
  console.log(name, loadMs + "ms", JSON.stringify(metrics.overflow), errors.length, "errors");
}

const browser = await chromium.launch({ args: ["--use-angle=metal", "--enable-gpu"] });
let paths;
for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
  const ctx = await browser.newContext(vp);
  const page = await ctx.newPage();
  paths ??= await findPaths(page);
  const p = (n) => `${vpName}-${n}`;
  await audit(page, p("home"), vp, "/", { steps: vpName === "desktop" ? 10 : 12 });
  await audit(page, p("browse"), vp, "/browse", { steps: 2 });
  await audit(page, p("browse-kr"), vp, "/browse?country=KR&genre=Action", { steps: 1 });
  await audit(page, p("title"), vp, paths.title, { steps: 4 });
  if (paths.read) await audit(page, p("reader"), vp, paths.read, { steps: 3 });
  await audit(page, p("login"), vp, "/login", { steps: 1 });
  await audit(page, p("login-error"), vp, "/login", { steps: 1, before: async (pg) => {
    await pg.getByLabel("Email").fill("nobody@example.com"); await pg.getByLabel("Password", { exact: true }).fill("wrongpass1");
    await pg.getByRole("button", { name: "Log in", exact: true }).last().click(); await pg.waitForTimeout(1500); } });
  await audit(page, p("signup"), vp, "/login?mode=signup", { steps: 1 });
  await audit(page, p("library"), vp, "/library", { steps: 1 });
  await audit(page, p("credits"), vp, "/credits", { steps: 2 });
  await audit(page, p("404"), vp, "/nope-not-here", { steps: 1 });
  await audit(page, p("search"), vp, "/", { steps: 1, before: async (pg) => {
    await pg.evaluate(() => window.dispatchEvent(new Event("ni:search"))); await pg.waitForTimeout(400); await pg.locator("dialog input, [role=dialog] input, input[type=search]").first().fill("solo level"); await pg.waitForTimeout(2500); } });
  await ctx.close();
}
await browser.close();
fs.writeFileSync(`${OUT}/report.json`, JSON.stringify({ paths, report }, null, 2));
console.log("done", JSON.stringify(paths));
