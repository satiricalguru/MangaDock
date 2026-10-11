// Screenshots design references (Dribbble) for the UI audit. Output in .audit/refs/
import { chromium } from "playwright";
import fs from "node:fs";
const OUT = ".audit/refs";
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const urls = [
  ["search-anime", "https://dribbble.com/search/anime"],
  ["search-manga-app", "https://dribbble.com/search/manga-app"],
  ["search-manga-reader", "https://dribbble.com/search/manga-reader"],
  ["search-anime-website", "https://dribbble.com/search/anime-website"],
  ["animfanz", "https://dribbble.com/shots/27280602-Animfanz-Anime-Streaming-Platform-Homepage"],
];
for (const [name, url] of urls) {
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(4000);
    for (let i = 0; i < 3; i++) {
      await page.screenshot({ path: `${OUT}/${name}-${i}.jpg`, type: "jpeg", quality: 60 });
      await page.mouse.wheel(0, 900);
      await page.waitForTimeout(1800);
    }
    console.log("ok", name);
  } catch (e) {
    console.log("fail", name, e.message);
  }
}
await browser.close();
