import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Logo from "./Logo.jsx";

/** Nav destinations, in page order. The scroll spy walks this same list. */
const LINKS = [
  { id: "about", label: "About" },
  { id: "work", label: "Capabilities" },
  { id: "stack", label: "Approach" },
  { id: "skills", label: "Skills" },
];

/* What the scroll spy can name, which is more than the nav links to. Contact
   has no link -- the CTA is its way in -- but the section label still has to
   say where you are once you reach it, or it goes on reading "Skills" through
   the whole of the contact section. On phones that label is the only nav. */
const SPY = [...LINKS, { id: "contact", label: "Contact" }];

/* Shown before the first section is reached: the hero and its panels. */
const TOP_LABEL = "Overview";

/**
 * Desktop: a full-width bar over the hero -- wordmark left, links and a filled
 * CTA right -- that morphs into a centred pill with the same links as the
 * hero leaves. The morph used to jump, for two reasons, and both are gone:
 *
 *   - Content changed mid-animation (the links swapped out for a section
 *     label). Now every link stays, and each label is rendered in BOTH type
 *     styles stacked in one grid cell and crossfaded, so no element changes
 *     size when the style does.
 *   - The target width was measured on the live element while its padding and
 *     gap were themselves mid-transition, so it measured the wrong size.
 *     It is measured on an off-screen clone instead.
 *
 * Phones (<=720px): wordmark + Contact over the hero, then a small island
 * with the N badge and the section name -- all the links cannot fit there.
 *
 * Three signals drive it, kept separate so they cannot disagree:
 *   navOpacity — appears once the hero hands off
 *   solid      — the hero leaving: deepens the desktop glass, and on phones
 *                switches bar to island
 *   active     — which section owns the middle of the viewport
 */
export default function Header({ navOpacity = 0, solid = 0 }) {
  const barRef = useRef(null);
  const innerRef = useRef(null);
  const linksRef = useRef(null);
  const itemRefs = useRef({});
  const [active, setActive] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [pill, setPill] = useState({ left: 0, width: 0, on: false });
  const [phone, setPhone] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 720px)").matches
  );

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 720px)");
    const sync = () => setPhone(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Past the hero: phones collapse to the badge-and-label island, desktop to
  // the centred pill. One threshold, two presentations.
  const past = solid > 0.5;
  const island = phone && past;
  const pillMode = !phone && past;
  const compact = island || pillMode;

  /**
   * Scroll spy: the last linked section whose top has passed the middle of the
   * viewport.
   *
   * An IntersectionObserver band cannot express this. The page has a section
   * with no nav destination -- the aperture, between About and Capabilities --
   * and while that one owned the band nothing intersected, so there was no
   * active section and the island showed an empty label. "Which is the last one
   * I have reached" always answers, and answers with exactly one.
   */
  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const mid = (window.scrollY || 0) + window.innerHeight * 0.5;
      let found = null;
      for (const l of SPY) {
        const el = document.getElementById(l.id);
        if (el && el.offsetTop <= mid) found = l.id;
      }
      setActive((prev) => (prev === found ? prev : found));
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

  /**
   * Animate the island between its intrinsic widths.
   *
   * This is the part that was snapping. The collapse went from `width: 100%` to
   * `width: fit-content`, and an intrinsic keyword is not an interpolable
   * value -- there is no midpoint between "all of it" and "as much as the
   * contents need" -- so the browser jumps straight to the end and the
   * transition never runs at all.
   *
   * So: measure what the intrinsic width actually resolves to, and animate
   * between two plain pixel lengths, which do interpolate. Measurement happens
   * on the real element with transitions suspended; the previous width is then
   * restored and flushed before the new one is set, because without that flush
   * the browser coalesces both writes into a single frame and there is still
   * nothing to animate between.
   */
  useLayoutEffect(() => {
    const el = innerRef.current;
    const header = barRef.current;
    if (!el || !header) return;

    /* The compact width, read off a hidden copy: the live element's padding
       and gap are transitioning too, so measured in place it reports a size
       somewhere between the two states. The copy carries the same attributes,
       so it lays out exactly as the compact bar will once it arrives. */
    const compactWidth = () => {
      const copy = el.cloneNode(true);
      copy.style.cssText += ";position:absolute;visibility:hidden;pointer-events:none;transition:none;width:max-content;";
      header.appendChild(copy);
      const w = copy.getBoundingClientRect().width;
      copy.remove();
      return w;
    };

    const from = el.getBoundingClientRect().width;
    const to = compact ? compactWidth() : header.clientWidth;

    const settle = () => {
      // Full width hands control back to CSS so it follows the window.
      if (!compact) el.style.width = "";
    };

    if (Math.abs(to - from) < 0.5) {
      el.style.width = compact ? `${to}px` : "";
      return;
    }

    // Pin the current width, flush it as a real frame, then set the target so
    // the transition has two concrete pixel lengths to run between.
    el.style.width = `${from}px`;
    void el.offsetWidth;
    el.style.width = `${to}px`;

    const onEnd = (e) => {
      if (e.target === el && e.propertyName === "width") settle();
    };
    el.addEventListener("transitionend", onEnd);

    /* Resizing mid-pill: re-fit without animating. */
    const onResize = () => {
      if (!compact) return;
      el.style.transition = "none";
      el.style.width = `${compactWidth()}px`;
      void el.offsetWidth;
      el.style.transition = "";
    };
    window.addEventListener("resize", onResize);
    return () => {
      el.removeEventListener("transitionend", onEnd);
      window.removeEventListener("resize", onResize);
    };
  }, [compact, expanded, active]);

  /**
   * Position the indicator under the active link. Measured from the DOM, not
   * computed from an index: the labels differ in width and the gap is a
   * clamp(), so arithmetic here would drift with the type scale.
   */
  useEffect(() => {
    const move = () => {
      const box = linksRef.current;
      const el = active ? itemRefs.current[active] : null;
      if (!box || !el) {
        setPill((p) => ({ ...p, on: false }));
        return;
      }
      const b = box.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      if (b.width === 0 || r.width === 0) {
        setPill((p) => ({ ...p, on: false }));
        return;
      }
      setPill({ left: r.left - b.left - 10, width: r.width + 20, on: true });
    };
    move();

    /* A ResizeObserver on the row catches everything that changes its
       geometry -- the expand, keyboard focus, a viewport resize, a late webfont
       reflowing the labels -- so the pill never sits under the wrong link
       waiting for a scroll to correct it. */
    let ro;
    if (typeof ResizeObserver !== "undefined" && linksRef.current) {
      ro = new ResizeObserver(move);
      ro.observe(linksRef.current);
    }
    window.addEventListener("resize", move);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", move);
    };
  }, [active, solid, expanded]);

  const current = SPY.find((l) => l.id === active);

  /**
   * Publish the bar's height as --nx-header-h.
   *
   * The bar is fixed, so anything centred in a full viewport is centred behind
   * it and reads high by half its height. The one place that matters is the
   * point-cloud panel's copy, which sits in a 100vh box of its own -- it needs
   * the number, and a constant would be wrong the moment this bar's padding or
   * type scale changes. Measured, it cannot drift.
   */
  useLayoutEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const publish = () => {
      document.documentElement.style.setProperty(
        "--nx-header-h",
        `${Math.round(bar.getBoundingClientRect().height)}px`
      );
    };
    publish();
    const ro = new ResizeObserver(publish);
    ro.observe(bar);
    return () => ro.disconnect();
  }, []);

  // Hover and focus both expand. Focus is held in state rather than left to
  // :focus-within, because the width measurement above has to know about it.
  const onBlur = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setExpanded(false);
  };

  return (
    <header
      ref={barRef}
      className="nx-header"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 60,
        opacity: navOpacity,
        pointerEvents: navOpacity > 0.5 ? "auto" : "none",
        transition: "opacity 0.25s linear",
      }}
    >
      {/* Soft-edged glass, for the stretch over the particle hero. A
          backdrop-filter ends at its own box, so a blurred bar always shows a
          hard bottom edge however the fill is graded; masking fades the blur
          out with the tint. Retired as the island takes over -- an island has
          its own edge and needs no mask. */}
      <div
        aria-hidden="true"
        className="nx-head-glass"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          opacity: 1 - solid,
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          background:
            "linear-gradient(to bottom, rgba(14, 20, 24,0.60) 0%, rgba(14, 20, 24,0.24) 52%, rgba(14, 20, 24,0) 100%)",
          maskImage: "linear-gradient(to bottom, #000 0%, #000 46%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, #000 0%, #000 46%, transparent 100%)",
        }}
      />

      <div
        ref={innerRef}
        className="nx-header-inner"
        data-island={island || undefined}
        data-pill={pillMode || undefined}
        data-expanded={island && expanded ? "true" : undefined}
        style={{ "--island": solid }}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        onFocus={() => setExpanded(true)}
        onBlur={onBlur}
      >
        {/* Every form of the mark is rendered; CSS picks. The inline wordmark
            is the bar's, the stacked one the desktop pill's -- the two share a
            grid cell and crossfade. The N badge is the phone island's. The
            aria-label keeps the link's name the full name whichever shows. */}
        <a href="#top" className="nx-head-mark" aria-label="Nexira IntelliX" style={{ display: "inline-flex" }}>
          <span className="nx-mark-stack">
            <span className="nx-mark-bar">
              <Logo showIcon size={26} />
            </span>
            <span className="nx-mark-pill" aria-hidden="true">
              NEXIRA<span>INTELLIX</span>
            </span>
          </span>
        </a>

        <nav className="nx-nav">
          {/* Label and links share one slot. Whichever is not showing is taken
              out of flow rather than out of the document, so it can fade rather
              than pop -- and so the row still measures to exactly the one that
              is visible, which is what the width animation reads. */}
          <span className="nx-nav-swap">
            {/* Not a link: it names where you already are, and a link to the
                place you are standing is a dead control. */}
            <span className="nx-nav-current" aria-hidden="true">
              <i />
              {current ? current.label : TOP_LABEL}
            </span>

            <span className="nx-nav-links" ref={linksRef}>
              <span
                aria-hidden="true"
                className="nx-nav-pill"
                style={{
                  transform: `translateX(${pill.left}px)`,
                  width: pill.width,
                  opacity: pill.on ? 1 : 0,
                }}
              />
              {LINKS.map((l) => (
                <a
                  key={l.id}
                  href={`#${l.id}`}
                  ref={(el) => (itemRefs.current[l.id] = el)}
                  aria-current={active === l.id ? "true" : undefined}
                  className="nx-nav-link"
                >
                  {/* Both type styles, stacked and crossfaded, so the link is
                      the same size in the bar and in the pill. */}
                  <span className="nx-lbl-bar">{l.label}</span>
                  <span className="nx-lbl-pill" aria-hidden="true">
                    {l.label}
                  </span>
                </a>
              ))}
            </span>
          </span>

          <a href="#contact" className="nx-head-cta" aria-label="Contact">
            {/* The bar's label and the pill's share a cell and crossfade. At
                320px "Start something" cannot coexist with the wordmark at any
                legible type size, so phones that narrow get the short one. */}
            <span className="nx-cta-stack">
              <span className="nx-cta-long">Start something</span>
              <span className="nx-cta-pill">Contact us</span>
            </span>
            <span className="nx-cta-short">Contact</span>
          </a>
        </nav>
      </div>
    </header>
  );
}
