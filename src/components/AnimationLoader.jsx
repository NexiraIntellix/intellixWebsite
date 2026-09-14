import { useEffect, useRef, useState } from "react";
import { useProgress } from "@react-three/drei";
import { lockScroll, unlockScroll } from "../hooks/useLenis.js";
import BoldGlitchText from "./BoldGlitchText.jsx";

/**
 * The intro panel.
 *
 * Ported from the Framer marketplace "Animation loader". Its shape is kept
 * exactly: a 4px rule wiping across the middle, a house-sized 0-100 counter
 * set hard right, and, at the end, the whole panel collapsing to a 2px line
 * that rounds off and goes.
 *
 * The original's fourth element, a wordmark at the top left blurring in a
 * character at a time, is dropped -- the name is already the first thing the
 * hero says, and saying it twice in three seconds is not emphasis. Its slot is
 * held open so the rule keeps the height it was composed at.
 *
 * Two more things are not kept.
 *
 * The original counts to 100 on a three-second timer and its own help text
 * tells you to hand-match the counter duration to the transition duration so
 * the two stay in step. That is a progress bar that knows nothing about
 * progress -- on a cold connection it finishes long before the page does, and
 * on a warm cache it holds an already-ready page hostage for three seconds.
 * This one reads `useProgress`, which is already tracking the 3.1MB MacBook and
 * the Draco decoder, so the number is the actual number.
 *
 * The other is framer-motion. The original leans on it for variant sequencing
 * and layout animation; this project has no motion library, and adding one to
 * animate three properties would be the tail wagging the dog. Everything here
 * is a CSS transition and one rAF loop.
 *
 * Replaces the plain bar-and-percentage HeroLoader.
 */

/* A floor, not a duration. Real progress can arrive in one jump from a warm
   cache, and a counter that reads 0 then 100 with nothing in between reads as
   a glitch -- so the number is not allowed to climb faster than this, and the
   ease makes it sprint then settle the way the original's does. */
const MIN_MS = 3000;
const CREEP_TO = 92;
const CREEP_MS = 2600;
const FINISH_MS = 500;
const NO_LOAD_MS = 4500;

/* Matches the original's [.12,.23,.5,1] closely enough: fast off the mark,
   long tail into 100. */
const easeOut = (t) => 1 - Math.pow(1 - t, 2.6);


/* Once per page load. React can mount this twice -- StrictMode does it on
   every dev boot -- and a loader that plays a second time is a loader that
   looks broken. */
let played = false;

/* Set at import, which is before first paint: late enough and the browser has
   already scrolled you back to wherever you were. The hero IS the scroll
   timeline here -- restoring into the middle of it means the intro ends on a
   half-flown camera instead of on the laptop. */
if (typeof history !== "undefined" && "scrollRestoration" in history) {
  try {
    history.scrollRestoration = "manual";
  } catch {
    /* some embedders lock it; the scrollTo below still covers us */
  }
}

const CSS = `
/* Nothing moves while the panel is up. Lenis listens on window, so leaving the
   page scrollable means wheeling behind the loader and arriving somewhere
   other than the laptop when it lifts.

   The padding is not cosmetic. Hiding overflow takes the scrollbar away, and on
   any platform that draws a real one -- Windows, most desktop Linux -- the root
   content box then grows by its width. Body grows with it, the hero's 100%-wide
   canvas grows with that, and WebGL re-projects the scene into the new size; put
   the scrollbar back when the loader lifts and the laptop visibly jumps
   sideways and rescales. Reserving the same width as padding keeps every
   measurement identical across the lock, so nothing reflows at all. */
html.nx-al-locked, html.nx-al-locked body { overflow: hidden; }
html.nx-al-locked { padding-right: var(--nx-al-sbw, 0px); }

.nx-al {
  position: fixed;
  inset: 0;
  /* Over the header, which is fixed at 60. Scoped inside the hero it was
     underneath the nav. */
  z-index: 100;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: opacity 300ms ease 600ms;
}
.nx-al.is-out { opacity: 0; }

/* The collapse. Framer did it by dropping the wrapper from flex:1 to a fixed
   2px; height is the honest version of the same move and it is the one
   property a browser can actually interpolate. */
.nx-al-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  transition: height 700ms cubic-bezier(0.77, 0.02, 0.24, 1.02);
}
.nx-al.is-out .nx-al-wrap { height: 2px; }

/* Wider than the frame and bottom-anchored, so the radius at the end curves
   away off both edges instead of cutting corners into view. */
.nx-al-mask {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 120%;
  height: 100vh;
  height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  transition: border-radius 700ms cubic-bezier(0.77, 0.02, 0.24, 1.02);
}
.nx-al.is-out .nx-al-mask { border-radius: 50%; }

.nx-al-content {
  position: relative;
  z-index: 1;
  width: 83%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(18px, 3vw, 34px) clamp(20px, 3vw, 34px);
}

/* Unbounded 800: wide and geometric where the rest of the site is condensed,
   which is the point -- the loader is the one screen that should not look like
   the page behind it. Heavy enough that the glitch slices have real surface to
   cut, which Chakra Petch at 700 did not.

   Loaded in index.html alongside the Plex families and used nowhere else.
   The note that used to sit here warned against Syne, on the grounds that
   inline styles around the site named it and would be restyled. Those inline
   styles are gone -- every heading resolves through --display now -- so the
   warning no longer describes anything. */
.nx-al-horizontal-cut-wrapper {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.nx-al-half {
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: "Anton", "Bebas Neue", "Unbounded", sans-serif;
  font-weight: 900;
  font-size: clamp(52px, 14vw, 195px);
  line-height: 0.82;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
  user-select: none;
}

.nx-al-half-top {
  clip-path: inset(0 0 50% 0);
  margin-bottom: -0.32em;
}

.nx-al-half-bottom {
  clip-path: inset(50% 0 0 0);
  margin-top: -0.32em;
}

.nx-al-strip {
  position: relative;
  z-index: 10;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  margin: -0.85em 0;
}

.nx-al-strip-title {
  font-family: var(--display);
  font-weight: 800;
  font-size: clamp(14px, 3vw, 38px);
  letter-spacing: 0.4em;
  color: var(--a-6);
  text-transform: uppercase;
  white-space: nowrap;
  background: var(--ink-2);
  padding: 4px 20px 4px 28px;
  text-shadow: 0 0 22px rgba(232, 135, 58, 0.45);
}
.nx-al-word-a {
  position: relative;
  z-index: 2;
  color: var(--text-strong);
}
.nx-al-word-b { font: inherit; letter-spacing: inherit; }

@media (prefers-reduced-motion: reduce) {
  /* No collapse. The panel still has to leave, so it fades. */
  .nx-al-wrap, .nx-al-mask { transition: none; }
  .nx-al { transition: opacity 320ms ease; }
  .nx-al.is-out .nx-al-wrap { height: 100%; }
  .nx-al.is-out .nx-al-mask { border-radius: 0; }
}
`;

export default function AnimationLoader({
  background = "var(--ink-2)",
  textColor = "var(--text-strong)",
}) {
  const { active, progress } = useProgress();
  const [phase, setPhase] = useState(played ? "gone" : "in"); // in | out | gone
  const done = phase === "gone";

  // Read through refs inside the loop: rAF should not restart every time drei
  // nudges progress, and it must never close over a stale `active`.
  const state = useRef({ active, progress, shown: 0, sawActive: false, endAt: 0, endFrom: 0 });
  state.current.active = active;
  state.current.progress = progress;

  useEffect(() => {
    let raf = 0;
    const start = performance.now();

    const tick = (now) => {
      const s = state.current;
      const t = now - start;

      if (s.active) s.sawActive = true;
      // `active` is false for the frame or two before the GLB request is even
      // registered, so "not active" alone is not "finished".
      const loading = s.active || (!s.sawActive && t < NO_LOAD_MS);

      let target;
      if (loading) {
        s.endAt = 0;
        const creep = CREEP_TO * (1 - Math.exp(-t / CREEP_MS));
        // Capped at 99: the last point belongs to the moment loading actually
        // ends, or the counter reads 100 with the panel still up -- a hang.
        target = Math.min(99, Math.max(s.progress, creep));
      } else {
        if (!s.endAt) {
          s.endAt = now;
          s.endFrom = s.shown;
        }
        const k = easeOut(Math.min(1, (now - s.endAt) / FINISH_MS));
        target = s.endFrom + (100 - s.endFrom) * k;
      }

      // The floor. Monotonic, because a percentage that goes backwards is
      // worse than one that is wrong.
      const cap = easeOut(Math.min(1, t / MIN_MS)) * 100;
      const next = Math.max(s.shown, Math.min(target, cap));

      /* Kept in the ref only. Nothing renders the number any more, and as
         state this wrote a new value roughly sixty times a second -- a full
         re-render per frame, during the exact window the GLB is being decoded. */
      s.shown = next;

      if (next >= 99.999 && !loading) {
        setPhase("out");
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (phase !== "out") return;
    const t = setTimeout(() => {
      played = true;
      setPhase("gone");
    }, 950);
    return () => clearTimeout(t);
  }, [phase]);

  /* Pin the page to the top for as long as the panel is up, and land there
     when it lifts -- the intro hands over to the laptop, never to the middle
     of a section a reload happened to remember. */
  useEffect(() => {
    if (done) return;

    const html = document.documentElement;

    // Measured before the class goes on, while the scrollbar is still there.
    // Zero on overlay-scrollbar platforms, which is the correct no-op.
    const sbw = Math.max(0, window.innerWidth - html.clientWidth);
    html.style.setProperty("--nx-al-sbw", `${sbw}px`);

    // Two locks for two cases: the class stops native scrolling (reduced
    // motion, where Lenis is never created), lockScroll stops Lenis.
    html.classList.add("nx-al-locked");
    lockScroll();

    const toTop = () => window.scrollTo(0, 0);
    toTop();
    // A reload can restore scroll on `load`, after this effect has already run.
    window.addEventListener("load", toTop);

    return () => {
      html.classList.remove("nx-al-locked");
      html.style.removeProperty("--nx-al-sbw");
      window.removeEventListener("load", toTop);
      // After the class is off, so Lenis re-measures a scrollable page.
      unlockScroll({ toTop: true });
    };
  }, [done]);

  if (done) return null;

  const out = phase === "out";

  return (
    <div
      className={`nx-al${out ? " is-out" : ""}`}
      role="status"
      aria-label="Loading"
      style={{ pointerEvents: out ? "none" : "auto", color: textColor }}
    >
      <style>{CSS}</style>

      <div className="nx-al-wrap">
        <div className="nx-al-mask" style={{ background }}>
          <div className="nx-al-content" aria-hidden="true">
            <div className="nx-al-horizontal-cut-wrapper">
              <div className="nx-al-half nx-al-half-top">LOADING</div>

              <div className="nx-al-strip">
                <BoldGlitchText
                  className="nx-al-strip-title"
                  text="THE NEW ERA"
                  preset="editorial"
                  presetStrength={0.72}
                  presetSpeed={0.88}
                  color="var(--a-6)"
                  glitchColorA="#FF2D7A"
                  glitchColorB="#00E5FF"
                  glitchColorC="#FFE600"
                  live={!out}
                />
              </div>

              <div className="nx-al-half nx-al-half-bottom">LOADING</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
