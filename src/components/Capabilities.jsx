import { useMemo } from "react";
import { capabilities } from "../data.js";
import { buildProfile } from "../lib/contours.js";
import { useReveal } from "../hooks/useReveal.js";

/** Profile box, in its own user units. Stretched to the card by the viewBox. */
const PROF_W = 300;
const PROF_H = 58;

/** First stop of each chip gradient, as a solid colour for the trace.
 *  Reads the token rather than a literal, since that is what the chips are
 *  written in now -- matching /#[0-9a-f]{6}/ found nothing and every trace
 *  fell back to the same single colour. */
function chipColor(chip) {
  const t = /var\(\s*(--[\w-]+)\s*\)/.exec(chip);
  return t ? `var(${t[1]})` : "var(--a-6)";
}

/**
 * Capabilities.
 *
 * The card each capability gets is drawn from the page's own system rather
 * than borrowed: this company surveys ground, and a survey is drawn twice --
 * in plan, which is the contour field already running behind the lower page,
 * and in section, which is the profile line along the foot of every card here.
 * Each one is a real cut through the same height field as the hero's point
 * cloud, taken at a different offset, so no two cards carry the same ground and
 * none of it is decoration invented for the occasion.
 *
 * The trace plots itself left to right on reveal, staggered down the grid, the
 * way a pen plotter lays a section down. That is the whole of the motion: one
 * gesture, once, on arrival. Hover lifts the card and brings the line up to
 * full strength.
 *
 * Layout is sized to the count. Seven divides by neither two nor three, so the
 * first card runs double-width and the column count is chosen per breakpoint to
 * land on a whole number of rows -- 4 rows at two columns, 3 at three, 2 at
 * four. No row ever ends on a hole.
 */
export default function Capabilities() {
  const [ref, shown] = useReveal();

  // Eighty-five noise samples a card. Cheap enough to do up front, and the
  // result is static -- there is nothing to recompute on a render.
  const cards = useMemo(
    () =>
      capabilities.map((c, i) => {
        const line = buildProfile({
          width: PROF_W,
          height: PROF_H,
          offsetY: 3.1 + i * 2.3,
          offsetX: 8.4 + i * 0.7,
        });
        return {
          ...c,
          line,
          // Same trace, closed down to the baseline: the tint under a section.
          area: `${line}L${PROF_W} ${PROF_H}L0 ${PROF_H}Z`,
          trace: chipColor(c.chip),
        };
      }),
    []
  );

  return (
    <section id="work" ref={ref} className="nx-full" style={{ position: "relative", padding: "clamp(76px,10vh,124px) 28px" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", width: "100%" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "clamp(20px,4vw,52px)", flexWrap: "wrap" }}>
          <h2 style={{ flex: 1, minWidth: 320, margin: 0, fontFamily: "var(--display)", fontWeight: 700, fontSize: "clamp(30px,4.2vw,54px)", lineHeight: 1.02, letterSpacing: "-0.035em", color: "var(--text-strong)", textWrap: "balance" }}>
            Seven capabilities, one accountable team
          </h2>
          <p style={{ flex: 1, minWidth: 300, margin: 0, fontSize: 16.5, lineHeight: 1.62, color: "var(--muted)", textWrap: "pretty" }}>
            From a two-week audit to a multi-quarter build, and from one workshop to a full institutional cohort. Whoever scopes your work delivers it.
          </p>
        </div>

        {/* is-live starts the plot. Held until the section is actually on
            screen, or the traces draw themselves to an empty room. */}
        <div className={"nx-cards" + (shown ? " is-live" : "")}>
          {cards.map((c, i) => (
            <article
              key={c.title}
              className="nx-cap"
              style={{ "--trace": c.trace, "--i": i }}
            >
              <h3 className="nx-cap-title">{c.title}</h3>
              <p className="nx-cap-body">{c.body}</p>

              {/* The ground the card stands on. preserveAspectRatio is off so
                  the cut spans the full card width whatever that width is;
                  non-scaling-stroke keeps the line 1.6px through the stretch. */}
              <svg
                className="nx-cap-ground"
                viewBox={`0 0 ${PROF_W} ${PROF_H}`}
                preserveAspectRatio="none"
                aria-hidden="true"
                focusable="false"
              >
                <path className="nx-cap-area" d={c.area} />
                <path className="nx-cap-trace" d={c.line} pathLength="1" />
              </svg>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
