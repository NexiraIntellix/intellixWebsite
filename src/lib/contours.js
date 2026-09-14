/**
 * Contour isolines for the page background.
 *
 * These are not decorative squiggles that happen to look topographic. The
 * height field below is byte-for-byte the one in `three/pointCloud.js` -- same
 * hash, same octaves, same seed offsets -- so the contours running behind the
 * lower page are literal isolines of the terrain the hero resolves into. The
 * page is one survey, drawn in plan below and in perspective above.
 *
 * Keeping the duplicate rather than importing: pointCloud.js feeds a WebGL
 * vertex buffer and this feeds SVG path strings. Sharing a module would couple
 * a render path to a layout path for twenty lines of arithmetic.
 */

const hash2 = (x, y) => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return s - Math.floor(s);
};

const smooth = (t) => t * t * (3 - 2 * t);

function valueNoise(x, y) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = smooth(xf);
  const v = smooth(yf);
  const a = hash2(xi, yi);
  const b = hash2(xi + 1, yi);
  const c = hash2(xi, yi + 1);
  const d = hash2(xi + 1, yi + 1);
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}

function ridged(x, y, octaves = 5) {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  let weight = 1;
  for (let i = 0; i < octaves; i++) {
    let n = 1 - Math.abs(valueNoise(x * freq, y * freq) * 2 - 1);
    n *= n;
    n *= weight;
    weight = Math.min(1, Math.max(0, n * 2));
    sum += n * amp;
    freq *= 2.03;
    amp *= 0.5;
  }
  return sum;
}

/**
 * Linear interpolation of the crossing point along a cell edge.
 *
 * Snapping to the edge midpoint instead is the shortcut that makes marching
 * squares output look like stair-stepped Lego. Interpolating is one divide and
 * gives the smooth, hand-drafted line the reference actually has.
 */
const cross = (p1, p2, v1, v2, level) => {
  const t = (level - v1) / (v2 - v1 || 1e-6);
  return [p1[0] + (p2[0] - p1[0]) * t, p1[1] + (p2[1] - p1[1]) * t];
};

/**
 * A single elevation profile: one horizontal cut through the same height
 * field, as an SVG polyline.
 *
 * The contour builder samples a whole grid and marches it, which is why it is
 * affordable once per section and not once per card. A profile reads one row,
 * so it is two orders of magnitude cheaper -- eighty-five samples against six
 * thousand -- and it is the other half of how a survey is drawn: the sheet in
 * plan, the section in profile.
 *
 * Normalised to its own range, so every cut fills the box whether that stretch
 * of ground happens to be a plateau or a ridge.
 */
export function buildProfile({
  width = 300,
  height = 58,
  samples = 84,
  scale = 2.6,
  offsetX = 8.4,
  offsetY = 3.1,
} = {}) {
  const vals = [];
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i <= samples; i++) {
    const v = ridged((i / samples) * scale + offsetX, offsetY);
    vals.push(v);
    if (v < min) min = v;
    if (v > max) max = v;
  }

  const span = max - min || 1e-6;
  const r = (n) => Math.round(n * 10) / 10;

  let d = "";
  for (let i = 0; i <= samples; i++) {
    const x = (i / samples) * width;
    // Inverted: high ground sits high on the page.
    const y = height - ((vals[i] - min) / span) * height;
    d += `${i === 0 ? "M" : "L"}${r(x)} ${r(y)}`;
  }
  return d;
}

/**
 * Marching squares over a sampled grid, returning one SVG path string per
 * level. Coordinates are in a 0..width / 0..height viewBox space.
 */
export function buildContours({
  width = 1000,
  height = 620,
  cols = 104,
  rows = 62,
  levels = 7,
  scale = 2.6,
  offsetX = 8.4,
  offsetY = 3.1,
} = {}) {
  // Sample once; every level reads the same grid.
  const grid = new Float32Array((cols + 1) * (rows + 1));
  let min = Infinity;
  let max = -Infinity;
  for (let y = 0; y <= rows; y++) {
    for (let x = 0; x <= cols; x++) {
      const v = ridged((x / cols) * scale + offsetX, (y / rows) * scale + offsetY);
      grid[y * (cols + 1) + x] = v;
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }

  const cw = width / cols;
  const ch = height / rows;
  const at = (x, y) => grid[y * (cols + 1) + x];
  const r = (n) => Math.round(n * 10) / 10;

  const paths = [];
  for (let l = 0; l < levels; l++) {
    // Levels sit strictly inside the range: an isoline at the exact minimum or
    // maximum is a single point or the whole plane, never a usable line.
    const level = min + ((l + 1) / (levels + 1)) * (max - min);
    let d = "";

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const x0 = x * cw;
        const y0 = y * ch;
        const x1 = x0 + cw;
        const y1 = y0 + ch;

        const tl = at(x, y);
        const tr = at(x + 1, y);
        const br = at(x + 1, y + 1);
        const bl = at(x, y + 1);

        let idx = 0;
        if (tl > level) idx |= 8;
        if (tr > level) idx |= 4;
        if (br > level) idx |= 2;
        if (bl > level) idx |= 1;
        if (idx === 0 || idx === 15) continue;

        const top = () => cross([x0, y0], [x1, y0], tl, tr, level);
        const right = () => cross([x1, y0], [x1, y1], tr, br, level);
        const bottom = () => cross([x0, y1], [x1, y1], bl, br, level);
        const left = () => cross([x0, y0], [x0, y1], tl, bl, level);

        const seg = (a, b) => {
          d += `M${r(a[0])} ${r(a[1])}L${r(b[0])} ${r(b[1])}`;
        };

        switch (idx) {
          case 1: case 14: seg(left(), bottom()); break;
          case 2: case 13: seg(bottom(), right()); break;
          case 3: case 12: seg(left(), right()); break;
          case 4: case 11: seg(top(), right()); break;
          case 5: seg(left(), top()); seg(bottom(), right()); break;
          case 6: case 9: seg(top(), bottom()); break;
          case 7: case 8: seg(left(), top()); break;
          case 10: seg(left(), bottom()); seg(top(), right()); break;
          default: break;
        }
      }
    }
    paths.push(d);
  }
  return paths;
}
