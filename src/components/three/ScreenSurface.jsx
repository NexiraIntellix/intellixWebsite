import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { fade } from "../../hooks/useZoomProgress.js";
import { SCREEN_CENTER, SCREEN_W, SCREEN_H } from "./cameraPath.js";
import { createTextMaskTexture } from "./screenTexture.js";
import { ORB_GLSL } from "./orbChunk.js";

/**
 * The display's backdrop.
 */
const BG_IMAGE = "/images/screen-hands.jpeg";
const USE_ORB = BG_IMAGE === null;
const PANEL_ASPECT = SCREEN_W / SCREEN_H;
const SCREEN_TILT_X = -Math.asin(0.3421);
const OFFSET = 0.0009;

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;

  varying vec2 vUv;

  uniform float uTime;
  uniform float uFade;
  uniform float uTextFade;
  uniform sampler2D uText;
  uniform sampler2D uBg;
  uniform float uHasBg;
  uniform vec2 uBgScale;
  uniform vec2 uBgOffset;

  const vec3 GLOW  = vec3(0.780, 0.790, 0.810);
  const vec3 ICE   = vec3(0.940, 0.950, 0.960);
  const vec3 WHITE = vec3(1.0);

${USE_ORB ? ORB_GLSL : ""}

  void main() {
    vec2 uv = vUv;

    vec3 col = mix(vec3(0.026, 0.026, 0.029), vec3(0.078, 0.079, 0.086), pow(1.0 - uv.y, 1.6));

    float horizon = exp(-abs(uv.y - 0.18) * 6.0);
    col += GLOW * horizon * 0.15;

    float key = exp(-length((uv - vec2(0.70, 0.62)) * vec2(1.30, 1.0)) * 2.0);
    col += GLOW * key * 0.24;

${
  USE_ORB
    ? `    vec2 sp = (uv - 0.5) * 2.6;
    sp.x *= ${(SCREEN_W / SCREEN_H).toFixed(4)};
    col += smokeOrb(sp - vec2(0.0, -0.08), uTime) * 0.70;`
    : ""
}

    vec2 duv = uv * vec2(150.0, 96.0) + vec2(uTime * 0.6, 0.0);
    vec2 dcell = floor(duv);
    float dh = fract(sin(dot(dcell, vec2(12.9898, 78.233))) * 43758.5453);
    float mote = smoothstep(0.34, 0.0, length(fract(duv) - 0.5));
    float twinkle = 0.5 + 0.5 * sin(uTime * 1.6 + dh * 40.0);
    col += ICE * step(0.9955, dh) * mote * twinkle * 0.7;

    vec3 bg = texture2D(uBg, uv * uBgScale + uBgOffset).rgb;
    col = mix(col, bg * 1.18 + col * 0.62, uHasBg);

    float vig = smoothstep(1.20, 0.30, length((uv - 0.5) * vec2(1.55, 1.0)));
    col *= mix(0.52, 1.0, vig);

    vec3 m = texture2D(uText, uv).rgb;
    // The page settled on one hue over a warm ground; this display was still
    // lit by the old six-accent palette, running cyan into lime -- the only
    // cool light left on the site, and on the one surface the whole hero drives
    // into. Same construction, moved onto the ramp: a-6 into a-8 across the
    // second line, the first held near text-strong so the two read as a pair
    // rather than as two colours.
    vec3 amber   = vec3(1.000, 0.604, 0.235);   // --a-6
    vec3 amberHi = vec3(1.000, 0.784, 0.565);   // --a-8
    vec3 line1Col = mix(vec3(1.000, 0.980, 0.957), amberHi, 0.45);
    vec3 line2Col = mix(amber, amberHi, clamp((uv.x - 0.2) * 1.6, 0.0, 1.0));
    col += (line1Col * m.r + line2Col * m.g) * 1.5 * uTextFade;

    col *= 1.0 - 0.016 * sin(uv.y * 700.0);

    gl_FragColor = vec4(col * uFade, 1.0);
  }
`;

export default function ScreenSurface({ progressRef, contentFade }) {
  const mat = useRef(null);

  const uniforms = useMemo(() => {
    const text = createTextMaskTexture();
    const loader = new THREE.TextureLoader();
    const blank = new THREE.Texture();
    const scale = new THREE.Vector2(1, 1);
    const offset = new THREE.Vector2(0, 0);
    const bg = BG_IMAGE
      ? loader.load(BG_IMAGE, (t) => {
          const a = t.image.width / t.image.height;
          if (a > PANEL_ASPECT) scale.x = PANEL_ASPECT / a;
          else scale.y = a / PANEL_ASPECT;
          offset.set((1 - scale.x) * 0.5, (1 - scale.y) * 0.5);
        })
      : blank;
    if (BG_IMAGE) bg.colorSpace = THREE.SRGBColorSpace;
    return {
      uTime: { value: 0 },
      uFade: { value: 1 },
      uTextFade: { value: 0 },
      uText: { value: text },
      uBg: { value: bg },
      uHasBg: { value: BG_IMAGE ? 1 : 0 },
      uBgScale: { value: scale },
      uBgOffset: { value: offset }
    };
  }, []);

  useFrame((state) => {
    const m = mat.current;
    if (!m) return;
    const p = progressRef.current || 0;
    m.uniforms.uTime.value = state.clock.elapsedTime;
    m.uniforms.uFade.value = 1 - fade(p, contentFade[0], contentFade[1]);
    
    const textFade = fade(p, 0.48, 0.66) * (1 - fade(p, 0.78, 0.86));
    m.uniforms.uTextFade.value = textFade;
  });

  return (
    <mesh
      position={[
        SCREEN_CENTER[0],
        SCREEN_CENTER[1] + 0.3421 * OFFSET,
        SCREEN_CENTER[2] + 0.9397 * OFFSET
      ]}
      rotation={[SCREEN_TILT_X, 0, 0]}
    >
      <planeGeometry args={[SCREEN_W, SCREEN_H]} />
      <shaderMaterial
        ref={mat}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}
