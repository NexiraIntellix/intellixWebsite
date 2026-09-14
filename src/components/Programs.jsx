import { programs } from "../data.js";
import { useReveal } from "../hooks/useReveal.js";

const weeksOf = (s) => parseInt(s, 10) || 0;
const MAX_WEEKS = Math.max(...programs.map((p) => weeksOf(p.weeks)));
const AXIS = [0, 4, 8, 12];

/**
 * Programs as a schedule profile.
 *
 * Four equal cards gave every program the same visual weight and buried the one
 * fact a person choosing between them actually needs: how long it takes. The
 * durations are real and they differ by 3x -- four weeks against twelve -- so
 * the bar is not a decoration, it is the comparison, and reading down the
 * column answers "which of these fits my term" without doing arithmetic.
 */
export default function Programs() {
  const [ref, shown] = useReveal({ threshold: 0.12 });

  return (
    <section id="programs" ref={ref} className="nx-full" style={{ position: "relative", padding: "clamp(76px,10vh,124px) 28px", borderTop: "1px solid var(--hairline)" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto" }}>
        <h2 style={{ margin: 0, fontFamily: "var(--display)", fontWeight: 700, fontSize: "clamp(30px,4.2vw,54px)", lineHeight: 1.02, letterSpacing: "-0.035em", color: "var(--text-strong)", textWrap: "balance" }}>
          Programs that end in real work
        </h2>

        <div className="nx-sched" style={{ marginTop: 44 }}>
          {/* Scale. Without it the bars are relative lengths with no unit, which
              is a chart that looks quantitative and is not. */}
          <div className="nx-sched-axis" aria-hidden="true">
            <div className="nx-sched-axis-inner">
              {AXIS.map((w) => (
                <span key={w} className="nx-sched-tick" style={{ left: `${(w / MAX_WEEKS) * 100}%` }}>
                  <i />
                  {w === 0 ? "start" : `${w}w`}
                </span>
              ))}
            </div>
          </div>

          {programs.map((p, i) => {
            const w = weeksOf(p.weeks);
            const pct = (w / MAX_WEEKS) * 100;
            return (
              <a
                key={p.name}
                href="#contact"
                className="nx-sched-row"
                style={{ "--accent": p.accent }}
              >
                <div className="nx-sched-meta">
                  <span className="nx-sched-track">{p.track}</span>
                  <h3 className="nx-sched-name">{p.name}</h3>
                  <p className="nx-sched-desc">{p.desc}</p>
                </div>

                <div className="nx-sched-plot">
                  <div
                    className="nx-sched-bar"
                    style={{
                      width: shown ? `${pct}%` : "0%",
                      transitionDelay: `${140 + i * 110}ms`,
                    }}
                  >
                    <span className="nx-sched-weeks">{p.weeks}</span>
                  </div>
                </div>

                <div className="nx-sched-mode">
                  <span>{p.mode}</span>
                  <span className="nx-sched-go" aria-hidden="true">Enrol →</span>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
