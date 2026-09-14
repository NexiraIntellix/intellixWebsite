import { marqueeItems } from "../data.js";

/**
 * Legend strip.
 *
 * A plain word-scroller says nothing about the subject. A map legend is the
 * strip that tells you what the colours on a sheet mean, which is exactly the
 * job this row is doing -- naming the services and giving each one the colour it
 * carries elsewhere on the page. Same content, honest structure.
 *
 * Edges are masked rather than cut: a hard clip announces "this is a marquee",
 * a fade lets the strip read as continuous survey.
 */
export default function Marquee() {
  const items = marqueeItems.concat(marqueeItems);

  return (
    <div
      className="nx-legend"
      style={{
        position: "relative",
        padding: "18px 0 20px",
        borderTop: "1px solid var(--hairline)",
        borderBottom: "1px solid var(--hairline)",
        background: "linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.012))",
        overflow: "hidden",
      }}
    >
      {/* Ruler ticks. The strip reads as an instrument scale, not a banner. */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 7,
          backgroundImage:
            "repeating-linear-gradient(90deg, rgba(255,255,255,0.30) 0 1px, transparent 1px 13px)",
          maskImage: "linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)",
          WebkitMaskImage: "linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)",
        }}
      />

      <div
        className="nx-legend-track"
        style={{ display: "flex", width: "max-content", marginTop: 10 }}
      >
        {items.map((m, i) => (
          <span
            key={i}
            aria-hidden={i >= marqueeItems.length ? "true" : undefined}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 13,
              padding: "0 26px",
              fontFamily: "var(--display)",
              fontWeight: 700,
              fontSize: "clamp(17px,1.9vw,24px)",
              letterSpacing: "-0.02em",
              color: m.color,
              whiteSpace: "nowrap",
            }}
          >
            {/* Legend swatch: a keyed square, the way a sheet keys a layer. */}
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 3,
                background: m.dot,
                boxShadow: `0 0 14px ${m.dot}66`,
                flex: "none",
              }}
            />
            {m.label}
          </span>
        ))}
      </div>
    </div>
  );
}
