import { useEffect, useState, type CSSProperties, type Ref } from "react";

import { cn } from "@/lib/utils";

/**
 * Concentric rings of text turning around a percentage.
 *
 * Ported from the Framer marketplace "Circular Preloader". What changed in the
 * port:
 *
 *   - No framer / framer-motion. Each ring is one element spinning on a CSS
 *     keyframe, so the motion runs on the compositor and costs nothing per
 *     frame on the main thread -- which matters here, because this is on
 *     screen while the page behind it is decoding a 3D model.
 *   - The counter is not a timer. The original animates 0 -> 100 over a fixed
 *     `loadingDuration` whether or not anything has loaded; this one shows
 *     whatever the parent writes into `percentRef`.
 *   - Ring text is repeated to fit its circumference. The original spreads one
 *     string evenly round each ring, so letter spacing depended on how long
 *     the sentence happened to be; here the spacing stays the same on every
 *     ring and at every screen size.
 *   - It scales to the viewport, so the outer ring fits on a phone.
 *   - The exit is left to the parent (the site's loader has its own collapse).
 */

export type PreloaderRing = {
  text: string;
  /** Seconds per full turn. */
  duration: number;
  reverse?: boolean;
};

export type CircularPreloaderProps = {
  rings?: PreloaderRing[];
  /** Radius of the innermost ring, in px at the reference size. */
  baseRadius?: number;
  /** Space between rings, in px at the reference size. */
  ringGap?: number;
  /** Ring letter size, in px at the reference size. */
  fontSize?: number;
  color?: string;
  accentColor?: string;
  fontFamily?: string;
  /** The parent writes the counter text into this element directly, so a
      progress value changing every frame never re-renders the rings. */
  percentRef?: Ref<HTMLSpanElement>;
  showPercentage?: boolean;
  /** Stops the rings turning. */
  reducedMotion?: boolean;
  className?: string;
  style?: CSSProperties;
};

const DEFAULT_RINGS: PreloaderRing[] = [
  { text: "design • code • create • ", duration: 15 },
  { text: "creative frontend development • ", duration: 20, reverse: true },
  { text: "interaction design • ui • ux • ", duration: 30 },
  { text: "digital experiences • 2025 • ", duration: 25, reverse: true },
];

/* The size the radii and type are specified at. The whole figure scales from
   here with the viewport's shorter side. */
const REFERENCE = 560;
const SCALE_MIN = 0.6;
const SCALE_MAX = 1.35;
/* Monospace advance is ~0.6em; the extra is breathing room between letters. */
const CHAR_ADVANCE = 0.6;
const LETTER_ROOM = 1.18;

const KEYFRAMES = `
@keyframes nx-cp-spin { to { transform: rotate(360deg); } }
@keyframes nx-cp-spin-rev { to { transform: rotate(-360deg); } }
`;

function useViewportScale() {
  const read = () =>
    typeof window === "undefined"
      ? 1
      : Math.min(SCALE_MAX, Math.max(SCALE_MIN, Math.min(window.innerWidth, window.innerHeight) / REFERENCE));
  const [scale, setScale] = useState(read);
  useEffect(() => {
    const onResize = () => setScale(read());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return scale;
}

/** Repeat the phrase a whole number of times so it runs once round the ring. */
function fitToRing(phrase: string, radius: number, size: number) {
  const slots = (2 * Math.PI * radius) / (size * CHAR_ADVANCE * LETTER_ROOM);
  const repeats = Math.max(1, Math.round(slots / phrase.length));
  return phrase.repeat(repeats).toUpperCase();
}

export function CircularPreloader({
  rings = DEFAULT_RINGS,
  baseRadius = 70,
  ringGap = 12,
  fontSize = 15,
  color = "rgba(255, 250, 244, 0.55)",
  accentColor = "#E8873A",
  fontFamily = '"IBM Plex Mono", ui-monospace, monospace',
  percentRef,
  showPercentage = true,
  reducedMotion = false,
  className,
  style,
}: CircularPreloaderProps) {
  const scale = useViewportScale();
  const size = fontSize * scale;

  return (
    <div
      className={cn("relative flex h-full w-full items-center justify-center overflow-hidden", className)}
      style={style}
    >
      <style>{KEYFRAMES}</style>

      {rings.map((ring, index) => {
        const radius = (baseRadius + index * (fontSize + ringGap)) * scale;
        const chars = fitToRing(ring.text, radius, size).split("");
        const step = 360 / chars.length;
        // Innermost ring carries the accent; the rest recede outward.
        const ringColor = index === 0 ? accentColor : color;
        const ringOpacity = index === 0 ? 1 : Math.max(0.35, 1 - index * 0.18);

        return (
          <div
            key={index + ring.text}
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 h-0 w-0"
            style={{
              opacity: ringOpacity,
              willChange: reducedMotion ? undefined : "transform",
              animation: reducedMotion
                ? undefined
                : `${ring.reverse ? "nx-cp-spin-rev" : "nx-cp-spin"} ${ring.duration}s linear infinite`,
            }}
          >
            {chars.map((char, i) => (
              <span
                key={i}
                className="absolute left-0 top-0 text-center"
                style={{
                  width: "1em",
                  height: "1em",
                  marginLeft: "-0.5em",
                  marginTop: "-0.5em",
                  lineHeight: "1em",
                  fontFamily,
                  fontSize: size,
                  fontWeight: 500,
                  color: ringColor,
                  transform: `rotate(${i * step}deg) translateY(-${radius}px)`,
                }}
              >
                {char}
              </span>
            ))}
          </div>
        );
      })}

      {showPercentage && (
        <span
          ref={percentRef}
          className="absolute z-10 font-semibold"
          style={{
            fontFamily,
            fontSize: size * 2.1,
            color: "#FFFAF4",
            fontVariantNumeric: "tabular-nums",
            letterSpacing: "-0.02em",
          }}
        >
          0%
        </span>
      )}
    </div>
  );
}

export default CircularPreloader;
