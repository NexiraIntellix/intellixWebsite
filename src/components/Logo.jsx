export default function Logo({ size = 32, fontSize = 18, showIcon = false }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 12, color: "var(--text)" }}>
      {showIcon && (
        <span
          style={{
            width: size,
            height: size,
            borderRadius: size * 0.31,
            background: "conic-gradient(from 210deg,var(--a-5),var(--a-6),var(--a-4),var(--a-7),var(--a-5))",
            display: "grid",
            placeItems: "center",
            fontFamily: "var(--display)",
            fontWeight: 800,
            fontSize: size * 0.44,
            color: "var(--ink)"
          }}
        >
          N
        </span>
      )}
      {/* 700, not 800: the display face tops out there, and a synthesised
          bold fattens every glyph and closes the gaps.
          The word gap is a real space plus a small margin: the space keeps the
          name copyable and readable to a screen reader, the margin stops it
          collapsing to nothing the way it did when the display face changed
          under a negative tracking value. */}
      <span style={{ fontFamily: "var(--display)", fontWeight: 700, fontSize, letterSpacing: "0", whiteSpace: "nowrap" }}>
        NEXIRA{" "}
        <span style={{ color: "var(--accent)", marginLeft: "0.06em" }}>INTELLIX</span>
      </span>
    </span>
  );
}
