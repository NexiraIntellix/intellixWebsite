# Nexira IntelliX — React (Vite)

Marketing site for **Nexira IntelliX**, the IT division of [Nexira Spatial](https://www.nexiraspatial.com/).
Dark canvas, Syne display type, CSS-3D scroll intro.

## Run

    npm install
    npm run dev      # http://localhost:5173
    npm run build    # production bundle in dist/
    npm run preview

No Tailwind, no UI library, no build-time CSS pipeline — React 18 + Vite only.

## The scroll intro

`LaptopZoomHero` is a 340vh section with a sticky 100vh stage. `useZoomProgress`
reports scroll progress `p` (0 → 1) through it, and every visual is a pure
function of `p`:

| range of p | what happens |
| --- | --- |
| 0.00 – 0.02 | closed laptop, "Scroll to enter" hint |
| 0.02 – 0.30 | lid rotates on its hinge from 180° (folded onto the keys) to 60° (upright, facing camera) |
| 0.16 – 0.28 | lid shell fades out, revealing the live page on the display |
| 0.34 – 0.90 | camera zooms in until the screen fills the viewport at exactly 1:1 |
| 0.46 – 0.93 | room lighting, desk glow and bezel fade away |
| 0.965 – 1.00 | real sticky header fades in |

Geometry: the keyboard deck lies in a plane at `rotateX(-60deg)` and the lid
hinges off its back edge, so "closed" is genuinely the lid lying on the keys.
Everything is derived from `startW` (laptop width in px), which keeps the scene
proportional at any viewport size.

`ScreenPage` renders the hero at full viewport dimensions and scales it down by
`startW / vw`, which is why the zoom lands at a pixel-exact 1:1 — the content on
the display and the content after the zoom are the same element.

### Tuning

```jsx
<LaptopZoomHero ... widthRatio={0.44} />   // laptop width as a fraction of the viewport (0.2–0.62)
```

Section height (`340vh`) controls how much scrolling the intro consumes.

## Structure

    src/
      App.jsx                     page composition
      data.js                     all copy + card/program/keyboard data
      index.css                   CSS custom properties, keyframes, hover states
      hooks/useZoomProgress.js    rAF-throttled scroll progress + fade/easing helpers
      components/
        Header.jsx  Logo.jsx  Marquee.jsx  Footer.jsx
        LaptopZoomHero.jsx        the 3D scroll scene
        Keyboard.jsx              keyboard deck + trackpad
        ScreenPage.jsx            the hero shown inside the display
        Capabilities.jsx  Approach.jsx  Programs.jsx  Contact.jsx

Styling is inline style objects + CSS custom properties from `index.css`;
hover/3D-tilt states are the `.nx-*` classes (inline styles can't do `:hover`).

## Design tokens

| token | value | use |
| --- | --- | --- |
| `--ink` | `#05050B` | page background |
| `--ink-2` | `#04040A` | hero stage |
| `--text` / `--text-strong` | `#ECEAFF` / `#F7F5FF` | body / headings |
| `--muted` / `--muted-2` | `#9C9AB8` / `#8F8DAB` | secondary text |
| `--violet` | `#7C5CFF` | primary accent, gradient start |
| `--cyan` | `#22D3EE` | links, gradient end |
| `--lime` | `#B6FF3B` | training accent |
| `--magenta` | `#FF4D9D` | research accent |
| `--amber` / `--periwinkle` | `#FFB020` / `#8AA4FF` | card accents |
| `--hairline` | `rgba(255,255,255,0.07)` | section borders |

Type: **Syne** 600–800 (display), **Instrument Sans** 400–600 (body),
**JetBrains Mono** 400–500 (labels/eyebrows). Loaded from Google Fonts in `index.html`.

## Before going live

- Replace placeholder contact details (`hello@nexiraintellix.com`) in `Footer.jsx`.
- Wire `Contact.jsx`'s `onSubmit` to a real endpoint — it currently only sets local state.
- Programs, durations and start dates in `data.js` are placeholders.
- Add real `<title>`/OG metadata and a favicon in `index.html`.
- `prefers-reduced-motion` disables the ambient animations; the scroll zoom still
  runs — gate it too if you need stricter accessibility.
