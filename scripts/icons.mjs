// Renders app/icon.svg to the PNG sizes browsers and the README need: node scripts/icons.mjs
import { chromium } from "playwright";
import fs from "node:fs";
const svg = fs.readFileSync("app/icon.svg", "utf8");
const b = await chromium.launch();
const p = await b.newPage();
for (const [out, size] of [["app/apple-icon.png", 180], ["public/icon-192.png", 192], ["public/icon-512.png", 512], ["docs/media/icon.png", 256]]) {
  await p.setViewportSize({ width: size, height: size });
  await p.setContent(`<style>html,body{margin:0;background:transparent}svg{width:${size}px;height:${size}px;display:block}</style>${svg}`);
  await p.screenshot({ path: out, omitBackground: true });
}
await b.close();
