// Shared runtime theme bridge.
// Loaded before globe.js/navigation.js so JavaScript uses the same CSS tokens as the stylesheets.
// ─────────────────────────────────────────────
// UTILITY: live viewport dimensions as functions
// so they always reflect the current window size
// rather than values captured at load time.
// ─────────────────────────────────────────────
const W = () => window.innerWidth;
const H = () => window.innerHeight;
const rootStyles = getComputedStyle(document.documentElement);
const cssVar = name => rootStyles.getPropertyValue(name).trim();
const THEME = {
  background: cssVar('--color-bg'),
  accent: cssVar('--color-accent'),
  globeGrid: cssVar('--color-globe-grid'),
  globeRing: cssVar('--color-globe-ring'),
  star: cssVar('--color-star'),
};
