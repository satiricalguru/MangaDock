// Captures the screenshots, GIF and video in docs/media for the README.
// Needs the site running on localhost:3000 and ffmpeg on the PATH:  node scripts/readme-media.mjs
import { chromium, devices } from "playwright";
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3000";
const OUT = "docs/media";
fs.mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });

// Desktop stills
const desk = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
for (const [name, path, scroll] of [
  ["desktop-home", "/", 0],
  ["desktop-shelves", "/", 2.6],
  ["desktop-browse", "/browse?src=md", 0],
  ["desktop-title", "/manga/105398", 0],
]) {
  await desk.goto(BASE + path, { waitUntil: "networkidle", timeout: 90000 });
  if (scroll) {
    await desk.evaluate((s) => window.scrollTo(0, s * document.querySelector("#trending").offsetTop / 2.6), scroll);
    await wait(1500);
  }
  await wait(2500);
  await desk.screenshot({ path: `${OUT}/${name}.jpg`, type: "jpeg", quality: 82 });
  console.log("shot", name);
}

// Phone: stills plus a scroll recording of the homepage
const phone = await browser.newContext({ ...devices["iPhone 13"], recordVideo: { dir: `${OUT}/raw`, size: devices["iPhone 13"].viewport } });
const p = await phone.newPage();
await p.goto(BASE + "/", { waitUntil: "networkidle", timeout: 90000 });
await wait(3000);
await p.screenshot({ path: `${OUT}/phone-home.jpg`, type: "jpeg", quality: 82 });
for (let i = 0; i < 26; i++) {
  await p.mouse.wheel(0, 260);
  await wait(260);
}
await wait(800);
await p.screenshot({ path: `${OUT}/phone-shelves.jpg`, type: "jpeg", quality: 82 });
await p.goto(BASE + "/browse?src=md", { waitUntil: "networkidle" });
await wait(1500);
await p.screenshot({ path: `${OUT}/phone-browse.jpg`, type: "jpeg", quality: 82 });
const video = p.video();
await phone.close();
const raw = await video.path();
await browser.close();

// webm -> mp4 for the README video, and a small looping GIF of the first 12 seconds
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", raw, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-crf", "28", `${OUT}/phone-tour.mp4`]);
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-ss", "1", "-t", "12", "-i", raw, "-vf",
  "fps=12,scale=300:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96[p];[b][p]paletteuse=dither=bayer:bayer_scale=4", `${OUT}/phone-tour.gif`]);
fs.rmSync(`${OUT}/raw`, { recursive: true, force: true });
console.log("done");
