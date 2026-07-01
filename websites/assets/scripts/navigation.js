// Section snapping, internal long-section scrolling, nav state, and the render loop.
// Depends on theme.js/globe.js globals: W, H, renderer, camera, globeGroup, and drag state.
// ─────────────────────────────────────────────
// DOM REFERENCES
// ─────────────────────────────────────────────
const canvasEl    = document.getElementById('canvas-container');
const heroText    = document.getElementById('hero-text');
const coordsEl    = document.getElementById('coords');
const snapSections = ['s0','s1','s2','s3','s4'].map(id => document.getElementById(id));
const navLinks    = document.querySelectorAll('.nav-link');
let currentSnapIndex = 0;
let isSnapping = false;
let snapUnlockTimer;
let touchStartY = 0;
let touchLastY = 0;
let touchStartTarget = null;
let touchScrolledInsideSection = false;
let wheelGestureActive = false;
let wheelGestureTimer;
const SNAP_DURATION = 420;
const WHEEL_THRESHOLD = 4;
const WHEEL_GESTURE_END = 180;
const TOUCH_THRESHOLD = 48;
const INTERNAL_KEY_SCROLL = 120;

function documentTop(el) {
  return el.getBoundingClientRect().top + window.scrollY;
}

function nearestSnapIndex() {
  const y = window.scrollY;
  return snapSections.reduce((nearest, section, index) => {
    if (!section) return nearest;
    const currentDistance = Math.abs(documentTop(section) - y);
    const nearestDistance = Math.abs(documentTop(snapSections[nearest]) - y);
    return currentDistance < nearestDistance ? index : nearest;
  }, 0);
}

function snapToSection(index) {
  const nextIndex = Math.max(0, Math.min(index, snapSections.length - 1));
  const target = snapSections[nextIndex];
  if (!target || nextIndex === currentSnapIndex && isSnapping) return;

  const direction = nextIndex - currentSnapIndex;
  const targetScrollEl = target.querySelector('.section-inner');
  if (targetScrollEl && targetScrollEl.scrollHeight > targetScrollEl.clientHeight + 1) {
    if (direction > 0) targetScrollEl.scrollTop = 0;
    if (direction < 0) targetScrollEl.scrollTop = targetScrollEl.scrollHeight - targetScrollEl.clientHeight;
  }

  currentSnapIndex = nextIndex;
  isSnapping = true;
  window.clearTimeout(snapUnlockTimer);
  window.scrollTo({ top: documentTop(target), behavior: 'smooth' });
  snapUnlockTimer = window.setTimeout(() => {
    isSnapping = false;
    currentSnapIndex = nearestSnapIndex();
  }, SNAP_DURATION);
}

function requestedSnapIndex(direction) {
  return Math.max(0, Math.min(currentSnapIndex + direction, snapSections.length - 1));
}

function scrollableAncestor(target) {
  let el = target instanceof Element ? target : target?.parentElement;
  while (el && el !== document.body) {
    const style = window.getComputedStyle(el);
    const canOverflow = style.overflowY === 'auto' || style.overflowY === 'scroll';
    if (canOverflow && el.scrollHeight > el.clientHeight + 1) return el;
    el = el.parentElement;
  }
  return null;
}

function canScrollElement(el, deltaY) {
  if (!el || deltaY === 0) return false;
  const edgeGap = 2;
  if (deltaY > 0) return el.scrollTop + el.clientHeight < el.scrollHeight - edgeGap;
  return el.scrollTop > edgeGap;
}

function activeSectionScrollEl() {
  return snapSections[nearestSnapIndex()]?.querySelector('.section-inner');
}

function scrollActiveSection(deltaY, amount, behavior = 'smooth') {
  const scrollEl = activeSectionScrollEl();
  if (!canScrollElement(scrollEl, deltaY)) return false;
  scrollEl.scrollBy({ top: Math.sign(deltaY) * amount, behavior });
  return true;
}

function updateScrollableSections() {
  document.querySelectorAll('.section-inner').forEach(el => {
    el.classList.toggle('scrollable', el.scrollHeight > el.clientHeight + 1);
  });
}

// Nav link click handlers — jump to that snap section
document.querySelectorAll('.nav-link').forEach(btn => {
  btn.addEventListener('click', () => {
    const el = document.getElementById(btn.dataset.target);
    const index = snapSections.indexOf(el);
    if (index !== -1) snapToSection(index);
  });
});

window.addEventListener('wheel', e => {
  if (e.ctrlKey) return;
  const scrollable = scrollableAncestor(e.target);
  if (scrollable && canScrollElement(scrollable, e.deltaY)) return;

  e.preventDefault();
  window.clearTimeout(wheelGestureTimer);
  wheelGestureTimer = window.setTimeout(() => {
    wheelGestureActive = false;
  }, WHEEL_GESTURE_END);

  if (wheelGestureActive) return;

  const activeScrollEl = !isSnapping ? activeSectionScrollEl() : null;
  if (!isSnapping && canScrollElement(activeScrollEl, e.deltaY)) {
    activeScrollEl.scrollBy({ top: e.deltaY, behavior: 'auto' });
    return;
  }

  if (Math.abs(e.deltaY) < WHEEL_THRESHOLD) return;

  wheelGestureActive = true;
  if (!isSnapping) currentSnapIndex = nearestSnapIndex();
  snapToSection(requestedSnapIndex(Math.sign(e.deltaY)));
}, { passive: false });

window.addEventListener('keydown', e => {
  if (e.target instanceof HTMLElement && (e.target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName))) return;

  const downKeys = ['ArrowDown', 'PageDown'];
  const upKeys = ['ArrowUp', 'PageUp'];
  const handledKeys = [...downKeys, ...upKeys, ' ', 'Home', 'End'];
  if (!handledKeys.includes(e.key)) return;

  e.preventDefault();
  if (!isSnapping) currentSnapIndex = nearestSnapIndex();
  const direction =
    downKeys.includes(e.key) || (e.key === ' ' && !e.shiftKey) ? 1 :
    upKeys.includes(e.key) || (e.key === ' ' && e.shiftKey) ? -1 :
    0;

  if (direction) {
    const amount = e.key.startsWith('Page') || e.key === ' ' ? H() * 0.85 : INTERNAL_KEY_SCROLL;
    if (!isSnapping && scrollActiveSection(direction, amount)) return;
    snapToSection(requestedSnapIndex(direction));
  }
  if (e.key === 'Home') snapToSection(0);
  if (e.key === 'End') snapToSection(snapSections.length - 1);
});

window.addEventListener('touchstart', e => {
  touchStartY = e.touches[0].clientY;
  touchLastY = touchStartY;
  touchStartTarget = e.target;
  touchScrolledInsideSection = false;
}, { passive: true });

window.addEventListener('touchmove', e => {
  const currentY = e.touches[0].clientY;
  const deltaY = touchStartY - currentY;
  const stepY = touchLastY - currentY;
  const scrollable = scrollableAncestor(touchStartTarget);
  if (scrollable && canScrollElement(scrollable, deltaY)) {
    touchScrolledInsideSection = true;
    touchLastY = currentY;
    return;
  }

  const activeScrollEl = activeSectionScrollEl();
  if (canScrollElement(activeScrollEl, stepY)) {
    e.preventDefault();
    activeScrollEl.scrollBy({ top: stepY, behavior: 'auto' });
    touchScrolledInsideSection = true;
    touchLastY = currentY;
    return;
  }

  if (Math.abs(deltaY) > 8) e.preventDefault();
  touchLastY = currentY;
}, { passive: false });

window.addEventListener('touchend', e => {
  const touchEndY = e.changedTouches[0].clientY;
  const deltaY = touchStartY - touchEndY;
  if (touchScrolledInsideSection) return;
  if (Math.abs(deltaY) < TOUCH_THRESHOLD) return;

  if (!isSnapping) currentSnapIndex = nearestSnapIndex();
  snapToSection(requestedSnapIndex(Math.sign(deltaY)));
});

// ─────────────────────────────────────────────
// SCROLL HANDLER
// ─────────────────────────────────────────────
function onScroll() {
  // Update the target scroll position immediately when the user scrolls
  targetScrollY = window.scrollY;

  const vh  = H();
  // For UI elements we still use the direct scroll position to avoid UI feeling disconnected
  const raw = Math.min(targetScrollY / vh, 1);

  // Fade out hero text as user begins scrolling.
  heroText.style.opacity = String(Math.max(0, 1 - raw * 4));

  // Add blur class
  canvasEl.classList.toggle('blurred', raw > 0.25);

  // Highlight active nav link
  let active = 0;
  snapSections.forEach((el, i) => {
    if (el && el.getBoundingClientRect().top <= vh * 0.6) active = i;
  });
  navLinks.forEach((l,i) => {
    const isActive = i === active;
    l.classList.toggle('active', isActive);
    l.toggleAttribute('aria-current', isActive);
  });

  // Reveal the dark panel later than its child text so it doesn't cross the globe
  // during the hero -> first-section transition.
  document.querySelectorAll('.section-backdrop').forEach(el => {
    const rect = el.getBoundingClientRect();
    el.classList.toggle('vis', rect.top < vh * 0.45 && rect.bottom > vh * 0.16);
  });

  // Reveal section elements while they are in view, and hide them again when they leave.
  document.querySelectorAll('.section-label,.section-title,.section-body,.card,.divider,.contact-link').forEach(el => {
    const rect = el.getBoundingClientRect();
    el.classList.toggle('vis', rect.top < vh * 0.88 && rect.bottom > vh * 0.12);
  });
}

window.addEventListener('scroll', onScroll, {passive:true});
window.addEventListener('resize', () => {
  updateScrollableSections();
});
document.querySelectorAll('.section-inner').forEach(el => {
  el.addEventListener('scroll', onScroll, {passive:true});
});

function releasePaintGuard() {
  document.documentElement.classList.add('paint-ready');
  window.setTimeout(() => document.getElementById('paint-guard')?.remove(), 180);
}


// ─────────────────────────────────────────────
// RENDER LOOP
// ─────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);

  if (!isDragging) {
    vel.x *= 0.95; vel.y *= 0.95;
    globeGroup.rotation.x += vel.x;
    globeGroup.rotation.y += vel.y;

    if (autoRotate) {
      globeGroup.rotation.y += 0.0015;
      globeGroup.rotation.x += 0.0003;
    }
  }

  // --- SPRING PHYSICS CALCULATION ---
  // 1. Calculate the distance to the target
  const distance = targetScrollY - currentScrollY;

  // 2. Add force to the velocity based on distance (Tension)
  scrollVelocity += distance * springTension;

  // 3. Apply friction so it eventually stops
  scrollVelocity *= springFriction;

  // 4. Update the current scroll position using the velocity
  currentScrollY += scrollVelocity;

  // 5. Calculate the eased progress using the *smoothed* scroll value
  //    Completes over 1 viewport height so globe is fully transitioned by s1
  const vh = H();
  const raw = Math.min(currentScrollY / vh, 1);
  const e = eio(raw);

  // 6. Zoom camera in as user scrolls (3 at hero → 1.8 at first section)
  camera.position.z = 3 - 1.2 * e;

  // 7. Slide globe from centre to left half of screen
  globeGroup.position.x = worldX(-0.67 * e);

  // 8. Dip globe down mid-transition then back up as it grows
  //    sin(π·e) peaks at e=0.5 (mid-scroll) giving a smooth arc
  const dip = Math.sin(Math.PI * e) * -0.25;  // negative = downward
  const settle = e * -0.1;                      // slight upward lift at full size
  globeGroup.position.y = dip + settle;

  // Update coordinate display
  const lon = Math.abs((globeGroup.rotation.y*180/Math.PI)%360).toFixed(2);
  const lat = Math.abs((globeGroup.rotation.x*180/Math.PI)%180).toFixed(2);
  coordsEl.textContent = lat+'° N  '+lon+'° E';

  renderer.render(scene, camera);
}

targetScrollY = window.scrollY;
currentScrollY = window.scrollY; // snap spring to current position on load
scrollVelocity = 0;
updateScrollableSections();
onScroll();
animate();
requestAnimationFrame(releasePaintGuard);
