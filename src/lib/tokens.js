/**
 * Read a design token as a real value.
 *
 * The CSS layer resolves tokens for free, but WebGL cannot: three.js wants a
 * concrete colour string, and `var(--a-6)` means nothing to it. So the scenes
 * read their palette off the document once, at construction.
 *
 * Once is enough: the palette is fixed at build time now, so there is nothing
 * to re-read. Anything that changed it at runtime would have to rebuild these
 * materials, which is why the switcher that used to do so reloaded the page.
 */
export function token(name, fallback) {
  if (typeof document === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}
