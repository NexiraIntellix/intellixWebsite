/**
 * Builds the shippable hero frame sequence.
 *
 *   node scripts/optimize-frames.mjs
 *
 *   frame-source/            ->  public/heroFrames/
 *   272 x 2910x2176 PNG          272 x 1600x1196 WebP
 *   689 MB                       29 MB
 *
 * Why this exists
 * ---------------
 * The source frames are 2.4 MB each. Vite copies `public/` verbatim into
 * `dist/`, so the raw set shipped 691 MB to every visitor -- more than the
 * entire rest of the site by a factor of a hundred. That download alone made
 * scrolling stutter across the whole page, because 272 in-flight requests and
 * their decodes compete with layout and paint for the same main thread.
 *
 * A 6.3-megapixel source is also far more than the canvas can use: the frames
 * are drawn to fit the viewport, at 0.85 opacity, behind a heavy radial
 * darkening. 1600px wide is already above what a 2x 1440p display resolves for
 * that layer, and WebP at q78 holds up because the imagery is dark and smooth
 * -- exactly the content type that compresses well and shows banding least.
 *
 * The originals now live in `frame-source/`, next to `model-source/` and for the
 * same reason: it is outside `public/`, so it is neither served nor built. Only
 * the WebP set under `public/heroFrames/` ships.
 */
import { mkdir, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const SRC = "frame-source";
const OUT = "public/heroFrames";
const WIDTH = 1600;
const QUALITY = 78;

/** sharp releases the libvips thread pool per call; a handful in flight keeps
 *  all cores busy without holding 8 decoded 6MP buffers in memory at once. */
const CONCURRENCY = 4;

const pad = (n) => String(n).padStart(3, "0");
const mb = (bytes) => (bytes / 1024 / 1024).toFixed(1) + " MB";

async function dirSize(dir) {
  const files = await readdir(dir);
  let total = 0;
  for (const f of files) total += (await stat(join(dir, f))).size;
  return { total, count: files.length };
}

async function main() {
  const before = await dirSize(SRC);
  console.log(`source: ${before.count} frames, ${mb(before.total)}`);
  await mkdir(OUT, { recursive: true });

  let next = 1;
  let done = 0;

  const worker = async () => {
    for (;;) {
      const i = next++;
      if (i > before.count) return;
      await sharp(join(SRC, `ezgif-frame-${pad(i)}.png`))
        .resize({ width: WIDTH, withoutEnlargement: true })
        .webp({ quality: QUALITY, effort: 5 })
        .toFile(join(OUT, `frame-${pad(i)}.webp`));
      done++;
      if (done % 20 === 0 || done === before.count) {
        process.stdout.write(`\r  ${done}/${before.count}`);
      }
    }
  };

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const after = await dirSize(OUT);
  console.log(`\noutput: ${after.count} frames, ${mb(after.total)}`);
  console.log(`saved:  ${mb(before.total - after.total)} (${(100 - (after.total / before.total) * 100).toFixed(1)}% smaller)`);
  console.log(`\nSequence now reads from ${OUT}. Delete ${SRC} so it stops shipping.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
