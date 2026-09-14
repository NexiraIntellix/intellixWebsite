import { memo, useState, useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import ParticleField from "./three/ParticleField.jsx";

const FEATURES = [
  {
    title: "We build the dimensions your IT lives in.",
    subtitle: "Software, consultancy, analytics and training from the IT division of a geospatial engineering company.",
    highlight: "dimensions",
  },
  {
    title: "Seamless High-Performance Visualizations",
    subtitle: "Manipulate, inspect, and navigate complex geospatial models dynamically with near-zero latency.",
    highlight: "High-Performance",
  },
  {
    title: "Intelligent Layered Architecture",
    subtitle: "Scale your software ecosystem with cloud-native pipelines, real-time telemetry, and modular data layers.",
    highlight: "Layered",
  },
  {
    title: "Empowering the Next Digital Era",
    subtitle: "Software, consultancy, analytics, and specialized training engineered for tomorrow's spatial enterprise.",
    highlight: "Next Digital",
  },
];

const stageFor = (t) => Math.min(FEATURES.length - 1, Math.floor(t * FEATURES.length));

/**
 * The hero's second half: a scroll-driven point cloud behind the feature copy,
 * revealed once the camera finishes flying into the laptop display.
 *
 * `progressRef` carries this section's own 0->1 progress as a ref rather than a
 * prop. Scroll progress changes every frame, and as a prop it re-rendered this
 * whole subtree ~60 times a second for a value only the GPU consumes. As a ref,
 * the component renders four times across the entire section -- once per feature
 * -- and memo() below stops the parent's per-frame renders from reaching it.
 *
 * `visible` gates the render loop. Two live WebGL contexts competing for the GPU
 * through the whole hero is the kind of cost that does not show up until it is
 * on a phone, so the canvas that is not being looked at is parked.
 */
function ScreenPage({ width, height, scale, progressRef, visible }) {
  const [stage, setStage] = useState(0);
  const reducedMotion = useRef(
    typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ).current;

  /**
   * Stage is driven from a rAF loop reading the same ref, not from a prop, so
   * the copy swaps on its own schedule without the parent re-rendering it.
   */
  useEffect(() => {
    if (!visible) return;
    let raf = 0;
    const tick = () => {
      const p = Math.min(1, Math.max(0, progressRef.current || 0));
      const s = stageFor(p);
      setStage((prev) => (prev === s ? prev : s));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [progressRef, visible]);

  const feat = FEATURES[stage];
  const last = stage === FEATURES.length - 1;

  return (
    <div style={{ width, height, transform: "scale(" + scale + ")", transformOrigin: "top left" }}>
      <style>{`
        @keyframes nx-gradient-flow-screen {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes nx-screen-copy-in {
          from { opacity: 0; transform: translateY(16px); filter: blur(6px); }
          to   { opacity: 1; transform: translateY(0);    filter: blur(0); }
        }
        /* Was violet into cyan into lime -- three accents from the palette this
           project replaced, on the one word the headline emphasises. Same
           device, moved onto the ramp. */
        .nx-screen-gradient {
          background: linear-gradient(
            120deg,
            var(--text-strong) 0%,
            var(--a-8) 28%,
            var(--a-6) 55%,
            var(--a-7) 78%,
            var(--text-strong) 100%
          );
          background-size: 200% 200%;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: nx-gradient-flow-screen 4s ease infinite;
        }
        .nx-screen-copy > * {
          animation: nx-screen-copy-in 0.62s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .nx-screen-copy > *:nth-child(2) { animation-delay: 0.06s; }
        .nx-screen-copy > *:nth-child(3) { animation-delay: 0.12s; }

        /* These were two <span>s: rectangles with text in them. Nothing to
           click, nothing to tab to, no cursor change, no press -- a screen
           reader read them as a stray sentence. They are links now, and the
           states below are the rest of what makes a control feel like one:
           something under the pointer, something under the finger, and a
           focus ring for the keyboard. */
        .nx-screen-cta {
          margin-top: 36px;
          display: flex;
          flex-wrap: wrap;
          gap: 14px;
          justify-content: center;
        }
        .nx-screen-btn {
          display: inline-flex;
          align-items: center;
          padding: 16px 30px;
          border: 1px solid transparent;
          border-radius: 14px;
          font-family: var(--body);
          font-size: 16px;
          white-space: nowrap;
          text-decoration: none;
          cursor: pointer;
          transition:
            transform 0.22s cubic-bezier(.16, 1, .3, 1),
            box-shadow 0.22s ease,
            background 0.22s ease,
            border-color 0.22s ease,
            color 0.22s ease;
        }
        .nx-screen-btn:focus-visible {
          outline: 2px solid var(--a-7);
          outline-offset: 3px;
        }
        /* The lift is 1px. A button that jumps on hover reads as a toy; this
           is just enough to say the thing is live under the pointer. */
        .nx-screen-btn:hover { transform: translateY(-1px); }
        /* And the press has to land BELOW the rest position, or the click has
           no bottom to it. */
        .nx-screen-btn:active {
          transform: translateY(1px) scale(0.988);
          transition-duration: 0.06s;
        }

        .nx-screen-btn-primary {
          background: linear-gradient(100deg, var(--a-6), var(--a-8));
          color: var(--s-1);
          font-weight: 600;
          /* Sitting on its own shadow rather than lying flat on the field --
             the other half of why the old pair looked painted on. */
          box-shadow: 0 6px 18px color-mix(in srgb, var(--a-6) 26%, transparent);
        }
        /* The plate stays amber. Turning the whole button white on hover said
           far more than "the pointer is here" -- it read as a second, different
           button appearing. The colour is the brand; the hover is only the
           glow under it getting stronger. */
        .nx-screen-btn-primary:hover {
          box-shadow: 0 12px 28px color-mix(in srgb, var(--a-6) 40%, transparent);
        }
        .nx-screen-btn-primary:active {
          box-shadow: 0 3px 10px color-mix(in srgb, var(--a-6) 30%, transparent);
        }
        /* Stated, not inherited: these are anchors, so the global a:hover rule
           reaches them and would repaint the label mid-press. */
        .nx-screen-btn-primary,
        .nx-screen-btn-primary:hover,
        .nx-screen-btn-primary:active { color: var(--s-1); }

        .nx-screen-btn-ghost {
          border-color: rgba(255, 255, 255, 0.16);
          background: rgba(255, 255, 255, 0.02);
          font-weight: 500;
        }
        /* The outline button fills white and lights up, the way the pill on
           nexiraspatial.com does. Two shadows, not one: a tight ring that
           holds the pill's own shape, and a wide soft halo behind it. A plain
           drop shadow would only sit under the button -- what makes that
           reference read as a LIGHT is that the glow surrounds it evenly, so
           both are spread with no vertical offset.

           Both are blurred. A zero-blur spread -- 0 0 0 6px -- looked like the
           right way to seed the halo, but a shadow with no blur has a hard
           outer edge: it drew a second rounded rectangle a few pixels outside
           the button, which reads as a boundary rather than as light. Light
           has no edge, so neither can this.

           An earlier pass tried carrying this on the label alone. It could
           not: white type on a dark plate is already the brightest thing
           there, so there was nothing left to brighten to. The fill is what
           gives the hover somewhere to go, and the label inverts to the ground
           colour because that is the only way it survives the white. */
        .nx-screen-btn-ghost { color: var(--text-strong); }
        .nx-screen-btn-ghost:hover {
          background: #ffffff;
          border-color: #ffffff;
          color: var(--s-1);
          box-shadow:
            0 0 16px rgba(255, 255, 255, 0.30),
            0 0 52px 10px rgba(255, 255, 255, 0.34);
        }
        .nx-screen-btn-ghost:active {
          background: var(--text-strong);
          border-color: var(--text-strong);
          color: var(--s-1);
          box-shadow:
            0 0 10px rgba(255, 255, 255, 0.22),
            0 0 30px 4px rgba(255, 255, 255, 0.20);
        }

        /* On a phone the pair was set at desktop size -- 16px type in 30px of
           side padding -- which made "Start something" nearly as wide as the
           frame and pushed the two onto separate rows, stacked under the
           paragraph like a menu. Brought down they fit side by side again,
           which is what makes them read as one choice with a preferred half
           rather than two unrelated blocks. Still 44px tall: the padding comes
           off the sides, not the top. */
        @media (max-width: 640px) {
          .nx-screen-cta { margin-top: 26px; gap: 10px; }
          .nx-screen-btn {
            padding: 12px 18px;
            font-size: 14px;
            border-radius: 12px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .nx-screen-copy > * { animation: none; }
          .nx-screen-gradient { animation: none; }
          .nx-screen-btn, .nx-screen-btn:hover, .nx-screen-btn:active { transform: none; }
        }
      `}</style>
      <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", background: "var(--s-1)" }}>

        {/* Scroll-driven point cloud */}
        <div style={{ position: "absolute", inset: 0 }}>
          <Canvas
            frameloop={visible ? "always" : "never"}
            dpr={[1, 1.75]}
            gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
            camera={{ position: [0, 0.55, 3.15], fov: 42, near: 0.1, far: 20 }}
          >
            <ParticleField progressRef={progressRef} reducedMotion={reducedMotion} />
          </Canvas>
        </div>

        {/* Copy scrim.
            A centred ellipse was the obvious move and the wrong one -- it put
            its darkest point exactly where the cloud resolves, hiding the
            effect to protect the text. A horizontal band does the same job for
            legibility while leaving the globe's upper and lower arcs clear. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to bottom, transparent 0%, " +
              "color-mix(in srgb, var(--s-1) 62%, transparent) 22%, " +
              "color-mix(in srgb, var(--s-1) 80%, transparent) 46%, " +
              "color-mix(in srgb, var(--s-1) 62%, transparent) 72%, transparent 100%)",
            pointerEvents: "none",
          }}
        />
        {/* Edge vignette, so the field dissolves rather than ending at the frame. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse 74% 68% at 50% 50%, transparent 55%, color-mix(in srgb, var(--s-1) 72%, transparent) 100%)",
            pointerEvents: "none",
          }}
        />

        {/* Feature copy */}
        <div key={stage} className="nx-screen-copy" style={{ position: "relative", zIndex: 10, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 clamp(20px, 8%, 96px)",
          /* Optically centred, not geometrically. The fixed bar covers the top
             of this box, so centring in the full height put the copy about
             40px above the middle of the space it actually has. Padding the
             top by the bar's own height moves the centre down by half of it,
             which is exactly the error. --nx-header-h is measured and
             published by Header.jsx; the fallback is its desktop value. */
          paddingTop: "var(--nx-header-h, 79px)" }}>
          {/* clamp, not a bare vw: at 4.8vw this h1 rendered at 19px on a
              393px phone while every other heading on the site uses clamp(). */}
          <h1 style={{ margin: 0, fontFamily: "var(--display)", fontWeight: 700, fontSize: "clamp(30px, 4.8vw, 68px)", lineHeight: 1.02, letterSpacing: "-0.015em", color: "#ffffff", textWrap: "balance" }}>
            {feat.title.includes(feat.highlight) ? (
              <>
                {feat.title.split(feat.highlight)[0]}
                <span className="nx-screen-gradient">{feat.highlight}</span>
                {feat.title.split(feat.highlight)[1]}
              </>
            ) : (
              feat.title
            )}
          </h1>
          <p style={{ margin: "20px 0 0", maxWidth: "58ch", fontSize: "clamp(15px, 1.3vw, 17px)", lineHeight: 1.6, color: "rgba(255,255,255,0.75)", textWrap: "pretty" }}>
            {feat.subtitle}
          </p>
          {/* The ask, and only at the end of the argument.
              It used to be on all four stages, which meant it arrived with the
              first line -- before the section has said anything worth acting
              on, and while the laptop is still dissolving into the page. It is
              the last panel's business now.

              Absent rather than hidden. It was hidden, on the theory that
              keeping its box stopped the headline shifting when the copy
              swapped -- but the panels swap by remounting on `key`, so every
              stage animates in from scratch and there was no continuity to
              protect. All the reserved box did was hold 90-odd pixels of
              nothing below the paragraph on three panels out of four, which
              this block then centred around: the copy sat visibly high on
              exactly the stages where nothing was there to balance it. */}
          {last && (
          <div className="nx-screen-cta">
            <a href="#contact" className="nx-screen-btn nx-screen-btn-primary">Start something</a>
            <a href="#work" className="nx-screen-btn nx-screen-btn-ghost">See programs</a>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(ScreenPage);
