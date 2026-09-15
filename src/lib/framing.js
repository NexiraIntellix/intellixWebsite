/**
 * One fact about lenses, shared by both of the hero's cameras.
 *
 * A three.js perspective camera's `fov` is VERTICAL. The horizontal extent it
 * sees is that angle scaled by the aspect ratio, so a phone held upright sees
 * barely a third of the width a laptop does from the same spot -- and any
 * subject with a fixed size in world units grows to fill that frame and then
 * past it. Both the MacBook and the point cloud were composed on a wide screen
 * and both overran a narrow one for this reason.
 *
 * Correcting it completely would mean distance proportional to 1/aspect, which
 * at 0.61 is 2.6x: the subject becomes a chip in the middle of a tall empty
 * frame. The vertical framing is already right on a phone; only the horizontal
 * is wrong. A fractional power takes the overflow off the sides while costing
 * little height, and 0.65 is the value measured to clear every handset aspect
 * from 0.46 (a 393x852 handset) to 0.62 (the same phone with browser chrome).
 *
 * Above 1.0 it is the identity, so every landscape frame -- phone or desktop --
 * keeps the pose that was composed for it.
 */
const REF_ASPECT = 1.0;
const NARROW_EXP = 0.65;

export function narrowPull(aspect) {
  if (!Number.isFinite(aspect) || aspect <= 0) return 1;
  return aspect >= REF_ASPECT ? 1 : Math.pow(REF_ASPECT / aspect, NARROW_EXP);
}

/** Move `pos` away from `look` by the pull factor, so the aim stays put.
 *  `strength` scales the correction in log space: 1 is the full pull, 0 none.
 *  The point cloud takes less than the MacBook, because on a phone its copy
 *  sits on top of it -- it only has to stop overrunning the frame, not clear it. */
export function pullBack(pos, look, aspect, strength = 1) {
  const k = Math.pow(narrowPull(aspect), strength);
  if (k === 1) return pos;
  return pos.map((v, i) => look[i] + (v - look[i]) * k);
}
