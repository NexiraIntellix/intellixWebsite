import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";

/**
 * Text cut out of moving footage.
 *
 * Ported from the Framer module of the same name. Three things in the original
 * do not survive being taken off Framer's canvas, so they are not kept:
 *
 *   1. It masked an HTML <video> with `mask: url(#svg-mask)`. Chromium and
 *      Firefox honour that; WebKit does not, and it fails silently -- you get a
 *      full-bleed video with no word in it, which is worse than no effect. This
 *      does the knockout the other way round: the video lies underneath and an
 *      SVG plate on top paints the ground everywhere the letters are not. That
 *      is plain SVG masking of an SVG shape, which every engine supports.
 *   2. The mask id came from Math.random() called during render, so it changed
 *      on every re-render and never matched under SSR.
 *   3. `textColor` was declared and never used, and the type was a fixed pixel
 *      size -- so the word was whatever 48px happened to be, regardless of the
 *      box it was placed in.
 *
 * Here the word is measured and the viewBox is fitted to it, so it fills the
 * box at any size; and `textColor` is what the word is drawn in when there is
 * no video to show it through -- reduced motion, a dead source, a blocked
 * autoplay. The effect degrades to a headline rather than to a blank plate.
 */

/* Nominal em. Nothing is read at this size -- the viewBox is fitted to the
   measured bbox, so this is only the unit the glyphs are measured in. */
const NOMINAL = 100;

/* Word scale (screen px per user unit) at and above which the outline is drawn
   at its full width. Laptop and desktop bands sit at 1.7-2.3; a phone band is
   near 0.75, where the letters are a third the size -- a fixed 1.25px line
   there reads three times as heavy against them, so below this it thins in
   proportion to the type. */
const OUTLINE_FULL_SCALE = 1.8;

/* Ours now, and served from /public. This pointed at the stock clip the
   Framer module arrived with, hosted on framerusercontent -- a live
   dependency on a third-party CDN that outlived the port off Framer's
   canvas, for footage the site does not own. The band only reads as the
   team's own work if the footage in the letters is. */
const DEFAULT_SRC = "/video/Developer.mp4";

/**
 * The word, drawn once. It is rendered twice -- live, as the thing that gets
 * measured, and again inside the mask -- and the two must be the same shape to
 * the pixel, so they come from one function.
 */
function Word({ lines, lineHeight, fontFamily, fontWeight, letterSpacing, fill, stroke, strokeWidth, strokeOpacity, textRef, opacity }) {
  return (
    <text
      ref={textRef}
      x={0}
      y={0}
      textAnchor="middle"
      opacity={opacity}
      style={{
        fontFamily,
        fontWeight,
        fontSize: NOMINAL,
        letterSpacing,
        fill,
        stroke,
        strokeWidth,
        strokeOpacity,
        strokeLinejoin: "round",
        whiteSpace: "pre",
      }}
    >
      {lines.map((line, i) => (
        <tspan key={i} x={0} dy={i === 0 ? 0 : NOMINAL * lineHeight}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

export default function TextVideoMask({
  src = DEFAULT_SRC,
  poster,
  text = "VIDEO",
  fontFamily = "var(--display)",
  fontWeight = 700,
  letterSpacing = "-0.03em",
  lineHeight = 0.86,
  textColor = "var(--accent)",
  backgroundColor = "var(--ink)",
  /* The page runs one hue on a warm ground; stock footage does not. `color`
     blending keeps the clip's luminance -- its movement, which is the whole
     point -- and takes the hue from the ramp, so the band belongs to the page
     instead of importing a second colour temperature. Pass tint={null} to show
     footage at its own colour. */
  tint = "var(--a-5)",
  tintOpacity = 0.62,
  padding = 0.08,
  /* Which part of the frame survives the crop, as CSS object-position. The
     crop is taken against the word's own box, so it is the same at every
     viewport -- tune it once against the footage and it holds. */
  videoPosition = "50% 50%",
  /* A hairline around the letters, drawn over the footage. The knockout only
     reads where the clip is brighter than the ground, and footage has dark
     passages -- through those the word simply dissolves into the plate. The
     line keeps the letterforms legible whatever the frame is doing. Width is
     in screen pixels; pass outlineWidth={0} to drop it. */
  outlineColor = "var(--accent)",
  outlineOpacity = 0.25,
  outlineWidth = 1.25,
  autoPlay = true,
  loop = true,
  muted = true,
  className,
  style,
}) {
  const maskId = `nx-tvm-${useId().replace(/:/g, "")}`;
  const hostRef = useRef(null);
  const videoRef = useRef(null);
  const textRef = useRef(null);

  const [box, setBox] = useState(null);
  const [size, setSize] = useState(null);
  const [still, setStill] = useState(false);

  const lines = String(text).split("\n");

  /* Fit the frame to the word. getBBox is taken on the live copy -- an element
     inside <defs> is never laid out, so measuring the mask's copy returns
     zeroes in some engines. */
  useLayoutEffect(() => {
    let cancelled = false;

    const measure = () => {
      const node = textRef.current;
      if (!node || cancelled) return;
      let b;
      try {
        b = node.getBBox();
      } catch {
        return; // detached, or laid out before the SVG had a frame
      }
      if (!b.width || !b.height) return;
      const pad = NOMINAL * padding;
      setBox((prev) => {
        const next = { x: b.x - pad, y: b.y - pad, w: b.width + pad * 2, h: b.height + pad * 2 };
        // Fonts settle in stages; bail out of a no-op state write.
        if (prev && Math.abs(prev.w - next.w) < 0.5 && Math.abs(prev.h - next.h) < 0.5) return prev;
        return next;
      });
    };

    measure();
    // The first measurement lands against the fallback face. Plex arrives a
    // beat later and is a different width, so measure again once it has.
    document.fonts?.ready?.then(measure);

    return () => {
      cancelled = true;
    };
  }, [text, fontFamily, fontWeight, letterSpacing, lineHeight, padding]);

  /* The band's own size, so the word's on-screen rectangle can be worked out
     below. The SVG draws the word with xMidYMid/meet, which is plain
     arithmetic on these two numbers and the viewBox -- no second measurement
     of the rendered glyphs is needed. */
  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width: w, height: h } = entry.contentRect;
      setSize((prev) => (prev && prev.w === w && prev.h === h ? prev : { w, h }));
    });
    ro.observe(host);
    return () => ro.disconnect();
  }, []);

  /* Reduced motion: no autoplaying footage. The word stays -- it is content. */
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setStill(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  /* Decoding a video nobody is looking at costs battery for nothing. */
  useEffect(() => {
    const host = hostRef.current;
    if (!host || still) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        const v = videoRef.current;
        if (!v) return;
        if (entry.isIntersecting) {
          // Autoplay can be refused outright (a data-saver profile, an engine
          // that wants a gesture). Fall back rather than sit on a frozen frame.
          if (autoPlay) v.play().catch(() => setStill(true));
        } else {
          v.pause();
        }
      },
      { rootMargin: "120px" }
    );
    io.observe(host);
    return () => io.disconnect();
  }, [still, autoPlay, src]);

  // Mask region and plate, in the fitted user space. Generous enough to cover
  // the letterboxing that xMidYMid/meet leaves when the box and the word
  // disagree about aspect ratio.
  const M = box ? Math.max(box.w, box.h) * 20 : 0;
  const plate = box
    ? { x: box.x - M, y: box.y - M, width: box.w + M * 2, height: box.h + M * 2 }
    : null;

  /* Footage is laid over the word's rectangle, not the whole band. The word
     fills only the middle of a wide band, so footage spread edge to edge put
     most of the frame -- the subject included -- under the plate, where it is
     never seen. Fitted to the word, the whole frame passes through the
     letters, and `cover` only has to reconcile the word's aspect with the
     clip's, which does not change with the viewport. */
  let frame = null;
  let k = 0;
  if (box && size && size.w && size.h) {
    k = Math.min(size.w / box.w, size.h / box.h);
    const w = box.w * k;
    const h = box.h * k;
    frame = { left: (size.w - w) / 2, top: (size.h - h) / 2, width: w, height: h };
  }

  const type = { lines, lineHeight, fontFamily, fontWeight, letterSpacing };

  return (
    <div
      ref={hostRef}
      className={className}
      role="img"
      aria-label={lines.join(" ")}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        background: backgroundColor,
        overflow: "hidden",
        // Keeps the tint blending against the footage and not against whatever
        // the page happens to have painted behind this band.
        isolation: "isolate",
        ...style,
      }}
    >
      {!still && (
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          autoPlay={autoPlay}
          loop={loop}
          muted={muted}
          playsInline
          preload="metadata"
          aria-hidden="true"
          onError={() => setStill(true)}
          style={{
            position: "absolute",
            ...(frame ?? { inset: 0, width: "100%", height: "100%" }),
            objectFit: "cover",
            objectPosition: videoPosition,
            // Held back until the plate exists. Showing the footage before the
            // knockout is ready flashes the whole clip for a frame.
            opacity: frame ? 1 : 0,
            transition: "opacity 420ms ease",
          }}
        />
      )}

      {/* Sits between the footage and the plate, so it is knocked out to the
          letters along with everything else beneath. */}
      {!still && tint && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            background: tint,
            mixBlendMode: "color",
            opacity: box ? tintOpacity : 0,
            transition: "opacity 420ms ease",
            pointerEvents: "none",
          }}
        />
      )}

      <svg
        viewBox={box ? `${box.x} ${box.y} ${box.w} ${box.h}` : "0 0 100 100"}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
        focusable="false"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
      >
        {plate && !still && (
          <defs>
            <mask id={maskId} maskUnits="userSpaceOnUse" {...plate}>
              {/* White keeps the ground; the word is punched out in black. */}
              <rect {...plate} fill="#fff" />
              <Word {...type} fill="#000" />
            </mask>
          </defs>
        )}

        {plate && !still && (
          <rect {...plate} mask={`url(#${maskId})`} style={{ fill: backgroundColor }} />
        )}

        {/* The outline, in user units converted from screen pixels: the viewBox
            is scaled by k, so w / k user units lands at w px on screen. w is
            outlineWidth on large bands and shrinks with the type on small
            ones (see OUTLINE_FULL_SCALE). Only while footage is showing -- the
            still fallback is already a solid word. */}
        {plate && !still && frame && outlineWidth > 0 && (
          <Word
            {...type}
            fill="none"
            stroke={outlineColor}
            strokeOpacity={outlineOpacity}
            strokeWidth={(outlineWidth * Math.min(1, k / OUTLINE_FULL_SCALE)) / k}
          />
        )}

        {/* The measured copy. Invisible while the footage shows through it;
            it becomes the visible word when there is no footage. */}
        <Word {...type} textRef={textRef} fill={textColor} opacity={still ? 1 : 0} />
      </svg>
    </div>
  );
}
