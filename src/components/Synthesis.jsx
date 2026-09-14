import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { token } from "../lib/tokens.js";

/**
 * Domain-warped shader field, as a section background.
 *
 * Ported from the supplied component. Three things had to change to live here:
 * it was TypeScript, this project is plain JSX; it used Tailwind and shadcn's
 * `cn`, this project has neither and styles from CSS custom properties; and it
 * ran an unconditional `<Canvas>`, which on this page would be a third WebGL
 * context rendering forever behind a section you are mostly not looking at.
 *
 * `live` is that third fix, and it is not optional here. The hero already
 * carries two contexts, and both were found running off-screen for the whole
 * length of the page earlier in this build. This one parks the moment Contact
 * leaves the window.
 */

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform vec2 uResolution;
  uniform float uTime;
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform vec3 uColor3;
  uniform float uScale;
  uniform float uComplexity;
  uniform float uDistortion;
  uniform float uGlowIntensity;
  uniform float uFlowFrequency;
  uniform float uContrast;

  mat2 rot(float a) {
      float s = sin(a), c = cos(a);
      return mat2(c, -s, s, c);
  }

  void main() {
    float minRes = min(uResolution.x, uResolution.y);
    vec2 uv = (gl_FragCoord.xy * 2.0 - uResolution.xy) / minRes;

    vec2 p = uv * uScale;
    float t = uTime;

    // Multi-layered domain warping with dynamic complexity
    for(float i = 1.0; i < 20.0; i++) {
        if(i >= uComplexity) break;
        p *= rot(t * 0.08 + i * 0.15);
        p += vec2(
            sin(p.x * i + t),
            cos(p.x * i - t)
        ) * (uDistortion / i);
    }

    // Wave flow blending with dynamic frequency
    float flow1 = 0.5 + 0.5 * sin(p.x * (uFlowFrequency * 0.8) + t);
    float flow2 = 0.5 + 0.5 * sin(p.y * uFlowFrequency + t * 1.1);

    // Mix theme colors (color1, color2, color3)
    vec3 color = mix(uColor1, uColor2, flow1);
    color = mix(color, uColor3, flow2);

    // Core glow
    float dist = length(uv);
    float glow = exp(-dist * 1.5);
    color += uColor3 * glow * uGlowIntensity;

    // Dynamic contrast and saturation mapping
    color = smoothstep(0.0, uContrast, color);

    gl_FragColor = vec4(color, 1.0);
  }
`;

function Effect({
  speed,
  color1,
  color2,
  color3,
  scale,
  complexity,
  distortion,
  glowIntensity,
  flowFrequency,
  contrast,
}) {
  const materialRef = useRef(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2() },
      uColor1: { value: new THREE.Color(color1) },
      uColor2: { value: new THREE.Color(color2) },
      uColor3: { value: new THREE.Color(color3) },
      uScale: { value: scale },
      uComplexity: { value: complexity },
      uDistortion: { value: distortion },
      uGlowIntensity: { value: glowIntensity },
      uFlowFrequency: { value: flowFrequency },
      uContrast: { value: contrast },
    }),
    // Built once; the effect below keeps them in step with the props.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    const m = materialRef.current;
    if (!m) return;
    m.uniforms.uColor1.value.set(color1);
    m.uniforms.uColor2.value.set(color2);
    m.uniforms.uColor3.value.set(color3);
    m.uniforms.uScale.value = scale;
    m.uniforms.uComplexity.value = complexity;
    m.uniforms.uDistortion.value = distortion;
    m.uniforms.uGlowIntensity.value = glowIntensity;
    m.uniforms.uFlowFrequency.value = flowFrequency;
    m.uniforms.uContrast.value = contrast;
  }, [color1, color2, color3, scale, complexity, distortion, glowIntensity, flowFrequency, contrast]);

  useFrame((state) => {
    const m = materialRef.current;
    if (!m) return;
    m.uniforms.uTime.value = state.clock.getElapsedTime() * speed;
    m.uniforms.uResolution.value.set(state.size.width, state.size.height);
  });

  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
}

export default function Synthesis({
  className,
  live = true,
  /* Warm by default, not the shipped navy/purple/cyan. This page runs one hue
     on a warm ground and states as much in its own palette comment; dropping a
     cold field behind the last section would put two colour temperatures on
     screen at once. Pass the original #0f172a / #3b0764 / #0ea5e9 to get the
     stock look back. */
  speed = 0.22,
  /* Slate, with one warm bloom at the core.
     This started as a full-bleed saturated field and it kept coming out as the
     loudest thing on the page -- orange under the old palette, pure red under
     this one, because the shader ends on smoothstep(0, contrast, color) and
     that crushes whichever channel is lowest, driving any saturated stop onto
     its hue axis. Retuning the red was the wrong fix: the palette's own rule
     is that signal is rationed to data and to the one action that matters, and
     a full-bleed accent behind the closing section is precisely what that
     rules out. So the two large stops are structure and only the core glow is
     warm, which leaves the heading and the button to carry the colour here. */
  color1 = token("--s-1", "#0E1418"),
  color2 = token("--s-3", "#1E2C35"),
  color3 = token("--a-4", "#C26718"),
  scale = 1.0,
  complexity = 6.0,
  distortion = 0.6,
  glowIntensity = 0.09,
  flowFrequency = 3.0,
  contrast = 1.3,
  backgroundColor = token("--s-1", "#0E1418"),
  style,
}) {
  return (
    <div
      className={className}
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        overflow: "hidden",
        backgroundColor,
        ...style,
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 1] }}
        dpr={1}
        frameloop={live ? "always" : "never"}
        gl={{ antialias: false, powerPreference: "high-performance" }}
      >
        <Effect
          speed={speed}
          color1={color1}
          color2={color2}
          color3={color3}
          scale={scale}
          complexity={complexity}
          distortion={distortion}
          glowIntensity={glowIntensity}
          flowFrequency={flowFrequency}
          contrast={contrast}
        />
      </Canvas>
    </div>
  );
}
