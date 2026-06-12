#!/usr/bin/env node
/**
 * build.js — PlayArcadeX Static Site Generator
 * Citește data/games.json și generează site-ul complet în /dist:
 *   - index.html (homepage)
 *   - /game/<slug>/index.html      (pagină SEO per joc, JSON-LD, OG)
 *   - /category/<slug>/index.html  (pagini de categorie)
 *   - sitemap.xml, robots.txt, CNAME, 404.html, games.json (index căutare)
 *
 * Rulează:  node build.js
 */

const fs = require("fs");
const path = require("path");

const SITE_URL = "https://playarcadex.com";
const SITE_NAME = "PlayArcadeX";
const SITE_TAGLINE = "Play Free Online Games";
const SITE_DESC = "Play the best free online games on PlayArcadeX! Racing, action, puzzle, sports and more — no downloads, instantly playable on mobile and desktop.";

const ROOT = __dirname;
const DIST = path.join(ROOT, "dist");
const games = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "games.json"), "utf8"));

/* ---------------- helpers ---------------- */
const esc = s => String(s ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const slugify = s => String(s).toLowerCase().normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

function write(rel, content) {
  const file = path.join(DIST, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const item of fs.readdirSync(src)) {
    const s = path.join(src, item), d = path.join(dest, item);
    fs.statSync(s).isDirectory() ? copyDir(s, d) : fs.copyFileSync(s, d);
  }
}

/* ---------------- data prep ---------------- */
const CATEGORY_EMOJI = {
  Racing: "🏎️", Action: "⚔️", Puzzle: "🧩", Sports: "⚽", Shooting: "🎯",
  Arcade: "🕹️", Adventure: "🗺️", Girls: "💄", Hypercasual: "✨",
  Multiplayer: "👥", Clicker: "👆", io: "🌐", "3D": "🎮", "2D": "🎮",
  Strategy: "♟️", Cards: "🃏", Cooking: "🍳", Horror: "👻", Battle: "🛡️", "2 Player": "🆚"
};

const categories = [...new Set(games.map(g => g.category))].sort();
const catSlug = c => slugify(c);
const byCategory = {};
for (const g of games) (byCategory[g.category] ??= []).push(g);

const featured = games.filter(g => g.featured);
const nowISO = new Date().toISOString().slice(0, 10);

/* ---------------- shared components ---------------- */
function sidebarHTML(activeCat) {
  const home = `<a href="/" class="${activeCat === "__home" ? "active" : ""}"><span class="emoji">🏠</span>Home</a>`;
  const cats = categories.map(c =>
    `<a href="/category/${catSlug(c)}/" class="${activeCat === c ? "active" : ""}"><span class="emoji">${CATEGORY_EMOJI[c] || "🎮"}</span>${esc(c)}</a>`
  ).join("\n    ");
  return `<nav class="sidebar" id="sidebar" aria-label="Categories">\n    ${home}\n    ${cats}\n  </nav>`;
}

function headerHTML() {
  return `<header class="header">
    <button class="menu-btn" id="menuBtn" aria-label="Open menu">☰</button>
    <a href="/" class="logo"><span class="logo-badge">🎮</span>PlayArcade<span class="x">X</span></a>
    <div class="search-wrap">
      <input type="search" id="searchInput" placeholder="Search games..." autocomplete="off" aria-label="Search games">
      <span class="search-ico">🔍</span>
    </div>
  </header>`;
}

function footerHTML() {
  return `<footer class="footer">
    <div class="links">
      <a href="/">Home</a>
      ${categories.slice(0, 6).map(c => `<a href="/category/${catSlug(c)}/">${esc(c)}</a>`).join("\n      ")}
    </div>
    <div class="links">
      <a href="/about/">About</a>
      <a href="/contact/">Contact</a>
      <a href="/privacy-policy/">Privacy Policy</a>
      <a href="/terms-of-service/">Terms of Service</a>
      <a href="/dmca/">DMCA</a>
    </div>
    <p>© ${new Date().getFullYear()} ${SITE_NAME} — free online games, playable instantly on any device. Games provided by GameMonetize.</p>
  </footer>`;
}

function cardHTML(g, eager = false) {
  return `<a class="card" href="/game/${g.slug}/" title="${esc(g.title)}">
      <img ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" src="${esc(g.thumb)}" alt="${esc(g.title)} - play free online" width="512" height="384">
      <span class="card-title">${esc(g.title)}</span>
    </a>`;
}

function page({ title, description, canonical, body, jsonld, ogImage, activeCat = "" }) {
  return `<!DOCTYPE html>
<html lang="en" data-base="">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <link rel="canonical" href="${canonical}">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <meta name="theme-color" content="#0e0f1a">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${SITE_NAME}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${esc(ogImage || SITE_URL + "/img/og-default.png")}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(description)}">
  <meta name="twitter:image" content="${esc(ogImage || SITE_URL + "/img/og-default.png")}">
  <link rel="icon" href="/img/favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://img.gamemonetize.com">
  <link rel="stylesheet" href="/css/style.css">
  ${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>` : ""}
</head>
<body>
  ${headerHTML()}
  ${sidebarHTML(activeCat)}
  <main class="main">
${body}
  </main>
  ${footerHTML()}
  <script src="/js/app.js" defer></script>
</body>
</html>`;
}

/* ---------------- HOME ---------------- */
function buildHome() {
  const categorySections = categories.map(c => `
    <h2 class="section-title"><span class="bar"></span>${CATEGORY_EMOJI[c] || "🎮"} ${esc(c)} <a href="/category/${catSlug(c)}/" style="margin-left:auto;font-size:.82rem;color:var(--accent-hover)">View all →</a></h2>
    <div class="grid">
      ${byCategory[c].slice(0, 12).map(g => cardHTML(g)).join("\n      ")}
    </div>`).join("\n");

  const body = `
    <div id="searchResults" class="grid" style="display:none"></div>
    <div id="emptyState" class="empty">😕 No games found. Try another search.</div>
    <div id="defaultSections">
      <h2 class="section-title"><span class="bar"></span>🔥 Featured Games</h2>
      <div class="grid featured">
        ${featured.map((g, i) => cardHTML(g, i < 4)).join("\n        ")}
      </div>
      ${categorySections}
    </div>`;

  const jsonld = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESC,
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: SITE_URL + "/?q={search_term_string}" },
      "query-input": "required name=search_term_string"
    }
  };

  write("index.html", page({
    title: `${SITE_NAME} — ${SITE_TAGLINE} | ${games.length}+ Free Browser Games`,
    description: SITE_DESC,
    canonical: SITE_URL + "/",
    body, jsonld, activeCat: "__home"
  }));
}

/* ---------------- GAME PAGES ---------------- */
function buildGamePages() {
  for (const g of games) {
    const related = (byCategory[g.category] || []).filter(x => x.slug !== g.slug).slice(0, 12);
    const canonical = `${SITE_URL}/game/${g.slug}/`;
    const desc = (g.description || `Play ${g.title} free online on ${SITE_NAME}.`).slice(0, 158);

    const jsonld = [{
      "@context": "https://schema.org",
      "@type": "VideoGame",
      name: g.title,
      url: canonical,
      description: g.description,
      image: g.thumb,
      genre: g.category,
      keywords: (g.tags || []).join(", "),
      gamePlatform: ["Web Browser", "Mobile", "Desktop"],
      applicationCategory: "Game",
      operatingSystem: "Any",
      playMode: "SinglePlayer",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD", availability: "https://schema.org/InStock" }
    }, {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL + "/" },
        { "@type": "ListItem", position: 2, name: g.category, item: `${SITE_URL}/category/${catSlug(g.category)}/` },
        { "@type": "ListItem", position: 3, name: g.title, item: canonical }
      ]
    }];

    const body = `
    <nav class="breadcrumbs" aria-label="Breadcrumb">
      <a href="/">Home</a> › <a href="/category/${catSlug(g.category)}/">${esc(g.category)}</a> › ${esc(g.title)}
    </nav>
    <div class="game-stage">
      <div class="game-frame-wrap" id="frameWrap" data-src="${esc(g.url)}">
        <div class="game-splash" id="gameSplash" style="background-image:url('${esc(g.thumb)}')">
          <img class="splash-thumb" src="${esc(g.thumb)}" alt="${esc(g.title)}" width="120" height="120" fetchpriority="high">
          <button class="play-btn" id="playBtn">▶ Play Now</button>
        </div>
      </div>
      <div class="game-toolbar">
        <h1>${esc(g.title)}</h1>
        <button class="tool-btn" id="fsBtn" aria-label="Fullscreen">⛶ Fullscreen</button>
      </div>
    </div>
    <div class="game-info">
      <h2>About ${esc(g.title)}</h2>
      <p>${esc(g.description)}</p>
      ${g.instructions ? `<h2>How to Play</h2><p>${esc(g.instructions)}</p>` : ""}
      <div class="tag-row">
        <a class="tag" href="/category/${catSlug(g.category)}/">${esc(g.category)}</a>
        ${(g.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join("\n        ")}
      </div>
    </div>
    ${related.length ? `
    <h2 class="section-title"><span class="bar"></span>More ${esc(g.category)} Games</h2>
    <div class="grid">
      ${related.map(r => cardHTML(r)).join("\n      ")}
    </div>` : ""}`;

    write(`game/${g.slug}/index.html`, page({
      title: `${g.title} 🎮 Play Free Online | ${SITE_NAME}`,
      description: desc,
      canonical, body, jsonld,
      ogImage: g.thumb,
      activeCat: g.category
    }));
  }
}

/* ---------------- CATEGORY PAGES ---------------- */
function buildCategoryPages() {
  for (const c of categories) {
    const list = byCategory[c];
    const canonical = `${SITE_URL}/category/${catSlug(c)}/`;
    const body = `
    <nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a> › ${esc(c)}</nav>
    <h1 class="section-title"><span class="bar"></span>${CATEGORY_EMOJI[c] || "🎮"} ${esc(c)} Games <span style="color:var(--text-dim);font-size:.85rem;font-weight:600">(${list.length})</span></h1>
    <div class="grid">
      ${list.map((g, i) => cardHTML(g, i < 6)).join("\n      ")}
    </div>`;

    const jsonld = {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: `${c} Games`,
      url: canonical,
      description: `Play ${list.length} free ${c.toLowerCase()} games online on ${SITE_NAME}.`,
      isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL }
    };

    write(`category/${catSlug(c)}/index.html`, page({
      title: `${c} Games — Play Free Online ${c} Games | ${SITE_NAME}`,
      description: `Play ${list.length}+ free ${c.toLowerCase()} games online, no download needed. The best ${c.toLowerCase()} browser games on ${SITE_NAME}.`,
      canonical, body, jsonld, activeCat: c
    }));
  }
}

/* ---------------- STATIC / LEGAL PAGES ---------------- */
const STATIC_PAGES = [
  {
    slug: "about",
    title: `About ${SITE_NAME}`,
    description: `Learn about ${SITE_NAME} — a free online games portal with hundreds of browser games playable on mobile and desktop.`,
    html: `
      <h1>About ${SITE_NAME}</h1>
      <p>${SITE_NAME} is a free online gaming portal where you can play hundreds of browser games instantly — no downloads, no installs, no sign-up required. Our catalog covers racing, action, shooting, puzzle, sports, .io, girls, cooking, horror and many more categories, and works on desktop, tablet and mobile.</p>
      <h2>Our mission</h2>
      <p>We believe great games should be one click away. We curate fun, high-quality HTML5 games and serve them on a fast, lightweight website so you spend your time playing, not waiting.</p>
      <h2>Where do the games come from?</h2>
      <p>Games on ${SITE_NAME} are provided by our distribution partner <strong>GameMonetize</strong> and their network of game developers. All games remain the property of their respective developers and publishers.</p>
      <h2>Get in touch</h2>
      <p>Questions, suggestions or a game you'd love to see here? Visit our <a href="/contact/">contact page</a>.</p>`
  },
  {
    slug: "contact",
    title: `Contact Us`,
    description: `Contact the ${SITE_NAME} team — questions, feedback, partnerships and game submissions.`,
    html: `
      <h1>Contact Us</h1>
      <p>We'd love to hear from you. For any questions, feedback, bug reports, partnership inquiries or content removal requests, reach us at:</p>
      <p><strong>Email:</strong> <a href="mailto:contact@playarcadex.com">contact@playarcadex.com</a></p>
      <h2>Before you write</h2>
      <p>If a game isn't loading, try refreshing the page or another browser first — most games need a modern browser with JavaScript enabled. For copyright matters, please see our <a href="/dmca/">DMCA page</a>.</p>
      <p>We usually reply within 48 hours.</p>`
  },
  {
    slug: "privacy-policy",
    title: `Privacy Policy`,
    description: `Privacy Policy of ${SITE_NAME}: what data is collected, cookies, third-party advertising and your rights.`,
    html: `
      <h1>Privacy Policy</h1>
      <p><em>Last updated: ${nowISO}</em></p>
      <p>This Privacy Policy explains how ${SITE_NAME} ("we", "us") handles information when you visit ${SITE_URL}.</p>
      <h2>Information we collect</h2>
      <p>${SITE_NAME} itself does not require accounts and does not directly collect personal information. Like most websites, our hosting provider (GitHub Pages) may log standard technical data such as IP address, browser type and pages visited for security and operational purposes.</p>
      <h2>Games and third-party content</h2>
      <p>Games on this site are embedded from our partner <strong>GameMonetize</strong> and run inside iframes. These games and the advertising inside them are operated by third parties, which may use cookies and similar technologies to serve and measure ads (including personalized ads where permitted). Their data practices are governed by their own privacy policies, including the <a href="https://gamemonetize.com/privacy" rel="nofollow noopener" target="_blank">GameMonetize Privacy Policy</a>.</p>
      <h2>Cookies</h2>
      <p>We do not set tracking cookies ourselves. Third-party game and ad providers embedded on this site may set cookies as described above. You can control or delete cookies through your browser settings.</p>
      <h2>Children's privacy</h2>
      <p>This website offers general-audience games and does not knowingly collect personal information from children. Parents and guardians who believe a third-party service embedded here has collected information from a child should contact that provider and us at contact@playarcadex.com.</p>
      <h2>Your rights</h2>
      <p>Depending on your location (e.g. GDPR in the EU, CCPA in California), you may have rights to access, correct or delete personal data held by the third-party providers mentioned above. Please direct such requests to the relevant provider; we will assist where we can.</p>
      <h2>Changes</h2>
      <p>We may update this policy from time to time. The latest version will always be available on this page.</p>
      <h2>Contact</h2>
      <p>Questions about this policy: <a href="mailto:contact@playarcadex.com">contact@playarcadex.com</a></p>`
  },
  {
    slug: "terms-of-service",
    title: `Terms of Service`,
    description: `Terms of Service for using ${SITE_NAME} and playing the free games available on the site.`,
    html: `
      <h1>Terms of Service</h1>
      <p><em>Last updated: ${nowISO}</em></p>
      <h2>1. Acceptance</h2>
      <p>By accessing ${SITE_URL} you agree to these Terms of Service. If you do not agree, please do not use the site.</p>
      <h2>2. The service</h2>
      <p>${SITE_NAME} provides free access to browser games supplied by third-party developers and our distribution partner GameMonetize. Games are provided "as is" and may be added, changed or removed at any time without notice.</p>
      <h2>3. Acceptable use</h2>
      <p>You agree not to misuse the site — including attempting to disrupt the service, scrape content at abusive rates, rehost games without rights, or use the site for any unlawful purpose.</p>
      <h2>4. Intellectual property</h2>
      <p>All games, trademarks and related assets belong to their respective developers and publishers. The ${SITE_NAME} name, design and original site content belong to us. See our <a href="/dmca/">DMCA page</a> for copyright matters.</p>
      <h2>5. Third-party content and ads</h2>
      <p>Embedded games may contain advertising served by third parties. We are not responsible for the content of third-party games, ads or external links.</p>
      <h2>6. Disclaimer and liability</h2>
      <p>The site is provided without warranties of any kind. To the maximum extent permitted by law, ${SITE_NAME} shall not be liable for any indirect or consequential damages arising from your use of the site or embedded games.</p>
      <h2>7. Changes</h2>
      <p>We may update these terms; continued use of the site after changes means you accept the updated terms.</p>
      <h2>8. Contact</h2>
      <p><a href="mailto:contact@playarcadex.com">contact@playarcadex.com</a></p>`
  },
  {
    slug: "dmca",
    title: `DMCA / Content Removal`,
    description: `How to submit a DMCA takedown or content removal request to ${SITE_NAME}.`,
    html: `
      <h1>DMCA / Content Removal</h1>
      <p>${SITE_NAME} respects the intellectual property rights of others. Games on this site are distributed through our partner GameMonetize, and we will promptly address valid copyright concerns.</p>
      <h2>Filing a notice</h2>
      <p>If you believe content on this site infringes your copyright, send a notice to <a href="mailto:contact@playarcadex.com">contact@playarcadex.com</a> including:</p>
      <p>1) identification of the copyrighted work; 2) the exact URL(s) on ${SITE_URL} where it appears; 3) your contact information; 4) a statement of good-faith belief that the use is not authorized; 5) a statement, under penalty of perjury, that the information is accurate and you are the rights holder or authorized to act on their behalf; 6) your physical or electronic signature.</p>
      <h2>What happens next</h2>
      <p>Upon receiving a valid notice we will remove or disable access to the content in question and, where applicable, forward the notice to the game's distributor.</p>`
  }
];

function buildStaticPages() {
  for (const p of STATIC_PAGES) {
    const canonical = `${SITE_URL}/${p.slug}/`;
    const body = `
    <nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a> › ${esc(p.title)}</nav>
    <div class="game-info static-page">
      ${p.html}
    </div>`;
    write(`${p.slug}/index.html`, page({
      title: `${p.title} | ${SITE_NAME}`,
      description: p.description,
      canonical, body
    }));
  }
}

/* ---------------- SITEMAP / ROBOTS / EXTRAS ---------------- */
function buildSitemap() {
  const urls = [
    { loc: SITE_URL + "/", priority: "1.0", changefreq: "daily" },
    ...categories.map(c => ({ loc: `${SITE_URL}/category/${catSlug(c)}/`, priority: "0.8", changefreq: "daily" })),
    ...games.map(g => ({ loc: `${SITE_URL}/game/${g.slug}/`, priority: "0.7", changefreq: "weekly" })),
    ...STATIC_PAGES.map(p => ({ loc: `${SITE_URL}/${p.slug}/`, priority: "0.3", changefreq: "monthly" }))
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${u.loc}</loc><lastmod>${nowISO}</lastmod><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`).join("\n")}
</urlset>`;
  write("sitemap.xml", xml);

  write("robots.txt", `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);
  write("CNAME", "playarcadex.com\n");
}

function build404() {
  const body = `
    <div style="text-align:center;padding:80px 20px">
      <div style="font-size:4rem">🕹️</div>
      <h1 style="margin:10px 0">404 — Game Over</h1>
      <p style="color:var(--text-dim)">This page doesn't exist. Insert coin and try again!</p>
      <a href="/" class="play-btn" style="display:inline-block;margin-top:20px">← Back to Games</a>
    </div>`;
  write("404.html", page({
    title: `Page Not Found | ${SITE_NAME}`,
    description: "Page not found on PlayArcadeX.",
    canonical: SITE_URL + "/404.html",
    body
  }));
}

function buildSearchIndex() {
  // versiune light pentru căutarea client-side
  const light = games.map(g => ({
    title: g.title, slug: g.slug, category: g.category,
    tags: g.tags, thumb: g.thumb
  }));
  write("games.json", JSON.stringify(light));
}

/* ---------------- RUN ---------------- */
console.log(`Building ${SITE_NAME} (${games.length} games, ${categories.length} categories)...`);
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

copyDir(path.join(ROOT, "static"), DIST);
buildHome();
buildGamePages();
buildCategoryPages();
buildStaticPages();
buildSitemap();
build404();
buildSearchIndex();

console.log(`✔ Done -> ${DIST}`);
console.log(`  - index.html`);
console.log(`  - ${games.length} game pages`);
console.log(`  - ${categories.length} category pages`);
console.log(`  - sitemap.xml (${1 + categories.length + games.length} URLs), robots.txt, CNAME, 404.html`);
