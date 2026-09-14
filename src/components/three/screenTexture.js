import * as THREE from "three";
import { SCREEN_W, SCREEN_H } from "./cameraPath.js";

/**
 * Text mask for the MacBook display, drawn once to a canvas.
 *
 * The two lines are encoded into separate colour CHANNELS rather than drawn in
 * their final colours — red for the first, green for the second. The shader
 * then colours each independently, so the gradient can flow through "the
 * future." over time while "Build" stays ivory, all from one static texture
 * that never has to be repainted.
 *
 * Drawn on opaque black so there is no alpha to premultiply: the quad is
 * additively blended, so black contributes nothing.
 *
 * Resolution is set for the closing frame, where the display covers the whole
 * viewport: at 2048 wide the headline is still crisp on a 1440px screen.
 */
const TEX_W = 2048;
const TEX_H = Math.round(TEX_W * (SCREEN_H / SCREEN_W)); // matches the panel's 1.54:1

const HEADLINE = ["Build", "the future"];

/**
 * Bebas Neue — a condensed all-caps display face. It ships as a single weight,
 * so 400 is not a light cut here, it is the only cut; the face is heavy by
 * design. Note it has no lowercase: "the future." comes out as "THE FUTURE."
 * whatever case HEADLINE is written in.
 */
const FONT_STACK = '"Bebas Neue", "Oswald", Impact, sans-serif';
const FONT_WEIGHT = 400;

function paint(ctx) {
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, TEX_W, TEX_H);

  const cx = TEX_W / 2;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // --- headline (red = line 1, green = line 2) ---
  // Fit to the panel with wide elegant letter spacing (tracking)
  const maxWidth = TEX_W * 0.68;
  const setFont = (px) => {
    ctx.font = `${FONT_WEIGHT} ${px}px ${FONT_STACK}`;
    ctx.letterSpacing = `${px * 0.18}px`;
  };
  let size = Math.round(TEX_H * 0.15);
  setFont(size);
  const widest = () => Math.max(...HEADLINE.map((l) => ctx.measureText(l).width));
  while (size > 24 && widest() > maxWidth) {
    size = Math.floor(size * 0.97);
    setFont(size);
  }

  // Tighter than the 1.02 a face with descenders needed — Bebas is caps-only,
  // so nothing hangs below the baseline and the old leading left a visible gap
  // between the two lines instead of a block.
  const lineH = size * 0.92;
  // Centred now the kicker is gone; it previously sat low to leave room above.
  const blockTop = TEX_H * 0.5 - lineH * 0.5;

  // Glow pass first, then an unblurred core on top. Baking only the blurred
  // pass leaves the glyphs looking soft once the shader amplifies them — the
  // crisp fill is what keeps the edges sharp at full-screen zoom.
  const line = (text, y, channel) => {
    const solid = channel === "r" ? "#ff0000" : "#00ff00";
    ctx.save();
    ctx.shadowColor = channel === "r" ? "rgba(255,0,0,0.55)" : "rgba(0,255,0,0.55)";
    ctx.shadowBlur = TEX_W * 0.011;
    ctx.fillStyle = solid;
    ctx.fillText(text, cx, y);
    ctx.restore();
    ctx.fillStyle = solid;
    ctx.fillText(text, cx, y);
  };

  line(HEADLINE[0], blockTop, "r");
  line(HEADLINE[1], blockTop + lineH, "g");
  ctx.letterSpacing = "0px";
}

export function createTextMaskTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = TEX_W;
  canvas.height = TEX_H;
  const ctx = canvas.getContext("2d");

  paint(ctx);

  const tex = new THREE.CanvasTexture(canvas);
  // Sampled on our own quad (not the model's glTF UVs), so the canvas-standard
  // flipY is what we want here.
  tex.colorSpace = THREE.NoColorSpace; // channel data, not colour — don't convert
  tex.anisotropy = 8;
  tex.needsUpdate = true;

  // Syne arrives over the network, and this canvas is painted once at mount —
  // whichever wins the race decides the headline's typeface for the whole
  // session. Repaint once the webfonts have settled so it can't be the
  // fallback, and size-fitting is redone against the real metrics.
  if (typeof document !== "undefined" && document.fonts?.ready) {
    document.fonts.ready.then(() => {
      paint(ctx);
      tex.needsUpdate = true;
    });
  }

  return tex;
}
