import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { fade } from "../../hooks/useZoomProgress.js";
import ScreenSurface from "./ScreenSurface.jsx";

export const MODEL_URL = "/models/macbook.glb";
/** Self-hosted so first paint doesn't wait on a CDN round-trip for the decoder. */
export const DRACO_PATH = "/draco/gltf/";

/**
 * The display content fades out as the camera arrives, so the screen is already
 * dark by the time the live page crossfades in over it.
 */
export const CONTENT_FADE = [0.62, 0.82];

export default function Macbook({ progressRef }) {
  /* Where the pointer is, and where the model has got to in following it.
     Two values, not one: the raw pointer is the target and the damped one is
     what is drawn, so the machine leans after the cursor rather than being
     pinned to it. */
  const pointer = useRef({ x: 0, y: 0 });
  const lean = useRef({ x: 0, y: 0 });
  const { scene } = useGLTF(MODEL_URL, DRACO_PATH);

  const root = useMemo(() => scene.clone(true), [scene]);
  const [fontsReady, setFontsReady] = useState(false);
  const groupRef = useRef();

  // Smooth idle floating movement: floats upward from floor level [0 to +0.009] so it never sinks below the desk
  useEffect(() => {
    const onMove = (e) => {
      pointer.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      pointer.current.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    const p = progressRef.current || 0;
    const idleFactor = 1 - fade(p, 0.05, 0.35);

    // The same 0.075 the camera uses, so the lean and the fly-in share a feel.
    lean.current.x += (pointer.current.x - lean.current.x) * 0.075;
    lean.current.y += (pointer.current.y - lean.current.y) * 0.075;

    // (1 + Math.sin) keeps position.y >= 0, so the laptop chassis never clips into the table
    groupRef.current.position.y = (1 + Math.sin(t * 0.62)) * 0.0045 * idleFactor;
    groupRef.current.rotation.z = Math.sin(t * 0.8) * 0.012 * idleFactor;
    /* Idle drift plus the pointer lean, both faded out by idleFactor: a
       machine that keeps swinging under the cursor while the camera is diving
       into its screen reads as loose, not alive. */
    groupRef.current.rotation.y =
      (Math.cos(t * 0.6) * 0.015 + lean.current.x * 0.12) * idleFactor;
    groupRef.current.rotation.x = lean.current.y * 0.05 * idleFactor;
  });

  useEffect(() => {
    let cancelled = false;

    root.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true;
      o.receiveShadow = true;
      const m = o.material;
      if (m && m.emissiveMap) {
        o.material = m.clone();
        o.material.emissiveMap = null;
        o.material.emissiveIntensity = 0;
        o.material.needsUpdate = true;
      }
    });

    const fonts = document.fonts;
    const wait = fonts
      ? Promise.all([
          fonts.load('700 200px "Space Grotesk"'),
          fonts.load('500 40px "JetBrains Mono"')
        ]).catch(() => {})
      : Promise.resolve();

    wait.then(() => {
      if (!cancelled) setFontsReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [root]);

  return (
    <group ref={groupRef}>
      <primitive object={root} />
      {fontsReady && <ScreenSurface progressRef={progressRef} contentFade={CONTENT_FADE} />}
    </group>
  );
}

useGLTF.preload(MODEL_URL, DRACO_PATH);
