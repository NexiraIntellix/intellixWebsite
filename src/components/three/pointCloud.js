/**
 * Target positions for the hero point cloud.
 *
 * The sequence is one idea in three states -- raw returns, resolved ground,
 * projected globe -- which is the actual pipeline a geospatial survey runs. Each
 * particle keeps an index into all three sets, so the shader interpolates
 * between them rather than spawning and killing points.
 *
 * All three are generated once at mount and uploaded as static attributes. The
 * per-frame cost is a lerp in the vertex shader and nothing on the CPU.
 */

/* ------------------------------------------------------------------ noise -- */

/**
 * Value noise. Deliberately not simplex: the terrain is read at a distance as a
 * silhouette, where the two are indistinguishable, and this is twenty lines with
 * no license attached.
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

/**
 * Ridged multifractal. `1 - |n|` folds the noise at zero, which turns smooth
 * hills into creased ridgelines -- the difference between "bumpy ground" and
 * "terrain". Octave amplitude is weighted by the previous octave so detail
 * concentrates on the ridges instead of spreading evenly.
 */
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

/* -------------------------------------------------------------- geometry -- */

/** Terrain footprint, in world units. Wider than deep so it reads as a horizon. */
const SPAN_X = 3.0;
const SPAN_Z = 1.7;
const HEIGHT = 0.95;
const GLOBE_R = 0.70;

/**
 * Builds every attribute the point cloud needs.
 *
 * Returns plain Float32Arrays so the caller can hand them straight to
 * BufferAttribute without a copy.
 */
export function buildPointCloud(count) {
  const scatter = new Float32Array(count * 3);
  const terrain = new Float32Array(count * 3);
  const globe = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  const elevation = new Float32Array(count);

  /**
   * Scan-line layout rather than a square grid or pure random placement.
   *
   * Real lidar returns arrive in rows, and keeping that structure is what makes
   * the resolved state read as *scanned* rather than as generic noise -- at a
   * grazing angle the rows separate into visible sweeps. Rows are jittered
   * along their own axis so the cloud never moires into a screen door.
   */
  const rows = Math.max(1, Math.round(Math.sqrt((count * SPAN_Z) / SPAN_X)));
  const cols = Math.ceil(count / rows);

  // Golden angle: the standard even-distribution trick, and the reason the globe
  // has no visible poles or seams the way a lat/long grid does.
  const PHI = Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const row = Math.floor(i / cols);
    const col = i % cols;

    seed[i] = hash2(i * 0.731, i * 1.917);

    // --- resolved ground -------------------------------------------------
    const jitterX = (hash2(i * 2.1, 7.3) - 0.5) * (SPAN_X / cols) * 0.9;
    const jitterZ = (hash2(i * 3.7, 1.9) - 0.5) * (SPAN_Z / rows) * 0.55;

    const tx = (col / (cols - 1 || 1) - 0.5) * SPAN_X + jitterX;
    const tz = (row / (rows - 1 || 1) - 0.5) * SPAN_Z + jitterZ;

    const h = ridged(tx * 1.15 + 8.4, tz * 1.15 + 3.1);
    const ty = h * HEIGHT - HEIGHT * 0.42;

    terrain[i3] = tx;
    terrain[i3 + 1] = ty;
    terrain[i3 + 2] = tz;

    // Normalized height drives the elevation ramp in the shader. Carried as an
    // attribute so the globe keeps the ground's colouring and the transition
    // reads as the same data reprojected, not as a different object.
    elevation[i] = Math.min(1, Math.max(0, h * 1.25));

    // --- projected globe --------------------------------------------------
    // Fibonacci sphere, then displaced along its own normal by the same height
    // field, so the globe carries visible relief instead of being a smooth ball.
    const t = (i + 0.5) / count;
    const inclination = Math.acos(1 - 2 * t);
    const azimuth = PHI * i;

    const sx = Math.sin(inclination) * Math.cos(azimuth);
    const sy = Math.cos(inclination);
    const sz = Math.sin(inclination) * Math.sin(azimuth);

    const relief = GLOBE_R * (1 + elevation[i] * 0.085);
    globe[i3] = sx * relief;
    globe[i3 + 1] = sy * relief;
    globe[i3 + 2] = sz * relief;

    // --- raw returns ------------------------------------------------------
    // A flattened shell rather than a filled box: a solid volume of points reads
    // as fog, while a shell keeps depth legible and leaves the centre clear for
    // the headline that sits over it.
    const r = 1.7 + hash2(i * 5.3, 2.7) * 1.5;
    const a = hash2(i * 1.3, 9.1) * Math.PI * 2;
    const e = (hash2(i * 4.9, 5.5) - 0.5) * Math.PI * 0.55;

    scatter[i3] = Math.cos(a) * Math.cos(e) * r * 1.25;
    scatter[i3 + 1] = Math.sin(e) * r * 0.72;
    scatter[i3 + 2] = Math.sin(a) * Math.cos(e) * r;
  }

  return { scatter, terrain, globe, seed, elevation, count };
}

export const CLOUD_BOUNDS = { SPAN_X, SPAN_Z, HEIGHT, GLOBE_R };
