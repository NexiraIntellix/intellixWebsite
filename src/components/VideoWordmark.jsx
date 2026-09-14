import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";

/**
 * A lockup with footage running inside the letters, on a transparent ground.
 *
 * TextVideoMask.jsx already does text-out-of-video, and this does not reuse it,
 * for one structural reason: that component knocks the word out of an opaque
 * plate -- the video lies underneath and a filled rectangle paints the ground
 * everywhere the letters are not. On the sign-off band that is exactly right,
 * because there the ground is a flat page colour. Over the hero it is fatal:
 * the plate would blanket the radial gradient and, once the fly-in starts, the
 * 3D laptop crossfading in behind the mark.
 *
 * So the compositing is inverted. Nothing is painted outside the letters at
 * all; the video itself is clipped to their outlines with `clip-path`, and
 * every pixel that is not a glyph stays genuinely transparent.
 *
 * The clip is declared in `objectBoundingBox` units, which is what lets this
 * work without measuring anything in pixels at runtime: the glyphs are drawn
 * once at a nominal size, their bounding box is measured in that space, and a
 * transform maps that box onto the unit square. The clip then stretches to
 * whatever box the video element happens to occupy. Since the SVG's viewBox is
 * fitted to the same measured box, and the video is laid over that SVG at
 * inset 0, the two agree at every size with no resize listener.
 *
 * Every line of the lockup lives in one text element, so a single video runs
 * continuously behind all of them and each line shows the part of the frame
 * that falls behind it. Giving each line its own <video> would be two decodes
 * of the same file and, worse, two independent object-fit crops -- the lines
 * would show unrelated parts of the picture and stop reading as one image.
 *
 * The lockup's width is published in em, so a parent sizing it with a single
 * font-size gets the right box for free.
 */

/* Nominal em. Nothing is read at this size -- the viewBox and the clip are both
   fitted to the measured bbox, so this is only the unit the glyphs are measured
   in, and what each line's `scale` and `lead` are fractions of. */
const NOMINAL = 100;

/**
 * The lockup, drawn once. It is rendered twice -- live, as the thing that gets
 * measured and backs the footage, and again inside the clip -- and the two must
 * be the same shape to the pixel, so they come from one component.
 */
function Lines({ lines, fill, textRef, transform }) {
  return (
    <text ref={textRef} x={0} y={0} textAnchor="middle" transform={transform} style={{ fill }}>
      {lines.map((line, i) => (
        <tspan
          key={i}
          x={0}
          // Baseline to baseline. Left to the caller, in em of NOMINAL, rather
          // than derived from a cap-height constant: the right value depends on
          // which face is set and is judged by eye.
          dy={i === 0 ? 0 : line.lead}
          style={{
            fontSize: NOMINAL * (line.scale ?? 1),
            fontWeight: line.weight,
            // Set here and never inherited from an ancestor. An em length
            // computes where it is declared, so tracking declared upstream
            // against the lockup's font-size arrives at these glyphs as a fixed
            // pixel value -- against a nominal 100, 0.05em upstream came through
            // as 34.56px and measured the word at two and a half times its
            // width. Declared alongside this font-size, it resolves against it.
            letterSpacing: line.tracking ?? 0,
            whiteSpace: "pre",
          }}
        >
          {line.text}
        </tspan>
      ))}
    </text>
  );
}

export default function VideoWordmark({
  src,
  poster,
  lines = [],
  /* The letters are painted in this before the footage goes over them, and it
     is all that shows when there is no footage: reduced motion, a dead source,
     a refused autoplay. It is also half of what makes the mark legible -- see
     videoOpacity. */
  backingColor = "#FFFFFF",
  /* Just under 1. Clipping footage into letters means the letters ARE the
     footage, so wherever a frame goes dark the wordmark stops reading. The
     first defence against that is the face -- stems with enough width to carry
     a picture -- and this is only the last few percent of insurance, letting a
     trace of the backing through in the darkest passages. Drop it further and
     the clip starts looking washed out rather than legible. */
  videoOpacity = 0.92,
  /* False parks the decoder. The observer below only knows whether the element
     is in the viewport, which in a sticky hero stays true for several viewports
     of scrolling after the mark itself has faded out -- so the caller, which
     knows when that is, gets to say so. */
  active = true,
  autoPlay = true,
  loop = true,
  muted = true,
  className,
  style,
}) {
  const clipId = `nx-vwm-${useId().replace(/:/g, "")}`;
  const hostRef = useRef(null);
  const videoRef = useRef(null);
  const textRef = useRef(null);

  const [box, setBox] = useState(null);
  const [still, setStill] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [onScreen, setOnScreen] = useState(false);

  const label = lines.map((l) => l.text).join(" ");
  const shape = JSON.stringify(lines);

  /* Fit the frame to the lockup.
     Horizontally, getBBox is the right answer: it reports the laid-out advance
     box, tracking and side bearings included.
     Vertically it is not. On a <text> element it reports the FONT's box --
     full ascent and descent, whatever the glyphs actually use -- and an
     all-caps setting uses almost none of it. Anton reported 150 units for a
     lockup whose ink is 95: 44 units of accent space above the caps and a
     descender well below a line with no descenders in it. Left alone that
     padding pushes the mark off centre and eats the frame.
     So the vertical extent is composed from the real ink instead: each line's
     baseline read off the laid-out text, and its ink ascent and descent
     measured on a canvas with that line's own computed font. */
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

      let top = Infinity;
      let bottom = -Infinity;
      try {
        const ctx = document.createElement("canvas").getContext("2d");
        for (const span of node.querySelectorAll("tspan")) {
          const cs = getComputedStyle(span);
          ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
          const m = ctx.measureText(span.textContent);
          const baseline = span.getStartPositionOfChar(0).y;
          top = Math.min(top, baseline - m.actualBoundingBoxAscent);
          bottom = Math.max(bottom, baseline + m.actualBoundingBoxDescent);
        }
      } catch {
        // No ink metrics to be had; the font box is a worse fit but not a wrong
        // one, so fall back to it rather than dropping the mark.
        top = b.y;
        bottom = b.y + b.height;
      }
      if (!Number.isFinite(top) || !Number.isFinite(bottom) || bottom <= top) {
        top = b.y;
        bottom = b.y + b.height;
      }

      setBox((prev) => {
        const next = { x: b.x, y: top, w: b.width, h: bottom - top };
        // Fonts settle in stages; bail out of a no-op state write.
        if (prev && Math.abs(prev.w - next.w) < 0.5 && Math.abs(prev.h - next.h) < 0.5) return prev;
        return next;
      });
    };

    measure();
    // The first measurement lands against the fallback face. The display face
    // arrives a beat later and is a very different width, so measure again once
    // it has.
    document.fonts?.ready?.then(measure);

    return () => {
      cancelled = true;
    };
  }, [shape]);

  /* Reduced motion: no autoplaying footage. The lockup stays -- it is content. */
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
    if (!host) return;
    const io = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), {
      rootMargin: "120px",
    });
    io.observe(host);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || still) return;
    if (onScreen && active && autoPlay) {
      // Autoplay can be refused outright (a data-saver profile, an engine that
      // wants a gesture). Fall back rather than sit on a frozen frame.
      v.play().catch(() => setStill(true));
    } else {
      v.pause();
    }
  }, [onScreen, active, still, autoPlay]);

  // Right-to-left: shift the measured box to the origin, then scale it onto the
  // unit square that objectBoundingBox clipping expects.
  const fit = box ? `scale(${1 / box.w} ${1 / box.h}) translate(${-box.x} ${-box.y})` : null;

  return (
    <span
      ref={hostRef}
      className={className}
      role="img"
      aria-label={label}
      style={{
        display: "block",
        position: "relative",
        // The measured lockup, published in the parent's em. Height follows from
        // the viewBox, so the box is the glyphs and their leading and nothing
        // else.
        width: box ? `${(box.w / NOMINAL).toFixed(4)}em` : "100%",
        margin: "0 auto",
        ...style,
      }}
    >
      <svg
        viewBox={box ? `${box.x} ${box.y} ${box.w} ${box.h}` : `0 0 ${NOMINAL} ${NOMINAL}`}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
        focusable="false"
        style={{ display: "block", width: "100%", height: "auto", overflow: "visible" }}
      >
        {fit && (
          <defs>
            {/* The fit goes on the <text> itself. A wrapping <g> is not valid
                clipPath content -- the spec allows shapes, <text> and <use> --
                and an engine that follows it drops the group silently, leaving
                an empty clip and a video clipped to nothing. */}
            <clipPath id={clipId} clipPathUnits="objectBoundingBox">
              <Lines lines={lines} transform={fit} />
            </clipPath>
          </defs>
        )}

        {/* The measured copy, and the ground the footage is laid over. */}
        <Lines lines={lines} textRef={textRef} fill={backingColor} />
      </svg>

      {!still && box && (
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
          onPlaying={() => setPlaying(true)}
          onError={() => setStill(true)}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            clipPath: `url(#${clipId})`,
            WebkitClipPath: `url(#${clipId})`,
            // A lift on top of the backing: between them, the dark passages of
            // the clip stay well clear of the page's ground.
            filter: "brightness(1.18) contrast(1.04)",
            // Held back until it is genuinely running, so a first frame never
            // pops in over the backing.
            opacity: playing ? videoOpacity : 0,
            transition: "opacity 420ms ease",
            pointerEvents: "none",
          }}
        />
      )}
    </span>
  );
}
