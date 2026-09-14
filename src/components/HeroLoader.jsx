import { useProgress } from "@react-three/drei";

/**
 * Covers the hero until the MacBook is decoded and ready.
 *
 * Without it the first paint is an empty black canvas for as long as the 3.1MB
 * GLB plus the Draco decoder take — indistinguishable from a broken page. The
 * overlay stays mounted through a short fade after `active` clears so the model
 * never pops in mid-transition.
 */
export default function HeroLoader() {
  const { active, progress } = useProgress();
  const pct = Math.min(100, Math.round(progress));

  return (
    <div
      aria-hidden={!active}
      style={{
        position: "absolute",
        inset: 0,
        display: "grid",
        placeItems: "center",
        background: "var(--ink-2)",
        opacity: active ? 1 : 0,
        transition: "opacity 0.6s ease",
        pointerEvents: active ? "auto" : "none",
        zIndex: 3
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <div style={{ width: 180, height: 2, background: "rgba(255,255,255,0.09)", borderRadius: 2, overflow: "hidden" }}>
          <div
            style={{
              width: pct + "%",
              height: "100%",
              background: "linear-gradient(90deg,#C9722C,#E8873A)",
              transition: "width 0.25s ease"
            }}
          />
        </div>
        <span style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--muted)" }}>
          Loading {pct}%
        </span>
      </div>
    </div>
  );
}
