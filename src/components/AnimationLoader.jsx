import { useEffect, useRef, useState } from "react";
import { useProgress } from "@react-three/drei";
import { lockScroll, unlockScroll } from "../hooks/useLenis.js";
import LaptopLineLoader from "@/components/ui/laptop-line-loader";

/**
 * The intro panel.
 *
 * The face of it is the hero laptop drawn in lines, stroke by stroke, as the
 * page loads -- traced in the pose and place the real 3D laptop occupies, so
 * the drawing completes exactly where the model is revealed (see
 * components/ui/laptop-line-loader). The exit is a crossfade, not a wipe:
 * the dark ground goes first, so for a moment the finished lines sit over the
 * real laptop they were drawn from, and then the lines go too.
 *
 * Two things from that Framer original are not kept.
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
   a glitch -- so the number is not allowed to climb faster than this.
   The loader is now a line drawing that builds with this number, so the floor
   is set by how long the drawing needs to read as drawn rather than flashed:
   5.5s, on an ease that starts and ends gently instead of sprinting off the
   mark. A slow connection is not held back by it -- real loading taking
   longer than the floor still decides when it ends. */
const MIN_MS = 5500;
const CREEP_TO = 92;
const CREEP_MS = 4200;
const FINISH_MS = 1100;
const NO_LOAD_MS = 4500;
/* The finished drawing holds this long before the crossfade starts. */
const HOLD_MS = 650;

/* Matches the original's [.12,.23,.5,1] closely enough: fast off the mark,
   long tail into 100. */
const easeOut = (t) => 1 - Math.pow(1 - t, 2.6);
const easeInOut = (t) => 0.5 - 0.5 * Math.cos(Math.PI * t);


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
  /* Second half of the crossfade: the lines go once the ground has. */
  transition: opacity 520ms ease 380ms;
}
.nx-al.is-out { opacity: 0; }

.nx-al-wrap {
  position: relative;
  width: 100%;
  height: 100%;
}

/* The ground. It fades first, on its own, so for a moment the finished
   drawing sits directly over the real laptop it was traced from.
   100vh and not dvh: the hero canvas is 100vh, and the drawing is placed in
   units of this box's height -- on a phone the two differ by the URL bar. */
.nx-al-mask {
  position: absolute;
  inset: 0;
  height: 100vh;
  transition: background-color 420ms ease;
}
.nx-al.is-out .nx-al-mask { background-color: transparent !important; }
/* The caption shares its spot with the hero's "Scroll to enter" cue, so it
   leaves before the ground does rather than printing over it. */
.nx-al .nx-ll-caption { transition: opacity 160ms ease; }
.nx-al.is-out .nx-ll-caption { opacity: 0; }

.nx-al-field {
  position: absolute;
  inset: 0;
}

@media (prefers-reduced-motion: reduce) {
  /* One plain fade, no staging. */
  .nx-al-mask { transition: none; }
  .nx-al { transition: opacity 320ms ease; }
}
`;

export default function AnimationLoader({
  background = "var(--ink-2)",
  textColor = "var(--text-strong)",
}) {
  const { active, progress } = useProgress();
  const [reducedMotion] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  const [phase, setPhase] = useState(played ? "gone" : "in"); // in | out | gone
  const done = phase === "gone";

  // Read through refs inside the loop: rAF should not restart every time drei
  // nudges progress, and it must never close over a stale `active`.
  const state = useRef({ active, progress, shown: 0, sawActive: false, endAt: 0, endFrom: 0, doneAt: 0 });
  state.current.active = active;
  state.current.progress = progress;

  useEffect(() => {
    let raf = 0;
    /* The loader's own clock, advanced by rendered frames rather than read off
       the wall. The page stalls while it loads -- over a second and a half on
       a cold dev server -- and on wall time the drawing would come out of that
       stall already a quarter drawn, jumping to catch up. Capping each step
       means a stall pauses the drawing instead of skipping part of it. */
    let clock = 0;
    let last = 0;

    const tick = (now) => {
      const s = state.current;
      clock += last ? Math.min(50, now - last) : 0;
      last = now;
      const t = clock;

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
          s.endAt = clock;
          s.endFrom = s.shown;
        }
        const k = easeInOut(Math.min(1, (clock - s.endAt) / FINISH_MS));
        target = s.endFrom + (100 - s.endFrom) * k;
      }

      // The floor. Monotonic, because a percentage that goes backwards is
      // worse than one that is wrong.
      const cap = easeInOut(Math.min(1, t / MIN_MS)) * 100;
      const next = Math.max(s.shown, Math.min(target, cap));

      /* Kept in the ref only. Nothing renders the number any more, and as
         state this wrote a new value roughly sixty times a second -- a full
         re-render per frame, during the exact window the GLB is being decoded. */
      s.shown = next;

      if (next >= 99.999 && !loading) {
        if (!s.doneAt) s.doneAt = clock;
        if (clock - s.doneAt >= HOLD_MS) {
          setPhase("out");
          return;
        }
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
          <div className="nx-al-field" aria-hidden="true">
            {/* Reads the same smoothed, monotonic number that decides when the
                panel lifts, so the drawing completes exactly as it goes. */}
            <LaptopLineLoader
              getProgress={() => state.current.shown / 100}
              reducedMotion={reducedMotion}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
