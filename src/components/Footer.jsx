/**
 * Footer.
 *
 * Sheet colophon rather than a link dump: who drew it, what it belongs to, and
 * the credits block a technical drawing carries in its corner.
 */
export default function Footer() {
  return (
    <footer style={{ position: "relative", padding: "56px 28px 44px", borderTop: "1px solid var(--hairline)" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", display: "flex", gap: 40, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          {/* Mark centred on the sentence beneath it, not on the column: the
              wrapper shrinks to whichever of the two lines is wider -- the
              tagline -- so the centring is against that line's own width
              rather than against the flex column, which is wider than both.
              The -1px that used to sit on the mark went with the flush
              alignment it corrected. It cancelled the bold 18px N's wider
              left side bearing against the 14.5px T below; centred, the mark
              is placed off its full advance width and both bearings are in
              the measurement, so the same nudge would now throw it a pixel
              left of centre instead of pulling it into line. */}
          <div style={{ display: "inline-block", textAlign: "center" }}>
            <div style={{ fontFamily: "var(--display)", fontWeight: 700, fontSize: 18, letterSpacing: "-0.01em", color: "var(--text-strong)", whiteSpace: "nowrap" }}>
              NEXIRA <span style={{ color: "var(--accent)" }}>INTELLIX</span>
            </div>
            <div style={{ marginTop: 10, fontSize: 14.5, lineHeight: 1.62, color: "var(--muted-2)", maxWidth: "34ch" }}>
              The IT division of Nexira Spatial.
            </div>
          </div>
        </div>

        <nav className="nx-foot-nav" aria-label="Footer">
          <a href="#about">About</a>
          <a href="#work">Capabilities</a>
          <a href="#stack">Approach</a>
          <a href="#programs">Programs</a>
          <a href="#contact">Contact</a>
          <a href="https://www.nexiraspatial.com/" target="_blank" rel="noreferrer">
            Nexira Spatial <span aria-hidden="true">↗</span>
          </a>
          <a href="mailto:info@nexiraspatial.com">info@nexiraspatial.com</a>
        </nav>
      </div>

      {/* NOTE: the MacBook GLB still shipped without a licence file. The
          credit line that used to sit here has been removed, but the question
          has not gone away -- confirm the model's terms before this goes live,
          and if attribution is required it belongs back on this row. */}
      <div
        style={{
          maxWidth: 1240,
          margin: "36px auto 0",
          paddingTop: 24,
          borderTop: "1px solid rgba(255, 255, 255, 0.06)",
          // Was 'JetBrains Mono', which this site never loads -- it had been
          // falling through to whatever generic monospace the OS supplies.
          fontFamily: "var(--mono)",
          fontSize: 12,
          lineHeight: 1.75,
          // Was #4B4A63, a violet-grey left over from the palette before last.
          color: "var(--muted-2)",
          textAlign: "center",
        }}
      >
        © 2026 Nexira IntelliX
      </div>
    </footer>
  );
}
