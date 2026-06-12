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

// URL-ul API-ului de trending (Cloudflare Worker). Lasa gol "" pana il configurezi —
// sectiunea Trending ramane pur si simplu ascunsa. Ex: "https://pax-trending.USER.workers.dev"
const TRENDING_API = "";

// Google Analytics 4 (lasa gol "" ca sa dezactivezi)
const GA_ID = "G-X4DF0DZ88J";

const ROOT = __dirname;
const DIST = path.join(ROOT, "dist");
const games = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "games.json"), "utf8"));

// CSS-ul se inline-eaza in <head> la build => zero render-blocking requests (PageSpeed)
const CSS_MIN = fs.readFileSync(path.join(ROOT, "static", "css", "style.css"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\s+/g, " ")
  .replace(/ ?([{};:,>]) ?/g, "$1")
  .trim();

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

/* ---------------- SVG icons (inline, fara requesturi externe) ---------------- */
const ICONS = {
  fb: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>',
  tw: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/></svg>',
  wa: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>',
  tg: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>',
  link: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>',
  dice: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zM7.5 18A1.5 1.5 0 1 1 9 16.5 1.5 1.5 0 0 1 7.5 18zm0-9A1.5 1.5 0 1 1 9 7.5 1.5 1.5 0 0 1 7.5 9zm4.5 4.5a1.5 1.5 0 1 1 1.5-1.5 1.5 1.5 0 0 1-1.5 1.5zM16.5 18a1.5 1.5 0 1 1 1.5-1.5 1.5 1.5 0 0 1-1.5 1.5zm0-9A1.5 1.5 0 1 1 18 7.5 1.5 1.5 0 0 1 16.5 9z"/></svg>'
};

/* ---------------- shared components ---------------- */
function sidebarHTML(activeCat) {
  const home = `<a href="/" class="${activeCat === "__home" ? "active" : ""}"><span class="emoji">🏠</span>Home</a>
    <a href="/games/" class="${activeCat === "__all" ? "active" : ""}"><span class="emoji">📚</span>All Games</a>`;
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
    <button class="dice-btn" id="randomBtn" title="Play a random game" aria-label="Play a random game">${ICONS.dice}<span class="dice-label">Random</span></button>
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

/* Thumbnail mic pentru grile (230x230 ~ 12KB vs 512x384 ~ 100KB+).
   Daca varianta mica nu exista pentru un joc, onerror revine la originala. */
function smallThumb(t) {
  return String(t).replace(/512x384/i, "230x230");
}

function cardHTML(g, eager = false) {
  const small = smallThumb(g.thumb);
  const fallback = small !== g.thumb
    ? ` onerror="this.onerror=null;this.src='${esc(g.thumb)}'"`
    : "";
  return `<a class="card" href="/game/${g.slug}/" title="${esc(g.title)}">
      <img ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" src="${esc(small)}"${fallback} alt="${esc(g.title)} - play free online" width="230" height="173">
      <span class="card-title">${esc(g.title)}</span>
    </a>`;
}

function page({ title, description, canonical, body, jsonld, ogImage, activeCat = "" }) {
  return `<!DOCTYPE html>
<html lang="en" data-base="" data-trending-api="${esc(TRENDING_API)}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
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
  <link rel="manifest" href="/manifest.webmanifest">
  <link rel="apple-touch-icon" href="/img/icon-192.png">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <link rel="preconnect" href="https://img.gamemonetize.com">
  <style>${CSS_MIN}</style>
  ${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>` : ""}
  ${GA_ID ? `<!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');</script>` : ""}
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
  const newest = [...games]
    .sort((a, b) => (a.feedRank ?? 1e9) - (b.feedRank ?? 1e9))
    .slice(0, 12);

  const categorySections = categories.map(c => `
    <section class="cat-sec" data-cat="${esc(c)}">
    <h2 class="section-title"><span class="bar"></span>${CATEGORY_EMOJI[c] || "🎮"} ${esc(c)} <a class="view-all" href="/category/${catSlug(c)}/">View all →</a></h2>
    <div class="grid">
      ${byCategory[c].slice(0, 8).map(g => cardHTML(g)).join("\n      ")}
    </div>
    </section>`).join("\n");

  const body = `
    <div id="searchResults" class="grid" style="display:none"></div>
    <div id="emptyState" class="empty">😕 No games found. Try another search.</div>
    <div id="defaultSections">
      <section id="recentSection" style="display:none">
        <h2 class="section-title"><span class="bar"></span>🕒 Recently Played</h2>
        <div class="grid" id="recentGrid"></div>
      </section>
      <section id="recoSection" style="display:none">
        <h2 class="section-title"><span class="bar"></span>✨ Recommended for You</h2>
        <div class="grid" id="recoGrid"></div>
      </section>
      <section id="favSection" style="display:none">
        <h2 class="section-title"><span class="bar"></span>❤️ Your Favorites</h2>
        <div class="grid" id="favGrid"></div>
      </section>
      <section id="trendingSection" style="display:none">
        <h2 class="section-title"><span class="bar"></span>📈 Trending Now</h2>
        <div class="grid" id="trendingGrid"></div>
      </section>
      <h2 class="section-title"><span class="bar"></span>🔥 Featured Games</h2>
      <div class="grid featured">
        ${featured.map((g, i) => cardHTML(g, i < 4)).join("\n        ")}
      </div>
      <h2 class="section-title"><span class="bar"></span>🆕 New Games</h2>
      <div class="grid">
        ${newest.map(g => cardHTML(g)).join("\n        ")}
      </div>
      <div id="catSections">
      ${categorySections}
      </div>
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

    const W = Number(g.width) || 0, H = Number(g.height) || 0;
    const orient = g.orientation ||
      (W && H ? (W >= H * 1.15 ? "landscape" : (H >= W * 1.15 ? "portrait" : "adaptive")) : "adaptive");
    const body = `
    <nav class="breadcrumbs" aria-label="Breadcrumb">
      <a href="/">Home</a> › <a href="/category/${catSlug(g.category)}/">${esc(g.category)}</a> › ${esc(g.title)}
    </nav>
    <div class="game-stage" data-orient="${orient}">
      <div class="game-frame-wrap" id="frameWrap" data-src="${esc(g.url)}" data-slug="${esc(g.slug)}" data-category="${esc(g.category)}">
        <div class="game-splash" id="gameSplash">
          <img class="splash-bg" src="${esc(smallThumb(g.thumb))}" onerror="this.onerror=null;this.src='${esc(g.thumb)}'" alt="" aria-hidden="true" loading="eager">
          <img class="splash-thumb" src="${esc(smallThumb(g.thumb))}" onerror="this.onerror=null;this.src='${esc(g.thumb)}'" alt="${esc(g.title)}" width="120" height="120" fetchpriority="high">
          <button class="play-btn" id="playBtn">▶ Play Now</button>
        </div>
        <div class="rotate-overlay" aria-hidden="true">
          <svg viewBox="0 0 120 100" width="130" height="108" fill="none" aria-hidden="true">
            <rect x="62" y="8" width="42" height="78" rx="9" stroke="#5a5d75" stroke-width="4"/>
            <rect x="14" y="46" width="74" height="42" rx="9" fill="#2a2d40" stroke="#fff" stroke-width="4"/>
            <rect x="18" y="58" width="5" height="18" rx="2.5" fill="#fff"/>
            <path d="M58 28 C 50 16, 34 14, 24 24" stroke="#6842ff" stroke-width="6" stroke-linecap="round"/>
            <path d="M22 14 L 23 26 L 35 25" stroke="#6842ff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          </svg>
          <div class="rotate-title">Rotate device</div>
          <div class="rotate-sub">This game supports only landscape orientation</div>
        </div>
        <button class="fs-close" id="fsCloseFloat" aria-label="Close game">✕</button>
        <a class="fs-allgames" href="/" aria-label="Back to all games">
          <span class="fs-allgames-label">🎮 All Games</span>
          <span class="fs-mini-logo">X</span>
        </a>
      </div>
      <div class="game-toolbar">
        <h1>${esc(g.title)}</h1>
        <button class="tool-btn fav-btn" id="favBtn" data-slug="${esc(g.slug)}" aria-label="Add to favorites">♡</button>
        <button class="tool-btn" id="fsBtn" aria-label="Fullscreen">⛶ Fullscreen</button>
        <button class="tool-btn close-btn" id="closeFsBtn" aria-label="Close fullscreen">✕ Close</button>
      </div>
    </div>
    <div class="share-row" aria-label="Share this game">
      <span class="share-label">Share:</span>
      <a class="share-btn fb" rel="nofollow noopener" target="_blank" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(canonical)}" aria-label="Share on Facebook">${ICONS.fb}</a>
      <a class="share-btn tw" rel="nofollow noopener" target="_blank" href="https://twitter.com/intent/tweet?url=${encodeURIComponent(canonical)}&text=${encodeURIComponent("Play " + g.title + " free!")}" aria-label="Share on X">${ICONS.tw}</a>
      <a class="share-btn wa" rel="nofollow noopener" target="_blank" href="https://wa.me/?text=${encodeURIComponent("Play " + g.title + " free! " + canonical)}" aria-label="Share on WhatsApp">${ICONS.wa}</a>
      <a class="share-btn tg" rel="nofollow noopener" target="_blank" href="https://t.me/share/url?url=${encodeURIComponent(canonical)}&text=${encodeURIComponent("Play " + g.title + " free!")}" aria-label="Share on Telegram">${ICONS.tg}</a>
      <button class="share-btn copy" id="copyLinkBtn" data-url="${esc(canonical)}" aria-label="Copy link">${ICONS.link}</button>
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
      <h2>Analytics</h2>
      <p>We use <strong>Google Analytics 4</strong> to understand how visitors use the site (pages visited, games played, time on site, approximate location at city level, device type). Google Analytics uses cookies and similar identifiers for this purpose. The data is aggregated and does not directly identify you. You can opt out using the <a href="https://tools.google.com/dlpage/gaoptout" rel="nofollow noopener" target="_blank">Google Analytics Opt-out Browser Add-on</a> or by blocking cookies in your browser. Learn more in the <a href="https://policies.google.com/privacy" rel="nofollow noopener" target="_blank">Google Privacy Policy</a>.</p>
      <h2>Cookies</h2>
      <p>We use Google Analytics cookies as described above. Additionally, third-party game and ad providers embedded on this site may set their own cookies. You can control or delete cookies through your browser settings.</p>
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

/* ---------------- ALL GAMES ---------------- */
function buildAllGamesPage() {
  const canonical = `${SITE_URL}/games/`;
  const sorted = [...games].sort((a, b) => a.title.localeCompare(b.title));
  const body = `
    <nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a> › All Games</nav>
    <h1 class="section-title"><span class="bar"></span>📚 All Games <span style="color:var(--text-dim);font-size:.85rem;font-weight:600">(${games.length})</span></h1>
    <div class="grid">
      ${sorted.map((g, i) => cardHTML(g, i < 6)).join("\n      ")}
    </div>`;
  const jsonld = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "All Games",
    url: canonical,
    description: `Browse all ${games.length} free online games on ${SITE_NAME}.`,
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL }
  };
  write("games/index.html", page({
    title: `All Games — Browse ${games.length}+ Free Online Games | ${SITE_NAME}`,
    description: `Browse the full ${SITE_NAME} catalog: ${games.length}+ free online games across ${categories.length} categories, sorted A-Z.`,
    canonical, body, jsonld, activeCat: "__all"
  }));
}

/* ---------------- PWA: manifest + service worker ---------------- */
function buildPWA() {
  const manifest = {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: SITE_DESC,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#0e0f1a",
    theme_color: "#6842ff",
    icons: [
      { src: "/img/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
      { src: "/img/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" }
    ]
  };
  write("manifest.webmanifest", JSON.stringify(manifest, null, 2));

  // Service worker: cache static assets (stale-while-revalidate). Paginile raman network-first
  // ca sa nu servim niciodata continut vechi dupa un deploy.
  const sw = `/* PlayArcadeX service worker */
const CACHE = "pax-v${Date.now()}";
const STATIC_RE = /\\.(css|js|svg|png|jpg|webp|woff2?)$|\\/games\\.json$/;

self.addEventListener("install", e => { self.skipWaiting(); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  if (!STATIC_RE.test(url.pathname)) return; // pages: always network
  e.respondWith(
    caches.open(CACHE).then(cache =>
      cache.match(e.request).then(cached => {
        const fresh = fetch(e.request).then(res => {
          if (res.ok) cache.put(e.request, res.clone());
          return res;
        }).catch(() => cached);
        return cached || fresh;
      })
    )
  );
});`;
  write("sw.js", sw);
}

/* ---------------- SITEMAP / ROBOTS / EXTRAS ---------------- */
function buildSitemap() {
  const urls = [
    { loc: SITE_URL + "/", priority: "1.0", changefreq: "daily" },
    { loc: SITE_URL + "/games/", priority: "0.9", changefreq: "daily" },
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
buildAllGamesPage();
buildStaticPages();
buildPWA();
buildSitemap();
build404();
buildSearchIndex();

console.log(`✔ Done -> ${DIST}`);
console.log(`  - index.html`);
console.log(`  - ${games.length} game pages`);
console.log(`  - ${categories.length} category pages`);
console.log(`  - sitemap.xml (${1 + categories.length + games.length} URLs), robots.txt, CNAME, 404.html`);
