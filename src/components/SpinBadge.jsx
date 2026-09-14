import { useEffect, useRef, useState } from "react";

/**
 * Text set around a circle, turning slowly, faster under the cursor.
 *
 * Ported from the Framer "CircularSpinText" module. The placement maths is kept
 * exactly: each character sits at 360/n * i degrees, at sin/-cos of that angle
 * times the radius, then rotated by the same angle so it faces outward. That
 * spaces glyphs evenly around the circle regardless of their own widths, which
 * is what makes a ring of type read as a ring rather than as a wobble.
 *
 * The rotation is not kept. Framer drives it with a linear tween it restarts on
 * every hover, passing the current angle in as `from` so the jump is hidden.
 * Without framer-motion the same trick in CSS is a real jump -- changing
 * animation-duration mid-animation snaps the element. So this keeps an angle
 * and an angular VELOCITY, and damps the velocity toward its target: hovering
 * accelerates the ring instead of restarting it, and the whole thing runs on
 * the same 0.075 lerp as the camera and the wordmark next door.
 *
 * It is a link, not an ornament. The ring names the parent company, so it goes
 * where the footer already points.
 */

/** Degrees per second. 18 is the module's 20s-per-revolution default. */
const BASE_SPEED = 18;
/** Its `speedUp` hover mode is spinDuration / 4. */
const HOVER_SPEED = 72;

/* Two laps of the name on a wide screen, one on a narrow one.
 *
 * The count is not decoration: 34 characters around a 36px radius leaves 6.6px
 * of arc each, which at any readable size is letters touching. Halving the
 * text is what lets the badge shrink to a size that suits a phone without the
 * ring turning into a grey smudge -- 17 characters on that radius get 13px of
 * arc apiece, more room than the desktop ring gives its own. */
const TEXT_WIDE = "NEXIRA SPATIAL • NEXIRA SPATIAL • ";
const TEXT_COMPACT = "NEXIRA SPATIAL • ";

/* Matches the CSS breakpoint that resizes the badge -- see .nx-spin-slot. */
const COMPACT_QUERY = "(max-width: 900px)";

export default function SpinBadge({
  href = "https://www.nexiraspatial.com/",
  /* The box is sized in CSS (--nx-spin-size), not here: the slot's placement
     has to subtract the badge's own height to keep it clear of the nav on a
     short window, and that number cannot live in two files. Only the radius
     the letters are laid on is a JS concern -- CSS cannot place them. */
  radius = 55,
  compactRadius = 36,
}) {
  const ringRef = useRef(null);
  const hovering = useRef(false);
  const [compact, setCompact] = useState(
    () => typeof window !== "undefined" && window.matchMedia(COMPACT_QUERY).matches
  );

  /* Re-read on change, so a rotated phone or a dragged window gets the ring
     that belongs to the size it is actually showing. */
  useEffect(() => {
    const mq = window.matchMedia(COMPACT_QUERY);
    const sync = () => setCompact(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const ring = ringRef.current;
    if (!ring) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // A ring of type that never turns is still a ring of type.
      return;
    }

    let raf = 0;
    let onScreen = true;
    const io = new IntersectionObserver(([e]) => (onScreen = e.isIntersecting), {
      rootMargin: "20%",
    });
    io.observe(ring);

    let angle = 0;
    let speed = BASE_SPEED;
    let last = performance.now();

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      if (!onScreen) return;

      const target = hovering.current ? HOVER_SPEED : BASE_SPEED;
      // Same damping constant as the hero's camera and wordmark.
      speed += (target - speed) * (1 - Math.pow(1 - 0.075, dt * 60));

      angle = (angle + speed * dt) % 360;
      ring.style.transform = `rotate(${angle.toFixed(2)}deg)`;
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, []);

  const letters = Array.from(compact ? TEXT_COMPACT : TEXT_WIDE);
  const r = compact ? compactRadius : radius;

  return (
    <a
      className="nx-spin"
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label="Nexira Spatial — the parent company. Opens in a new tab."
      onMouseEnter={() => (hovering.current = true)}
      onMouseLeave={() => (hovering.current = false)}
      onFocus={() => (hovering.current = true)}
      onBlur={() => (hovering.current = false)}
    >
      <span className="nx-spin-ring" ref={ringRef} aria-hidden="true">
        {letters.map((ch, i) => {
          const deg = (360 / letters.length) * i;
          const rad = (deg * Math.PI) / 180;
          return (
            <span
              key={i}
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                transform:
                  `translate(-50%, -50%) ` +
                  `translate(${(Math.sin(rad) * r).toFixed(2)}px, ${(-Math.cos(rad) * r).toFixed(2)}px) ` +
                  `rotate(${deg.toFixed(2)}deg)`,
              }}
            >
              {ch}
            </span>
          );
        })}
      </span>
      <span className="nx-spin-hub" aria-hidden="true">↗</span>
    </a>
  );
}
