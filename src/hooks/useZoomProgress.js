import { useEffect, useRef, useState } from "react";

/**
 * Tracks scroll progress (0 -> 1) through a tall sticky section and
 * keeps viewport dimensions in state so the 3D scene can be sized in px.
 */
export default function useZoomProgress() {
  const ref = useRef(null);
  const [state, setState] = useState({ p: 0, exit: 0, vw: 1440, vh: 900 });

  useEffect(() => {
    let frame = 0;

    const measure = () => {
      frame = 0;
      const el = ref.current;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let p = 0;
      // How far the hero has scrolled out of frame, 0 while it still fills the
      // viewport and 1 once it is gone. `p` cannot express this: it saturates at
      // 1 the moment the sticky panel reaches its last frame and stays there for
      // the rest of the page, so it cannot tell "end of hero" from "far past it".
      let exit = 0;
      if (el) {
        const rect = el.getBoundingClientRect();
        const span = Math.max(1, el.offsetHeight - vh);
        p = Math.min(1, Math.max(0, -rect.top / span));
        exit = Math.min(1, Math.max(0, 1 - rect.bottom / Math.max(1, vh)));
      }
      setState((prev) =>
        Math.abs(p - prev.p) > 0.002 ||
        Math.abs(exit - prev.exit) > 0.004 ||
        vw !== prev.vw ||
        vh !== prev.vh
          ? { p, exit, vw, vh }
          : prev
      );
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

  return [ref, state];
}

export const fade = (p, a, b) => Math.min(1, Math.max(0, (p - a) / (b - a)));
export const easeInOut = (t) =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
