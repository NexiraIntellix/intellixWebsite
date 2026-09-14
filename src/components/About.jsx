import { useEffect, useRef } from "react";
import ContourField from "./ContourField.jsx";

/**
 * The statement, revealed a word at a time as the section crosses the screen.
 *
 * Written as one sentence rather than a heading plus body: the reveal is the
 * structure here, and a heading above it would just be a thing to read before
 * the thing you are meant to read. The h2 is present for the document outline
 * and for screen readers, which get the whole statement at once regardless of
 * where the page happens to be scrolled.
 */
const STATEMENT =
  "We're the IT division of Nexira Spatial — building the software, analytics and training that carry spatial work past the survey and into systems your team can actually run.";

const WORDS = STATEMENT.split(" ");

export default function About() {
  const ref = useRef(null);
  const sayRef = useRef(null);

  /**
   * The reveal is one CSS custom property, written straight to the node.
   *
   * Not React state: this changes on essentially every scroll frame, and as
   * state it would re-render thirty-odd spans each time for a value only CSS
   * consumes. Each word then computes its own opacity from `--reveal` and its
   * own index, so the whole effect costs one property write per frame.
   */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.style.setProperty("--reveal", "1");
      return;
    }

    let frame = 0;
    const measure = () => {
      frame = 0;
      const say = sayRef.current;
      if (!say) return;

      const r = say.getBoundingClientRect();
      const vh = window.innerHeight || 1;

      /* Off screen: leave `--reveal` where it is. It is an inherited custom
       * property, so every write invalidates this whole subtree -- the contour
       * field included -- and there is no reason to pay that for a sentence
       * nobody can see. The value it holds is already the right one at either
       * end of the section. */
      if (r.bottom < -vh * 0.5 || r.top > vh * 1.5) return;

      /* Measured on the sentence, not on the section.
       *
       * It used to scrub against the section's own box, which worked while the
       * section was only as tall as its contents. The section is a full window
       * now and centres what is inside it, so the same sums put the finish line
       * most of a screen below the last word: you could scroll the statement
       * clean past the middle of the display with a third of it still unlit.
       *
       * Anchoring to the sentence makes the window mean something you can see.
       * It opens with the first line near the foot of the screen and closes as
       * the last line settles just below the middle -- which, for a section
       * that centres its content, is exactly where the statement comes to
       * rest. The sentence finishes lighting at the moment it finishes
       * arriving, however tall the section around it happens to be. */
      const from = vh * 0.88;
      const to = vh * 0.62;
      const t = (from - r.top) / Math.max(1, from - to + r.height);

      el.style.setProperty("--reveal", Math.min(1, Math.max(0, t)).toFixed(3));
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
    };
  }, []);

  return (
    <section
      id="about"
      ref={ref}
      className="nx-about nx-full"
      style={{ "--n": WORDS.length }}
    >
      <div aria-hidden="true" className="nx-about-bg">
        <ContourField tint="34,211,238" opacity={0.42} offsetY={6.8} height={640} />
      </div>

      <div className="nx-about-inner">
        <h2 className="nx-about-head">About us</h2>

        <p className="nx-about-say" ref={sayRef}>
          {WORDS.map((w, i) => (
            <span key={i} style={{ "--i": i }}>
              {w}
              {i < WORDS.length - 1 ? " " : ""}
            </span>
          ))}
        </p>

        <dl className="nx-about-facts">
          <dt>Parent</dt>
          <dd>
            <a href="https://www.nexiraspatial.com/" target="_blank" rel="noreferrer">
              Nexira Spatial <span aria-hidden="true">↗</span>
            </a>
          </dd>
        </dl>
      </div>
    </section>
  );
}
