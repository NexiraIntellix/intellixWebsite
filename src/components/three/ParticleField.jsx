import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { pullBack } from "../../lib/framing.js";
import * as THREE from "three";
import { token } from "../../lib/tokens.js";
import { buildPointCloud } from "./pointCloud.js";

/**
 * Scroll-driven point cloud: raw returns -> resolved ground -> projected globe.
 *
 * Replaces a 272-frame image sequence that cost 29 MB of transfer and up to
 * 1.94 GB of decoded bitmaps. This ships no assets at all -- the whole thing is
 * ~2 MB of static GPU buffers and a vertex shader -- and being geometry rather
 * than pixels it is resolution independent, so it no longer crops on portrait
 * phones or goes soft on a 4K display.
 */

/**
 * Particle budget by viewport.
 *
 * Scaled by width rather than by a device sniff: the constraint is fill rate and
 * buffer size, both of which track the actual surface being drawn.
 *
 * Phones were on a quarter of the desktop count, on the theory that larger
 * points make up for it. On the globe they did not: pulled back to fit a
 * narrow frame, the sphere is small, and at 22k points it read as a faint
 * haze rather than an object. A third of desktop holds its surface.
 */
function particleBudget(width) {
  if (width < 640) return 30000;
  if (width < 1100) return 48000;
  return 90000;
}

const VERTEX = /* glsl */ `
  attribute vec3 aTerrain;
  attribute vec3 aGlobe;
  attribute float aSeed;
  attribute float aElevation;

  uniform float uProgress;
  uniform float uTime;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uCalm;

  varying float vElevation;
  varying float vScan;
  varying float vAlpha;

  void main() {
    // Per-particle stagger. Without it every point arrives on the same frame and
    // the transition reads as one rigid object snapping between poses; the
    // offset makes the cloud resolve progressively, like returns landing.
    float lead = aSeed * 0.22;
    float p = clamp((uProgress - lead) / (1.0 - 0.22), 0.0, 1.0);

    // Two overlapping stages. They share a window either side of 0.5 so the
    // ground never fully settles before the globe starts drawing it in -- a
    // clean handoff at a single point reads as two animations, not one motion.
    float toGround = smoothstep(0.0, 0.62, p);
    float toGlobe  = smoothstep(0.48, 1.0, p);

    vec3 raw = position;

    // Ambient drift, present only while the returns are still raw. uCalm is 0
    // under prefers-reduced-motion, which removes the idle motion but leaves the
    // scroll-linked transition, since that one is user-driven.
    float wander = uTime * 0.16 + aSeed * 6.283;
    raw += vec3(sin(wander) * 0.10, cos(wander * 0.83) * 0.07, sin(wander * 0.62) * 0.10)
         * (1.0 - toGround) * uCalm;

    vec3 pos = mix(mix(raw, aTerrain, toGround), aGlobe, toGlobe);

    // The globe turns, and only the globe.
    float spin = uTime * 0.11 * uCalm * toGlobe;
    float c = cos(spin);
    float s = sin(spin);
    pos.xz = mat2(c, -s, s, c) * pos.xz;

    // The authored moment: a sweep crossing the ground in the depth axis while
    // it resolves, brightening points as it passes. It is what names the effect
    // as a scan instead of leaving it as an abstract morph.
    float sweep = mix(-1.6, 1.6, smoothstep(0.05, 0.72, p));
    vScan = exp(-pow((aTerrain.z - sweep) * 2.6, 2.0)) * (1.0 - toGlobe) * toGround;

    vElevation = aElevation;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);

    // Perspective-correct sizing, floored so distant points stay above one
    // physical pixel -- below that they alias into flicker while scrolling.
    gl_PointSize = max(uSize * uPixelRatio * (1.6 / -mv.z), uPixelRatio * 0.9);

    // Fade the far shell so the cloud dissolves into the background instead of
    // ending on a visible boundary.
    vAlpha = smoothstep(11.0, 1.8, -mv.z) * mix(0.72, 1.0, toGround);

    gl_Position = projectionMatrix * mv;
  }
`;

const FRAGMENT = /* glsl */ `
  uniform vec3 uLow;
  uniform vec3 uMid;
  uniform vec3 uHigh;

  varying float vElevation;
  varying float vScan;
  varying float vAlpha;

  void main() {
    // Round the point and soften its edge. Cheaper and sharper than a sprite
    // texture, and it costs no asset.
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float mask = smoothstep(0.5, 0.12, d);

    // Elevation ramp -- the convention every topographic map already uses, which
    // is why it reads as terrain rather than as an arbitrary gradient.
    vec3 col = mix(uLow, uMid, smoothstep(0.0, 0.55, vElevation));
    col = mix(col, uHigh, smoothstep(0.62, 1.0, vElevation));

    // The sweep runs hot, so the leading edge blooms slightly.
    col += uHigh * vScan * 1.5;

    gl_FragColor = vec4(col, mask * vAlpha * (0.92 + vScan * 0.7));
  }
`;

/**
 * Camera keyframes, in the cloud's own progress.
 *
 * A static camera cannot serve all three states: the ground only reads as
 * terrain from a low, grazing angle where the ridgeline silhouettes against
 * empty space, while the globe needs to sit centred with room around it. Held
 * face-on and high, the resolved ground looked like a starfield -- every point
 * visible, no horizon anywhere.
 */
const CAM = [
  { at: 0.0, pos: [0, 0.62, 3.9], look: [0, 0.05, 0] },   // raw returns, wide
  // Below the ridgeline, aimed slightly up. Sitting above it and looking down
  // shows the whole surface at once, which reads as a field of dots; from under
  // the crest the ridges silhouette against empty space and the horizon appears.
  // Keeping it low also drops the terrain into the lower third, leaving the
  // headline over clear background.
  { at: 0.55, pos: [0, 0.02, 2.5], look: [0, 0.22, 0] },
  { at: 1.0, pos: [0, 0.14, 2.75], look: [0, 0, 0] },      // globe, framed
];

const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

function cameraAtProgress(p) {
  let i = 0;
  while (i < CAM.length - 2 && p > CAM[i + 1].at) i++;
  const a = CAM[i];
  const b = CAM[i + 1];
  const t = ease(Math.min(1, Math.max(0, (p - a.at) / (b.at - a.at))));
  return {
    pos: a.pos.map((v, k) => lerp(v, b.pos[k], t)),
    look: a.look.map((v, k) => lerp(v, b.look[k], t)),
  };
}

export default function ParticleField({ progressRef, reducedMotion = false }) {
  const points = useRef(null);
  const materialRef = useRef(null);
  const { size, camera } = useThree();

  // Budget is fixed at mount. Rebuilding 90k particles on every resize tick
  // would stall the main thread for exactly the reason we removed the frames.
  const count = useMemo(() => particleBudget(size.width), []); // eslint-disable-line react-hooks/exhaustive-deps

  const cloud = useMemo(() => buildPointCloud(count), [count]);

  const uniforms = useMemo(
    () => ({
      uProgress: { value: 0 },
      uTime: { value: 0 },
      uSize: { value: size.width < 640 ? 4.2 : 3.4 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
      uCalm: { value: reducedMotion ? 0 : 1 },
      // The site's own palette: violet floor, cyan mid, lime peaks.
      /* The shader maps vElevation straight onto these three stops, so the
         object is a relief model whether or not it is coloured like one.

         They come from three tokens of their own rather than from the accent
         ramp. Driving them off the ramp is what quietly repainted the cloud
         every time the palette moved -- and the cloud is the one thing here
         whose colours were chosen for it directly. */
      uLow: { value: new THREE.Color(token("--cloud-1", "#7C5CFF")) },
      uMid: { value: new THREE.Color(token("--cloud-2", "#4FE3F7")) },
      uHigh: { value: new THREE.Color(token("--cloud-3", "#CFFF63")) },
    }),
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Smoothed progress, held on the GPU-facing uniform rather than in React
  // state, so scrolling never triggers a render of this subtree.
  const smoothed = useRef(0);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);
    const target = Math.min(1, Math.max(0, progressRef.current || 0));

    // Frame-rate independent catch-up, matching the easing the camera rig uses
    // so the two halves of the hero share one sense of weight.
    const k = 1 - Math.pow(0.0022, dt);
    smoothed.current += (target - smoothed.current) * k;

    const u = materialRef.current?.uniforms;
    if (u) {
      u.uProgress.value = smoothed.current;
      u.uTime.value = state.clock.elapsedTime;
    }

    const { pos, look } = cameraAtProgress(smoothed.current);
    /* Same correction as the MacBook's camera, for the same reason: this fov
       is vertical, so on a phone held upright the globe overran the frame and
       the shot became its interior -- points everywhere, no silhouette, which
       is why it stopped reading as a globe at all. See lib/framing.js. */
    const framed = pullBack(pos, look, size.width / size.height);
    camera.position.set(framed[0], framed[1], framed[2]);
    camera.lookAt(look[0], look[1], look[2]);
  });

  return (
    <points ref={points} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[cloud.scatter, 3]} />
        <bufferAttribute attach="attributes-aTerrain" args={[cloud.terrain, 3]} />
        <bufferAttribute attach="attributes-aGlobe" args={[cloud.globe, 3]} />
        <bufferAttribute attach="attributes-aSeed" args={[cloud.seed, 1]} />
        <bufferAttribute attach="attributes-aElevation" args={[cloud.elevation, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={VERTEX}
        fragmentShader={FRAGMENT}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
