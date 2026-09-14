import { useEffect, useRef, useState, useMemo } from "react";
import { fade } from "../hooks/useZoomProgress.js";

const TOTAL_FRAMES = 272;

// Helper to format frame number to 3-digit string (e.g. 1 -> "001")
const padFrame = (num) => String(num).padStart(3, "0");

const FEATURES = [
  {
    badge: "Spatial Engineering",
    title: "We build the dimensions your IT lives in.",
    subtitle: "Enterprise-grade software, analytics, and spatial intelligence engineered with multi-dimensional precision.",
    highlight: "dimensions",
    start: 0,
    end: 0.22,
  },
  {
    badge: "Interactive & Real-time",
    title: "Seamless High-Performance Visualizations",
    subtitle: "Manipulate, inspect, and navigate complex geospatial models dynamically with near-zero latency.",
    highlight: "High-Performance Visualizations",
    start: 0.23,
    end: 0.47,
  },
  {
    badge: "Cloud & Analytics",
    title: "Intelligent Layered Architecture",
    subtitle: "Scale your software ecosystem with cloud-native pipelines, real-time telemetry, and modular data layers.",
    highlight: "Intelligent Layered Architecture",
    start: 0.48,
    end: 0.72,
  },
  {
    badge: "Next-Gen Tech",
    title: "Empowering the Next Digital Era",
    subtitle: "Software, consultancy, analytics, and specialized training engineered for tomorrow's spatial enterprise.",
    highlight: "Next Digital Era",
    start: 0.73,
    end: 1.0,
  },
];

export default function CanvasHeroSequence({ sectionRef, p }) {
  const canvasRef = useRef(null);
  const imagesRef = useRef([]);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);

  // Smooth lerped progress ref for buttery smooth frame rendering
  const smoothedPRef = useRef(p);
  const targetPRef = useRef(p);
  targetPRef.current = p;

  // Preload images into memory
  useEffect(() => {
    let loadedCount = 0;
    const imgs = [];

    for (let i = 1; i <= TOTAL_FRAMES; i++) {
      const img = new Image();
      const frameStr = padFrame(i);
      img.src = `/heroImages/ezgif-frame-${frameStr}.png`;
      img.onload = () => {
        loadedCount++;
        setLoadProgress(Math.round((loadedCount / TOTAL_FRAMES) * 100));
        if (loadedCount === TOTAL_FRAMES) {
          setImagesLoaded(true);
        }
      };
      imgs.push(img);
    }
    imagesRef.current = imgs;
  }, []);

  // Continuous animation loop using lerp (linear interpolation) for ultra-smooth frame transition
  useEffect(() => {
    let animationFrameId;

    const render = () => {
      // Smooth lerp factor (0.12 provides silky smooth momentum)
      smoothedPRef.current += (targetPRef.current - smoothedPRef.current) * 0.12;

      const currentP = smoothedPRef.current;
      const canvas = canvasRef.current;

      if (canvas && imagesRef.current.length === TOTAL_FRAMES) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          // Calculate target frame index using interpolated smooth progress
          const frameIndex = Math.min(
            TOTAL_FRAMES - 1,
            Math.max(0, Math.floor(currentP * (TOTAL_FRAMES - 1)))
          );

          const img = imagesRef.current[frameIndex];

          if (img && img.complete && img.naturalWidth > 0) {
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            const imgWidth = img.naturalWidth;
            const imgHeight = img.naturalHeight;

            const imgRatio = imgWidth / imgHeight;
            const canvasRatio = canvasWidth / canvasHeight;

            let drawWidth, drawHeight, offsetX, offsetY;

            if (canvasRatio > imgRatio) {
              drawWidth = canvasWidth;
              drawHeight = canvasWidth / imgRatio;
              offsetX = 0;
              offsetY = (canvasHeight - drawHeight) / 2;
            } else {
              drawWidth = canvasHeight * imgRatio;
              drawHeight = canvasHeight;
              offsetX = (canvasWidth - drawWidth) / 2;
              offsetY = 0;
            }

            ctx.clearRect(0, 0, canvasWidth, canvasHeight);
            ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [imagesLoaded]);

  // Canvas resize handler to keep crisp resolution
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = window.innerWidth * (window.devicePixelRatio || 1);
        canvas.height = window.innerHeight * (window.devicePixelRatio || 1);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Calculate current active text section based on p
  const activeFeatureIndex = useMemo(() => {
    if (p <= 0.22) return 0;
    if (p <= 0.47) return 1;
    if (p <= 0.72) return 2;
    return 3;
  }, [p]);

  return (
    <section ref={sectionRef} id="top" style={{ position: "relative", height: "450vh" }}>
      <style>{`
        @keyframes nx-gradient-flow-hero {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .nx-feature-gradient {
          background: linear-gradient(
            120deg,
            #ffffff 0%,
            #D99A62 25%,
            #F0A468 50%,
            #F0A468 75%,
            #ffffff 100%
          );
          background-size: 200% 200%;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: nx-gradient-flow-hero 4s ease infinite;
        }
        .nx-cta-btn {
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .nx-cta-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px -5px rgba(232, 135, 58, 0.5);
        }
      `}</style>

      <div
        style={{
          position: "sticky",
          top: 0,
          height: "100vh",
          overflow: "hidden",
          background: "#0E1418",
        }}
      >
        {/* Sequence Canvas */}
        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: imagesLoaded ? 1 : 0.2,
            transition: "opacity 0.6s ease",
          }}
        />

        {/* Ambient Dark Overlay Gradients for Depth and Contrast */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse 90% 70% at 50% 50%, rgba(14, 20, 24,0.3) 0%, rgba(14, 20, 24,0.75) 70%, rgba(14, 20, 24,0.95) 100%)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "25vh",
            background: "linear-gradient(to top, #0E1418 0%, transparent 100%)",
            pointerEvents: "none",
          }}
        />

        {/* Loading Indicator overlay */}
        {!imagesLoaded && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "#0E1418",
              zIndex: 30,
              gap: 16,
            }}
          >
            <div style={{ fontFamily: "var(--display)", fontSize: 22, fontWeight: 700, color: "#fff" }}>
              NEXIRA <span style={{ color: "#F0A468" }}>INTELLIX</span>
            </div>
            <div style={{ width: 180, height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 99, overflow: "hidden" }}>
              <div
                style={{
                  width: `${loadProgress}%`,
                  height: "100%",
                  background: "linear-gradient(90deg, #C9722C, #E8873A)",
                  transition: "width 0.1s linear",
                }}
              />
            </div>
            <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
              Loading Experience {loadProgress}%
            </span>
          </div>
        )}

        {/* Feature Text Overlays (Driven by scroll p) */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
            zIndex: 10,
            padding: "0 24px",
          }}
        >
          {FEATURES.map((feat, index) => {
            // Calculate smooth fade and translation for each section
            const fadeIn = fade(p, feat.start, feat.start + 0.05);
            const fadeOut = index < FEATURES.length - 1 ? 1 - fade(p, feat.end - 0.05, feat.end) : 1;
            const opacity = Math.min(fadeIn, fadeOut);

            // Subtle vertical drift on scroll
            const progressSpan = feat.end - feat.start;
            const localProgress = (p - feat.start) / progressSpan;
            const translateY = (0.5 - localProgress) * 40;

            if (opacity <= 0.001) return null;

            return (
              <div
                key={index}
                style={{
                  position: "absolute",
                  maxWidth: 900,
                  width: "100%",
                  textAlign: "center",
                  opacity: opacity,
                  transform: `translateY(${translateY.toFixed(1)}px)`,
                  transition: "opacity 0.3s ease-out, transform 0.3s ease-out",
                  pointerEvents: opacity > 0.6 ? "auto" : "none",
                }}
              >
                {/* Badge */}
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 16px",
                    borderRadius: 999,
                    border: "1px solid rgba(232, 135, 58, 0.4)",
                    background: "rgba(232, 135, 58, 0.12)",
                    backdropFilter: "blur(12px)",
                    fontFamily: "var(--mono)",
                    fontSize: 12,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "#FFCC9A",
                    marginBottom: 20,
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: 99, background: "#E8873A" }} />
                  {feat.badge}
                </div>

                {/* Title */}
                <h1
                  style={{
                    margin: 0,
                    fontFamily: "var(--display)",
                    fontWeight: 800,
                    fontSize: "clamp(36px, 5.5vw, 76px)",
                    lineHeight: 1.05,
                    letterSpacing: "-0.03em",
                    color: "#ffffff",
                    textWrap: "balance",
                  }}
                >
                  {feat.title.includes(feat.highlight) ? (
                    <>
                      {feat.title.split(feat.highlight)[0]}
                      <span className="nx-feature-gradient">{feat.highlight}</span>
                      {feat.title.split(feat.highlight)[1]}
                    </>
                  ) : (
                    feat.title
                  )}
                </h1>

                {/* Subtitle */}
                <p
                  style={{
                    margin: "20px auto 0",
                    maxWidth: 640,
                    fontFamily: "var(--body)",
                    fontSize: "clamp(15px, 1.4vw, 19px)",
                    lineHeight: 1.6,
                    color: "rgba(255, 255, 255, 0.75)",
                    textWrap: "pretty",
                  }}
                >
                  {feat.subtitle}
                </p>

                {/* Primary & Secondary Action Buttons (Show on first and last feature) */}
                {(index === 0 || index === FEATURES.length - 1) && (
                  <div style={{ marginTop: 32, display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
                    <a
                      href="#contact"
                      className="nx-cta-btn"
                      style={{
                        padding: "14px 28px",
                        borderRadius: 12,
                        background: "linear-gradient(100deg, #C9722C, #E8873A)",
                        color: "#0E1418",
                        fontWeight: 700,
                        fontSize: 15,
                        textDecoration: "none",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      Start something
                    </a>
                    <a
                      href="#capabilities"
                      className="nx-cta-btn"
                      style={{
                        padding: "14px 28px",
                        borderRadius: 12,
                        border: "1px solid rgba(255,255,255,0.2)",
                        background: "rgba(255,255,255,0.05)",
                        backdropFilter: "blur(10px)",
                        color: "#ffffff",
                        fontWeight: 600,
                        fontSize: 15,
                        textDecoration: "none",
                      }}
                    >
                      Explore Capabilities
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Feature Pagination / Progress Indicators on bottom right */}
        <div
          style={{
            position: "absolute",
            right: 32,
            top: "50%",
            transform: "translateY(-50%)",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            zIndex: 20,
          }}
        >
          {FEATURES.map((feat, idx) => {
            const isActive = idx === activeFeatureIndex;
            return (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    width: isActive ? 24 : 8,
                    height: 8,
                    borderRadius: 99,
                    background: isActive
                      ? "linear-gradient(90deg, #C9722C, #E8873A)"
                      : "rgba(255, 255, 255, 0.25)",
                    transition: "all 0.3s ease",
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Bottom Scroll Prompt Indicator */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 30,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            opacity: 1 - fade(p, 0.92, 0.99),
            pointerEvents: "none",
            zIndex: 15,
          }}
        >
          <span
            style={{
              fontFamily: "var(--mono)",
              fontSize: 11,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "rgba(255, 255, 255, 0.5)",
            }}
          >
            Scroll to explore features
          </span>
          <span
            style={{
              width: 1,
              height: 28,
              background: "linear-gradient(#E8873A, transparent)",
              animation: "nx-hint 2.2s ease-in-out infinite",
            }}
          />
        </div>
      </div>
    </section>
  );
}
