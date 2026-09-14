/**
 * Batched hero inspection: both device classes, every phase, one run.
 *
 *   node scripts/shoot.mjs <baseURL> <outDir>
 *
 * Scroll positions are given in *section* progress and converted to pixels from
 * the live layout, so they stay correct if HERO_VH changes.
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const BASE = process.argv[2] || "http://localhost:4178";
const OUT = process.argv[3] || "shots";

const DEVICES = [
  { name: "desktop", width: 1440, height: 900, dpr: 1 },
  { name: "mobile", width: 393, height: 852, dpr: 2 },
];

// p = progress through the hero section. SEQ_START is 0.48.
const MARKS = [
  ["00-top", 0.0],
  ["01-flyin", 0.26],
  ["02-arrive", 0.47],
  ["03-raw", 0.56],
  ["04-scan", 0.72],
  ["05-globe", 0.93],
  ["06-after", 1.0],
];

const problems = [];

for (const dev of DEVICES) {
  const browser = await chromium.launch({
    args: ["--enable-unsafe-swiftshader", "--use-gl=angle", "--enable-webgl"],
  });
  const page = await browser.newPage({
    viewport: { width: dev.width, height: dev.height },
    deviceScaleFactor: dev.dpr,
    isMobile: dev.name === "mobile",
    hasTouch: dev.name === "mobile",
  });

  page.on("console", (m) => {
    const t = m.text();
    if (m.type() === "error" || /shader|GLSL|WebGL|THREE\./i.test(t)) {
      problems.push(`[${dev.name}] console.${m.type()}: ${t.slice(0, 400)}`);
    }
  });
  page.on("pageerror", (e) => problems.push(`[${dev.name}] pageerror: ${String(e).slice(0, 400)}`));
  page.on("requestfailed", (r) =>
    problems.push(`[${dev.name}] requestfailed: ${r.url().slice(0, 160)} ${r.failure()?.errorText || ""}`)
  );

  await mkdir(`${OUT}/${dev.name}`, { recursive: true });
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(3500); // model + shader compile

  const span = await page.evaluate(() => {
    const el = document.getElementById("top");
    return el ? el.offsetHeight - window.innerHeight : 0;
  });

  for (const [label, p] of MARKS) {
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), Math.round(span * p));
    await page.waitForTimeout(1400); // let the smoothed progress settle
    await page.screenshot({ path: `${OUT}/${dev.name}/${label}.png` });
  }

  // Is the point cloud actually drawing pixels, or is the canvas blank?
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), Math.round(span * 0.75));
  await page.waitForTimeout(1600);
  const lit = await page.evaluate(() => {
    const cs = [...document.querySelectorAll("canvas")];
    return cs.map((c) => {
      const g = c.getContext("webgl2") || c.getContext("webgl");
      if (!g) return { w: c.width, h: c.height, err: "no gl ctx" };
      const px = new Uint8Array(c.width * c.height * 4);
      g.readPixels(0, 0, c.width, c.height, g.RGBA, g.UNSIGNED_BYTE, px);
      let nonBlack = 0;
      for (let i = 0; i < px.length; i += 4) {
        if (px[i] > 12 || px[i + 1] > 12 || px[i + 2] > 12) nonBlack++;
      }
      return { w: c.width, h: c.height, litPct: +((nonBlack / (c.width * c.height)) * 100).toFixed(2) };
    });
  });
  console.log(`${dev.name} canvases:`, JSON.stringify(lit));

  await browser.close();
}

console.log("\n=== PROBLEMS ===");
console.log(problems.length ? [...new Set(problems)].join("\n") : "none");
