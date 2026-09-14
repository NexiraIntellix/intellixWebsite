/* Legend swatches walk the ramp: one hue, nine lightnesses, the way a
   single-band elevation key is built.

   Written as tokens, not hex. These were literal values and they were the last
   place on the site still painted in the palette before last -- the capability
   chips, the process steps and the layer stack all stayed orange through two
   palette changes because those only moved CSS custom properties and this file
   was never in that path. Through the tokens they follow the palette like
   everything else. */
export const marqueeItems = [
  { label: "Consultancy", color: "var(--text-strong)", dot: "var(--a-6)" },
  { label: "Product development", color: "var(--muted)", dot: "var(--a-8)" },
  { label: "IT training", color: "var(--text-strong)", dot: "var(--a-4)" },
  { label: "Academic support", color: "var(--muted)", dot: "var(--a-9)" },
  { label: "Data & AI", color: "var(--text-strong)", dot: "var(--a-5)" },
  { label: "Cloud & DevOps", color: "var(--muted)", dot: "var(--a-7)" },
  { label: "GIS & remote sensing", color: "var(--text-strong)", dot: "var(--a-3)" },
  { label: "Internships", color: "var(--muted)", dot: "var(--a-8)" }
];

export const capabilities = [
  { title: "Academic & research support", body: "Methodology, reproducible pipelines, analysis and the figures that carry your argument.", chip: "linear-gradient(140deg,var(--a-9),var(--a-5))" },
  { title: "Web & mobile applications", body: "Responsive web apps and cross-platform mobile builds — design, build, release, maintain.", chip: "linear-gradient(140deg,var(--a-8),var(--a-4))" },
  { title: "Custom product development", body: "Internal tools and client platforms built in checkpointed increments, handed over documented.", chip: "linear-gradient(140deg,var(--a-7),var(--a-3))" },
  { title: "IT trainings & certifications", body: "Cohort-based upskilling taught on live projects by engineers who are currently delivering client work.", chip: "linear-gradient(140deg,var(--a-6),var(--a-2))" },
  { title: "Agentic AI & Data analytics", body: "Agents that do real work inside your systems, and models judged on honest evaluation rather than a demo.", chip: "linear-gradient(140deg,var(--a-5),var(--a-1))" },
  { title: "Cloud & DevOps", body: "Containerised services, automated pipelines, real monitoring and cloud bills you can explain.", chip: "linear-gradient(140deg,var(--a-4),var(--a-1))" },
  { title: "Internships & mentorship", body: "Structured placements on live work with a named mentor and a written reference at the end.", chip: "linear-gradient(140deg,var(--a-3),var(--a-1))" }
];

export const steps = [
  { n: "01", title: "Discovery", body: "A short call, then a written summary of the problem as we understand it.", color: "var(--a-4)" },
  { n: "02", title: "Proposal", body: "Fixed scope, timeline and cost. You approve before anything starts.", color: "var(--a-6)" },
  { n: "03", title: "Delivery", body: "Weekly checkpoints with working output, not status reports.", color: "var(--a-8)" },
  { n: "04", title: "Handover", body: "Documentation, training and a support window so nothing stalls after launch.", color: "var(--a-9)" }
];

export const layers = [
  { label: "Handover", bg: "linear-gradient(150deg,var(--a-9),var(--a-6))", z: 150 },
  { label: "Delivery", bg: "linear-gradient(150deg,var(--a-8),var(--a-5))", z: 100 },
  { label: "Proposal", bg: "linear-gradient(150deg,var(--a-6),var(--a-3))", z: 50 },
  { label: "Discovery", bg: "linear-gradient(150deg,var(--a-5),var(--a-2))", z: 0 }
];

/* The stack, grouped by discipline.
 *
 * Ordered so the colour walks the ramp light-to-dark down the row, the way the
 * capability chips do -- the groups are parallel, so the ramp is giving the row
 * a direction to read in, not ranking anything.
 *
 * NOTE: derived from the capabilities this site already claims, not from an
 * inventory anyone confirmed. Every name here is a public statement about what
 * the team works in, so it wants a pass from someone who knows.
 */
export const skills = [
  {
    group: "Web & mobile",
    color: "var(--a-9)",
    items: [
      { name: "React", logo: "react" },
      { name: "Next.js", logo: "nextjs" },
      { name: "React Native", logo: "reactnative" },
      { name: "Flutter", logo: "flutter" }
    ]
  },
  {
    group: "Backend & data",
    color: "var(--a-8)",
    items: [
      { name: "Node.js", logo: "nodejs" },
      { name: "Python", logo: "python" },
      { name: "FastAPI", logo: "fastapi" },
      { name: "PostgreSQL", logo: "postgresql" }
    ]
  },
  {
    group: "Cloud & DevOps",
    color: "var(--a-7)",
    items: [
      // No marks: simple-icons carries none for Amazon or Microsoft, both on
      // trademark grounds. A lettered tile beats a logo drawn from memory,
      // which would be a wrong version of someone's trademark.
      { name: "AWS", logo: null },
      { name: "Azure", logo: null },
      { name: "Docker", logo: "docker" }
    ]
  },
  {
    group: "AI & analytics",
    color: "var(--a-6)",
    items: [
      { name: "LangChain", logo: "langchain" },
      { name: "LangGraph", logo: "langgraph" },
      { name: "Claude", logo: "claude" }
    ]
  }
];

/* Unmounted: the Programs section was replaced by Skills. Kept so the course
   copy is not lost if it comes back. */
export const programs = [
  { track: "Development", name: "Full-stack web development", desc: "Build and deploy a complete production application, front to back.", weeks: "12 weeks", mode: "Online cohort", accent: "var(--a-5)", bg: "linear-gradient(160deg,rgba(201, 114, 44,0.15),rgba(12,8,5,0.9))" },
  { track: "Data & AI", name: "Data analytics with Python", desc: "Turn messy real datasets into analysis and dashboards leaders read.", weeks: "8 weeks", mode: "Hybrid", accent: "var(--a-6)", bg: "linear-gradient(160deg,rgba(232, 135, 58,0.15),rgba(12,8,5,0.9))" },
  { track: "Geospatial", name: "GIS & spatial data with Python", desc: "Spatial analysis and web mapping, taught with the Nexira Spatial team.", weeks: "10 weeks", mode: "Hybrid", accent: "var(--a-7)", bg: "linear-gradient(160deg,rgba(240, 164, 104,0.15),rgba(12,8,5,0.9))" },
  { track: "Academic", name: "Research computing bootcamp", desc: "For postgraduates and labs: reproducible workflows, defensible analysis.", weeks: "4 weeks", mode: "On campus", accent: "var(--a-8)", bg: "linear-gradient(160deg,rgba(246, 194, 150,0.15),rgba(12,8,5,0.9))" }
];

const keyRow = (labels, flexes, h, fs) => ({
  h,
  fs,
  keys: labels.map((label, i) => {
    const flex = (flexes && flexes[i]) || 1;
    return { label, flex, justify: flex > 1.6 ? "flex-start" : "center" };
  })
});

export const keyboardRows = [
  keyRow(["esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12", "\u23FB"], null, "0.72em", "0.32em"),
  keyRow(["~", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", "\u232B"], [1,1,1,1,1,1,1,1,1,1,1,1,1,1.7], "1.05em", "0.42em"),
  keyRow(["\u21E5", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\"], [1.5,1,1,1,1,1,1,1,1,1,1,1,1,1.2], "1.05em", "0.42em"),
  keyRow(["\u21EA", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "return"], [1.7,1,1,1,1,1,1,1,1,1,1,1,2], "1.05em", "0.42em"),
  keyRow(["\u21E7", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "\u21E7"], [2.2,1,1,1,1,1,1,1,1,1,1,2.2], "1.05em", "0.42em"),
  keyRow(["fn", "\u2303", "\u2325", "\u2318", "", "\u2318", "\u2325", "\u25C2", "\u25BE", "\u25B8"], [1,1,1,1.3,6.4,1.3,1,1,1,1], "1.05em", "0.42em")
];

export const contactReasons = [
  "I want to enrol in a training program",
  "I need consultancy or an audit",
  "I want a product built",
  "I need academic / research support",
  "Internship or career enquiry"
];
