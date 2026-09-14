import { useMemo } from "react";
import * as THREE from "three";
import { Environment, Lightformer, ContactShadows } from "@react-three/drei";
import { FLOOR_Y } from "./cameraPath.js";

/**
 * A pool of light on the desk, drawn to a canvas.
 *
 * The contact shadow underneath the machine was already there and was doing
 * nothing visible: it paints black onto a ground that is already black, so the
 * laptop read as cut out and floating rather than as an object resting on a
 * surface. This gives the shadow something to darken. It is the cheapest way
 * to make a render sit in space, and its absence is most of why the frame did
 * not read as three-dimensional.
 */
function useFloorPool() {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const x = c.getContext("2d");
    const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, "rgba(255, 236, 214, 0.20)");
    g.addColorStop(0.42, "rgba(255, 224, 190, 0.07)");
    g.addColorStop(1, "rgba(255, 220, 185, 0)");
    x.fillStyle = g;
    x.fillRect(0, 0, 256, 256);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
}

/**
 * Studio lighting for a black chassis.
 *
 * The model is already black -- its base colours run #171819, #3a3a3b and
 * #000000 -- so the copper it used to read as came from here, not from the
 * mesh. Every source was amber, right down to an ambient of #8A6A48, which is
 * brown; a dark metal surface has almost no colour of its own and returns
 * whatever it is lit with, so amber light on black metal is a copper laptop.
 *
 * Every source is neutral now, with the ambient pulled very slightly cool --
 * the standard way to make a dark grey read as black rather than as mud, and
 * enough to hold the chassis apart from the warm ground behind it.
 *
 * The rim pair included, which is worth saying because it is not obvious. They
 * sit behind the machine, so the reasonable assumption is that amber there only
 * grazes the outline. It does not: these Lightformers are baked into the
 * environment map, and the palm rest is a large, flat, upward-facing metal
 * panel that reflects that whole map. At full strength it came out copper; at
 * 0.3 it still came out bronze. A metal surface has almost no colour of its
 * own, so there is no intensity at which a coloured environment leaves it
 * black. The warm hue belongs to the page, not to this object.
 */
export default function Studio() {
  const pool = useFloorPool();

  return (
    <>
      <Environment resolution={256} frames={1}>
        {/* Soft overhead fill -- just enough to separate the lid from the bg */}
        <Lightformer form="rect" intensity={1.1} position={[0, 1.6, 0.4]} rotation={[-Math.PI / 2, 0, 0]} scale={[3.8, 1.8, 1]} color="#ffffff" />
        {/* Neutral key/fill pair -- keeps chassis edges readable without tinting it */}
        <Lightformer form="rect" intensity={0.75} position={[1.6, 0.7, 0.9]} rotation={[0, -Math.PI / 3, 0]} scale={[2.5, 1.6, 1]} color="#FFFFFF" />
        <Lightformer form="rect" intensity={0.5} position={[-1.6, 0.5, 0.7]} rotation={[0, Math.PI / 3, 0]} scale={[2.5, 1.4, 1]} color="#F4F4F6" />
        {/* Rim pair. Neutral, and that is the whole fix -- see the note above. */}
        <Lightformer form="rect" intensity={0.85} position={[-1.0, 0.35, -1.2]} rotation={[0, Math.PI - 0.6, 0]} scale={[1.8, 1.1, 1]} color="#FFFFFF" />
        <Lightformer form="rect" intensity={0.75} position={[1.2, 0.3, -1.1]} rotation={[0, Math.PI + 0.6, 0]} scale={[1.8, 1.1, 1]} color="#F8F8FA" />
      </Environment>

      {/* Low and neutral. It was pulled cool to hold a black chassis apart from
          a violet ground; against the warm ground that replaced it, that same
          bias reads as a blue cast on the metal. Neutral light on dark grey is
          what actually returns black. */}
      <ambientLight intensity={0.13} color="#EAEAEC" />
      <directionalLight position={[0.8, 1.8, 1.1]} intensity={0.8} color="#FFFFFF" castShadow shadow-mapSize={[1024, 1024]} />

      {/* The desk. Not a lit plane -- a painted pool that fades to nothing, so
          there is no edge anywhere and no second horizon in the shot. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR_Y - 0.0004, 0.01]}>
        <planeGeometry args={[1.15, 0.95]} />
        <meshBasicMaterial map={pool} transparent depthWrite={false} toneMapped={false} />
      </mesh>

      {/* Soft contact shadow, which now has something to darken */}
      <ContactShadows
        frames={1}
        position={[0, FLOOR_Y + 0.0005, 0]}
        scale={1.8}
        resolution={1024}
        blur={2.2}
        far={0.4}
        opacity={0.6}
        color="#000000"
      />
    </>
  );
}
