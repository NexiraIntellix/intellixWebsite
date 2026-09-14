/**
 * Canvas2D reimplementation of the 21st.dev "Hands&Robots" ASCII-art effect.
 *
 * Pipeline, in order:
 *   1. background (bgMode / bgBlur / bgOpacity)
 *   2. sample the photo into a cellSize grid
 *   3. draw a primitive per cell per renderMode
 *   4. colour adjustments: brightness, contrast, saturation, grayscale, tint, blur
 *   5. post-effects (pfx)
 *   6. lights
 *   7. reveal mask
 *
 * Cell sampling is done by downscaling the photo to exactly cols x rows on an
 * offscreen canvas — the browser's box filter gives the per-cell average for
 * free, which is far cheaper than averaging pixels by hand.
 */

export const CHAR_SETS = {
  standard: " .:-=+*#%@",
  blocks: " ░▒▓█",
  minimal: " .:*#",
  binary: " 01",
  hex: " 0123456789ABCDEF",
  dots: " ⠁⠃⠇⠧⠷⠿",
  shades: " ·∘○◍●",
  code: " ;:!?/\\|(){}[]#@"
};

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const lum = (r, g, b) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

/** Cover-fit: fill the target without distorting the source. */
function drawCover(ctx, img, w, h) {
  const s = Math.max(w / img.width, h / img.height);
  const dw = img.width * s;
  const dh = img.height * s;
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

/** Piecewise-linear tone curve through the supplied control points. */
function applyToneCurve(v, pts) {
  if (!pts || pts.length < 2) return v;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    if (v >= a.x && v <= b.x) {
      const t = b.x === a.x ? 0 : (v - a.x) / (b.x - a.x);
      return a.y + (b.y - a.y) * t;
    }
  }
  return v;
}

/**
 * Per-cell animation offset. Returns a luminance delta in roughly -1..1, scaled
 * by the caller. Each style perturbs the grid differently over time.
 */
function animOffset(style, x, y, cols, rows, t) {
  const nx = x / Math.max(1, cols - 1);
  const ny = y / Math.max(1, rows - 1);
  switch (style) {
    case "wave":
      return Math.sin(nx * 8 + t * 2) * 0.5 + Math.sin(ny * 5 - t * 1.3) * 0.5;
    case "pulse":
      return Math.sin(t * 2.2) * 0.8;
    case "shimmer": {
      const h = Math.sin((x * 12.9898 + y * 78.233) * 43758.5453);
      return Math.sin(t * 3 + h * 20) * 0.7;
    }
    case "ripple": {
      const dx = nx - 0.5;
      const dy = ny - 0.5;
      const d = Math.sqrt(dx * dx + dy * dy);
      // Radial travelling wave, decaying outward so the centre stays lively.
      return Math.sin(d * 26 - t * 3.2) * Math.exp(-d * 1.6);
    }
    case "flicker": {
      const h = Math.sin((x * 31.7 + y * 13.3 + Math.floor(t * 12)) * 7919.13);
      return (h - Math.floor(h)) * 1.4 - 0.7;
    }
    default:
      return 0;
  }
}

/** Draws one cell's primitive. `l` is 0..1 luminance, `size` the cell size. */
function drawCell(ctx, mode, cx, cy, size, l, color, charSet, density, time, gx, gy) {
  const half = size / 2;
  const r = (l * size) / 2;
  ctx.fillStyle = color;
  ctx.strokeStyle = color;

  switch (mode) {
    case "characters": {
      const set = charSet;
      const ch = set[clamp(Math.floor(l * (set.length - 1) + 0.5), 0, set.length - 1)];
      ctx.font = `${size}px "JetBrains Mono", ui-monospace, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(ch, cx, cy);
      break;
    }
    case "lines": {
      // Horizontal stroke whose length tracks luminance — the mode this
      // recipe's JSON actually selects.
      const w = l * size;
      ctx.lineWidth = Math.max(1.4, size * (0.2 + density * 0.3));
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(cx - w / 2, cy);
      ctx.lineTo(cx + w / 2, cy);
      ctx.stroke();
      break;
    }
    case "diagonal": {
      const w = l * size;
      ctx.lineWidth = Math.max(1, size * 0.14);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(cx - w / 2, cy + w / 2);
      ctx.lineTo(cx + w / 2, cy - w / 2);
      ctx.stroke();
      break;
    }
    case "hatch": {
      const n = Math.round(l * 4);
      ctx.lineWidth = Math.max(0.6, size * 0.07);
      for (let i = 0; i < n; i++) {
        const o = (i / 4) * size - half;
        ctx.beginPath();
        ctx.moveTo(cx - half, cy + o);
        ctx.lineTo(cx + half, cy + o - size);
        ctx.stroke();
        if (i % 2) {
          ctx.beginPath();
          ctx.moveTo(cx - half, cy - o);
          ctx.lineTo(cx + half, cy - o + size);
          ctx.stroke();
        }
      }
      break;
    }
    case "mosaic":
    case "pixel":
      ctx.fillRect(cx - half, cy - half, size, size);
      break;
    case "dither": {
      // 4x4 ordered Bayer threshold — the classic newsprint dither.
      const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
      const th = bayer[(gy % 4) * 4 + (gx % 4)] / 16;
      if (l > th) ctx.fillRect(cx - half, cy - half, size, size);
      break;
    }
    case "dots":
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "bubbles":
      ctx.lineWidth = Math.max(1, size * 0.1);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case "rings":
      ctx.lineWidth = Math.max(1, size * 0.09);
      for (let i = 1; i <= Math.max(1, Math.round(l * 3)); i++) {
        ctx.beginPath();
        ctx.arc(cx, cy, (r * i) / 3, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    case "cross":
      ctx.lineWidth = Math.max(1, size * 0.14);
      ctx.beginPath();
      ctx.moveTo(cx - r, cy);
      ctx.lineTo(cx + r, cy);
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx, cy + r);
      ctx.stroke();
      break;
    case "diamond":
      ctx.beginPath();
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + r, cy);
      ctx.lineTo(cx, cy + r);
      ctx.lineTo(cx - r, cy);
      ctx.closePath();
      ctx.fill();
      break;
    case "triangles":
      ctx.beginPath();
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + r, cy + r);
      ctx.lineTo(cx - r, cy + r);
      ctx.closePath();
      ctx.fill();
      break;
    case "hexagons":
    case "voxel": {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 6;
        const px = cx + Math.cos(a) * r;
        const py = cy + Math.sin(a) * r;
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "lego": {
      ctx.fillRect(cx - half, cy - half, size, size);
      ctx.globalAlpha *= 0.55;
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.22, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha /= 0.55;
      break;
    }
    case "hearts": {
      const s = r * 0.9;
      ctx.beginPath();
      ctx.moveTo(cx, cy + s);
      ctx.bezierCurveTo(cx - s * 2, cy - s * 0.4, cx - s * 0.5, cy - s * 1.4, cx, cy - s * 0.5);
      ctx.bezierCurveTo(cx + s * 0.5, cy - s * 1.4, cx + s * 2, cy - s * 0.4, cx, cy + s);
      ctx.fill();
      break;
    }
    case "stars": {
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const rad = i % 2 ? r * 0.45 : r;
        const a = (Math.PI / 5) * i - Math.PI / 2;
        const px = cx + Math.cos(a) * rad;
        const py = cy + Math.sin(a) * rad;
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "halfblocks": {
      // Two independent half-cells: double the vertical detail of a full block.
      const top = clamp(l * 1.3, 0, 1);
      const bot = clamp(l * 0.8, 0, 1);
      ctx.globalAlpha *= top;
      ctx.fillRect(cx - half, cy - half, size, half);
      ctx.globalAlpha /= top || 1;
      ctx.globalAlpha *= bot;
      ctx.fillRect(cx - half, cy, size, half);
      ctx.globalAlpha /= bot || 1;
      break;
    }
    case "braille": {
      const set = CHAR_SETS.dots;
      const ch = set[clamp(Math.floor(l * (set.length - 1) + 0.5), 0, set.length - 1)];
      ctx.font = `${size}px monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(ch, cx, cy);
      break;
    }
    case "hexdump": {
      const set = CHAR_SETS.hex;
      const ch = set[clamp(Math.floor(l * (set.length - 1) + 0.5), 0, set.length - 1)];
      ctx.font = `${size * 0.9}px "JetBrains Mono", monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(ch, cx, cy);
      break;
    }
    case "matrix": {
      const set = "01ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿ";
      const j = Math.floor((Math.sin(gx * 7.3 + Math.floor(time * 6 + gy * 0.5)) * 0.5 + 0.5) * set.length);
      ctx.fillStyle = `rgba(80,255,140,${(0.15 + l * 0.85).toFixed(3)})`;
      ctx.font = `${size}px "JetBrains Mono", monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(set[clamp(j, 0, set.length - 1)], cx, cy);
      break;
    }
    case "disco": {
      const hue = (gx * 7 + gy * 11 + time * 60) % 360;
      ctx.fillStyle = `hsl(${hue} 90% ${(20 + l * 55).toFixed(0)}%)`;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "contour": {
      // Iso-lines: only cells whose luminance sits near a band edge get inked.
      const bands = 7;
      const e = Math.abs(((l * bands) % 1) - 0.5);
      if (e > 0.36) {
        ctx.lineWidth = Math.max(1, size * 0.1);
        ctx.beginPath();
        ctx.arc(cx, cy, size * 0.42, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    }
    case "mixed": {
      const pick = (gx + gy) % 3;
      if (pick === 0) ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      else if (pick === 1) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.lineWidth = Math.max(1, size * 0.14);
        ctx.beginPath();
        ctx.moveTo(cx - r, cy);
        ctx.lineTo(cx + r, cy);
        ctx.stroke();
      }
      break;
    }
    default:
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
}

function postEffects(ctx, w, h, pfx, time) {
  const on = (k) => pfx && pfx[k] && pfx[k].enabled;
  const amt = (k) => (pfx[k].intensity || 0) / 100;

  if (on("bloom")) {
    // Bright-pass, blurred, added back — a cheap approximation of a real bloom.
    const a = amt("bloom");
    const tmp = document.createElement("canvas");
    tmp.width = w;
    tmp.height = h;
    const t = tmp.getContext("2d");
    t.filter = `brightness(${1 + a * 0.6}) blur(${(6 + a * 18).toFixed(1)}px)`;
    t.drawImage(ctx.canvas, 0, 0);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = a * 0.55;
    ctx.drawImage(tmp, 0, 0);
    ctx.restore();
  }

  if (on("scanLines")) {
    const a = amt("scanLines");
    ctx.save();
    ctx.globalAlpha = a * 0.5;
    ctx.fillStyle = "#000";
    for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);
    ctx.restore();
  }

  if (on("chromatic")) {
    const a = amt("chromatic");
    const off = Math.max(1, a * 8);
    const tmp = document.createElement("canvas");
    tmp.width = w;
    tmp.height = h;
    tmp.getContext("2d").drawImage(ctx.canvas, 0, 0);
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = 0.5;
    ctx.drawImage(tmp, -off, 0);
    ctx.drawImage(tmp, off, 0);
    ctx.restore();
  }

  if (on("halftone")) {
    const a = amt("halftone");
    ctx.save();
    ctx.globalAlpha = a * 0.35;
    ctx.fillStyle = "#000";
    const s = 4;
    for (let y = 0; y < h; y += s)
      for (let x = 0; x < w; x += s) {
        ctx.beginPath();
        ctx.arc(x, y, s * 0.22, 0, Math.PI * 2);
        ctx.fill();
      }
    ctx.restore();
  }

  if (on("pixelate")) {
    const a = amt("pixelate");
    const f = Math.max(2, Math.round(a * 14));
    const tmp = document.createElement("canvas");
    tmp.width = Math.max(1, Math.floor(w / f));
    tmp.height = Math.max(1, Math.floor(h / f));
    const t = tmp.getContext("2d");
    t.drawImage(ctx.canvas, 0, 0, tmp.width, tmp.height);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tmp, 0, 0, w, h);
    ctx.imageSmoothingEnabled = true;
  }

  if (on("glitch")) {
    const a = amt("glitch");
    const tmp = document.createElement("canvas");
    tmp.width = w;
    tmp.height = h;
    tmp.getContext("2d").drawImage(ctx.canvas, 0, 0);
    const slices = Math.round(a * 14);
    for (let i = 0; i < slices; i++) {
      const sy = Math.random() * h;
      const sh = 4 + Math.random() * 18;
      const dx = (Math.random() - 0.5) * a * 60;
      ctx.drawImage(tmp, 0, sy, w, sh, dx, sy, w, sh);
    }
  }

  if (on("filmGrain")) {
    const a = amt("filmGrain");
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (Math.random() - 0.5) * a * 90;
      d[i] += n;
      d[i + 1] += n;
      d[i + 2] += n;
    }
    ctx.putImageData(img, 0, 0);
  }

  if (on("filmDust")) {
    const a = amt("filmDust");
    ctx.save();
    for (let i = 0; i < a * 300; i++) {
      ctx.globalAlpha = Math.random() * 0.5;
      ctx.fillStyle = Math.random() > 0.5 ? "#fff" : "#000";
      const x = Math.random() * w;
      const y = Math.random() * h;
      if (Math.random() > 0.7) ctx.fillRect(x, y, 1, 1 + Math.random() * 12);
      else ctx.fillRect(x, y, 1 + Math.random() * 2, 1);
    }
    ctx.restore();
  }

  if (on("vignette")) {
    const a = amt("vignette");
    const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.max(w, h) * 0.72);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, `rgba(0,0,0,${(a * 1.15).toFixed(3)})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
}

/**
 * Renders one frame of the effect into `ctx` (sized w x h).
 *
 * `time` is seconds; pass a changing value to animate, or a constant for a
 * still. `rotate` turns the SOURCE PHOTO before sampling (radians), so the cell
 * grid and every primitive stay aligned to the output rather than being rotated
 * along with the picture.
 */
export function renderAsciiFrame(ctx, image, params, time = 0, rotate = 0) {
  const p = params;
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  // --- source, optionally pre-rotated -------------------------------------
  const src = document.createElement("canvas");
  src.width = w;
  src.height = h;
  const sctx = src.getContext("2d");
  if (rotate) {
    sctx.save();
    sctx.translate(w / 2, h / 2);
    sctx.rotate(rotate);
    // Swap the box the photo is fitted into, so a quarter-turn still covers.
    const rw = Math.abs(Math.cos(rotate)) * w + Math.abs(Math.sin(rotate)) * h;
    const rh = Math.abs(Math.sin(rotate)) * w + Math.abs(Math.cos(rotate)) * h;
    sctx.translate(-rw / 2, -rh / 2);
    drawCover(sctx, image, rw, rh);
    sctx.restore();
  } else {
    drawCover(sctx, image, w, h);
  }

  // --- 1. background -------------------------------------------------------
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);
  const bgA = (p.bgOpacity ?? 100) / 100;
  /**
   * The background is dimmed as well as faded.
   *
   * The cells are drawn in the colour they sampled from this same photo, so
   * against a full-strength copy of it they land on near-identical values and
   * the whole effect disappears into a faint texture. Dropping the backdrop's
   * brightness is what lets the sharp cells, not the blur, carry the image.
   * `bgDim` defaults to 0.45; set it to 1 for a literal reading of bgOpacity.
   */
  const bgDim = p.bgDim ?? 0.45;
  if (p.bgMode === "blur") {
    ctx.save();
    ctx.globalAlpha = bgA;
    ctx.filter = `blur(${p.bgBlur ?? 20}px) brightness(${bgDim})`;
    ctx.drawImage(src, 0, 0);
    ctx.restore();
  } else if (p.bgMode === "photo") {
    ctx.save();
    ctx.globalAlpha = bgA;
    ctx.drawImage(src, 0, 0);
    ctx.restore();
  } else if (p.bgMode === "color") {
    ctx.save();
    ctx.globalAlpha = bgA;
    ctx.fillStyle = p.bgColor || "#000";
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  // --- 2. sample into cells ------------------------------------------------
  const cell = Math.max(2, p.cellSize || 12);
  const cols = Math.ceil(w / cell);
  const rows = Math.ceil(h / cell);
  const small = document.createElement("canvas");
  small.width = cols;
  small.height = rows;
  const smctx = small.getContext("2d", { willReadFrequently: true });
  smctx.drawImage(src, 0, 0, cols, rows);
  const data = smctx.getImageData(0, 0, cols, rows).data;

  // Edge map (Sobel-lite) only when edgeEmphasis asks for it.
  const edgeAmt = (p.edgeEmphasis || 0) / 100;
  const lumAt = (x, y) => {
    const i = (clamp(y, 0, rows - 1) * cols + clamp(x, 0, cols - 1)) * 4;
    return lum(data[i], data[i + 1], data[i + 2]);
  };

  const charSet = p.charSet === "custom" && p.customChars ? p.customChars : CHAR_SETS[p.charSet] || CHAR_SETS.standard;
  const coverage = (p.coverage ?? 100) / 100;
  const density = (p.density || 0) / 100;
  const animOn = p.animated && p.animIntensity?.enabled;
  const animAmp = ((p.animIntensity?.intensity ?? 0) / 100) * 0.45;
  const speed = ((p.animSpeed?.intensity ?? 100) / 100) * 1.2;

  // --- 3. draw the grid ----------------------------------------------------
  ctx.save();
  ctx.globalCompositeOperation = p.styleBlend || "source-over";
  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      if (coverage < 1) {
        const hsh = Math.abs(Math.sin(gx * 12.9898 + gy * 78.233) * 43758.5453) % 1;
        if (hsh > coverage) continue;
      }
      const i = (gy * cols + gx) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      let l = lum(r, g, b);

      l = applyToneCurve(l, p.toneCurve);

      if (edgeAmt > 0) {
        const e = Math.abs(lumAt(gx + 1, gy) - lumAt(gx - 1, gy)) + Math.abs(lumAt(gx, gy + 1) - lumAt(gx, gy - 1));
        l = clamp(l + e * edgeAmt * 2, 0, 1);
      }

      if (animOn) l = clamp(l + animOffset(p.animStyle, gx, gy, cols, rows, time * speed) * animAmp, 0, 1);
      if (p.invert) l = 1 - l;
      if (l <= 0.004) continue;

      drawCell(
        ctx,
        p.renderMode,
        gx * cell + cell / 2,
        gy * cell + cell / 2,
        cell,
        l,
        `rgb(${r},${g},${b})`,
        charSet,
        density,
        time,
        gx,
        gy
      );
    }
  }
  ctx.restore();

  // --- 4. colour adjustments ----------------------------------------------
  const filters = [];
  if (p.brightness) filters.push(`brightness(${1 + p.brightness / 100})`);
  if (p.contrast != null && p.contrast !== 100) filters.push(`contrast(${p.contrast}%)`);
  if (p.saturation != null && p.saturation !== 100) filters.push(`saturate(${p.saturation}%)`);
  if (p.grayscale) filters.push(`grayscale(${p.grayscale}%)`);
  if (p.blurType && p.blurType !== "off" && p.blurAmount) filters.push(`blur(${(p.blurAmount / 100) * 12}px)`);

  if (filters.length) {
    const tmp = document.createElement("canvas");
    tmp.width = w;
    tmp.height = h;
    tmp.getContext("2d").drawImage(ctx.canvas, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.filter = filters.join(" ");
    ctx.drawImage(tmp, 0, 0);
    ctx.restore();
  }

  if (p.tint && p.tintOpacity) {
    ctx.save();
    ctx.globalCompositeOperation = p.overlayBlend || "soft-light";
    ctx.globalAlpha = p.tintOpacity / 100;
    ctx.fillStyle = p.tint;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  // --- 5. post-effects -----------------------------------------------------
  postEffects(ctx, w, h, p.pfx || {}, time);

  // --- 6. lights -----------------------------------------------------------
  if (p.lights?.enabled) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const pt of p.lights.points || []) {
      const g = ctx.createRadialGradient(pt.x * w, pt.y * h, 0, pt.x * w, pt.y * h, (pt.radius || 0.2) * Math.max(w, h));
      g.addColorStop(0, `rgba(240, 246, 248,${((pt.intensity ?? 50) / 100) * 0.8})`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.restore();
  }

  return ctx.canvas;
}
