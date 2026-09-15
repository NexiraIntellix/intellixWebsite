import { easeInOut } from "../../hooks/useZoomProgress.js";
import { pullBack } from "../../lib/framing.js";

/**
 * Camera keyframes for the MacBook hero, in WORLD units (metres — the model is
 * at real-world scale, 0.312m wide).
 *
 * Screen geometry, measured off the GLB rather than eyeballed: the display mesh
 * is the one whose material carries the emissive wallpaper map. Its world-space
 * centre, size and facing are below, and the closing shot is placed along that
 * normal so the camera arrives square to the display.
 */
export const SCREEN_CENTER = [0, 0.1053, -0.1514];
export const SCREEN_NORMAL = [0, 0.3421, 0.9397];
export const SCREEN_W = 0.3008;
export const SCREEN_H = 0.1956;

/** Model rests on this plane (its bbox floor). */
export const FLOOR_Y = -0.0094;

const LAPTOP_CENTER = [0, 0.096, -0.03];

// Orbit positions, as (azimuth, elevation, distance) from LAPTOP_CENTER.
//
// WIDE opens at 26 degrees of azimuth and 15 of elevation, 1.05m out.
//
// It was 42/21, and the swing was the reason -- more angle at the start means
// more travel toward head-on. But at 42 degrees the lid face projects to 74% of
// its true width and the near side of the base becomes a sliver, so a word
// crossing that edge overlaps almost nothing and reads as sitting beside the
// machine rather than behind it. At 26 the lid reads at 90% and both edges have
// real mass to pass behind, which is the whole point of putting the type there.
// MID is at 12 degrees, so this still leaves 14 degrees of swing.
//
// The lower elevation is the other half: 21 degrees looks down onto the
// keyboard deck, 15 puts the eye nearer the desk and the screen more square to
// it, which is the register of a product shot rather than a desk photo.
export const WIDE_POS = [0.445, 0.368, 0.882];

/* WIDE aims slightly below the subject, and slightly to its right.

   The drop keeps the whole object in frame rather than hung low with dead
   headroom above the lid.

   The sideways term is half a correction, deliberately. At 26 degrees of
   azimuth the open lid sits about 7vw right of the chassis it stands on, so
   the two cannot both be centred: centre the machine and the lid reads at
   56.9vw, centre the lid and the machine visibly slides left. The wordmark
   runs at the lid's height, so the lid is what it has to straddle -- but the
   machine is what the eye reads as the subject, and a subject 7vw off centre
   looks like a mistake rather than a decision.

   This takes none of it: the machine sits centred, which is what the eye is
   actually judging, and the wordmark's own nudge carries the whole correction
   so the gap still lands on the lid. The cost is that the two overlaps are no
   longer equal -- the lid's own offset has to come out of one side -- and it
   comes out of INTELLIX, which is the half with room to spare. */

/* Scaled by aspect because it must be: the value is a distance in metres but
   what it needs to be is a constant fraction of the FRAME, and a phone held
   upright sees barely a quarter of the width a desktop does at the same
   distance. Fixed, an earlier version of this moved the machine 10% of a 16:9
   frame and 38% of a 393px one, shoving it off the edge. */
const WIDE_LOOK_X_PER_ASPECT = 0;
const WIDE_LOOK_Y = 0.088;
const WIDE_LOOK_Z = -0.02;

/* How far back the camera stands, as a function of the frame's shape. The rule
 * itself lives in lib/framing.js, because the point cloud's camera needs the
 * same correction for the same reason -- see the note there. */
const REF_ASPECT = 1.0;

/* Pulling back exposes an offset that a cropped frame was hiding: the machine
 * does not sit centred, it sits about 27px right of centre on every handset
 * width measured. That is the open lid's own lean -- on a wide frame the
 * wordmark absorbs it (see the note above), but on a phone the mark is in
 * front and centred, so there is nothing to absorb it and the shot just looks
 * off. A couple of millimetres of aim covers it, and the same value works from
 * 0.46 to 0.62 because what it has to cancel scales with the frame the same
 * way the frame's own width does.
 *
 * 0.012, not the 0.034 this first shipped with: that overshot, and on a 338px
 * phone the machine landed about 18px LEFT of centre instead of 27px right.
 * Tuned against the render in two passes; this lands the
 * machine within about 2px of centre on a 338px phone, in line with the
 * loading drawing that crossfades into it. */
const NARROW_LOOK_X = 0.012;

const wideAt = (aspect) => {
  const look = [
    WIDE_LOOK_X_PER_ASPECT * aspect + (aspect < REF_ASPECT ? NARROW_LOOK_X : 0),
    WIDE_LOOK_Y,
    WIDE_LOOK_Z,
  ];
  // Scaled about the point it is aiming at, so pulling back reframes rather
  // than slides: the same spot stays in the middle of the shot.
  return { pos: pullBack(WIDE_POS, look, aspect), look, fov: 32 };
};
const MID = { pos: [0.127, 0.204, 0.557], look: [0, 0.103, -0.11], fov: 32 };

/**
 * Progress window over which the camera actually travels.
 *
 * FLY_START is 0: every 1% of dead zone here is scrolling that visibly does
 * nothing. It used to be 0.1, which cost a quarter of a viewport of scroll
 * before the laptop so much as twitched.
 *
 * FLY_END is on the *fly-in's own* 0->1 scale, not the hero section's. Every
 * threshold in Macbook.jsx and ScreenSurface.jsx is calibrated against this
 * number, so it must not move; Hero3D remaps the section's scroll onto this
 * scale instead (see `flyP` there).
 */
export const FLY_START = 0.0;
export const FLY_END = 0.84;

/**
 * Hero section height, and the point in *section* progress at which the laptop
 * fly-in finishes and the point cloud takes over.
 *
 * Sized so the fly-in keeps its original physical length (0.48 * 460vh = 221vh,
 * against 218vh before it moved), leaving ~239vh for the cloud.
 *
 * The cloud needs far less room than the image sequence it replaced. That was
 * 272 discrete frames, which had to be spread thin enough that stepping between
 * them read as motion; this interpolates continuously, so the constraint is only
 * how long the three states want to take. 700vh dropped to 560vh with the
 * transition reading slower, not faster.
 */
export const HERO_VH = 560;
export const SEQ_START = 0.48;

const lerp = (a, b, t) => a + (b - a) * t;
const lerp3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

/**
 * Easing for the fly-in.
 *
 * Plain ease-in-out has zero velocity at t=0, so even with no dead zone the
 * first stretch of scrolling reads as nothing happening. Blending in a linear
 * term gives the curve real initial speed — the laptop responds to the very
 * first wheel notch — while the ease-in-out still carries the smooth landing.
 */
const LEAD = 0.4;
const ease = (t) => LEAD * t + (1 - LEAD) * easeInOut(t);

/**
 * Distance at which the display exactly covers a viewport of the given aspect.
 *
 * Computed rather than hard-coded because which axis binds flips with aspect: a
 * wide window is limited by the screen's width, a tall one by its height. The
 * 3% overshoot guarantees full cover despite the camera's per-frame easing.
 */
export function closeDistance(aspect, fovDeg) {
  const fov = (fovDeg * Math.PI) / 180;
  const visibleHeight = Math.min(SCREEN_H, SCREEN_W / Math.max(aspect, 0.0001));
  return (visibleHeight / (2 * Math.tan(fov / 2))) * 0.97;
}

const CLOSE_FOV = 32;

/** A point on the screen's normal axis, `d` metres out, looking straight at it.
 *  Anywhere on this axis the display is dead square to the camera. */
function onAxis(d) {
  return {
    pos: [
      SCREEN_CENTER[0] + SCREEN_NORMAL[0] * d,
      SCREEN_CENTER[1] + SCREEN_NORMAL[1] * d,
      SCREEN_CENTER[2] + SCREEN_NORMAL[2] * d
    ],
    look: SCREEN_CENTER,
    fov: CLOSE_FOV
  };
}

/**
 * Where the camera meets the screen's normal axis — far enough out that the
 * whole machine is still in frame, so arriving here reads as squaring up to the
 * laptop rather than as a jump.
 */
const ALIGN_DIST = 0.55;

export function closeCamera(aspect) {
  return onAxis(closeDistance(aspect, CLOSE_FOV));
}

// Segment boundaries in eased time. The last segment gets the largest share
// because it is the one the viewer actually reads as "zooming into the screen".
const T_MID = 0.4;
const T_ALIGN = 0.68;

/**
 * Three-segment path: swing from the three-quarter establishing angle toward
 * head-on (WIDE→MID), settle onto the screen's normal axis (MID→ALIGN), then
 * dolly straight down that axis until the display fills the frame
 * (ALIGN→CLOSE).
 *
 * The third segment exists because a straight lerp from an off-axis point to
 * CLOSE is only square to the display at the very last instant — so the screen
 * spends the whole of its frame-filling phase visibly skewed. Travelling along
 * the normal keeps it plane-parallel with the viewport for that entire stretch,
 * which is what makes the handoff to the DOM page invisible.
 */
export function cameraAt(p, aspect) {
  const WIDE = wideAt(aspect);
  const ALIGN = onAxis(ALIGN_DIST);
  const CLOSE = closeCamera(aspect);
  const t = ease(Math.min(1, Math.max(0, (p - FLY_START) / (FLY_END - FLY_START))));

  if (t < T_MID) {
    const k = t / T_MID;
    return { pos: lerp3(WIDE.pos, MID.pos, k), look: lerp3(WIDE.look, MID.look, k), fov: lerp(WIDE.fov, MID.fov, k) };
  }
  if (t < T_ALIGN) {
    const k = (t - T_MID) / (T_ALIGN - T_MID);
    return { pos: lerp3(MID.pos, ALIGN.pos, k), look: lerp3(MID.look, ALIGN.look, k), fov: lerp(MID.fov, ALIGN.fov, k) };
  }
  const k = (t - T_ALIGN) / (1 - T_ALIGN);
  return { pos: lerp3(ALIGN.pos, CLOSE.pos, k), look: SCREEN_CENTER, fov: lerp(ALIGN.fov, CLOSE.fov, k) };
}
