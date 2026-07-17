// Three.js scene setup and globe construction.
// Depends on three.min.js and theme.js. navigation.js consumes the scene/camera/globe globals below.
// ─────────────────────────────────────────────
// THREE.JS SCENE SETUP
// The three core objects every Three.js scene needs:
//   scene    — the container for all 3D objects
//   camera   — defines what we see and how
//   renderer — draws the scene to a <canvas>
// ─────────────────────────────────────────────

const scene = new THREE.Scene();

// PerspectiveCamera(fov, aspect, near, far)
// fov 55° is slightly narrower than human vision — looks cinematic.
// near/far define the clipping planes: objects outside this range aren't drawn.
const camera = new THREE.PerspectiveCamera(55, W() / H(), 0.1, 1000);
camera.position.z = 3; // pull camera back 3 units so the globe (radius 1) fills the frame

// WebGLRenderer with antialiasing for smooth edges.
// alpha:false (default) — we set a solid clear colour instead of transparency.
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); // cap at 2x to avoid GPU overload on HiDPI screens
renderer.setSize(W(), H());
renderer.setClearColor(THEME.background, 1); // match body background so there's no seam
renderer.clear(true, true, true);
const cvs = renderer.domElement;
cvs.style.background = THEME.background;
cvs.style.display = "block";
document.getElementById("canvas-container").appendChild(cvs);

// ─────────────────────────────────────────────
// GLOBE CONSTRUCTION
// A Group acts as a parent transform — rotating
// the group rotates all children together.
// This is how we spin the whole globe (sphere +
// dots + rings) as one unit.
// ─────────────────────────────────────────────
const globeGroup = new THREE.Group();
scene.add(globeGroup);

// Wireframe sphere — the latitude/longitude grid lines of the globe.
// SphereGeometry(radius, widthSegments, heightSegments)
// 36×24 segments gives enough grid lines without being too dense.
const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(1, 36, 24),
    new THREE.MeshBasicMaterial({
        color: THEME.globeGrid,
        wireframe: true,
        transparent: true,
        opacity: 0.55,
    }),
);
globeGroup.add(sphere);

// SURFACE DOTS — 420 random points scattered over the sphere surface.
// Uses spherical coordinates: phi (polar) and theta (azimuthal).
// Math.acos(2*random-1) gives uniform distribution over the sphere
// (not just random lat/lon which would cluster at the poles).
const dp = [];
for (let i = 0; i < 420; i++) {
    const phi = Math.acos(2 * Math.random() - 1); // polar angle 0→π, uniform
    const theta = 2 * Math.PI * Math.random(); // azimuthal angle 0→2π
    // r=1.002 places dots fractionally above the sphere surface to avoid z-fighting
    dp.push(
        1.002 * Math.sin(phi) * Math.cos(theta), // x
        1.002 * Math.cos(phi), // y
        1.002 * Math.sin(phi) * Math.sin(theta), // z
    );
}
const dg = new THREE.BufferGeometry();
// Float32BufferAttribute(array, itemSize) — itemSize 3 means xyz per point
dg.setAttribute("position", new THREE.BufferAttribute(new Float32Array(dp), 3));
globeGroup.add(
    new THREE.Points(
        dg,
        new THREE.PointsMaterial({
            color: THEME.star,
            size: 0.018,
            transparent: true,
            opacity: 0.8,
        }),
    ),
);

// ORBITAL RINGS — two TorusGeometry rings at different tilt angles.
// Each defined as [rotationX, rotationY, colour, opacity].
// TorusGeometry(radius, tubeRadius, radialSegments, tubularSegments)
// tubeRadius 0.003 makes them hairline thin.
[
    [Math.PI / 2, 0, THEME.globeRing, 0.25],
    [Math.PI / 3, Math.PI / 5, THEME.globeRing, 0.18],
].forEach(([rx, ry, col, op]) => {
    const r = new THREE.Mesh(
        new THREE.TorusGeometry(1.08, 0.003, 2, 120),
        new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op }),
    );
    r.rotation.x = rx;
    r.rotation.y = ry;
    globeGroup.add(r);
});

// STAR FIELD — dense but structured so it reads as depth, not screen dust.
const sp = [];
for (let i = 0; i < 900; i++) {
    const inBand = Math.random() < 0.62;
    const x = (Math.random() - 0.5) * 80;
    const bandY = Math.sin(x * 0.13) * 3.5 + (Math.random() - 0.5) * 9;
    const y = inBand ? bandY : (Math.random() - 0.5) * 80;
    const z = (Math.random() - 0.5) * 80;
    sp.push(x, y, z);
}

const clusterCenters = [
    [22, -10, -24],
    [34, 16, -34],
    [14, 24, -38],
];
const constellationSegments = [];
clusterCenters.forEach(([cx, cy, cz], clusterIndex) => {
    const clusterPoints = [];
    for (let i = 0; i < 42; i++) {
        const spread = clusterIndex % 2 === 0 ? 4.8 : 6.2;
        const x = cx + (Math.random() - 0.5) * spread;
        const y = cy + (Math.random() - 0.5) * spread;
        const z = cz + (Math.random() - 0.5) * spread;
        sp.push(x, y, z);
        if (i < 4) clusterPoints.push([x, y, z]);
    }
    for (let i = 1; i < clusterPoints.length; i++) {
        constellationSegments.push(...clusterPoints[i - 1], ...clusterPoints[i]);
    }
});

const sg = new THREE.BufferGeometry();
sg.setAttribute("position", new THREE.BufferAttribute(new Float32Array(sp), 3));
// Added directly to scene (not globeGroup) so stars don't rotate with the globe
scene.add(
    new THREE.Points(
        sg,
        new THREE.PointsMaterial({
            color: THEME.star,
            size: 2.4,
            sizeAttenuation: false,
            transparent: true,
            opacity: 0.2,
        }),
    ),
);

const cg = new THREE.BufferGeometry();
cg.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(constellationSegments), 3),
);
scene.add(
    new THREE.LineSegments(
        cg,
        new THREE.LineBasicMaterial({
            color: THEME.globeGrid,
            transparent: true,
            opacity: 0.12,
        }),
    ),
);

// ─────────────────────────────────────────────
// DRAG TO ROTATE
// Tracks mouse/touch deltas each frame and
// applies them as rotation velocity to globeGroup.
// Velocity decays (×0.95 per frame) for inertia.
// autoRotate resumes after 2.5s of inactivity.
// ─────────────────────────────────────────────
let isDragging = false,
    prev = { x: 0, y: 0 }, // previous mouse position for delta calculation
    vel = { x: 0, y: 0 }, // rotation velocity (radians/frame)
    autoRotate = true,
    autoTimer;

cvs.addEventListener("mousedown", (e) => {
    isDragging = true;
    autoRotate = false;
    clearTimeout(autoTimer); // cancel any pending auto-rotate resume
    prev = { x: e.clientX, y: e.clientY };
    vel = { x: 0, y: 0 }; // kill existing inertia on new drag
    document.body.classList.add("dragging");
});

window.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    // delta Y controls X rotation (up/down tilts the globe)
    // delta X controls Y rotation (left/right spins the globe)
    vel.x = (e.clientY - prev.y) * 0.005;
    vel.y = (e.clientX - prev.x) * 0.005;
    globeGroup.rotation.x += vel.x;
    globeGroup.rotation.y += vel.y;
    prev = { x: e.clientX, y: e.clientY };
});

// mouseup on window (not canvas) catches releases outside the canvas
window.addEventListener("mouseup", () => {
    isDragging = false;
    document.body.classList.remove("dragging");
    // Resume auto-rotate after 2.5s of no interaction
    autoTimer = setTimeout(() => {
        autoRotate = true;
    }, 2500);
});

// Touch equivalents — same logic, different event API
cvs.addEventListener(
    "touchstart",
    (e) => {
        isDragging = true;
        autoRotate = false;
        clearTimeout(autoTimer);
        prev = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        vel = { x: 0, y: 0 };
    },
    { passive: true },
); // passive:true tells browser we won't call preventDefault — allows scroll

window.addEventListener(
    "touchmove",
    (e) => {
        if (!isDragging) return;
        vel.x = (e.touches[0].clientY - prev.y) * 0.005;
        vel.y = (e.touches[0].clientX - prev.x) * 0.005;
        globeGroup.rotation.x += vel.x;
        globeGroup.rotation.y += vel.y;
        prev = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    },
    { passive: true },
);

window.addEventListener("touchend", () => {
    isDragging = false;
    autoTimer = setTimeout(() => {
        autoRotate = true;
    }, 2500);
});

// Scroll-wheel zoom removed — camera.position.z is now driven
// by scroll progress in the animate loop (hero → first section).

// On resize: update camera aspect ratio and renderer size to match new viewport.
// Without this the scene stretches/compresses on resize.
window.addEventListener("resize", () => {
    camera.aspect = W() / H();
    camera.updateProjectionMatrix(); // must call this after changing camera properties
    renderer.setSize(W(), H());
});

// ─────────────────────────────────────────────
// SCROLL HELPERS (SPRING PHYSICS)
// Defined here but consumed exclusively by navigation.js's animate() loop.
// Both scripts run in the same global scope — there is no module boundary,
// so they share these globals directly.  Any refactor that isolates scripts
// (e.g. ES modules or script defer/async) must migrate these variables into
// the consumer module, otherwise the spring-driven camera zoom + globe slide
// will silently stop working.
// ─────────────────────────────────────────────

// Ease-in-out curve: slow start, fast middle, slow end.
// Maps 0→1 input to 0→1 output with a smooth S-curve.
function eio(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

// Converts a normalised screen fraction (-1 to 1) to Three.js world units.
function worldX(ndc) {
    const fovRad = (55 * Math.PI) / 180;
    const halfH = Math.tan(fovRad / 2) * camera.position.z;
    const halfW = halfH * (W() / H());
    return ndc * halfW;
}

// Globe position state using Spring Physics
let targetScrollY = 0; // The actual scroll position of the window
let currentScrollY = 0; // The smoothed scroll position used for rendering
let scrollVelocity = 0; // The spring velocity

// Spring configuration constants
const springTension = 0.02; // How strongly it pulls toward the target
const springFriction = 0.6; // How much it slows down (must be under 1.0)
