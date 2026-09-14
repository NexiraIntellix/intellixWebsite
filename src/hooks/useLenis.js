import { useEffect } from "react";
import Lenis from "lenis";

/**
 * Smooth scrolling for the whole page.
 *
 * The hero's camera is driven directly by scroll position, so raw wheel input —
 * which arrives in coarse, uneven jumps — makes the push-in feel stepped no
 * matter how much the camera itself is eased. Lenis interpolates the scroll
 * position itself, which is the part that was actually jumping.
 *
 * Disabled under prefers-reduced-motion: hijacking scroll is exactly what that
 * setting is asking us not to do.
 */
/**
 * The live instance, so an overlay can hold the page still.
 *
 * `overflow: hidden` on the root is not enough on its own: it stops a *user*
 * from scrolling, but Lenis moves the page by calling window.scrollTo, which
 * is programmatic and walks straight through it. Anything that needs the page
 * to stay put has to say so here.
 */
let instance = null;
let wantLocked = false;

export function lockScroll() {
  wantLocked = true;
  // May be null: child effects run before the parent's, so an overlay can lock
  // before Lenis exists. The flag is picked up when it is created.
  instance?.stop();
}

export function unlockScroll({ toTop = false } = {}) {
  wantLocked = false;
  if (toTop) {
    // Lenis holds its own animated scroll value. Moving the window without
    // telling it just means it eases back to where it thought it was.
    instance?.scrollTo(0, { immediate: true, force: true });
    window.scrollTo(0, 0);
  }
  instance?.resize();
  instance?.start();
}

export default function useLenis() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
      duration: 0.75,
      easing: (t) => 1 - Math.pow(1 - t, 3),
      smoothWheel: true,
      smoothTouch: false
    });

    instance = lenis;
    if (wantLocked) lenis.stop();

    /* Section snapping was here and has been removed.
     *
     * It waited 150ms after the scroll went quiet, then eased to the nearest
     * `.nx-full` top if you had settled within 30% of a viewport of one.
     * Measured, that meant the page moved on its own every time you stopped
     * near a boundary -- 31px at one sample, 53px backwards at another. A
     * viewport that pulls you somewhere after you have decided to stop is the
     * scroll bug being reported, and pulling you BACKWARDS is the worst form
     * of it: you scrolled down, you stopped, and the page went up.
     *
     * It could not be cancelled properly either. The escape hatch listened for
     * `wheel` and `touchstart` only, so a keyboard PageDown or a scrollbar drag
     * never cleared a pending snap; and clearing the guard flag did not abort
     * an animation already running, so the snap kept easing toward its target
     * while the user scrolled against it.
     *
     * Smoothing is kept -- that is what the hero camera needs, and it does not
     * take control away. Deciding where to stop stays with the reader.
     */

    let frame = requestAnimationFrame(function raf(time) {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    });

    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
      instance = null;
    };
  }, []);
}
