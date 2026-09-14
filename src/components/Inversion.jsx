import { useEffect, useRef } from "react";

/**
 * The aperture.
 *
 * A circle rises from below the frame, centres, and opens until it fills the
 * screen. Inside it the page is inverted -- light ground, dark type -- and
 * because the same statement is drawn twice in exact register, the words
 * themselves appear to flip as the edge sweeps over them.
 *
 * It does not close again. Reversing it would make the whole section undo
 * itself, which reads as a mistake being corrected rather than as a move being
 * made; the panel simply holds, then scrolls away as the sticky stage
 * releases.
 *
 * Everything is one custom property written per frame. Drawing the statement
 * twice is the whole trick, so the copies must never diverge -- they are one
 * constant rendered by one function.
 */
const HEAD = "Working output, not status reports.";
const SUB =
  "Weekly checkpoints you can open and run — from the first audit through to handover.";

function Statement({ hidden }) {
  return (
    <div className="nx-invert-copy" aria-hidden={hidden || undefined}>
      <p className="nx-invert-head">{HEAD}</p>
      <p className="nx-invert-sub">{SUB}</p>
    </div>
  );
}

export default function Inversion() {
  const ref = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => {
    const el = ref.current;
    const panel = panelRef.current;
    if (!el || !panel) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // No sweep. The statement is content, so it stays -- shown open rather
      // than animated, on the same inverted ground it would have ended on.
      panel.style.clipPath = "circle(150% at 50% 50%)";
      return;
    }

    let frame = 0;
    const measure = () => {
      frame = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;

      /* Off screen: draw nothing.
       *
       * This used to write clip-path every scroll frame for the life of the
       * page. A circle() on a viewport-sized panel is a full repaint of that
       * panel, and the browser still does it while the panel is just outside
       * the window -- which is why scrolling the sections either side of this
       * one ran at 30fps while the far ones ran at 60. Skipping the write
       * leaves the last value in place, which is the open state this section
       * ends on anyway. */
      const visible = r.top < vh && r.bottom > 0;
      if (!visible) {
        if (document.documentElement.classList.contains("nx-inverted")) {
          document.documentElement.classList.remove("nx-inverted");
        }
        return;
      }

      const span = Math.max(1, r.height - vh);
      const p = Math.min(1, Math.max(0, -r.top / span));

      // rise 0->0.30, open 0.30->0.66, hold 0.66->1
      const rise = Math.min(1, Math.max(0, p / 0.30));
      const open = Math.min(1, Math.max(0, (p - 0.30) / 0.36));

      const ease = (t) => t * t * (3 - 2 * t);

      // Travels from below the frame to centre while still small.
      const cy = 128 - 78 * ease(rise);
      // 72, not 128. A centred circle covers the frame once its radius passes
      // the half-diagonal -- about 59vmax at 16:10 -- so everything above that
      // is off-screen growth that costs scroll and shows nothing. Ending just
      // past the threshold spends almost the whole phase on the part where the
      // edge is actually visible, which is the effect.
      const rad = 9 + 63 * ease(open);

      panel.style.clipPath = `circle(${rad.toFixed(2)}vmax at 50% ${cy.toFixed(2)}%)`;

      /* The white already reaches behind the header -- the sticky stage starts
         at top:0 -- so what cut it was the header painting its own dark bar on
         top. Flag the moment the circle actually reaches the top edge and let
         the header invert with it, rather than guessing at a scroll value that
         would drift the first time these phases are retuned. */
      const vmax = Math.max(window.innerWidth, window.innerHeight);
      const reachesTop = (rad / 100) * vmax >= (cy / 100) * vh;
      // Visibility is already established above -- we returned early otherwise.
      // It matters here because progress clamps to 1 once the section is behind
      // you, so the radius test alone stayed true forever and left the nav in
      // dark ink over the dark section below, invisible.
      document.documentElement.classList.toggle("nx-inverted", reachesTop);
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
      document.documentElement.classList.remove("nx-inverted");
    };
  }, []);

  return (
    <section id="delivery" ref={ref} className="nx-invert">
      <div className="nx-invert-stage">
        {/* Base: the page as it already is. Carries the real, readable copy. */}
        <div className="nx-invert-base">
          <Statement />
        </div>

        {/* Inverted duplicate, clipped to the aperture. Hidden from the
            accessibility tree -- it is the same sentence, and announcing it
            twice is the cost of an effect nobody using a screen reader sees. */}
        <div ref={panelRef} className="nx-invert-panel">
          <Statement hidden />
        </div>
      </div>
    </section>
  );
}
