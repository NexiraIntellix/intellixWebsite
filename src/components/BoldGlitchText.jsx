import { useEffect, useId, useMemo, useState } from "react";

/**
 * Bold glitch text.
 *
 * Ported from the Framer module. The seeded slice geometry, the cadence
 * patterns and the burst maths are the original's.
 *
 * What is not the original's is the driver. The module runs its bursts from a
 * gsap timeline, which lives on the main thread -- and the one place this is
 * used is the loading screen, where the main thread is busy decoding a 3.1MB
 * Draco mesh. Measured over a real load: a worst frame of 3116ms, seven frames
 * over 400ms, and 1.84 bursts a second against the 2.79 the timeline asks for.
 * A third of the glitch was being dropped, and what survived arrived in clumps.
 *
 * So the bursts are baked into CSS keyframes instead, generated once from the
 * same pattern. Transform and opacity animations are composited, so they keep
 * their own time while the main thread is blocked -- measured at 3150ms of
 * animation across a 3126ms freeze, which during a page load is the point.
 */

const PRESETS = {
  cleanCut: { duration: 2.45, intensity: 4.8, slices: 9, blocks: 2, cadence: "clean" },
  sharpDigital: { duration: 2.15, intensity: 7.3, slices: 14, blocks: 6, cadence: "sharp" },
  heavyBreak: { duration: 1.85, intensity: 9.1, slices: 18, blocks: 9, cadence: "aggressive" },
  editorial: { duration: 2.75, intensity: 5.9, slices: 11, blocks: 4, cadence: "editorial" },
  minimal: { duration: 3.1, intensity: 3.2, slices: 6, blocks: 1, cadence: "clean" },
  titleTemplate: { duration: 2.2, intensity: 7.4, slices: 14, blocks: 6, cadence: "sharp" },
};

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

/** Deterministic pseudo-random, so the slice geometry is stable across renders. */
const seeded = (index, salt) => {
  const v = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453123;
  return v - Math.floor(v);
};

const snapValue = (v, snap) => (!Number.isFinite(v) ? 0 : snap ? Math.round(v) : v);

function getCadencePattern(cadence) {
  if (cadence === "clean") {
    return [
      { ratio: 0.06, power: 0.58, direction: -1, hold: 0.034, density: 4 },
      { ratio: 0.18, power: 0.82, direction: 1, hold: 0.042, density: 3 },
      { ratio: 0.42, power: 0.44, direction: -1, hold: 0.03, density: 5 },
      { ratio: 0.68, power: 0.66, direction: 1, hold: 0.038, density: 4 },
    ];
  }
  if (cadence === "aggressive") {
    return [
      { ratio: 0.025, power: 1.1, direction: -1, hold: 0.052, density: 2 },
      { ratio: 0.08, power: 0.76, direction: 1, hold: 0.034, density: 3 },
      { ratio: 0.145, power: 1.34, direction: 1, hold: 0.062, density: 2 },
      { ratio: 0.225, power: 0.64, direction: -1, hold: 0.034, density: 3 },
      { ratio: 0.34, power: 1, direction: -1, hold: 0.05, density: 2 },
      { ratio: 0.52, power: 0.58, direction: 1, hold: 0.034, density: 4 },
      { ratio: 0.74, power: 0.72, direction: -1, hold: 0.038, density: 3 },
    ];
  }
  if (cadence === "editorial") {
    return [
      { ratio: 0.04, power: 0.78, direction: -1, hold: 0.044, density: 4 },
      { ratio: 0.23, power: 1.02, direction: 1, hold: 0.052, density: 3 },
      { ratio: 0.36, power: 0.36, direction: -1, hold: 0.026, density: 6 },
      { ratio: 0.61, power: 0.72, direction: 1, hold: 0.04, density: 4 },
      { ratio: 0.82, power: 0.42, direction: -1, hold: 0.026, density: 5 },
    ];
  }
  return [
    { ratio: 0.035, power: 0.96, direction: -1, hold: 0.05, density: 3 },
    { ratio: 0.105, power: 0.58, direction: 1, hold: 0.034, density: 4 },
    { ratio: 0.185, power: 1.22, direction: 1, hold: 0.06, density: 2 },
    { ratio: 0.31, power: 0.48, direction: -1, hold: 0.03, density: 5 },
    { ratio: 0.455, power: 0.82, direction: -1, hold: 0.046, density: 3 },
    { ratio: 0.69, power: 0.38, direction: 1, hold: 0.026, density: 5 },
  ];
}

/* ── Keyframe generation ───────────────────────────────────────────────────
 *
 * One @keyframes per layer, holding that layer's own displacement at each
 * burst it takes part in and nothing in between. The stops sit a hundredth of
 * a percent either side of every burst window so the change is a jump rather
 * than a tween -- the gsap version set values instantly through `.call()`, and
 * a glitch that eases is not a glitch.
 */

const REST = "opacity:0;transform:translate3d(0,0,0) skewX(0deg) scaleX(1);";
const EPS = 0.01;
const pct = (n) => +(n * 100).toFixed(3);
const px = (n) => +n.toFixed(2);

function layerKeyframes(name, windows, restOpacity = 0) {
  const rest = restOpacity
    ? `opacity:${restOpacity};transform:translate3d(0,0,0) skewX(0deg) scaleX(1);`
    : REST;
  let out = `@keyframes ${name}{0%,100%{${rest}}`;
  for (const w of windows) {
    const a = Math.max(0, pct(w.start));
    const z = Math.min(100, pct(w.end));
    const on = `opacity:${+w.opacity.toFixed(3)};transform:translate3d(${px(w.x)}px,${px(w.y)}px,0) skewX(${px(w.skewX)}deg) scaleX(${px(w.scaleX)});`;
    if (a - EPS > 0) out += `${(a - EPS).toFixed(3)}%{${rest}}`;
    out += `${a}%,${z}%{${on}}`;
    if (z + EPS < 100) out += `${(z + EPS).toFixed(3)}%{${rest}}`;
  }
  return out + "}";
}

/**
 * Every layer's whole cycle, as CSS. Mirrors the gsap version's `applyBurst`
 * exactly -- same formulas, same density rules for which layers take part in
 * which burst.
 */
function buildGlitchCss(uid, resolved, spread, snap, sliceData, blockData) {
  const pattern = getCadencePattern(resolved.cadence);
  const colorOffset = 1.4 + resolved.intensity * 1.85 + spread * 0.9;
  const cycle = resolved.duration;

  const titleW = [];
  const shadowW = [[], [], []];
  const sliceW = sliceData.map(() => []);
  const blockW = blockData.map(() => []);

  for (const b of pattern) {
    const start = b.ratio;
    const end = b.ratio + b.hold;
    const titleX = snapValue(b.direction * b.power * (1 + resolved.intensity * 0.72), snap);
    const titleSkew = snapValue(b.direction * b.power * (1.1 + resolved.intensity * 0.46), snap);

    titleW.push({ start, end, opacity: 1, x: titleX, y: 0, skewX: titleSkew, scaleX: 1 + b.power * 0.005 });

    shadowW[0].push({ start, end, opacity: 0.78, x: snapValue(-b.direction * colorOffset * b.power, snap), y: snapValue(-1 * b.power, snap), skewX: snapValue(-titleSkew * 0.36, snap), scaleX: 1 });
    shadowW[1].push({ start, end, opacity: 0.7, x: snapValue(b.direction * colorOffset * 0.86 * b.power, snap), y: snapValue(1 * b.power, snap), skewX: snapValue(titleSkew * 0.26, snap), scaleX: 1 });
    shadowW[2].push({ start, end, opacity: 0.56, x: snapValue(b.direction * colorOffset * -0.42 * b.power, snap), y: snapValue(1.5 * b.power, snap), skewX: snapValue(titleSkew * -0.18, snap), scaleX: 1 + b.power * 0.012 });

    sliceData.forEach((d, i) => {
      if (i % b.density === 1) return;
      const mult = 1 + d.colorIndex * 0.16;
      sliceW[i].push({ start, end, opacity: d.opacity, x: snapValue(d.x * b.power * b.direction * mult, snap), y: snapValue(d.y * b.power, snap), skewX: snapValue(d.skew * b.power, snap), scaleX: 1 });
    });

    blockData.forEach((d, i) => {
      if (i % Math.max(2, b.density - 1) !== 0) return;
      const mult = 1 + d.colorIndex * 0.18;
      blockW[i].push({ start, end, opacity: d.opacity, x: snapValue(d.x * b.power * b.direction * mult, snap), y: snapValue(d.y * b.power, snap), skewX: 0, scaleX: d.scaleX });
    });
  }

  const frames = [];
  const rules = [];
  const add = (sel, name, windows, restOpacity) => {
    frames.push(layerKeyframes(name, windows, restOpacity));
    rules.push(`${sel}{animation:${name} ${cycle}s linear infinite;}`);
  };

  add(`.${uid} .bgt-title`, `${uid}-t`, titleW, 1);
  shadowW.forEach((w, i) => add(`.${uid} .bgt-shadow-${"abc"[i]}`, `${uid}-s${i}`, w));
  sliceW.forEach((w, i) => add(`.${uid} .bgt-slice-${i}`, `${uid}-l${i}`, w));
  blockW.forEach((w, i) => add(`.${uid} .bgt-block-${i}`, `${uid}-b${i}`, w));

  return frames.join("") + rules.join("");
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return reduced;
}

const CSS = `
.bgt-root, .bgt-root * { box-sizing: border-box; }
.bgt-root { font-synthesis: none; }
.bgt-title { user-select: none; transform-origin: 50% 50%; }
.bgt-base { position: relative; z-index: 5; }

.bgt-shadow, .bgt-slice, .bgt-block {
  position: absolute; inset: 0;
  display: inline-block;
  white-space: inherit; word-break: inherit;
  text-align: inherit; text-transform: inherit;
  pointer-events: none;
  /* Opacity alone, no visibility: only transform and opacity get composited,
     and compositing is the entire reason this is CSS and not a timeline. */
  opacity: 0;
  transform: translate3d(0, 0, 0); transform-origin: 50% 50%;
  will-change: transform, opacity;
}

.bgt-shadow { z-index: 2; }
.bgt-shadow-a { color: var(--bgt-glitch-a); clip-path: inset(0 0 54% 0); }
.bgt-shadow-b { color: var(--bgt-glitch-b); clip-path: inset(35% 0 28% 0); }
.bgt-shadow-c { color: var(--bgt-glitch-c); clip-path: inset(47% 0 0 0); }
.bgt-slice { z-index: 6; }
.bgt-block { z-index: 7; }
.bgt-color-0 { color: var(--bgt-glitch-a); }
.bgt-color-1 { color: var(--bgt-glitch-b); }
.bgt-color-2 { color: var(--bgt-glitch-c); }

.bgt-pixel .bgt-title, .bgt-pixel .bgt-shadow,
.bgt-pixel .bgt-slice, .bgt-pixel .bgt-block { backface-visibility: hidden; }

/* Paused rather than removed, so it resumes where it left off. */
.bgt-root.is-paused .bgt-title,
.bgt-root.is-paused .bgt-shadow,
.bgt-root.is-paused .bgt-slice,
.bgt-root.is-paused .bgt-block { animation-play-state: paused; }

@media (prefers-reduced-motion: reduce) {
  .bgt-title, .bgt-shadow, .bgt-slice, .bgt-block { animation: none !important; }
  .bgt-shadow, .bgt-slice, .bgt-block { opacity: 0 !important; transform: none !important; }
}
`;

export default function BoldGlitchText({
  text = "GLITCH",
  as: Tag = "span",
  className,
  uppercase = true,
  /* Warm by default, not the shipped cyan/magenta/yellow. This page runs one
     hue and tells things apart by lightness; an RGB split would be the only
     three foreign colours on the site. Pass #00E5FF / #FF2D7A / #FFE600 for the
     original neon tear. */
  color = "var(--text-strong)",
  glitchColorA = "#E8873A",
  glitchColorB = "#FBDFC6",
  glitchColorC = "#8C4813",
  colorSpread = 5,
  preset = "sharpDigital",
  presetStrength = 1,
  presetSpeed = 1,
  pixelSnap = true,
  live = true,
  style,
}) {
  const reducedMotion = useReducedMotion();

  // A CSS-safe identifier, so two instances never share keyframe names.
  const uid = `bgt-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  const resolved = useMemo(() => {
    const selected = PRESETS[preset] ?? PRESETS.sharpDigital;
    const speed = clamp(presetSpeed, 0.5, 1.8);
    const strength = clamp(presetStrength, 0.4, 1.4);
    return {
      duration: clamp(selected.duration / speed, 0.75, 8),
      intensity: clamp(selected.intensity * strength, 0, 10),
      slices: Math.round(clamp(selected.slices, 4, 22)),
      blocks: Math.round(clamp(selected.blocks, 0, 14)),
      cadence: selected.cadence,
    };
  }, [preset, presetStrength, presetSpeed]);

  const safeText = text?.trim() ? text : "GLITCH";
  const spread = clamp(colorSpread, 0, 10);

  const sliceData = useMemo(() => {
    const rows = [];
    const rowHeight = 100 / resolved.slices;
    for (let i = 0; i < resolved.slices; i++) {
      const jitter = seeded(i, 10) * rowHeight * 0.36;
      const height = clamp(rowHeight * (0.68 + seeded(i, 11) * 0.72), 2.5, 17);
      const top = clamp(i * rowHeight + jitter, 0, 97);
      const bottom = clamp(100 - top - height, 0, 100);
      const direction = i % 2 === 0 ? -1 : 1;
      const energy = 0.62 + seeded(i, 12) * 1.08;
      rows.push({
        id: i, top, bottom, colorIndex: i % 3,
        x: direction * (7 + resolved.intensity * 5.25) * energy,
        y: (seeded(i, 13) - 0.5) * resolved.intensity * 1.65,
        skew: direction * (0.45 + resolved.intensity * 0.58) * energy,
        opacity: 0.62 + seeded(i, 14) * 0.38,
      });
    }
    return rows;
  }, [resolved.slices, resolved.intensity]);

  const blockData = useMemo(
    () =>
      Array.from({ length: resolved.blocks }, (_, i) => {
        const top = 4 + seeded(i, 40) * 89;
        const height = 3.8 + seeded(i, 41) * 13;
        const bottom = clamp(100 - top - height, 0, 100);
        const direction = i % 2 === 0 ? 1 : -1;
        const energy = 0.78 + seeded(i, 42) * 1.28;
        return {
          id: i, top, bottom, colorIndex: (i + 1) % 3,
          x: direction * (11 + resolved.intensity * 6.2) * energy,
          y: (seeded(i, 43) - 0.5) * resolved.intensity * 2.1,
          scaleX: 0.93 + seeded(i, 44) * 0.17,
          opacity: 0.48 + seeded(i, 45) * 0.44,
        };
      }),
    [resolved.blocks, resolved.intensity]
  );

  /* Built once and handed to the browser as a stylesheet. Nothing here runs
     again for the life of the component -- the compositor owns the playback. */
  const glitchCss = useMemo(
    () => buildGlitchCss(uid, resolved, spread, pixelSnap, sliceData, blockData),
    [uid, resolved, spread, pixelSnap, sliceData, blockData]
  );

  const paused = !live || reducedMotion;

  return (
    <span
      className={`bgt-root ${uid}${pixelSnap ? " bgt-pixel" : ""}${paused ? " is-paused" : ""}`}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        isolation: "isolate",
        color,
        "--bgt-glitch-a": glitchColorA,
        "--bgt-glitch-b": glitchColorB,
        "--bgt-glitch-c": glitchColorC,
        ...style,
      }}
    >
      <style>{CSS + glitchCss}</style>

      <Tag
        className={className ? `bgt-title ${className}` : "bgt-title"}
        style={{
          margin: 0,
          position: "relative",
          display: "inline-block",
          color,
          textTransform: uppercase ? "uppercase" : "none",
          whiteSpace: "pre",
          WebkitFontSmoothing: "antialiased",
          textRendering: "geometricPrecision",
        }}
      >
        <span className="bgt-base">{safeText}</span>
        <span className="bgt-shadow bgt-shadow-a" aria-hidden="true">{safeText}</span>
        <span className="bgt-shadow bgt-shadow-b" aria-hidden="true">{safeText}</span>
        <span className="bgt-shadow bgt-shadow-c" aria-hidden="true">{safeText}</span>
        {sliceData.map((s) => (
          <span
            key={s.id}
            className={`bgt-slice bgt-slice-${s.id} bgt-color-${s.colorIndex}`}
            aria-hidden="true"
            style={{ clipPath: `inset(${s.top}% 0 ${s.bottom}% 0)` }}
          >
            {safeText}
          </span>
        ))}
        {blockData.map((bl) => (
          <span
            key={bl.id}
            className={`bgt-block bgt-block-${bl.id} bgt-color-${bl.colorIndex}`}
            aria-hidden="true"
            style={{ clipPath: `inset(${bl.top}% 0 ${bl.bottom}% 0)` }}
          >
            {safeText}
          </span>
        ))}
      </Tag>
    </span>
  );
}
