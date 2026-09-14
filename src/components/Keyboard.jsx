import { keyboardRows } from "../data.js";

const speaker = {
  width: "9%",
  borderRadius: "0.22em",
  background: "repeating-linear-gradient(90deg,rgba(255,255,255,0.05) 0 1px,transparent 1px 3px)"
};

export default function Keyboard({ radius, glowAlpha, glowGap, glowHeight, opacity }) {
  return (
    <div style={{ position: "relative", width: "100%", opacity }}>
      <div style={{ height: "0.9em", borderRadius: "0 0 " + radius + " " + radius, background: "linear-gradient(180deg,#26263A,#15151F)" }} />
      <div
        style={{
          position: "relative",
          borderRadius: "0 0 " + radius + " " + radius,
          background: "linear-gradient(180deg,#1E1E2C,#101018)",
          padding: "0.5em",
          boxShadow: "0 26px 46px -22px rgba(0,0,0,0.95)",
          display: "flex",
          gap: "0.5em",
          alignItems: "stretch"
        }}
      >
        <div style={speaker} />
        <div style={{ flex: 1, display: "grid", gap: "0.2em" }}>
          {keyboardRows.map((row, ri) => (
            <div key={ri} style={{ display: "flex", gap: "0.2em" }}>
              {row.keys.map((k, ki) => (
                <div
                  key={ki}
                  style={{
                    flex: k.flex,
                    height: row.h,
                    borderRadius: "0.22em",
                    background: "linear-gradient(180deg,#15151F,#0A0A11)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    boxShadow: "inset 0 -1px 0 rgba(0,0,0,0.6)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: k.justify,
                    padding: "0 0.35em",
                    fontSize: row.fs,
                    color: "#7E7C9A",
                    overflow: "hidden",
                    whiteSpace: "nowrap"
                  }}
                >
                  {k.label}
                </div>
              ))}
            </div>
          ))}
          <div
            style={{
              margin: "0.2em auto 0",
              width: "38%",
              height: "2.1em",
              borderRadius: "0.22em",
              background: "linear-gradient(180deg,#191926,#0E0E16)",
              border: "1px solid rgba(255,255,255,0.08)"
            }}
          />
        </div>
        <div style={speaker} />
      </div>
      <div style={{ margin: "0 auto", width: "56%", height: "0.35em", borderRadius: "0 0 " + radius + " " + radius, background: "linear-gradient(180deg,#141420,#0A0A11)" }} />
      <div
        style={{
          margin: glowGap + " auto 0",
          width: "120%",
          height: glowHeight,
          borderRadius: "50%",
          background: "radial-gradient(ellipse,rgba(232, 135, 58," + glowAlpha + "),transparent 70%)",
          filter: "blur(16px)"
        }}
      />
    </div>
  );
}
