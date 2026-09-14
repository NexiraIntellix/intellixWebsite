import { fade, easeInOut } from "../hooks/useZoomProgress.js";
import Keyboard from "./Keyboard.jsx";
import ScreenPage from "./ScreenPage.jsx";

const DECK_DEG = 90;
const CAMERA_TILT_MAX = 21;
const DESK_TILT = 76;

/**
 * Scroll-driven hero: closed laptop resting on a desk -> lid opens on its
 * hinge -> camera flies into the display until the screen IS the page at 1:1.
 *
 * The laptop base is flat (DECK_DEG = 90); a camera-tilt wrapper around it
 * is what reads as "looking down at a table," unwinding to 0 as the zoom
 * lands so the final frame is dead flat. The desk itself is a separate,
 * self-contained perspective plane (its own DESK_TILT) anchored just under
 * the laptop's front edge — decoupling it from the laptop's own rig avoids
 * compounding two independent rotations, which made the desk's projected
 * position unpredictable. It's only shown during the early "resting on the
 * table" beat, before the lid finishes opening, since it's tuned to align
 * with the laptop only while the rig's camera tilt is still near its max.
 *
 * All geometry is derived from startW so the scene stays proportional.
 */
export default function LaptopZoomHero({ sectionRef, p, vw, vh, widthRatio = 0.44 }) {
  const ratio = Number.isFinite(widthRatio) && widthRatio >= 0.2 ? widthRatio : 0.44;
  const startW = Math.max(320, Math.min(vw * ratio, 760));
  const startH = startW * 0.625;
  const deckDepth = startW * 0.6;
  const target = Math.max(1.2, Math.max(vw / startW, vh / startH) * 1.02);

  const open = fade(p, 0.02, 0.32);
  const openE = easeInOut(open);
  const zoomE = fade(p, 0.36, 0.9);
  const zoom = Math.pow(target, zoomE);
  const camTilt = CAMERA_TILT_MAX * (1 - easeInOut(fade(p, 0.02, 0.5)));

  const px = (n) => n.toFixed(2) + "px";
  const anchorY = startH * 0.34 * openE - startH * 0.12 * (1 - openE);

  const deskOpacity = 1 - fade(p, 0.08, 0.24);
  const keyboardOpacity = openE * (1 - fade(p, 0.62, 0.93));

  return (
    <section ref={sectionRef} id="top" style={{ position: "relative", height: "340vh" }}>
      <div style={{ position: "sticky", top: 0, height: "100vh", overflow: "hidden", background: "linear-gradient(135deg, #12003E 0%, #1A0050 18%, #0A1245 38%, #081830 56%, #0C2040 72%, #160838 86%, #200A4A 100%)" }}>

        {/* ── BASE GRADIENT: Large vivid color mesh blobs ── */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          {/* Violet mega-blob — top-right */}
          <div style={{
            position: "absolute", top: "-20%", right: "-10%",
            width: "70vw", height: "70vw", borderRadius: "50%",
            background: "radial-gradient(circle, rgba(232, 135, 58,0.75) 0%, rgba(100,50,255,0.45) 35%, rgba(80,20,200,0.2) 62%, transparent 78%)",
            filter: "blur(40px)",
            animation: "nx-orb-a 22s ease-in-out infinite"
          }} />
          {/* Cyan mega-blob — bottom-left */}
          <div style={{
            position: "absolute", bottom: "-15%", left: "-8%",
            width: "60vw", height: "60vw", borderRadius: "50%",
            background: "radial-gradient(circle, rgba(232, 135, 58,0.65) 0%, rgba(0,160,200,0.38) 40%, rgba(0,100,160,0.15) 65%, transparent 80%)",
            filter: "blur(44px)",
            animation: "nx-orb-b 28s ease-in-out infinite"
          }} />
          {/* Magenta blob — bottom-right */}
          <div style={{
            position: "absolute", bottom: "5%", right: "-5%",
            width: "42vw", height: "42vw", borderRadius: "50%",
            background: "radial-gradient(circle, rgba(173, 92, 30,0.55) 0%, rgba(200,40,120,0.3) 45%, transparent 70%)",
            filter: "blur(50px)",
            animation: "nx-orb-c 34s ease-in-out infinite"
          }} />
          {/* Lime accent — mid-left */}
          <div style={{
            position: "absolute", top: "35%", left: "5%",
            width: "30vw", height: "30vw", borderRadius: "50%",
            background: "radial-gradient(circle, rgba(240, 164, 104,0.4) 0%, rgba(120,220,20,0.18) 50%, transparent 72%)",
            filter: "blur(46px)",
            animation: "nx-orb-a 26s ease-in-out infinite reverse"
          }} />
          {/* Periwinkle centre glow — pulls focus to laptop */}
          <div style={{
            position: "absolute", top: "20%", left: "30%",
            width: "40vw", height: "40vw", borderRadius: "50%",
            background: "radial-gradient(circle, rgba(78, 159, 184,0.35) 0%, rgba(100,120,255,0.15) 50%, transparent 72%)",
            filter: "blur(38px)",
            animation: "nx-orb-b 18s ease-in-out infinite reverse"
          }} />
        </div>

        {/* ── DIAGONAL SWEEP GRADIENT overlay ── */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "linear-gradient(115deg, rgba(232, 135, 58,0.18) 0%, transparent 35%, rgba(232, 135, 58,0.14) 65%, transparent 100%)",
          animation: "nx-aurora 16s ease-in-out infinite"
        }} />

        {/* ── DOT-MATRIX GRID (brighter now that base is colored) ── */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: "radial-gradient(circle, rgba(200,180,255,0.45) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          animation: "nx-grid-shimmer 9s ease-in-out infinite",
          maskImage: "radial-gradient(ellipse 85% 80% at 50% 48%, black 25%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse 85% 80% at 50% 48%, black 25%, transparent 75%)"
        }} />

        {/* ── AURORA SWEEP BANDS ── */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
          <div style={{
            position: "absolute", top: "8%", left: "-10%", width: "120%", height: "14%",
            background: "linear-gradient(90deg, transparent 0%, rgba(232, 135, 58,0.38) 22%, rgba(232, 135, 58,0.44) 50%, rgba(240, 164, 104,0.28) 74%, transparent 100%)",
            filter: "blur(18px)",
            animation: "nx-aurora 13s ease-in-out infinite"
          }} />
          <div style={{
            position: "absolute", top: "30%", left: "-5%", width: "110%", height: "10%",
            background: "linear-gradient(90deg, transparent 0%, rgba(173, 92, 30,0.32) 28%, rgba(232, 135, 58,0.38) 54%, rgba(232, 135, 58,0.3) 78%, transparent 100%)",
            filter: "blur(22px)",
            animation: "nx-aurora-2 20s ease-in-out infinite"
          }} />
          <div style={{
            position: "absolute", top: "62%", left: "-8%", width: "116%", height: "9%",
            background: "linear-gradient(90deg, transparent 0%, rgba(232, 135, 58,0.26) 30%, rgba(240, 164, 104,0.28) 58%, rgba(173, 92, 30,0.22) 80%, transparent 100%)",
            filter: "blur(18px)",
            animation: "nx-aurora 25s ease-in-out infinite reverse"
          }} />
        </div>

        {/* ── FLOATING SPARK PARTICLES ── */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 1 - fade(p, 0.36, 0.72) }}>
          {[
            { top:"10%", left:"16%", c:"rgba(240, 164, 104,1)",    s:3,   d:3.2 },
            { top:"20%", left:"72%", c:"rgba(232, 135, 58,1)",    s:3,   d:5.8 },
            { top:"36%", left:"6%",  c:"rgba(173, 92, 30,1)",    s:2.5, d:8.1 },
            { top:"53%", left:"86%", c:"rgba(232, 135, 58,1)",    s:3.5, d:2.6 },
            { top:"67%", left:"40%", c:"rgba(232, 135, 58,1)",    s:2.5, d:7.3 },
            { top:"78%", left:"60%", c:"rgba(240, 164, 104,0.9)",  s:3,   d:4.5 },
            { top:"6%",  left:"48%", c:"rgba(173, 92, 30,0.9)",  s:2.5, d:11.2},
            { top:"46%", left:"28%", c:"rgba(78, 159, 184,1)",   s:2,   d:6.7 },
            { top:"70%", left:"13%", c:"rgba(232, 135, 58,0.95)", s:2.5, d:9.4 },
            { top:"28%", left:"93%", c:"rgba(232, 135, 58,0.95)", s:3,   d:3.9 },
          ].map((sp, i) => (
            <div key={i} style={{
              position: "absolute", top: sp.top, left: sp.left,
              width: sp.s + "px", height: sp.s + "px", borderRadius: "50%",
              background: sp.c,
              boxShadow: "0 0 " + (sp.s * 5) + "px " + (sp.s * 2) + "px " + sp.c,
              animation: "nx-spark " + sp.d + "s ease-in-out infinite",
              animationDelay: (i * 0.6) + "s"
            }} />
          ))}
        </div>

        {/* ── VIGNETTE: light edge-darken, keeps laptop as focal point ── */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none",
          background: "radial-gradient(ellipse 70% 75% at 50% 46%, transparent 20%, rgba(4,2,20,0.55) 100%)"
        }} />
        {/* Bottom fade to match rest of site */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "30%", pointerEvents: "none",
          background: "linear-gradient(180deg, transparent 0%, rgba(14, 20, 24,0.65) 60%, #05050B 100%)"
        }} />

        {/* zoom stage */}
        <div style={{ position: "absolute", inset: 0, transform: "scale(" + zoom.toFixed(4) + ")", transformOrigin: "50% 50%", willChange: "transform" }}>
          {/* desk surface: its own small perspective context, anchored just below the laptop's front edge */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "calc(50% + " + px(anchorY + deckDepth * 0.33) + ")",
              width: px(startW * 3.2),
              height: px(startW * 1.5),
              marginLeft: px(-startW * 1.6),
              perspective: px(startW * 1.7),
              perspectiveOrigin: "50% 0%",
              opacity: deskOpacity,
              pointerEvents: "none"
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                transform: "rotateX(" + DESK_TILT + "deg)",
                transformOrigin: "top center",
                background:
                  "linear-gradient(180deg, rgba(40,36,60,0.96) 0%, rgba(21, 31, 38,0.98) 45%, rgba(9,8,16,1) 100%)",
                boxShadow: "inset 0 " + px(startW * 0.01) + " 0 rgba(255,255,255,0.05)"
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: "50%",
                  width: "62%",
                  height: "40%",
                  marginLeft: "-31%",
                  background: "radial-gradient(ellipse at 50% 0%, rgba(232, 135, 58,0.18), transparent 72%)"
                }}
              />
              <div
                style={{
                  position: "absolute",
                  top: "-4%",
                  left: "50%",
                  width: px(startW * 1.3),
                  height: px(startW * 0.5),
                  marginLeft: px(-startW * 0.65),
                  borderRadius: "50%",
                  background: "radial-gradient(ellipse, rgba(0,0,0,0.62), rgba(0,0,0,0.3) 55%, transparent 75%)",
                  filter: "blur(" + px(startW * 0.022) + ")"
                }}
              />
            </div>
          </div>

          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translateX(-50%) translateY(" + px(anchorY) + ") rotateX(" + camTilt.toFixed(2) + "deg)",
              perspective: px(startW * 2.6),
              perspectiveOrigin: "50% 20%",
              transformStyle: "preserve-3d"
            }}
          >
            {/* laptop base + hinge + lid */}
            <div
              style={{
                position: "relative",
                left: "50%",
                width: px(startW * 1.06),
                height: px(deckDepth),
                marginLeft: px(-startW * 0.53),
                display: "flex",
                flexDirection: "column",
                transform: "rotateX(-" + DECK_DEG + "deg)",
                transformOrigin: "center top",
                transformStyle: "preserve-3d",
                fontSize: px(startW * 0.024),
                borderRadius: "0 0 " + px(startW * 0.02) + " " + px(startW * 0.02),
                background: "linear-gradient(180deg,#26263A 0%,#181824 80%,#101018 100%)",
                boxShadow: "0 " + px(startW * 0.05) + " " + px(startW * 0.1) + " -" + px(startW * 0.04) + " rgba(0,0,0,0.9)"
              }}
            >
              {/* lid */}
              <div
                style={{
                  position: "absolute",
                  bottom: "100%",
                  left: "50%",
                  marginLeft: px(-startW / 2),
                  width: px(startW),
                  height: px(startH),
                  borderRadius: px(startW * 0.018),
                  padding: px(Math.max(1, startW * 0.014)),
                  background: "linear-gradient(160deg,#2A2A3D,#12121C)",
                  boxShadow: "0 " + px(startW * 0.06) + " " + px(startW * 0.12) + " -" + px(startW * 0.05) + " rgba(0,0,0,0.95)",
                  transform: "rotateX(" + (180 - (180 - DECK_DEG) * openE).toFixed(2) + "deg)",
                  transformOrigin: "center bottom",
                  transformStyle: "preserve-3d"
                }}
              >
                <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: px(startW * 0.012), overflow: "hidden", background: "var(--ink)" }}>
                  <ScreenPage width={vw + "px"} height={vh + "px"} scale={(startW / vw).toFixed(5)} />
                  <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "linear-gradient(118deg,rgba(255,255,255,0.14),transparent 34%,transparent 66%,rgba(255,255,255,0.06))", opacity: 0.45 * (1 - fade(p, 0.34, 0.72)) }} />
                  {/* closed-lid shell */}
                  <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "linear-gradient(150deg,#24243A,#0E0E16 62%,#1A1A2A)", opacity: 1 - fade(p, 0.02, 0.13), pointerEvents: "none" }}>
                    <span style={{ width: "14%", aspectRatio: "1/1", borderRadius: "22%", background: "conic-gradient(from 210deg,#C9722C,#E8873A,#AD5C1E,#F0A468,#C9722C)", opacity: 0.55 }} />
                  </div>
                </div>
                <div style={{ position: "absolute", top: px(startW * 0.0055), left: "50%", transform: "translateX(-50%)", width: px(startW * 0.0055), height: px(startW * 0.0055), borderRadius: "50%", background: "#3A3A52" }} />
              </div>

              {/* deck top surface: keyboard toward the hinge, palm rest + trackpad toward the front edge */}
              <div style={{ position: "relative", flex: "0 0 auto", opacity: keyboardOpacity, padding: "0 " + px(startW * 0.02) }}>
                <Keyboard
                  radius={px(startW * 0.014)}
                  glowAlpha={(0.18 + 0.28 * openE).toFixed(3)}
                  glowGap={px(startW * 0.012)}
                  glowHeight={px(startW * 0.05)}
                  opacity={1}
                />
              </div>
              <div
                style={{
                  position: "relative",
                  flex: "1 1 auto",
                  opacity: keyboardOpacity,
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "center",
                  paddingTop: "0.6em"
                }}
              >
                <div
                  style={{
                    width: "42%",
                    height: "72%",
                    borderRadius: "0.6em",
                    background: "linear-gradient(165deg,rgba(255,255,255,0.045),rgba(255,255,255,0.01))",
                    border: "1px solid rgba(255,255,255,0.06)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)"
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* scroll hint */}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 38, display: "flex", flexDirection: "column", alignItems: "center", gap: 10, opacity: 1 - fade(p, 0.02, 0.16), pointerEvents: "none" }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--muted)" }}>Scroll to enter</span>
          <span style={{ width: 1, height: 34, background: "linear-gradient(#E8873A,transparent)", animation: "nx-hint 2.2s ease-in-out infinite" }} />
        </div>
      </div>
    </section>
  );
}
