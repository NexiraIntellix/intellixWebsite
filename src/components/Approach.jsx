import { useMemo } from "react";
import { steps, layers } from "../data.js";
import { useSectionProgress } from "../hooks/useReveal.js";

const reduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The page's one orchestrated moment.
 *
 * The stack and the step list used to be strangers sharing a row: four static
 * planes on the right, four unrelated rows on the left. Now scrolling the
 * section separates the stack and walks the highlight down both at once, so the
 * diagram is showing the same thing the list is saying instead of decorating
 * beside it.
 *
 * The 01-04 numbering stays. Unlike the capabilities, this genuinely is a
 * sequence -- you cannot hand over before you deliver -- so the order is
 * information the reader needs.
 */
export default function Approach() {
  const [ref, p] = useSectionProgress();
  const calm = useMemo(reduced, []);

  // Assembled to separated across the middle of the section, so the motion
  // happens while the diagram is actually on screen rather than at its edges.
  const spread = calm ? 1 : Math.min(1, Math.max(0, (p - 0.16) / 0.46));
  const eased = spread * spread * (3 - 2 * spread);

  // Which step is being read. Held one index behind the spread so the highlight
  // lands after a layer has moved, not while it is still travelling.
  const walk = Math.min(1, Math.max(0, (p - 0.26) / 0.42));
  const activeStep = calm ? -1 : Math.min(steps.length - 1, Math.floor(walk * steps.length));

  return (
    <section
      id="stack"
      ref={ref}
      className="nx-full"
      style={{
        position: "relative",
        padding: "var(--nx-sec-pad, clamp(76px,10vh,124px)) 28px",
        borderTop: "1px solid var(--hairline)",
        background: "radial-gradient(900px 500px at 82% 10%,rgba(34,211,238,0.13),transparent 62%)",
      }}
    >
      <div style={{ maxWidth: 1240, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,380px),1fr))", gap: "clamp(40px,5vw,80px)", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0, fontFamily: "var(--display)", fontWeight: 700, fontSize: "clamp(28px,3.8vw,48px)", lineHeight: 1.04, letterSpacing: "-0.035em", color: "var(--text-strong)", textWrap: "balance" }}>
            Four layers, stacked in order
          </h2>
          <div className="nx-stack-steps">
            {steps.map((s, i) => {
              const on = i === activeStep;
              return (
                <div
                  key={s.n}
                  className={"nx-step" + (on ? " is-on" : "")}
                  style={{ "--step": s.color }}
                >
                  <span className="nx-step-n">{s.n}</span>
                  <div>
                    <div className="nx-step-title">{s.title}</div>
                    <div className="nx-step-body">{s.body}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* The size lives in CSS, not here. A plane tilted 52 degrees and turned
            38 projects to about 1.6x its own width and 1.4x its height, so at
            the phone column's 332px it painted 451px across -- off both edges
            of the frame -- and climbed 72px back into the last step card. An
            inline width cannot be answered by a media query, so the two
            measurements the breakpoint needs are classes now. */}
        <div aria-hidden="true" className="nx-stack-art">
          <div
            className="nx-stack-art-planes"
            style={{
              position: "relative",
              transformStyle: "preserve-3d",
              transform: `rotateX(52deg) rotateZ(${-38 + eased * 6}deg)`,
            }}
          >
            {layers.map((l, i) => {
              // layers run top-to-bottom, steps bottom-to-top
              const stepIndex = layers.length - 1 - i;
              const on = stepIndex === activeStep;
              return (
                <div
                  key={l.label}
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: 24,
                    border: `1px solid rgba(255,255,255,${on ? 0.55 : 0.22})`,
                    background: l.bg,
                    boxShadow: on
                      ? "0 34px 62px -22px rgba(0,0,0,0.95)"
                      : "0 24px 50px -24px rgba(0,0,0,0.9)",
                    transform: `translateZ(${(26 + l.z * eased * 1.62).toFixed(1)}px) scale(${on ? 1.045 : 1})`,
                    transition: "border-color 0.35s ease, box-shadow 0.35s ease, scale 0.35s ease",
                    display: "flex",
                    alignItems: "flex-end",
                    padding: 22,
                  }}
                >
                  <span style={{ fontFamily: "var(--display)", fontWeight: 700, fontSize: 20, letterSpacing: "-0.02em", color: "#06060D" }}>
                    {l.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
