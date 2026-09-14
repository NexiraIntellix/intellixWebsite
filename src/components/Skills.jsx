import { skills } from "../data.js";
import { logos } from "../lib/logos.js";
import { useReveal } from "../hooks/useReveal.js";

/* How long the light takes to cross the whole grid, once. */
const SWEEP_S = 7;

/* The grid is locked to seven tiles a row above 760px (see index.css), so a
   tile's row and column are known from its index alone -- no measuring. */
const COLS = 7;

/* One flat field of tools, still ordered by discipline so related things sit
   together, and each tile carrying its group's ramp colour for the glow. */
const TOOLS = skills.flatMap((g) =>
  g.items.map((item) => ({
    ...item,
    band: g.color,
    brand: item.logo ? logos[item.logo]?.hex : null
  }))
);

/* Staggered along the diagonal rather than along the index.
 *
 * Delaying tile by tile lit one at a time, which at thirteen tiles reads as
 * the occasional flicker rather than as anything crossing. Grouping by
 * row + column lights a whole diagonal at once, so what moves over the grid is
 * a band with a direction -- top-left to bottom-right, the way the eye is
 * already travelling.
 *
 * The offset counts down from the last diagonal: a negative animation-delay
 * starts a tile further into its cycle, so a delay that grows with rank would
 * make later diagonals light sooner and run the wave backwards. */
const RANKS = TOOLS.map((_, i) => Math.floor(i / COLS) + (i % COLS));
const LAST = Math.max(...RANKS);

const SWEPT = TOOLS.map((t, i) => ({
  ...t,
  delay: `${(-(LAST - RANKS[i]) / (LAST + 1)) * SWEEP_S}s`
}));

/** Initials for a tool with no mark: AWS -> AWS, Azure -> AZ, Power BI -> PB. */
function monogram(name) {
  if (name === name.toUpperCase()) return name.slice(0, 3);
  const words = name.split(/[\s.&-]+/).filter(Boolean);
  // One word gives one initial, and a lone "A" next to "AWS" reads as a
  // rendering fault rather than a mark. Two letters for single-word names.
  return (words.length === 1 ? words[0].slice(0, 2) : words.map((w) => w[0]).join("").slice(0, 2)).toUpperCase();
}

function Mark({ item }) {
  const icon = item.logo ? logos[item.logo] : null;

  // No invented trademark: simple-icons carries no Amazon mark, so AWS gets
  // letters rather than a logo drawn from memory.
  if (!icon) {
    return <span className="nx-tool-mono" aria-hidden="true">{monogram(item.name)}</span>;
  }

  return (
    <svg className="nx-tool-mark" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={icon.path} />
    </svg>
  );
}

/**
 * The stack, as one field of marks.
 *
 * Centred eyebrow over a centred statement is the About section's construction,
 * not the reference's -- using the page's own idiom is what keeps this from
 * reading as a component lifted from somewhere else.
 *
 * The marks carry their real brand colours, which is the one place this page
 * lets a second hue in. They are held slightly back from full saturation at
 * rest: thirteen logos at full strength on a warm ground fight both it and each
 * other, and the difference between 80% and 100% is exactly the headroom the
 * hover and the sweep need to register.
 *
 * The sweep is a diagonal band of light crossing the grid every seven seconds,
 * lifting each mark it reaches to full colour with a glow behind it. Pointing
 * at a tile takes it off the clock and pins it.
 *
 * The tiles wrap centred rather than sitting in a fixed column count, so
 * thirteen tools -- or eleven, or twenty -- never leave a half-empty last row
 * hanging off to the left.
 */
export default function Skills() {
  const [ref, shown] = useReveal({ threshold: 0.1 });

  return (
    <section
      id="skills"
      ref={ref}
      className="nx-full is-top"
      style={{
        position: "relative",
        /* Deeper at the top than the other sections. Their content is centred,
           so nothing of theirs ever sits near the fixed nav; this one starts at
           the top, and the standard 10vh left the eyebrow 22px under the pill.
           This clears it by about the pill's own height. */
        padding: "var(--nx-skills-pad-t, clamp(124px,15vh,176px)) 28px var(--nx-skills-pad-b, clamp(76px,10vh,124px))",
        borderTop: "1px solid var(--hairline)"
      }}
    >
      <div className="nx-stack-inner">
        <p className="nx-stack-eyebrow">Skills &amp; stack</p>

        <h2 className="nx-stack-head">Working with the tools your team will inherit</h2>

        <ul className={"nx-stack-grid" + (shown ? " is-live" : "")}>
          {SWEPT.map((item, i) => (
            <li
              key={item.name}
              className="nx-tool"
              style={{
                "--i": i,
                "--delay": item.delay,
                "--band": item.band,
                // Unset for a tool with no mark, so the glow falls back to the
                // group colour rather than to nothing.
                ...(item.brand ? { "--brand": item.brand } : null)
              }}
            >
              <span className="nx-tool-slab">
                <Mark item={item} />
              </span>
              <span className="nx-tool-name">{item.name}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
