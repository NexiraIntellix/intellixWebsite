import { useEffect, useRef, type CSSProperties } from "react";

import { narrowPull } from "@/lib/framing.js";

import { LAPTOP_PARTS, REF_HEIGHT, REF_WIDTH } from "./laptop-lines";

/**
 * The hero laptop, drawn in lines as the page loads.
 *
 * Each part of the machine strokes itself in over its own slice of progress --
 * lid, screen, deck, the slab's edge, keyboard, keys, trackpad -- so at 100%
 * the drawing is complete, and it sits where the real 3D laptop will be when
 * the loader lifts off it (see laptop-lines.ts for why that holds at any
 * window size).
 *
 * All motion is stroke-dashoffset on a few SVG paths plus one CSS float, so it
 * costs next to nothing while the page behind it is decoding the model.
 */

export type LaptopLineLoaderProps = {
  /** Load progress in [0, 1], read every animation frame. */
  getProgress: () => number;
  color?: string;
  /** Freeze the idle float; the drawing still follows progress. */
  reducedMotion?: boolean;
  /** Caption before the percentage. Empty string hides the caption. */
  label?: string;
  style?: CSSProperties;
};

/* Each part eases in and out of its own stroke, so one line settles as the
   next begins rather than every line arriving at full speed. */
const ease = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : 0.5 - 0.5 * Math.cos(Math.PI * t));

/* Time constant of the smoothing between the progress it is given and the
   progress it draws. Real progress arrives in steps -- a chunk of the model
   lands, the number jumps -- and a line that jumps with it reads as a stutter. */
const SMOOTH_MS = 220;

/* The model's own idle motion, from Macbook.jsx, approximated on screen: a
   ~10s bob of a few pixels and a ~0.7 degree roll. Same periods, so the
   drawing breathes like the thing it hands over to. */
const FLOAT_CSS = `
@keyframes nx-ll-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-0.55%); } }
@keyframes nx-ll-roll { 0%, 100% { transform: rotate(-0.45deg); } 50% { transform: rotate(0.45deg); } }
`;

export function LaptopLineLoader({
  getProgress,
  color = "#FFFAF4",
  reducedMotion = false,
  label = "Loading",
  style,
}: LaptopLineLoaderProps) {
  const pathRefs = useRef<(SVGPathElement | null)[]>([]);
  const glowRefs = useRef<(SVGPathElement | null)[]>([]);
  const screenFillRef = useRef<SVGPathElement | null>(null);
  const captionRef = useRef<HTMLSpanElement | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const progressRef = useRef(getProgress);
  progressRef.current = getProgress;

  /* Portrait windows: the hero camera stands further back (lib/framing.js)
     and aims a little to the side, so the laptop is smaller and shifted.
     Measured by projecting the model through the live camera at 338x579,
     390x844 and 768x1024: the size follows the pull-back factor to within
     about 1%, and the shift, in units of window height, is a constant
     (-0.0515, -0.0088) times that same size -- the aim offset is a fixed
     distance, so it shrinks on screen exactly as the laptop does. */
  useEffect(() => {
    const fit = () => {
      const el = boxRef.current;
      if (!el) return;
      const sbw = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--nx-al-sbw")) || 0;
      const h = window.innerHeight;
      const aspect = (window.innerWidth - sbw) / h;
      const portrait = aspect < 1;
      const scale = portrait ? 1.01 / narrowPull(aspect) : 1;
      el.style.setProperty("--nx-ll-scale", String(scale));
      // Horizontal shift dropped: the hero's aim was retuned so the machine
      // sits centred on phones, and the drawing follows it to the centre.
      el.style.setProperty("--nx-ll-dx", "0px");
      el.style.setProperty("--nx-ll-dy", `${portrait ? -0.0088 * scale * h : 0}px`);
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  useEffect(() => {
    let raf = 0;
    let lastPct = -1;
    let drawn = 0;
    let last = 0;
    const tick = (now: number) => {
      const target = Math.min(1, Math.max(0, progressRef.current()));
      // Frame-rate independent: the same glide at 60Hz and at 144Hz.
      const dt = last ? Math.min(100, now - last) : 16;
      last = now;
      drawn += (target - drawn) * (1 - Math.exp(-dt / SMOOTH_MS));
      if (target - drawn < 0.0005) drawn = target;
      const p = drawn;
      LAPTOP_PARTS.forEach((part, i) => {
        const [a, b] = part.span;
        const k = ease((p - a) / (b - a));
        const offset = String(1 - k);
        /* Hidden until the part actually starts: a zero-length dash still
           paints its round cap, so every undrawn part showed as a dot. */
        const visible = k > 0.002 ? "1" : "0";
        const path = pathRefs.current[i];
        const glow = glowRefs.current[i];
        if (path) {
          if (path.style.strokeDashoffset !== offset) path.style.strokeDashoffset = offset;
          if (path.style.opacity !== visible) path.style.opacity = visible;
        }
        if (glow) {
          if (glow.style.strokeDashoffset !== offset) glow.style.strokeDashoffset = offset;
          if (glow.style.opacity !== visible) glow.style.opacity = visible;
        }
      });
      // The last stretch lights the screen, as the drawing completes.
      if (screenFillRef.current) screenFillRef.current.style.opacity = String(ease((p - 0.9) / 0.1) * 0.045);
      const pct = Math.floor(p * 100);
      if (captionRef.current && pct !== lastPct) {
        lastPct = pct;
        captionRef.current.textContent = `${pct}%`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const screen = LAPTOP_PARTS.find((part) => part.id === "screen");

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", ...style }}>
      <style>{FLOAT_CSS}</style>

      {/* Sized to the hero canvas's height and centred on its centre. The
          loader hides the scrollbar and pads the page by its width, so the
          canvas centre sits half a scrollbar left of the window's. */}
      <div
        ref={boxRef}
        style={{
          position: "absolute",
          top: "50%",
          left: "calc(50% - var(--nx-al-sbw, 0px) / 2)",
          height: "100%",
          aspectRatio: `${REF_WIDTH} / ${REF_HEIGHT}`,
          transform:
            "translate(-50%, -50%) translate(var(--nx-ll-dx, 0px), var(--nx-ll-dy, 0px)) scale(var(--nx-ll-scale, 1))",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            animation: reducedMotion ? undefined : "nx-ll-bob 10.1s ease-in-out infinite",
          }}
        >
          <svg
            viewBox={`0 0 ${REF_WIDTH} ${REF_HEIGHT}`}
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              overflow: "visible",
              transformOrigin: "50% 51%",
              animation: reducedMotion ? undefined : "nx-ll-roll 7.9s ease-in-out infinite",
            }}
          >
            {screen && <path ref={screenFillRef} d={screen.d} fill={color} style={{ opacity: 0 }} />}

            {/* A soft wide stroke under each line stands in for a glow filter,
                which would repaint its whole blur region every frame. */}
            {LAPTOP_PARTS.map((part, i) => (
              <path
                key={`glow-${part.id}`}
                ref={(el) => {
                  glowRefs.current[i] = el;
                }}
                d={part.d}
                fill="none"
                stroke={color}
                strokeOpacity={part.weight === "outline" ? 0.1 : 0.05}
                strokeWidth={part.weight === "outline" ? 7 : 5}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                pathLength={1}
                style={{ strokeDasharray: 1, strokeDashoffset: 1, opacity: 0 }}
              />
            ))}
            {LAPTOP_PARTS.map((part, i) => (
              <path
                key={part.id}
                ref={(el) => {
                  pathRefs.current[i] = el;
                }}
                d={part.d}
                fill="none"
                stroke={color}
                strokeOpacity={part.weight === "outline" ? 1 : 0.6}
                strokeWidth={part.weight === "outline" ? 1.5 : 1}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                pathLength={1}
                style={{ strokeDasharray: 1, strokeDashoffset: 1, opacity: 0 }}
              />
            ))}
          </svg>
        </div>
      </div>

      {label !== "" && (
        /* Where the hero's "Scroll to enter" cue sits, so the one hands over
           to the other in place. */
        <div
          className="nx-ll-caption"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: "91.9%",
            transform: "translateY(-50%)",
            textAlign: "center",
            fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
            fontSize: 12,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: "rgba(243, 234, 225, 0.6)",
          }}
        >
          {label} <span ref={captionRef} style={{ color, fontVariantNumeric: "tabular-nums" }}>0%</span>
        </div>
      )}
    </div>
  );
}

export default LaptopLineLoader;
