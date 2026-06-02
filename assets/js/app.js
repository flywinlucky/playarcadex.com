(() => {
    "use strict";

    const SITE = {
        name: "PlayArcadeX",
        origin: "https://playarcadex.com",
        home: "https://playarcadex.com/",
        defaultImage: "https://images.gamedistribution.com/13eabea86f7c4cd993a156258420e9ec-512x512.jpeg"
    };
    const BASE_PATH = resolveBasePath();

    const CATEGORIES = [
        { id: "all", label: "All Games", icon: "layout-grid" },
        { id: "action", label: "Action", icon: "zap" },
        { id: "adventure", label: "Adventure", icon: "compass" },
        { id: "racing", label: "Racing", icon: "car" },
        { id: "puzzle", label: "Puzzle", icon: "puzzle" },
        { id: "sports", label: "Sports", icon: "trophy" },
        { id: "casual", label: "Casual", icon: "sparkles" },
        { id: "shooter", label: "Shooter", icon: "crosshair" },
        { id: "strategy", label: "Strategy", icon: "shield" },
        { id: "io", label: ".io", icon: "orbit" },
        { id: "multiplayer", label: "Multiplayer", icon: "users" }
    ];

    const SIDEBAR_GROUPS = [
        {
            label: "Main",
            items: [
                { id: "home", label: "Home", icon: "home", category: "all", sort: "popular" },
                { id: "recent", label: "Recently played", icon: "clock", category: "all", sort: "newest" },
                { id: "new", label: "New", icon: "sparkles", category: "all", sort: "newest" },
                { id: "popular", label: "Popular Games", icon: "flame", category: "all", sort: "popular" },
                { id: "updated", label: "Updated", icon: "refresh-cw", category: "all", sort: "rating" },
                { id: "multiplayer", label: "Multiplayer", icon: "users", category: "multiplayer" },
                { id: "leaderboards", label: "Leaderboards", icon: "medal", category: "all", sort: "rating" }
            ]
        },
        {
            label: "Categories",
            items: CATEGORIES.filter((category) => category.id !== "all")
        }
    ];

    const categoryIds = new Set(CATEGORIES.map((category) => category.id));
    const gameCategoryIds = new Set(CATEGORIES.filter((category) => category.id !== "all").map((category) => category.id));
    const PAGE_SIZE = 48;
    const RELATED_COUNT = 18;
    const SCHEMA_ID = "dynamicSchema";
    const rawGames = Array.isArray(window.PLAYARCADEX_GAMES_DATA) ? window.PLAYARCADEX_GAMES_DATA : [];
    const games = normalizeGames(rawGames);
    const gameById = new Map(games.map((game) => [game.id, game]));

    const state = {
        view: "catalog",
        category: "all",
        query: "",
        sort: "popular",
        page: 1,
        activeGameId: null,
        launchedGameId: null,
        feedbackTimer: null
    };

    const root = document.getElementById("app");
    if (!root) return;

    root.innerHTML = appTemplate();

    const dom = {
        header: document.querySelector(".site-header"),
        sidebar: document.getElementById("sidebar"),
        footer: document.querySelector(".footer"),
        categoryNav: document.getElementById("categoryNav"),
        mobileCategories: document.getElementById("mobileCategories"),
        searchForm: document.getElementById("searchForm"),
        searchInput: document.getElementById("searchInput"),
        clearSearchBtn: document.getElementById("clearSearchBtn"),
        randomBtn: document.getElementById("randomBtn"),
        catalogView: document.getElementById("catalogView"),
        catalogTitle: document.getElementById("catalogTitle"),
        catalogDescription: document.getElementById("catalogDescription"),
        catalogKicker: document.getElementById("catalogKicker"),
        sortSelect: document.getElementById("sortSelect"),
        resetFiltersBtn: document.getElementById("resetFiltersBtn"),
        catalogGrid: document.getElementById("catalogGrid"),
        pager: document.getElementById("pager"),
        gameView: document.getElementById("gameView"),
        gameMain: document.getElementById("gameMain"),
        relatedPanel: document.getElementById("relatedPanel"),
        modalPrivacy: document.getElementById("modalPrivacy"),
        modalTerms: document.getElementById("modalTerms"),
        modalAbout: document.getElementById("modalAbout"),
        metaDescription: document.querySelector('meta[name="description"]'),
        metaKeywords: document.querySelector('meta[name="keywords"]'),
        ogType: document.querySelector('meta[property="og:type"]'),
        ogUrl: document.querySelector('meta[property="og:url"]'),
        ogTitle: document.querySelector('meta[property="og:title"]'),
        ogDescription: document.querySelector('meta[property="og:description"]'),
        ogImage: document.querySelector('meta[property="og:image"]'),
        twitterTitle: document.querySelector('meta[name="twitter:title"]'),
        twitterDescription: document.querySelector('meta[name="twitter:description"]'),
        twitterImage: document.querySelector('meta[name="twitter:image"]'),
        canonical: document.querySelector('link[rel="canonical"]')
    };

    function normalizeGames(entries) {
        const seenIds = new Set();
        const seenHashes = new Set();
        const normalized = [];

        entries.forEach((entry, index) => {
            const id = String(entry.id || "").trim();
            const title = String(entry.title || "").trim();
            const iframeUrl = String(entry.iframeUrl || "").trim();
            if (!id || !title || !iframeUrl || seenIds.has(id)) return;

            const imageHash = String(entry.imageHash || "").trim();
            if (imageHash && seenHashes.has(imageHash)) return;

            seenIds.add(id);
            if (imageHash) seenHashes.add(imageHash);

            const category = gameCategoryIds.has(entry.category) ? entry.category : "casual";
            const description = String(entry.description || `Play ${title} online for free on PlayArcadeX.`).trim();
            const plays = String(entry.plays || "0").trim();
            const rating = Number.isFinite(Number(entry.rating)) ? Number(entry.rating) : 4.5;

            normalized.push({
                id,
                title,
                category,
                iframeUrl,
                thumbnail: String(entry.thumbnail || "").trim(),
                description,
                plays,
                rating,
                imageHash,
                index,
                searchText: `${title} ${description} ${category}`.toLowerCase(),
                playsValue: toNumericPlays(plays)
            });
        });

        return normalized;
    }

    function appTemplate() {
        return `
            <header class="site-header">
                <div class="header-inner">
                    <a class="brand" href="${BASE_PATH}" data-route-home aria-label="PlayArcadeX home">
                        <span class="brand-mark"><i data-lucide="gamepad-2"></i></span>
                        <span>
                            <span class="brand-word">PlayArcadeX</span>
                            <span class="brand-sub">Free browser games</span>
                        </span>
                    </a>

                    <form id="searchForm" class="search" role="search" aria-label="Search games">
                        <label for="searchInput" class="sr-only">Search games</label>
                        <i class="search-icon" data-lucide="search"></i>
                        <input id="searchInput" type="search" autocomplete="off" placeholder="Search games" />
                        <button id="clearSearchBtn" class="icon-btn search-clear hidden" type="button" aria-label="Clear search">
                            <i data-lucide="x"></i>
                        </button>
                    </form>

                    <div class="header-actions">
                        <button id="randomBtn" class="icon-btn" type="button" aria-label="Open a random game">
                            <i data-lucide="shuffle"></i>
                        </button>
                        <a class="text-btn" href="${BASE_PATH}?category=multiplayer" data-category-link="multiplayer">
                            <i data-lucide="users"></i>
                            <span>Multiplayer</span>
                        </a>
                    </div>
                </div>
            </header>

            <div class="shell">
                <aside id="sidebar" class="sidebar" aria-label="Game categories">
                    <nav id="categoryNav" class="category-list"></nav>
                </aside>

                <main class="main">
                    <nav id="mobileCategories" class="mobile-cats" aria-label="Game categories"></nav>

                    <section id="catalogView" aria-live="polite">
                        <header class="catalog-head">
                            <div>
                                <p id="catalogKicker" class="kicker">Free online games</p>
                                <h1 id="catalogTitle">Play browser games instantly</h1>
                                <p id="catalogDescription">Choose a game, launch it in a secure iframe, and keep playing on desktop, tablet, or mobile.</p>
                            </div>
                            <div class="catalog-tools">
                                <select id="sortSelect" class="select" aria-label="Sort games">
                                    <option value="popular">Popular</option>
                                    <option value="rating">Top rated</option>
                                    <option value="newest">Newest</option>
                                    <option value="az">A to Z</option>
                                </select>
                                <button id="resetFiltersBtn" class="icon-btn" type="button" aria-label="Reset filters">
                                    <i data-lucide="rotate-ccw"></i>
                                </button>
                            </div>
                        </header>

                        <section class="rail">
                            <div class="section-head">
                                <h2>Top games</h2>
                                <span class="section-meta">Fast picks, no install</span>
                            </div>
                            <div id="catalogGrid" class="game-grid"></div>
                            <nav id="pager" class="pager" aria-label="Catalog pages"></nav>
                        </section>
                    </section>

                    <section id="gameView" class="hidden" aria-live="polite">
                        <div class="game-layout">
                            <div id="gameMain"></div>
                            <aside id="relatedPanel" class="side-panel"></aside>
                        </div>
                    </section>
                </main>
            </div>

            <footer class="footer">
                <div class="footer-inner">
                    <div class="footer-brand">
                        <span class="brand-mark"><i data-lucide="gamepad-2"></i></span>
                        <div>
                            <strong>PlayArcadeX</strong>
                            <p>Free browser games, loaded clean and fast.</p>
                        </div>
                    </div>
                    <nav class="footer-links footer-categories" aria-label="Popular categories">
                        ${CATEGORIES.filter((category) => category.id !== "all").slice(0, 8).map((category) => `
                            <a href="${BASE_PATH}?category=${encodeURIComponent(category.id)}" data-category-link="${category.id}">${escapeHtml(category.label)}</a>
                        `).join("")}
                    </nav>
                    <nav class="footer-links footer-legal" aria-label="Footer links">
                        <button type="button" data-modal-open="modalAbout">About</button>
                        <button type="button" data-modal-open="modalPrivacy">Privacy</button>
                        <button type="button" data-modal-open="modalTerms">Terms</button>
                        <a href="${BASE_PATH}sitemap.xml">Sitemap</a>
                    </nav>
                    <p class="footer-copy">© 2026 PlayArcadeX. Embedded games belong to their respective publishers.</p>
                </div>
            </footer>

            ${modalTemplate("modalAbout", "About PlayArcadeX", [
                "PlayArcadeX is a browser gaming portal built for fast game discovery, clean iframe gameplay, and a mobile-friendly catalog.",
                "Game embeds are loaded only when the player starts a title, keeping browsing fast and lightweight.",
                'Business inquiries and partnerships: <a href="mailto:contact@playarcadex.com">contact@playarcadex.com</a>.'
            ])}
            ${modalTemplate("modalPrivacy", "Privacy Policy", [
                "PlayArcadeX uses essential local preferences for browsing state and may rely on third-party providers for embedded game delivery.",
                "Partner games run inside iframes and may process limited technical data for security, ads, analytics, and anti-abuse systems according to their policies.",
                "For privacy or removal requests, contact contact@playarcadex.com."
            ])}
            ${modalTemplate("modalTerms", "Terms of Service", [
                "By using PlayArcadeX, you agree to use the portal lawfully and respect the rights of game publishers and developers.",
                "Embedded game content, brands, and assets remain owned by their respective rights holders.",
                "PlayArcadeX may update, suspend, or remove games and features to maintain legal compliance, security, and service quality."
            ])}
        `;
    }

    function modalTemplate(id, title, paragraphs) {
        return `
            <dialog id="${id}">
                <header class="modal-head">
                    <h2>${escapeHtml(title)}</h2>
                    <button class="icon-btn" type="button" data-modal-close aria-label="Close ${escapeHtml(title)}">
                        <i data-lucide="x"></i>
                    </button>
                </header>
                <section class="modal-body">
                    ${paragraphs.map((text) => `<p>${text}</p>`).join("")}
                </section>
            </dialog>
        `;
    }

    function refreshIcons() {
        if (window.lucide && typeof window.lucide.createIcons === "function") {
            window.lucide.createIcons();
        }
    }

    function resolveBasePath() {
        const path = window.location.pathname.replace(/\\/g, "/");
        if (path.endsWith("/game.html") || path.endsWith("/index.html")) {
            return path.slice(0, path.lastIndexOf("/") + 1) || "/";
        }
        return path.endsWith("/") ? path : "/";
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function debounce(fn, wait) {
        let timer = null;
        return (...args) => {
            window.clearTimeout(timer);
            timer = window.setTimeout(() => fn(...args), wait);
        };
    }

    function capitalize(value) {
        return value ? value.charAt(0).toUpperCase() + value.slice(1) : "";
    }

    function toNumericPlays(value) {
        const raw = String(value || "").trim().toUpperCase();
        const number = Number.parseFloat(raw.replace(/[^\d.]/g, "")) || 0;
        if (raw.endsWith("M")) return Math.round(number * 1_000_000);
        if (raw.endsWith("K")) return Math.round(number * 1_000);
        return Math.round(number);
    }

    function categoryLabel(id) {
        return CATEGORIES.find((category) => category.id === id)?.label || "Games";
    }

    function getRouteState() {
        const params = new URLSearchParams(window.location.search);
        const hashGame = window.location.hash.match(/^#game=(.+)$/);
        const gameId = params.get("id") || params.get("game") || (hashGame ? decodeURIComponent(hashGame[1]) : "");
        const category = params.get("category") || "all";
        const query = params.get("q") || "";
        const sort = params.get("sort") || "popular";
        const page = Number(params.get("page") || "1");

        return {
            gameId: gameId.trim(),
            category: categoryIds.has(category) ? category : "all",
            query: query.trim(),
            sort: ["popular", "rating", "newest", "az"].includes(sort) ? sort : "popular",
            page: Number.isFinite(page) && page > 0 ? Math.floor(page) : 1
        };
    }

    function applyRouteState() {
        const route = getRouteState();
        state.category = route.category;
        state.query = route.query;
        state.sort = route.sort;
        state.page = route.page;
        dom.searchInput.value = state.query;
        dom.sortSelect.value = state.sort;
        syncSearchClear();

        if (route.gameId && gameById.has(route.gameId)) {
            renderGame(route.gameId);
        } else {
            renderCatalog();
        }
    }

    function catalogPath() {
        const params = new URLSearchParams();
        if (state.category !== "all") params.set("category", state.category);
        if (state.query) params.set("q", state.query);
        if (state.sort !== "popular") params.set("sort", state.sort);
        if (state.page > 1) params.set("page", String(state.page));
        const qs = params.toString();
        return qs ? `${BASE_PATH}?${qs}` : BASE_PATH;
    }

    function gamePath(gameId) {
        return `${BASE_PATH}game.html?id=${encodeURIComponent(gameId)}`;
    }

    function absoluteGameUrl(gameId) {
        return `${SITE.origin}/game.html?id=${encodeURIComponent(gameId)}`;
    }

    function pushCatalogRoute(replace = false) {
        const path = catalogPath();
        const method = replace ? "replaceState" : "pushState";
        window.history[method]({}, "", path);
    }

    function pushGameRoute(gameId) {
        window.history.pushState({}, "", gamePath(gameId));
    }

    function renderCategoryNav() {
        const html = SIDEBAR_GROUPS.map((group) => `
            <div class="category-group" aria-label="${escapeHtml(group.label)}">
                <p class="sidebar-title">${escapeHtml(group.label)}</p>
                ${group.items.map((item) => sidebarItem(item)).join("")}
            </div>
        `).join("");

        const mobileHtml = CATEGORIES.map((category) => {
            const active = state.category === category.id && state.view === "catalog";
            const href = category.id === "all" ? BASE_PATH : `${BASE_PATH}?category=${encodeURIComponent(category.id)}`;
            return `
                <a class="mobile-cat ${active ? "is-active" : ""}" href="${href}" data-category-link="${category.id}">
                    <i data-lucide="${category.icon}"></i>
                    <span>${escapeHtml(category.label)}</span>
                </a>
            `;
        }).join("");

        dom.categoryNav.innerHTML = html;
        dom.mobileCategories.innerHTML = mobileHtml;
    }

    function sidebarItem(item) {
        const active = isSidebarItemActive(item);
        const href = itemHref(item);
        const attrs = [
            item.category ? `data-category-link="${item.category}"` : "",
            item.sort ? `data-sort-link="${item.sort}"` : "",
            active ? 'aria-current="page"' : 'aria-current="false"'
        ].filter(Boolean).join(" ");

        return `
            <a class="category-link ${active ? "is-active" : ""}" href="${href}" ${attrs} data-label="${escapeHtml(item.label)}" aria-label="${escapeHtml(item.label)}">
                <i data-lucide="${item.icon}"></i>
                <span>${escapeHtml(item.label)}</span>
            </a>
        `;
    }

    function isSidebarItemActive(item) {
        if (state.view !== "catalog") return false;
        if (["recent", "popular", "updated"].includes(item.id)) return false;
        if (item.id === "home") {
            return state.category === "all" && state.sort === "popular" && !state.query;
        }
        if (item.sort && state.sort !== item.sort) return false;
        if (item.category) return state.category === item.category;
        return false;
    }

    function itemHref(item) {
        const params = new URLSearchParams();
        if (item.category && item.category !== "all") params.set("category", item.category);
        if (item.sort && item.sort !== "popular") params.set("sort", item.sort);
        const qs = params.toString();
        return qs ? `${BASE_PATH}?${qs}` : BASE_PATH;
    }

    function filteredGames() {
        const query = state.query.toLowerCase();
        const filtered = games.filter((game) => {
            const matchesCategory = state.category === "all" || game.category === state.category;
            const matchesSearch = !query || game.searchText.includes(query);
            return matchesCategory && matchesSearch;
        });

        return sortGames(filtered);
    }

    function sortGames(list) {
        const copy = [...list];
        switch (state.sort) {
            case "rating":
                return copy.sort((a, b) => b.rating - a.rating || b.playsValue - a.playsValue);
            case "newest":
                return copy.sort((a, b) => b.index - a.index);
            case "az":
                return copy.sort((a, b) => a.title.localeCompare(b.title));
            default:
                return copy.sort((a, b) => b.playsValue - a.playsValue || b.rating - a.rating);
        }
    }

    function thumbnailCandidates(game) {
        const hash = String(game.imageHash || "").trim();
        const candidates = [];
        if (hash) {
            candidates.push(`https://img.gamedistribution.com/${hash}-512x384.jpeg`);
            candidates.push(`https://images.gamedistribution.com/${hash}-512x384.jpeg`);
            candidates.push(`https://img.gamedistribution.com/${hash}-512x340.jpeg`);
            candidates.push(`https://images.gamedistribution.com/${hash}-512x340.jpeg`);
            candidates.push(`https://img.gamedistribution.com/${hash}-512x512.jpeg`);
            candidates.push(`https://images.gamedistribution.com/${hash}-512x512.jpeg`);
            candidates.push(`https://img.gamedistribution.com/${hash}-512x512.jpg`);
        }
        if (game.thumbnail) candidates.push(game.thumbnail);
        return [...new Set(candidates)];
    }

    function thumbnailSrc(game, step = 0) {
        const candidates = thumbnailCandidates(game);
        if (!candidates.length) return placeholderImage(game.title);
        return candidates[Math.max(0, Math.min(step, candidates.length - 1))];
    }

    function placeholderImage(title) {
        const initials = title
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((word) => word.charAt(0).toUpperCase())
            .join("") || "PX";
        const hue = Array.from(title).reduce((sum, char) => sum + char.charCodeAt(0), 0) % 360;
        const svg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
                <defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="hsl(${hue},70%,42%)"/><stop offset="1" stop-color="hsl(${(hue + 70) % 360},72%,30%)"/></linearGradient></defs>
                <rect width="512" height="512" fill="url(#g)"/>
                <text x="256" y="282" text-anchor="middle" font-family="Arial,sans-serif" font-size="150" font-weight="800" fill="white">${escapeHtml(initials)}</text>
            </svg>
        `;
        return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
    }

    function gameCard(game, index) {
        const candidates = thumbnailCandidates(game);
        const highPriority = index < 8;
        return `
            <article class="game-card">
                <a class="game-card-link" href="${gamePath(game.id)}" data-game-link="${game.id}" aria-label="Play ${escapeHtml(game.title)}">
                    <figure class="game-card-media">
                        <img
                            src="${escapeHtml(thumbnailSrc(game, 0))}"
                            alt="${escapeHtml(game.title)}"
                            width="512"
                            height="384"
                            loading="${highPriority ? "eager" : "lazy"}"
                            fetchpriority="${highPriority ? "high" : "low"}"
                            decoding="async"
                            data-game-id="${escapeHtml(game.id)}"
                            data-step="0"
                            data-max-step="${Math.max(candidates.length - 1, 0)}"
                        />
                    </figure>
                    <div class="game-card-body">
                        <h3 class="game-card-title">${escapeHtml(game.title)}</h3>
                        <div class="game-card-meta">
                            <span>${escapeHtml(capitalize(game.category))}</span>
                            <span>${game.rating.toFixed(1)}</span>
                        </div>
                    </div>
                </a>
            </article>
        `;
    }

    function renderCatalog() {
        state.view = "catalog";
        state.activeGameId = null;
        state.launchedGameId = null;
        document.body.classList.remove("is-focus");
        renderCategoryNav();

        const filtered = filteredGames();
        const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
        state.page = Math.min(state.page, totalPages);
        const start = (state.page - 1) * PAGE_SIZE;
        const pageGames = filtered.slice(start, start + PAGE_SIZE);
        const isSearch = Boolean(state.query);
        const categoryName = categoryLabel(state.category);

        dom.catalogKicker.textContent = isSearch ? "Search results" : "Free online games";
        dom.catalogTitle.textContent = isSearch
            ? `Search: ${state.query}`
            : state.category === "all"
                ? "Play browser games instantly"
                : `${categoryName} games`;
        dom.catalogDescription.textContent = isSearch
            ? `Showing matching games from the PlayArcadeX catalog.`
            : state.category === "all"
                ? "Choose a game, launch it in a secure iframe, and keep playing on desktop, tablet, or mobile."
                : `Play free ${categoryName.toLowerCase()} games instantly in your browser.`;

        if (!pageGames.length) {
            dom.catalogGrid.innerHTML = `
                <article class="empty-state">
                    <h2>No games found</h2>
                    <p>Try a different category or search term.</p>
                </article>
            `;
            dom.pager.innerHTML = "";
        } else {
            dom.catalogGrid.innerHTML = pageGames.map((game, index) => gameCard(game, index)).join("");
            dom.pager.innerHTML = pagerTemplate(state.page, totalPages);
        }

        dom.catalogView.classList.remove("hidden");
        dom.gameView.classList.add("hidden");
        syncSearchClear();
        updateCatalogSeo(filtered);
        injectItemListSchema(pageGames.slice(0, 20));
        refreshIcons();
    }

    function pagerTemplate(current, total) {
        if (total <= 1) return "";
        const pages = pageTokens(current, total).map((token) => {
            if (token === "...") return `<span class="section-meta" aria-hidden="true">...</span>`;
            return `
                <button class="page-btn ${token === current ? "is-active" : ""}" type="button" data-page="${token}" ${token === current ? 'aria-current="page"' : ""}>
                    ${token}
                </button>
            `;
        }).join("");

        return `
            <button class="page-btn" type="button" data-page="${current - 1}" ${current <= 1 ? "disabled" : ""} aria-label="Previous page">
                <i data-lucide="chevron-left"></i>
            </button>
            ${pages}
            <button class="page-btn" type="button" data-page="${current + 1}" ${current >= total ? "disabled" : ""} aria-label="Next page">
                <i data-lucide="chevron-right"></i>
            </button>
        `;
    }

    function pageTokens(current, total) {
        if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
        const tokens = [1];
        const left = Math.max(2, current - 1);
        const right = Math.min(total - 1, current + 1);
        if (left > 2) tokens.push("...");
        for (let page = left; page <= right; page += 1) tokens.push(page);
        if (right < total - 1) tokens.push("...");
        tokens.push(total);
        return tokens;
    }

    function renderGame(gameId) {
        const game = gameById.get(gameId);
        if (!game) {
            renderCatalog();
            return;
        }

        state.view = "game";
        state.activeGameId = game.id;
        state.launchedGameId = null;
        document.body.classList.remove("is-focus");
        renderCategoryNav();

        dom.catalogView.classList.add("hidden");
        dom.gameView.classList.remove("hidden");
        dom.gameMain.innerHTML = gameTemplate(game);
        dom.relatedPanel.innerHTML = relatedTemplate(game);
        bindGameControls();
        updateGameSeo(game);
        injectGameSchema(game);
        refreshIcons();
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function gameTemplate(game) {
        return `
            <article class="player-card">
                <section id="playerStage" class="player-stage">
                    <img class="player-poster" src="${escapeHtml(thumbnailSrc(game, 0))}" alt="${escapeHtml(game.title)}" width="512" height="512" data-game-id="${escapeHtml(game.id)}" data-step="0" data-max-step="${Math.max(thumbnailCandidates(game).length - 1, 0)}" />
                    <div class="player-shade"></div>
                    <div id="playerBoot" class="player-boot">
                        <div class="player-boot-inner">
                            <span class="pill"><i data-lucide="star"></i>${game.rating.toFixed(1)} rating</span>
                            <h1 class="game-title">${escapeHtml(game.title)}</h1>
                            <p class="game-summary">${escapeHtml(game.description)}</p>
                            <button class="primary-btn" type="button" data-launch-game>
                                <i data-lucide="play"></i>
                                <span>Play now</span>
                            </button>
                        </div>
                    </div>
                </section>

                <nav class="toolbar" aria-label="Game controls">
                    <button class="ghost-btn" type="button" data-back-home>
                        <i data-lucide="arrow-left"></i>
                        <span>Back</span>
                    </button>
                    <button class="ghost-btn" type="button" data-launch-game>
                        <i data-lucide="play"></i>
                        <span>Launch</span>
                    </button>
                    <button class="ghost-btn" type="button" data-reload-game>
                        <i data-lucide="refresh-cw"></i>
                        <span>Reload</span>
                    </button>
                    <button class="ghost-btn" type="button" data-fullscreen>
                        <i data-lucide="maximize"></i>
                        <span>Fullscreen</span>
                    </button>
                    <button class="ghost-btn" type="button" data-focus>
                        <i data-lucide="focus"></i>
                        <span>Focus</span>
                    </button>
                    <button class="ghost-btn" type="button" data-share-game>
                        <i data-lucide="share-2"></i>
                        <span>Share</span>
                    </button>
                    <span id="feedback" class="feedback" aria-live="polite"></span>
                </nav>
            </article>

            <section class="game-info">
                <div class="stat-row">
                    <span class="pill"><i data-lucide="folder"></i>${escapeHtml(capitalize(game.category))}</span>
                    <span class="pill"><i data-lucide="activity"></i>${escapeHtml(game.plays)} plays</span>
                    <span class="pill"><i data-lucide="monitor-smartphone"></i>Desktop and mobile</span>
                </div>
                <section class="info-panel">
                    <h2>About ${escapeHtml(game.title)}</h2>
                    <p>${escapeHtml(game.description)}</p>
                </section>
                <section class="info-panel">
                    <h2>Controls</h2>
                    <p>Most games support keyboard, mouse, touch, or gamepad controls depending on the original publisher build.</p>
                </section>
            </section>
        `;
    }

    function relatedTemplate(game) {
        const related = [
            ...games.filter((entry) => entry.id !== game.id && entry.category === game.category),
            ...games.filter((entry) => entry.id !== game.id && entry.category !== game.category)
        ]
            .sort((a, b) => b.playsValue - a.playsValue || b.rating - a.rating)
            .slice(0, RELATED_COUNT);

        return `
            <h2>Play next</h2>
            <div class="side-list">
                ${related.map((entry, index) => `
                    <article class="side-card">
                        <a href="${gamePath(entry.id)}" data-game-link="${entry.id}" aria-label="Play ${escapeHtml(entry.title)}">
                            <figure class="side-thumb">
                                <img src="${escapeHtml(thumbnailSrc(entry, 0))}" alt="${escapeHtml(entry.title)}" loading="${index < 4 ? "eager" : "lazy"}" decoding="async" width="512" height="384" data-game-id="${escapeHtml(entry.id)}" data-step="0" data-max-step="${Math.max(thumbnailCandidates(entry).length - 1, 0)}" />
                            </figure>
                            <span>${escapeHtml(entry.title)}</span>
                        </a>
                    </article>
                `).join("")}
            </div>
        `;
    }

    function bindGameControls() {
        const bind = (selector, handler) => {
            dom.gameMain.querySelectorAll(selector).forEach((button) => {
                button.addEventListener("click", async (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    await handler();
                });
            });
        };

        bind("[data-launch-game]", launchActiveGame);
        bind("[data-reload-game]", reloadActiveGame);
        bind("[data-fullscreen]", toggleFullscreen);
        bind("[data-focus]", toggleFocus);
        bind("[data-share-game]", shareGame);
        bind("[data-back-home]", () => {
            state.page = 1;
            pushCatalogRoute(false);
            renderCatalog();
        });
    }

    function launchActiveGame() {
        const game = gameById.get(state.activeGameId);
        const stage = document.getElementById("playerStage");
        const boot = document.getElementById("playerBoot");
        if (!game || !stage) return;

        const existing = stage.querySelector("iframe");
        if (existing) existing.remove();

        const iframe = document.createElement("iframe");
        iframe.title = `${game.title} on PlayArcadeX`;
        iframe.loading = "eager";
        iframe.referrerPolicy = "origin";
        iframe.allowFullscreen = true;
        iframe.setAttribute("allow", "autoplay; fullscreen; gamepad; clipboard-write");
        iframe.setAttribute("sandbox", "allow-scripts allow-same-origin allow-popups allow-pointer-lock allow-forms allow-downloads");
        iframe.src = gameIframeUrl(game);
        stage.appendChild(iframe);
        if (boot) boot.classList.add("hidden");
        state.launchedGameId = game.id;
        setFeedback("Game loaded");
    }

    function gameIframeUrl(game) {
        const clean = String(game.iframeUrl || "").split("?")[0];
        const referrer = `${SITE.origin}/game.html?id=${encodeURIComponent(game.id)}`;
        return `${clean}?gd_sdk_referrer_url=${encodeURIComponent(referrer)}`;
    }

    function reloadActiveGame() {
        if (state.launchedGameId !== state.activeGameId) {
            launchActiveGame();
            return;
        }
        const iframe = document.querySelector("#playerStage iframe");
        if (!iframe) {
            launchActiveGame();
            return;
        }
        iframe.src = iframe.src;
        setFeedback("Reloaded");
    }

    async function toggleFullscreen() {
        const stage = document.getElementById("playerStage");
        if (!stage) return;

        try {
            if (document.fullscreenElement === stage) {
                await document.exitFullscreen();
            } else {
                await stage.requestFullscreen();
            }
        } catch {
            setFeedback("Fullscreen unavailable", true);
        }
    }

    function toggleFocus() {
        if (state.view !== "game") return;
        document.body.classList.toggle("is-focus");
        setFeedback(document.body.classList.contains("is-focus") ? "Focus mode" : "Focus off");
    }

    async function shareGame() {
        const game = gameById.get(state.activeGameId);
        if (!game) return;
        const url = absoluteGameUrl(game.id);
        const data = {
            title: `${game.title} | PlayArcadeX`,
            text: `Play ${game.title} free on PlayArcadeX`,
            url
        };

        if (navigator.share) {
            try {
                await navigator.share(data);
                return;
            } catch {
                // Continue with clipboard fallback.
            }
        }

        try {
            await navigator.clipboard.writeText(url);
            setFeedback("Link copied");
        } catch {
            setFeedback("Copy failed", true);
        }
    }

    function setFeedback(message, isError = false) {
        const feedback = document.getElementById("feedback");
        if (!feedback) return;
        window.clearTimeout(state.feedbackTimer);
        feedback.textContent = message;
        feedback.style.color = isError ? "var(--danger)" : "var(--brand)";
        state.feedbackTimer = window.setTimeout(() => {
            feedback.textContent = "";
        }, 2200);
    }

    function updateCatalogSeo(list) {
        const categoryName = categoryLabel(state.category);
        const isSearch = Boolean(state.query);
        const title = isSearch
            ? `Search ${state.query} Games | PlayArcadeX`
            : state.category === "all"
                ? "PlayArcadeX | Free Online Browser Games"
                : `${categoryName} Games Online | PlayArcadeX`;
        const description = isSearch
            ? `Search results for ${state.query} on PlayArcadeX. Play free browser games instantly on desktop and mobile.`
            : state.category === "all"
                ? "Play free HTML5 browser games instantly on PlayArcadeX. Action, racing, puzzle, sports, casual, io, and multiplayer games in one fast arcade."
                : `Play free ${categoryName.toLowerCase()} games online on PlayArcadeX. Launch fast HTML5 games directly in your browser.`;
        const url = canonicalCatalogUrl();
        const image = list[0]?.thumbnail || SITE.defaultImage;

        setMeta(title, description, url, image, "website");
        safeSet(dom.metaKeywords, "content", `${SITE.name}, free online games, browser games, ${categoryName.toLowerCase()} games, html5 games`);
    }

    function canonicalCatalogUrl() {
        const params = new URLSearchParams();
        if (state.category !== "all") params.set("category", state.category);
        if (state.query) params.set("q", state.query);
        if (state.sort !== "popular") params.set("sort", state.sort);
        if (state.page > 1) params.set("page", String(state.page));
        const qs = params.toString();
        return qs ? `${SITE.origin}/?${qs}` : SITE.home;
    }

    function updateGameSeo(game) {
        const title = trimText(`Play ${game.title} Online Free | PlayArcadeX`, 62);
        const description = trimText(`Play ${game.title} online for free on PlayArcadeX. This ${capitalize(game.category)} browser game loads in a secure iframe and works on desktop and mobile.`, 158);
        const url = absoluteGameUrl(game.id);
        const image = game.thumbnail || thumbnailSrc(game, 0) || SITE.defaultImage;

        setMeta(title, description, url, image, "game");
        safeSet(dom.metaKeywords, "content", `${SITE.name}, ${game.title}, ${game.category} game, free browser game, html5 game`);
    }

    function setMeta(title, description, url, image, type) {
        document.title = title;
        safeSet(dom.metaDescription, "content", description);
        safeSet(dom.ogType, "content", type);
        safeSet(dom.ogUrl, "content", url);
        safeSet(dom.ogTitle, "content", title);
        safeSet(dom.ogDescription, "content", description);
        safeSet(dom.ogImage, "content", image);
        safeSet(dom.twitterTitle, "content", title);
        safeSet(dom.twitterDescription, "content", description);
        safeSet(dom.twitterImage, "content", image);
        safeSet(dom.canonical, "href", url);
    }

    function safeSet(element, attr, value) {
        if (element) element.setAttribute(attr, value);
    }

    function trimText(value, limit) {
        if (value.length <= limit) return value;
        return `${value.slice(0, Math.max(0, limit - 3)).trim()}...`;
    }

    function clearDynamicSchema() {
        const existing = document.getElementById(SCHEMA_ID);
        if (existing) existing.remove();
    }

    function injectItemListSchema(list) {
        clearDynamicSchema();
        if (!list.length) return;
        injectSchema({
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: "PlayArcadeX game catalog",
            itemListElement: list.slice(0, 20).map((game, index) => ({
                "@type": "ListItem",
                position: index + 1,
                url: absoluteGameUrl(game.id),
                name: game.title
            }))
        });
    }

    function injectGameSchema(game) {
        clearDynamicSchema();
        injectSchema({
            "@context": "https://schema.org",
            "@type": "GameApplication",
            name: game.title,
            url: absoluteGameUrl(game.id),
            image: game.thumbnail || thumbnailSrc(game, 0),
            description: game.description,
            applicationCategory: "Game",
            operatingSystem: "Any",
            genre: capitalize(game.category),
            aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: game.rating.toFixed(1),
                bestRating: "5",
                worstRating: "1",
                ratingCount: Math.max(25, Math.round(game.playsValue / 16))
            },
            offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
                availability: "https://schema.org/InStock"
            },
            publisher: {
                "@type": "Organization",
                name: SITE.name,
                url: SITE.home
            }
        });
    }

    function injectSchema(schema) {
        const script = document.createElement("script");
        script.id = SCHEMA_ID;
        script.type = "application/ld+json";
        script.textContent = JSON.stringify(schema);
        document.head.appendChild(script);
    }

    function handleImageError(event) {
        const image = event.target;
        if (!(image instanceof HTMLImageElement)) return;
        const game = gameById.get(image.dataset.gameId || "");
        if (!game) return;

        const step = Number(image.dataset.step || "0");
        const maxStep = Number(image.dataset.maxStep || "0");
        if (step < maxStep) {
            const nextStep = step + 1;
            image.dataset.step = String(nextStep);
            image.src = thumbnailSrc(game, nextStep);
            return;
        }

        if (image.dataset.placeholder === "1") return;
        image.dataset.placeholder = "1";
        image.src = placeholderImage(game.title);
    }

    function syncSearchClear() {
        dom.clearSearchBtn.classList.toggle("hidden", !dom.searchInput.value);
    }

    function setCatalogFilter(category, sort = null) {
        if (category !== null) {
            state.category = categoryIds.has(category) ? category : "all";
        }
        if (sort && ["popular", "rating", "newest", "az"].includes(sort)) {
            state.sort = sort;
            dom.sortSelect.value = state.sort;
        }
        state.page = 1;
        renderCatalog();
        pushCatalogRoute(false);
    }

    function setCategory(category) {
        setCatalogFilter(category);
    }

    function resetFilters() {
        state.category = "all";
        state.query = "";
        state.sort = "popular";
        state.page = 1;
        dom.searchInput.value = "";
        dom.sortSelect.value = "popular";
        renderCatalog();
        pushCatalogRoute(false);
    }

    function openRandomGame() {
        const pool = filteredGames();
        if (!pool.length) return;
        const game = pool[Math.floor(Math.random() * pool.length)];
        if (!game) return;
        pushGameRoute(game.id);
        renderGame(game.id);
    }

    function bindEvents() {
        dom.searchForm.addEventListener("submit", (event) => {
            event.preventDefault();
            state.query = dom.searchInput.value.trim();
            state.page = 1;
            renderCatalog();
            pushCatalogRoute(false);
        });

        dom.searchInput.addEventListener("input", debounce(() => {
            state.query = dom.searchInput.value.trim();
            state.page = 1;
            renderCatalog();
            pushCatalogRoute(true);
        }, 180));

        dom.clearSearchBtn.addEventListener("click", () => {
            dom.searchInput.value = "";
            state.query = "";
            state.page = 1;
            renderCatalog();
            pushCatalogRoute(false);
        });

        dom.sortSelect.addEventListener("change", () => {
            state.sort = dom.sortSelect.value;
            state.page = 1;
            renderCatalog();
            pushCatalogRoute(false);
        });

        dom.resetFiltersBtn.addEventListener("click", resetFilters);
        dom.randomBtn.addEventListener("click", openRandomGame);

        document.addEventListener("click", async (event) => {
            const categoryLink = event.target.closest("[data-category-link], [data-sort-link]");
            if (categoryLink) {
                event.preventDefault();
                const category = categoryLink.hasAttribute("data-category-link")
                    ? categoryLink.getAttribute("data-category-link")
                    : null;
                const sort = categoryLink.getAttribute("data-sort-link");
                setCatalogFilter(category, sort);
                return;
            }

            const gameLink = event.target.closest("[data-game-link]");
            if (gameLink) {
                event.preventDefault();
                const gameId = gameLink.getAttribute("data-game-link");
                if (gameId && gameById.has(gameId)) {
                    pushGameRoute(gameId);
                    renderGame(gameId);
                }
                return;
            }

            if (event.target.closest("[data-route-home]") || event.target.closest("[data-back-home]")) {
                event.preventDefault();
                state.page = 1;
                pushCatalogRoute(false);
                renderCatalog();
                return;
            }

            const pageButton = event.target.closest("[data-page]");
            if (pageButton) {
                const page = Number(pageButton.getAttribute("data-page"));
                const totalPages = Math.max(1, Math.ceil(filteredGames().length / PAGE_SIZE));
                if (Number.isFinite(page)) {
                    state.page = Math.max(1, Math.min(totalPages, page));
                    renderCatalog();
                    pushCatalogRoute(false);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                }
                return;
            }

            if (event.target.closest("[data-launch-game]")) {
                launchActiveGame();
                return;
            }

            if (event.target.closest("[data-reload-game]")) {
                reloadActiveGame();
                return;
            }

            if (event.target.closest("[data-fullscreen]")) {
                await toggleFullscreen();
                return;
            }

            if (event.target.closest("[data-focus]")) {
                toggleFocus();
                return;
            }

            if (event.target.closest("[data-share-game]")) {
                await shareGame();
                return;
            }

            const modalOpen = event.target.closest("[data-modal-open]");
            if (modalOpen) {
                const dialog = document.getElementById(modalOpen.getAttribute("data-modal-open"));
                if (dialog && typeof dialog.showModal === "function") dialog.showModal();
                return;
            }

            if (event.target.closest("[data-modal-close]")) {
                const dialog = event.target.closest("dialog");
                if (dialog) dialog.close();
            }
        });

        [dom.modalAbout, dom.modalPrivacy, dom.modalTerms].forEach((dialog) => {
            if (!dialog) return;
            dialog.addEventListener("click", (event) => {
                const bounds = dialog.getBoundingClientRect();
                const inside = event.clientX >= bounds.left &&
                    event.clientX <= bounds.right &&
                    event.clientY >= bounds.top &&
                    event.clientY <= bounds.bottom;
                if (!inside) dialog.close();
            });
        });

        document.addEventListener("error", handleImageError, true);

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && document.body.classList.contains("is-focus")) {
                document.body.classList.remove("is-focus");
                setFeedback("Focus off");
            }
        });

        window.addEventListener("popstate", applyRouteState);
        window.addEventListener("load", refreshIcons);
    }

    function init() {
        renderCategoryNav();
        bindEvents();
        applyRouteState();
        refreshIcons();
    }

    init();
})();
