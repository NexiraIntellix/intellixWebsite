/**
 * Radiance cascades, in 2D, over a scene of one glowing letter N.
 *
 * The scene is analytic -- three capsule strokes for the N and a handful of
 * dark orbs circling it -- so there is no scene texture and no jump-flood
 * distance field: every ray march step asks the signed distance functions
 * directly, which is exact and cheaper than the textures it replaces.
 *
 * Light transport is the standard cascade scheme:
 *
 *   cascade n   probe spacing 2^n px, 4^(n+1) rays per probe,
 *               ray interval [ (4^n - 1)/3 , (4^(n+1) - 1)/3 ] px
 *
 * Each cascade is one full-screen pass into a texture laid out so that a
 * probe's cell of (2^n)^2 texels holds its rays in groups of four, one group
 * per texel. That layout makes the merge a lookup: ray k of cascade n
 * continues into texel k of the cell above it, which already holds the
 * average of the four rays of cascade n+1 that subdivide ray k. Passes run
 * top-down, ping-ponging two textures, and cascade 0 -- one probe per pixel,
 * four rays averaged -- is the fluence that gets displayed.
 *
 * The N is drawn a second time at canvas resolution in the display pass, so
 * the letter stays crisp while the light field is solved at a lower one.
 */

export type RendererOptions = {
  canvas: HTMLCanvasElement;
  /** Load progress in [0, 1], read every frame. Omit for a self-running loop. */
  getProgress?: () => number;
  /** Freezes the ambient motion (orbiting occluders, shimmer). Progress still shows. */
  reducedMotion?: boolean;
};

export type Renderer = {
  /** Resolves true once a frame has been drawn with WebGL2, false if it fell back. */
  ready: Promise<boolean>;
  dispose: () => void;
};

/* Five cascades: top spacing 16px, top interval unbounded. The light-field
   texture is snapped to multiples of the top spacing so probe cells tile. */
const CASCADES = 5;
const TOP_SPACING = 1 << (CASCADES - 1);
/* Signed-distance marching in open 2D space converges in a handful of steps;
   the cap only matters for rays grazing a stroke edge. */
const MAX_STEPS = 28;

/* Light field resolution, long side, in texels. Measured on an integrated
   AMD Radeon: at 820 the solve took 27ms of GPU time a frame (35fps) before
   the page loading behind the loader took its share. The field is soft by
   nature and the letter itself is redrawn crisp at canvas resolution, so a
   coarse solve costs almost nothing visible. */
const RC_LONG_DESKTOP = 460;
const RC_LONG_SMALL = 340;

/* If frames still come in slow, the field steps down in resolution by this
   factor, to no less than QUALITY_MIN of the size above. Judged on the median
   interval over a window, so one long main-thread stall -- the MacBook model
   decoding, which happens during exactly this loader -- does not count. */
const QUALITY_STEP = 0.8;
const QUALITY_MIN = 0.5;
const SLOW_FRAME_MS = 22;
const WINDOW = 30;

const VERT = /* glsl */ `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const SCENE = /* glsl */ `
uniform vec2 uRes;
uniform float uTime;
uniform float uProgress;
uniform float uMotion;

const int OCC = 5;
const float TAU = 6.28318530718;

// Scene geometry, computed once per frame in JS (see sceneFor) rather than
// once per fragment: N stroke endpoints A -> B -> C -> D in writing order,
// letter height, stroke half-width, path segment lengths, and the orbs.
uniform vec2 gA, gB, gC, gD;
uniform float gH, gTh, gL1, gL2, gL;
uniform vec3 gOcc[OCC];

float segDist(vec2 p, vec2 a, vec2 b, out float h) {
  vec2 pa = p - a, ba = b - a;
  h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}

/* Signed distance to the N, and the arc length along its stroke path of the
   nearest point -- which is what the progress fill is measured in. */
float nDist(vec2 p, out float s) {
  float h1, h2, h3;
  float d1 = segDist(p, gA, gB, h1);
  float d2 = segDist(p, gB, gC, h2);
  float d3 = segDist(p, gC, gD, h3);
  float d = d1;
  s = h1 * gL1;
  if (d2 < d) { d = d2; s = gL1 + h2 * gL2; }
  if (d3 < d) { d = d3; s = gL1 + gL2 + h3 * gH; }
  return d - gTh;
}

float occDist(vec2 p) {
  float d = 1e9;
  for (int i = 0; i < OCC; i++) d = min(d, length(p - gOcc[i].xy) - gOcc[i].z);
  return d;
}

float sceneDist(vec2 p) {
  float s;
  return min(nDist(p, s), occDist(p));
}

vec3 nEmit(float s) {
  vec3 amber = vec3(1.0, 0.46, 0.12);
  vec3 hot = vec3(1.0, 0.80, 0.52);
  float head = uProgress * gL;
  float edge = gH * 0.03;
  // 1 along the part of the path the progress has already reached.
  float lit = 1.0 - smoothstep(head - edge, head + edge, s);
  float shimmer = 0.78 + 0.22 * sin(s / gH * 9.0 - uTime * uMotion * 5.0);
  // The bright bead at the leading edge; it burns out as loading completes.
  float bead = exp(-pow((s - head) / (gH * 0.10), 2.0)) * (1.0 - smoothstep(0.96, 1.0, uProgress));
  return amber * (0.04 + lit * 0.9 * shimmer) + hot * bead * 3.0;
}

vec3 sceneEmit(vec2 p) {
  float s;
  float dn = nDist(p, s);
  return dn <= occDist(p) ? nEmit(s) : vec3(0.0);
}
`;

const CASCADE_FRAG = /* glsl */ `#version 300 es
precision highp float;
precision highp int;
${SCENE}
uniform sampler2D uUpper;
uniform bool uHasUpper;
uniform int uSpacing;
uniform float uStart;
uniform float uEnd;
out vec4 fragColor;

/* rgb = radiance gathered on the interval, a = 1 if the ray got through
   without hitting anything (so the cascade above supplies the rest). */
vec4 march(vec2 origin, vec2 dir) {
  float t = uStart;
  for (int i = 0; i < ${MAX_STEPS}; i++) {
    vec2 q = origin + dir * t;
    if (q.x < 0.0 || q.y < 0.0 || q.x > uRes.x || q.y > uRes.y) return vec4(0.0, 0.0, 0.0, 1.0);
    float d = sceneDist(q);
    if (d < 0.5) return vec4(sceneEmit(q), 0.0);
    t += d;
    if (t >= uEnd) return vec4(0.0, 0.0, 0.0, 1.0);
  }
  return vec4(0.0, 0.0, 0.0, 1.0);
}

vec3 upperTexel(ivec2 cell, int k, int s2) {
  return texelFetch(uUpper, cell * s2 + ivec2(k % s2, k / s2), 0).rgb;
}

void main() {
  int s = uSpacing;
  ivec2 px = ivec2(gl_FragCoord.xy);
  ivec2 cell = px / s;
  ivec2 local = px - cell * s;
  int group = local.x + local.y * s;
  vec2 probe = (vec2(cell) + 0.5) * float(s);
  int rays = 4 * s * s;

  // The four upper probes around this one, for a bilinear merge -- nearest
  // would print the upper cascade's 2x-coarser probe grid into the light.
  int s2 = s * 2;
  ivec2 grid = ivec2(uRes) / s2;
  vec2 g = probe / float(s2) - 0.5;
  ivec2 b = ivec2(floor(g));
  vec2 f = fract(g);
  ivec2 c00 = clamp(b,               ivec2(0), grid - 1);
  ivec2 c10 = clamp(b + ivec2(1, 0), ivec2(0), grid - 1);
  ivec2 c01 = clamp(b + ivec2(0, 1), ivec2(0), grid - 1);
  ivec2 c11 = clamp(b + ivec2(1, 1), ivec2(0), grid - 1);

  vec3 sum = vec3(0.0);
  for (int i = 0; i < 4; i++) {
    int k = 4 * group + i;
    float angle = (float(k) + 0.5) / float(rays) * TAU;
    vec4 hit = march(probe, vec2(cos(angle), sin(angle)));
    if (uHasUpper && hit.a > 0.0) {
      vec3 up = mix(mix(upperTexel(c00, k, s2), upperTexel(c10, k, s2), f.x),
                    mix(upperTexel(c01, k, s2), upperTexel(c11, k, s2), f.x), f.y);
      hit.rgb += up * hit.a;
    }
    sum += hit.rgb;
  }
  fragColor = vec4(sum * 0.25, 1.0);
}`;

const DISPLAY_FRAG = /* glsl */ `#version 300 es
precision highp float;
${SCENE}
uniform sampler2D uField;
uniform vec2 uCanvas;
in vec2 vUv;
out vec4 fragColor;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec2 q = vUv * uRes;
  // Low exposure on purpose: 2D fluence falls off only as 1/r, so anything
  // brighter lifts the whole screen to a flat glow and the shadows vanish.
  vec3 col = texture(uField, vUv).rgb * 0.55;

  // Emitters and occluders again at canvas resolution: the field is solved
  // coarser than the screen, and a soft-edged letter reads as a blur.
  float aa = uRes.x / uCanvas.x;
  float s;
  float dn = nDist(q, s);
  float dOcc = occDist(q);
  col = mix(col, nEmit(s) * 1.6, 1.0 - smoothstep(-aa, aa, dn));
  float disc = 1.0 - smoothstep(-aa, aa, dOcc);
  float rim = (1.0 - smoothstep(0.0, aa * 2.0, abs(dOcc))) * 0.35;
  col = mix(col, col * rim, disc);

  col = 1.0 - exp(-col);                         // filmic shoulder
  // A shallower curve than sRGB's 2.2: the full encode lifts the dim far
  // field to grey, and the loader wants it near black around the light.
  col = pow(col, vec3(1.0 / 1.6));
  vec2 v = vUv - 0.5;
  col *= 1.0 - dot(v, v) * 0.9;                  // vignette
  col += (hash(gl_FragCoord.xy + fract(uTime)) - 0.5) / 255.0;  // dither the gradient
  fragColor = vec4(col, 1.0);
}`;

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("createShader failed");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`shader compile failed: ${log}`);
  }
  return shader;
}

function link(gl: WebGL2RenderingContext, vs: WebGLShader, fsSource: string) {
  const fs = compile(gl, gl.FRAGMENT_SHADER, fsSource);
  const program = gl.createProgram();
  if (!program) throw new Error("createProgram failed");
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.bindAttribLocation(program, 0, "aPos");
  gl.linkProgram(program);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(`program link failed: ${gl.getProgramInfoLog(program)}`);
  }
  const cache = new Map<string, WebGLUniformLocation | null>();
  const loc = (name: string) => {
    if (!cache.has(name)) cache.set(name, gl.getUniformLocation(program, name));
    return cache.get(name) ?? null;
  };
  return { program, loc };
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

const OCCLUDERS = 5;

/** The letter and orbs in light-field texel space, at t seconds of motion. */
function sceneFor(w: number, h: number, t: number) {
  const H = Math.min(h * 0.36, w * 0.42);
  const W = H * 0.8;
  const cx = w / 2;
  const cy = h / 2;
  // Bottom-left, top-left, bottom-right, top-right: the order the letter is
  // written in, and the order it fills with light.
  const A = [cx - W / 2, cy - H / 2];
  const B = [cx - W / 2, cy + H / 2];
  const C = [cx + W / 2, cy - H / 2];
  const D = [cx + W / 2, cy + H / 2];
  const L2 = Math.hypot(C[0] - B[0], C[1] - B[1]);
  const occ = new Float32Array(OCCLUDERS * 3);
  for (let i = 0; i < OCCLUDERS; i++) {
    const dir = i % 2 === 0 ? 1 : -1;
    const a = t * (0.32 + 0.08 * i) * dir + (i * Math.PI * 2) / OCCLUDERS;
    occ[i * 3] = cx + Math.cos(a) * H * (0.92 + 0.07 * i);
    occ[i * 3 + 1] = cy + Math.sin(a) * H * (0.72 + 0.05 * i);
    occ[i * 3 + 2] = H * (0.034 + 0.011 * ((i * 3) % 4));
  }
  return { A, B, C, D, H, th: H * 0.075, L1: H, L2, L: H * 2 + L2, occ };
}

/** Self-running progress for when nothing real is being loaded: fill, hold, repeat. */
const demoProgress = (seconds: number) => {
  const t = seconds % 3.2;
  return t < 2.6 ? 1 - Math.pow(1 - t / 2.6, 2.2) : 1;
};

export function createRenderer({ canvas, getProgress, reducedMotion = false }: RendererOptions): Renderer {
  const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, premultipliedAlpha: false });
  if (!gl) return createFallback({ canvas, getProgress });
  try {
    return createWebGLRenderer(gl, { canvas, getProgress, reducedMotion });
  } catch (err) {
    // A canvas that has handed out a WebGL2 context cannot give a 2D one, so
    // there is no drawing fallback from here -- the wrapper's background shows.
    console.warn("[radiance-cascades] WebGL2 setup failed:", err);
    return { ready: Promise.resolve(false), dispose: () => {} };
  }
}

function createWebGLRenderer(
  gl: WebGL2RenderingContext,
  { canvas, getProgress, reducedMotion }: Required<Pick<RendererOptions, "canvas" | "reducedMotion">> &
    Pick<RendererOptions, "getProgress">
): Renderer {
  // Otherwise the failure surfaces later as "shader compile failed: null".
  if (gl.isContextLost()) throw new Error("WebGL2 context is lost");
  // Half-float targets keep radiance above 1.0 through the merges; without
  // the extension the field still works, just clipped.
  const floatTargets = !!gl.getExtension("EXT_color_buffer_float");
  const internal = floatTargets ? gl.RGBA16F : gl.RGBA8;
  const texType = floatTargets ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE;

  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const cascade = link(gl, vs, CASCADE_FRAG);
  const display = link(gl, vs, DISPLAY_FRAG);
  gl.deleteShader(vs);

  // One oversized triangle covers the viewport with no seam down a diagonal.
  const vao = gl.createVertexArray();
  const vbo = gl.createBuffer();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const targets = [0, 1].map(() => {
    const tex = gl.createTexture()!;
    const fbo = gl.createFramebuffer()!;
    return { tex, fbo };
  });

  let rcW = 0;
  let rcH = 0;
  let cssW = 0;
  let cssH = 0;

  const allocate = () => {
    for (const { tex, fbo } of targets) {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, internal, rcW, rcH, 0, gl.RGBA, texType, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  };

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);
    if (w === cssW && h === cssH) return;
    cssW = w;
    cssH = h;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    fitField();
  };

  let quality = 1;
  function fitField() {
    const cap = (cssW * cssH < 520_000 ? RC_LONG_SMALL : RC_LONG_DESKTOP) * quality;
    const scale = Math.min(1, cap / Math.max(cssW, cssH));
    const snap = (v: number) => Math.max(TOP_SPACING * 2, Math.round((v * scale) / TOP_SPACING) * TOP_SPACING);
    const nextW = snap(cssW);
    const nextH = snap(cssH);
    if (nextW !== rcW || nextH !== rcH) {
      rcW = nextW;
      rcH = nextH;
      allocate();
    }
  }

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  let raf = 0;
  let disposed = false;
  let lost = false;
  const t0 = performance.now();
  let resolveReady: (ok: boolean) => void = () => {};
  const ready = new Promise<boolean>((r) => (resolveReady = r));

  const onLost = (e: Event) => {
    e.preventDefault();
    lost = true;
    cancelAnimationFrame(raf);
    resolveReady(false);
  };
  canvas.addEventListener("webglcontextlost", onLost);

  const setScene = (
    loc: (n: string) => WebGLUniformLocation | null,
    scene: ReturnType<typeof sceneFor>,
    time: number,
    progress: number
  ) => {
    gl.uniform2f(loc("uRes"), rcW, rcH);
    gl.uniform1f(loc("uTime"), time);
    gl.uniform1f(loc("uProgress"), progress);
    gl.uniform1f(loc("uMotion"), reducedMotion ? 0 : 1);
    gl.uniform2f(loc("gA"), scene.A[0], scene.A[1]);
    gl.uniform2f(loc("gB"), scene.B[0], scene.B[1]);
    gl.uniform2f(loc("gC"), scene.C[0], scene.C[1]);
    gl.uniform2f(loc("gD"), scene.D[0], scene.D[1]);
    gl.uniform1f(loc("gH"), scene.H);
    gl.uniform1f(loc("gTh"), scene.th);
    gl.uniform1f(loc("gL1"), scene.L1);
    gl.uniform1f(loc("gL2"), scene.L2);
    gl.uniform1f(loc("gL"), scene.L);
    gl.uniform3fv(loc("gOcc"), scene.occ);
  };

  const intervals: number[] = [];
  let lastNow = 0;
  const adapt = (now: number) => {
    if (lastNow) intervals.push(now - lastNow);
    lastNow = now;
    if (intervals.length < WINDOW) return;
    const median = [...intervals].sort((a, b) => a - b)[WINDOW >> 1];
    intervals.length = 0;
    if (median > SLOW_FRAME_MS && quality > QUALITY_MIN) {
      quality = Math.max(QUALITY_MIN, quality * QUALITY_STEP);
      fitField();
    }
  };

  const frame = (now: number) => {
    if (disposed || lost) return;
    adapt(now);
    const time = (now - t0) / 1000;
    const progress = clamp01(getProgress ? getProgress() : demoProgress(time));
    const scene = sceneFor(rcW, rcH, reducedMotion ? 0 : time);

    gl.bindVertexArray(vao);

    // Cascades, top down. Each pass reads the previous pass's target.
    gl.useProgram(cascade.program);
    setScene(cascade.loc, scene, time, progress);
    gl.uniform1i(cascade.loc("uUpper"), 0);
    gl.viewport(0, 0, rcW, rcH);
    let write = 0;
    for (let n = CASCADES - 1; n >= 0; n--) {
      const top = n === CASCADES - 1;
      const start = (Math.pow(4, n) - 1) / 3;
      const end = top ? 1e6 : (Math.pow(4, n + 1) - 1) / 3;
      gl.bindFramebuffer(gl.FRAMEBUFFER, targets[write].fbo);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, top ? null : targets[1 - write].tex);
      gl.uniform1i(cascade.loc("uHasUpper"), top ? 0 : 1);
      gl.uniform1i(cascade.loc("uSpacing"), 1 << n);
      gl.uniform1f(cascade.loc("uStart"), start);
      gl.uniform1f(cascade.loc("uEnd"), end);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      write = 1 - write;
    }
    const field = targets[1 - write].tex;

    // Display.
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(display.program);
    setScene(display.loc, scene, time, progress);
    gl.uniform2f(display.loc("uCanvas"), canvas.width, canvas.height);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, field);
    gl.uniform1i(display.loc("uField"), 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    resolveReady(true);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(raf);
    ro.disconnect();
    canvas.removeEventListener("webglcontextlost", onLost);
    resolveReady(false);
    if (!lost) {
      for (const { tex, fbo } of targets) {
        gl.deleteTexture(tex);
        gl.deleteFramebuffer(fbo);
      }
      gl.deleteBuffer(vbo);
      gl.deleteVertexArray(vao);
      gl.deleteProgram(cascade.program);
      gl.deleteProgram(display.program);
      // Browsers cap live WebGL contexts per page, and the page behind this
      // already runs several; hand this one back rather than wait for GC.
      // Deferred, and only once the canvas has actually left the document: a
      // canvas returns the SAME context object for its whole life, lost or not,
      // so losing it on a dispose that is followed by a re-create on the same
      // canvas -- React StrictMode's dev double-mount does exactly that -- hands
      // the new renderer a dead context and every shader fails to compile.
      setTimeout(() => {
        if (!canvas.isConnected) gl.getExtension("WEBGL_lose_context")?.loseContext();
      }, 0);
    }
  };

  return { ready, dispose };
}

/** No WebGL2: the same N and progress, as a canvas-2D stroke with a glow. */
function createFallback({ canvas, getProgress }: Pick<RendererOptions, "canvas" | "getProgress">): Renderer {
  const ctx = canvas.getContext("2d");
  if (!ctx) return { ready: Promise.resolve(false), dispose: () => {} };
  let raf = 0;
  const t0 = performance.now();

  const draw = (now: number) => {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const rect = canvas.getBoundingClientRect();
    const w = Math.round(rect.width * dpr);
    const h = Math.round(rect.height * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    const time = (now - t0) / 1000;
    const p = clamp01(getProgress ? getProgress() : demoProgress(time));

    const H = Math.min(h * 0.36, w * 0.42);
    const W = H * 0.8;
    const cx = w / 2;
    const cy = h / 2;
    const pts: [number, number][] = [
      [cx - W / 2, cy + H / 2],
      [cx - W / 2, cy - H / 2],
      [cx + W / 2, cy + H / 2],
      [cx + W / 2, cy - H / 2],
    ];
    const stroke = (alpha: number, blur: number, fraction: number) => {
      ctx.save();
      ctx.strokeStyle = `rgba(255, 140, 50, ${alpha})`;
      ctx.shadowColor = "rgba(255, 130, 40, 0.9)";
      ctx.shadowBlur = blur;
      ctx.lineWidth = H * 0.15;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      const total = H * 2 + Math.hypot(W, H);
      const dash = total * fraction;
      ctx.setLineDash([dash, total]);
      ctx.beginPath();
      ctx.moveTo(...pts[0]);
      for (const pt of pts.slice(1)) ctx.lineTo(...pt);
      ctx.stroke();
      ctx.restore();
    };

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
    stroke(0.08, 0, 1);
    if (p > 0) stroke(1, H * 0.35, p);
    raf = requestAnimationFrame(draw);
  };
  raf = requestAnimationFrame(draw);

  return { ready: Promise.resolve(false), dispose: () => cancelAnimationFrame(raf) };
}
