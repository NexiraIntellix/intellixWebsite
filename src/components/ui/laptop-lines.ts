/**
 * The hero MacBook at rest, as line art.
 *
 * Traced off the rendered hero at a 1920x955 window (canvas 1910 wide once the
 * scrollbar is taken), so the coordinates are that canvas's pixels and the
 * viewBox is the canvas itself.
 *
 * Why one trace fits every landscape window: the hero camera's pose and its
 * vertical field of view do not change with aspect above 1:1, so a point on
 * the model lands at the same offset from the canvas centre, in units of
 * canvas height, at every size. Measured by projecting the model through the
 * live camera at 1920x955, 1440x900, 1280x620 and 1024x768 -- identical to
 * four decimal places. Portrait frames are pulled back by lib/framing.js and
 * the loader applies the same factor.
 *
 * It will not match to the pixel at any given instant, and cannot: the model
 * floats (Macbook.jsx -- a slow bob, a slight roll, a lean toward the
 * pointer), so "at rest" is a small range, not a pose. This is traced inside
 * that range.
 */

export const REF_WIDTH = 1910;
export const REF_HEIGHT = 955;

export type LaptopPart = {
  id: string;
  d: string;
  /** Span of overall progress over which this part draws, [start, end] in 0..1. */
  span: [number, number];
  /** Fainter parts are detail; full-strength parts are the silhouette. */
  weight: "outline" | "detail";
};

type Pt = [number, number];
const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const f = (p: Pt) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;

// Keyboard well corners: back-left, back-right, front-right, front-left.
const KB: [Pt, Pt, Pt, Pt] = [
  [820, 546],
  [1195, 592.5],
  [1150, 652.5],
  [740, 589],
];

/* Key rows: lines across the well, parallel to its back edge. */
const keyRows = Array.from({ length: 5 }, (_, i) => {
  const t = (i + 1) / 6;
  return `M${f(lerp(KB[0], KB[3], t))} L${f(lerp(KB[1], KB[2], t))}`;
}).join(" ");

export const LAPTOP_PARTS: LaptopPart[] = [
  {
    id: "lid",
    // Rounded at the two top corners, square at the hinge.
    d: "M860.5 259 Q861 250 869 250.5 L1263 271 Q1271.5 272 1270.5 281 L1232.5 575 L820 535 Z",
    span: [0, 0.3],
    weight: "outline",
  },
  {
    id: "screen",
    d: "M868 258 L1262 278 L1234 563 L823 522 Z",
    span: [0.14, 0.42],
    weight: "detail",
  },
  {
    id: "deck",
    d: "M817.5 536 L1227.5 580 L1115 722 Q1110 727 1102 725 L646 641 Q638 638.5 640 634 Z",
    span: [0.3, 0.6],
    weight: "outline",
  },
  {
    id: "base-edge",
    // The slab's thickness: down the front-left corner, along the underside,
    // and back up the right side to the hinge.
    d: "M640 634 L642 645 Q645 649 652 650 L1106 733 Q1114 734 1119 727 L1231 589 L1227.5 580",
    span: [0.44, 0.72],
    weight: "outline",
  },
  {
    id: "keyboard",
    d: `M${f(KB[0])} L${f(KB[1])} L${f(KB[2])} L${f(KB[3])} Z`,
    span: [0.56, 0.8],
    weight: "detail",
  },
  {
    id: "keys",
    d: keyRows,
    span: [0.68, 0.9],
    weight: "detail",
  },
  {
    id: "trackpad",
    d: "M825 610 L1017.5 637.5 L965 682.5 L767.5 647.5 Z",
    span: [0.74, 0.94],
    weight: "detail",
  },
  {
    id: "notch",
    d: "M817 667 Q857 675 898 682",
    span: [0.86, 1],
    weight: "detail",
  },
];
