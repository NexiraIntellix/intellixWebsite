import { useMemo } from "react";
import { buildContours } from "../lib/contours.js";

/**
 * The page's connective tissue: isolines of the hero's own terrain, drawn in
 * plan behind the sections below it.
 *
 * Deliberately not a per-section decoration. One field spans the lower page and
 * each section sits on a different stretch of it, which is what makes the page
 * read as a single sheet rather than as a stack of unrelated blocks.
 */
export default function ContourField({
  tint = "124,92,255",
  opacity = 1,
  offsetY = 3.1,
  height = 620,
  /* Sampling density. The default is right for a field spanning a section; a
     card-sized patch is drawn a quarter the width and does not need it -- and
     marching squares costs grid area, so seven of these at full density is a
     visible hitch on mount for detail nobody can resolve at 255px. */
  cols,
  rows,
  style,
}) {
  const paths = useMemo(
    () => buildContours({ width: 1000, height, offsetY, cols, rows }),
    [height, offsetY, cols, rows]
  );

  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 1000 ${height}`}
      preserveAspectRatio="xMidYMid slice"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        opacity,
        ...style,
      }}
    >
      {paths.map((d, i) => {
        // Index contours: every third line heavier, the convention on a real
        // topographic sheet and the thing that stops a contour field reading as
        // uniform hatching.
        const index = i % 3 === 0;
        return (
          <path
            key={i}
            d={d}
            fill="none"
            stroke={`rgba(${tint},${index ? 0.30 : 0.14})`}
            strokeWidth={index ? 1.15 : 0.7}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
    </svg>
  );
}
