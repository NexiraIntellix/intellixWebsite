import { useEffect, useRef, useState } from "react";
import Synthesis from "./Synthesis.jsx";

/* Contact details, taken from Nexira Spatial's own contact page rather than
 * invented here: this is its IT division, the two share a door, and the
 * address below was already inherited on that basis.
 *
 * Both values were read off the live site rather than typed from memory --
 * a wrong digit in a `tel:` link is a live link that dials a stranger, which
 * is why PHONE sat null until there was a real one to put in it. The Call
 * button is gated on it and appears on its own now that there is.
 *
 * NOTE: the footer still publishes hello@nexiraintellix.com. Two addresses on
 * one page is a decision, not an accident -- if only one is real, the other
 * should go.
 */
const EMAIL = "info@nexiraspatial.com";
const PHONE = "+91 7736459090";
const ADDRESS = [
  "Suite No 290B, Heiley Offices, Basement Floor,",
  "Pallath Square, North Kalamassery, Kochi, Kerala 683104",
];

/**
 * Let's connect.
 *
 * The statement, the address, and the two ways to start -- the construction
 * from Nexira Spatial's own contact page, so the two sites end the same way.
 *
 * The background is the supplied shader field, tuned warm. It is a third WebGL
 * context on this page, so it is parked unless the section is actually on
 * screen; the hero's two were found rendering off-screen for the whole length
 * of the page earlier in this build and that is not a mistake worth repeating.
 */
export default function Contact() {
  const ref = useRef(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setLive(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => setLive(entry.isIntersecting),
      { rootMargin: "150px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      id="contact"
      ref={ref}
      className="nx-full nx-connect"
      style={{ position: "relative", padding: "clamp(84px,12vh,148px) 28px", borderTop: "1px solid var(--hairline)", overflow: "clip" }}
    >
      <Synthesis live={live} />

      {/* The field is bright at its centre and the type sits on top of it, so
          the middle is dimmed rather than the whole panel -- a flat scrim would
          take the field back out again. */}
      <div className="nx-connect-scrim" aria-hidden="true" />

      <div className="nx-connect-inner">
        <h2 className="nx-connect-head">Let&apos;s connect</h2>

        <address className="nx-connect-address">
          {ADDRESS.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </address>

        {/* The value each button carries rides on the element as data, so the
            reveal can be pure CSS -- see .nx-connect-btn::after, which sets
            content: attr(data-reveal). Nothing here needs a hover handler, and
            the address is never rendered twice into the accessibility tree:
            generated content is not announced, and the label the button keeps
            is the one that describes the action. */}
        <div className="nx-connect-actions">
          <a className="nx-connect-btn" href={`mailto:${EMAIL}`} data-reveal={EMAIL}>
            <span className="nx-connect-btn-label">Email us</span>
          </a>
          {PHONE && (
            <a
              className="nx-connect-btn"
              href={`tel:${PHONE.replace(/\s+/g, "")}`}
              data-reveal={PHONE}
            >
              <span className="nx-connect-btn-label">Call us</span>
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
