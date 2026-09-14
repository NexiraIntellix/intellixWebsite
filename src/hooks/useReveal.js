import { useEffect, useRef, useState } from "react";

const reduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Fires once when an element first enters view.
 *
 * IntersectionObserver rather than scroll maths: it runs off the main thread,
 * and a reveal that never un-reveals has no reason to keep recomputing. Under
 * prefers-reduced-motion it reports visible immediately, so the content is
 * present rather than animated in.
 */
export function useReveal({ threshold = 0.18, rootMargin = "0px 0px -8% 0px" } = {}) {
  const ref = useRef(null);
  const [shown, setShown] = useState(() => reduced());

  useEffect(() => {
    if (reduced()) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold, rootMargin }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold, rootMargin]);

  return [ref, shown];
}

/**
 * Progress of an element through the viewport, 0 as its top reaches the bottom
 * of the screen and 1 as its bottom leaves the top.
 *
 * Used for scroll-scrubbed sequences rather than one-shot reveals. Reads are
 * batched into a single rAF per scroll burst -- getBoundingClientRect on every
 * scroll event forces layout and is exactly how a smooth page starts stuttering.
 */
export function useSectionProgress() {
  const ref = useRef(null);
  const [p, setP] = useState(0);

  useEffect(() => {
    let frame = 0;

    const measure = () => {
      frame = 0;
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const span = rect.height + vh;
      const next = Math.min(1, Math.max(0, (vh - rect.top) / span));
      setP((prev) => (Math.abs(next - prev) > 0.004 ? next : prev));
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

  return [ref, p];
}
