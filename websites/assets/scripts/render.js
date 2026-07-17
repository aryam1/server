// Data-driven section + nav renderer.
// Fetches profile.json, builds nav rail and content sections,
// then notifies navigation.js to bind new scroll listeners.
// ─────────────────────────────────────────────

const NAV_ICONS = {
    "home": `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11.5 12 5l8 6.5"/><path d="M6.5 10.5V19h11v-8.5"/></svg>`,
    "info": `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 11v5"/><path d="M12 8h.01"/></svg>`,
    "work": `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="7.5" width="16" height="11" rx="1.5"/><path d="M9 7.5V5.5h6v2"/><path d="M4 12h16"/></svg>`,
    "code": `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="6" width="16" height="12" rx="1.5"/><path d="m8 10 2.5 2L8 14"/><path d="M13 14h3"/></svg>`,
    "at": `<span class="nav-text-icon" aria-hidden="true">@</span>`,
};

const TAG_ICONS = {
    "Python":       "devicon-python-plain",
    "C++":          "devicon-cplusplus-plain",
    "PyTorch":      "devicon-pytorch-plain",
    "CUDA":         "devicon-cuda-plain",
    "Neo4j":        "devicon-neo4j-plain",
    "Azure":        "devicon-azure-plain",
    "Playwright":   "devicon-playwright-plain",
    "FastAPI":      "devicon-fastapi-plain",
    "Traefik":      "devicon-traefikproxy-plain",
    "Docker":       "devicon-docker-plain",
    "Cloudflare":   "devicon-cloudflare-plain",
    "Node.js":      "devicon-nodejs-plain",
    "MySQL":        "devicon-mysql-plain",
    "MATLAB":       "devicon-matlab-plain",
    "Jupyter":      "devicon-jupyter-plain",
    "Pandas":       "devicon-pandas-plain",
    "NumPy":        "devicon-numpy-plain",
    "Kubernetes":   "devicon-kubernetes-plain",
    "Linux":        "devicon-linux-plain",
};

const scrollFadeTop = `<div class="scroll-fade scroll-fade-top"></div>`;
const scrollFadeBot = `<div class="scroll-fade scroll-fade-bot"></div>`;

// ── Render helpers ──

function renderNavButton(target, icon, label) {
    const svg = NAV_ICONS[icon]
        || `<span class="nav-text-icon" aria-hidden="true">&#9679;</span>`;
    return `<button class="nav-link" data-target="${target}" aria-label="${label}">${svg}</button>`;
}

function renderTag(tag) {
    const iconClass = TAG_ICONS[tag];
    if (iconClass) {
        return `<span class="tag"><i class="${iconClass}"></i> ${tag}</span>`;
    }
    return `<span class="tag">${tag}</span>`;
}

function renderCard(card, staggerDelay) {
    const hasUrl = card.url != null;
    const tag = hasUrl ? "a" : "div";
    const href = hasUrl
        ? ` href="${card.url}" target="_blank" rel="noopener"`
        : "";
    const cls = hasUrl ? "card is-clickable" : "card";
    const delay = staggerDelay != null ? ` style="transition-delay:${staggerDelay.toFixed(1)}s"` : "";

    let html = `<${tag} class="${cls}"${delay}${href}>`;
    html += `<div class="card-title">${card.title}</div>`;
    if (card.sub) html += `<div class="card-sub">${card.sub}</div>`;
    if (card.desc) html += `<div class="card-desc">${card.desc}</div>`;
    if (card.bullets && card.bullets.length) {
        html += `<ul class="card-bullets">`;
        card.bullets.forEach(function (b) { html += `<li>${b}</li>`; });
        html += `</ul>`;
    }
    if (card.tags && card.tags.length) {
        html += `<div class="tags">`;
        card.tags.forEach(function (t) { html += renderTag(t); });
        html += `</div>`;
    }
    html += `</${tag}>`;
    return html;
}

function renderSection(section) {
    let html = `<div class="section-inner"><div class="section-backdrop">`;
    if (section.label) html += `<div class="section-label">${section.label}</div>`;
    if (section.title) html += `<h2 class="section-title">${section.title}</h2>`;
    if (section.body) html += `<p class="section-body">${section.body}</p>`;

    if (section.cards && section.cards.length) {
        html += `${scrollFadeTop}<div class="cards">`;
        section.cards.forEach(function (c, i) { html += renderCard(c, 0.2 + i * 0.05); });
        html += `</div>${scrollFadeBot}`;
    }

    if (section.button) {
        html += `<a href="${section.button.url}" class="section-button" target="_blank" rel="noopener">${section.button.label}</a>`;
    }

    if (section.links && section.links.length) {
        html += `<div class="contact-links">`;
        section.links.forEach(function (l) {
            html += `<a href="${l.url}" class="contact-link" target="_blank" rel="noopener">${l.label}</a>`;
        });
        html += `</div>`;
    }

    html += `</div></div>`;
    return html;
}

// ── Main ──

document.addEventListener("DOMContentLoaded", function () {
    fetch("/assets/data/profile.json")
        .then(function (r) {
            if (!r.ok) throw new Error("HTTP " + r.status);
            return r.json();
        })
        .then(function (data) {
            // ── Nav rail ──
            var nav = document.getElementById("section-nav");
            var navHTML = renderNavButton("s0", "home", "Home");
            data.sections.forEach(function (s) {
                navHTML += `<div class="nav-spacer" aria-hidden="true"></div>`;
                navHTML += renderNavButton(s.id, s.nav.icon, s.nav.label);
            });
            nav.innerHTML = navHTML;

            // ── Sections ──
            var content = document.getElementById("content");
            var sectionsHTML = "";
            data.sections.forEach(function (s) {
                sectionsHTML += `<section class="section" id="${s.id}">`;
                sectionsHTML += renderSection(s);
                sectionsHTML += `</section>`;
            });
            content.innerHTML = sectionsHTML;

            // ── Footer ──
            if (data.footer && data.footer.text) {
                document.getElementById("footer-text").textContent = data.footer.text;
            }

            // ── Hook navigation.js ──
            if (typeof updateScrollableSections === "function") updateScrollableSections();
            if (typeof onScroll === "function") onScroll();
            document.querySelectorAll(".section-inner").forEach(function (el) {
                el.addEventListener("scroll", onScroll, { passive: true });
            });
        })
        .catch(function (err) {
            console.warn("profile.json failed to load:", err.message);
        });
});
