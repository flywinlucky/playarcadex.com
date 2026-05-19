(() => {
    "use strict";

    const categories = [
        { id: "all", label: "All Games", icon: "layout-grid" },
        { id: "action", label: "Action", icon: "swords" },
        { id: "racing", label: "Racing", icon: "flag" },
        { id: "puzzle", label: "Puzzle", icon: "brain" },
        { id: "sports", label: "Sports", icon: "trophy" },
        { id: "casual", label: "Casual", icon: "sparkles" },
        { id: "adventure", label: "Adventure", icon: "compass" },
        { id: "shooter", label: "Shooter", icon: "crosshair" },
        { id: "strategy", label: "Strategy", icon: "shield" },
        { id: "io", label: ".io", icon: "orbit" },
        { id: "multiplayer", label: "Multiplayer", icon: "users" }
    ];

    const gamesData = Array.isArray(window.PLAYARCADEX_GAMES_DATA) ? window.PLAYARCADEX_GAMES_DATA : [];
    const catalogGames = enrichCatalogEntries(dedupeCatalogEntries(gamesData));

    const gameById = new Map(catalogGames.map((game) => [game.id, game]));

    const SIDEBAR_COLLAPSED_KEY = "playarcadex:sidebar-collapsed:v1";
    const HIDDEN_GAMES_KEY = "playarcadex:hidden-games:v1";
    const DYNAMIC_SCHEMA_ID = "dynamicGameSchema";
    const SPECULATION_SCRIPT_ID = "speculationRulesSeed";
    const FILTER_PAGE_SIZE = 24;
    const PAGINATION_VISIBLE_SPAN = 1;

    const sidebarCategoryLinks = categories.map((category) => ({
        id: category.id,
        label: category.label,
        icon: category.icon,
        filter: category.id
    }));

    const BASE_META = {
        title: "PlayArcadeX | Free Browser Games",
        description: "PlayArcadeX is a premium portal for fast-loading HTML5 browser games with secure launch flow and curated action, racing, puzzle, sports, and casual titles.",
        keywords: "PlayArcadeX, browser games, html5 games, unblocked games, racing games, puzzle games, sports games, casual games",
        url: "https://playarcadex.com/",
        image: "https://images.gamedistribution.com/13eabea86f7c4cd993a156258420e9ec-512x512.jpeg"
    };

    const state = {
        currentView: "catalog",
        activeCategory: "all",
        searchTerm: "",
        catalogPage: 1,
        activeGameId: null,
        isFocusMode: false,
        sidebarCollapsed: loadSidebarCollapsed(),
        hiddenGameIds: new Set(loadHiddenGameIds()),
        catalogRefreshTimer: null,
        feedbackTimer: null
    };

    const dom = {
        siteHeader: document.getElementById("siteHeader"),
        sidebarToggleBtn: document.getElementById("sidebarToggleBtn"),
        desktopSidebar: document.getElementById("desktopSidebar"),
        desktopCategoryNav: document.getElementById("desktopCategoryNav"),
        searchForm: document.getElementById("searchForm"),
        searchInput: document.getElementById("searchInput"),
        resultInfo: document.getElementById("resultInfo"),
        resetFiltersBtn: document.getElementById("resetFiltersBtn"),
        catalogFiltersBar: document.getElementById("catalogFiltersBar"),
        catalogView: document.getElementById("catalogView"),
        catalogSections: document.getElementById("catalogSections"),
        gameArticle: document.getElementById("gameArticle"),
        bootScreen: document.getElementById("bootScreen"),
        playArena: document.getElementById("playArena"),
        playerFrameHost: document.getElementById("playerFrameHost"),
        playerPlaceholder: document.getElementById("playerPlaceholder"),
        metaDetails: document.getElementById("metaDetails"),
        backToCatalogBtn: document.getElementById("backToCatalogBtn"),
        focusModeBtn: document.getElementById("focusModeBtn"),
        focusModeLabel: document.getElementById("focusModeLabel"),
        fullscreenBtn: document.getElementById("fullscreenBtn"),
        fullscreenLabel: document.getElementById("fullscreenLabel"),
        shareBtn: document.getElementById("shareBtn"),
        reloadGameBtn: document.getElementById("reloadGameBtn"),
        controlFeedback: document.getElementById("controlFeedback"),
        randomGameBtn: document.getElementById("randomGameBtn"),
        backToTopBtn: document.getElementById("backToTopBtn"),
        desktopRecommendList: document.getElementById("desktopRecommendList"),
        mobileRecommendList: document.getElementById("mobileRecommendList"),
        siteFooter: document.getElementById("siteFooter"),
        privacyModal: document.getElementById("privacyModal"),
        termsModal: document.getElementById("termsModal"),
        aboutModal: document.getElementById("aboutModal"),
        metaDescription: document.querySelector('meta[name="description"]'),
        metaKeywords: document.querySelector('meta[name="keywords"]'),
        ogType: document.querySelector('meta[property="og:type"]'),
        ogTitle: document.querySelector('meta[property="og:title"]'),
        ogDescription: document.querySelector('meta[property="og:description"]'),
        ogUrl: document.querySelector('meta[property="og:url"]'),
        ogImage: document.querySelector('meta[property="og:image"]'),
        twitterTitle: document.querySelector('meta[name="twitter:title"]'),
        twitterDescription: document.querySelector('meta[name="twitter:description"]'),
        twitterUrl: document.querySelector('meta[name="twitter:url"]'),
        twitterImage: document.querySelector('meta[name="twitter:image"]'),
        canonical: document.querySelector('link[rel="canonical"]')
    };

    function loadSidebarCollapsed() {
        try {
            return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
        } catch {
            return false;
        }
    }

    function saveSidebarCollapsed() {
        try {
            window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, state.sidebarCollapsed ? "1" : "0");
        } catch {
            // Ignore storage restrictions.
        }
    }

    function loadHiddenGameIds() {
        try {
            const raw = window.localStorage.getItem(HIDDEN_GAMES_KEY);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed)
                ? parsed.map((entry) => String(entry || "").trim()).filter(Boolean)
                : [];
        } catch {
            return [];
        }
    }

    function saveHiddenGameIds() {
        try {
            window.localStorage.setItem(HIDDEN_GAMES_KEY, JSON.stringify([...state.hiddenGameIds]));
        } catch {
            // Ignore storage restrictions.
        }
    }

    function isGameVisible(game) {
        return !state.hiddenGameIds.has(game.id);
    }

    function visibleCatalogGames() {
        return catalogGames.filter(isGameVisible);
    }

    function markGameAsHidden(gameId) {
        if (!gameId || state.hiddenGameIds.has(gameId)) {
            return false;
        }

        state.hiddenGameIds.add(gameId);
        saveHiddenGameIds();
        return true;
    }

    function scheduleCatalogRefresh() {
        if (state.catalogRefreshTimer) return;

        state.catalogRefreshTimer = window.setTimeout(() => {
            state.catalogRefreshTimer = null;
            renderCatalog();
            refreshIcons();
        }, 80);
    }

    function activeGame() {
        if (!state.activeGameId) return null;
        return gameById.get(state.activeGameId) || null;
    }

    function dedupeCatalogEntries(entries) {
        const unique = [];
        const seenIds = new Set();
        const seenHashes = new Set();

        for (const game of entries) {
            const id = String(game.id || "").trim();
            const hash = String(game.imageHash || "").trim();
            if (!id) continue;
            if (seenIds.has(id)) continue;
            if (hash && seenHashes.has(hash)) continue;

            seenIds.add(id);
            if (hash) {
                seenHashes.add(hash);
            }
            unique.push(game);
        }

        return unique;
    }

    function enrichCatalogEntries(entries) {
        return entries.map((game) => ({
            ...game,
            _searchText: `${game.title} ${game.description} ${game.category}`.toLowerCase(),
            _playsValue: toNumericPlays(game.plays)
        }));
    }

    function debounce(fn, wait) {
        let timer = null;
        return (...args) => {
            window.clearTimeout(timer);
            timer = window.setTimeout(() => fn(...args), wait);
        };
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function capitalize(value) {
        if (!value) return "";
        return value.charAt(0).toUpperCase() + value.slice(1);
    }

    function toNumericPlays(plays) {
        const normalized = String(plays).trim().toUpperCase();
        const numeric = parseFloat(normalized.replace(/[^\d.]/g, "")) || 0;
        if (normalized.endsWith("M")) return Math.round(numeric * 1_000_000);
        if (normalized.endsWith("K")) return Math.round(numeric * 1_000);
        return Math.round(numeric);
    }

    function getInitials(title) {
        return title
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part.charAt(0).toUpperCase())
            .join("") || "GX";
    }

    function createGradientPlaceholder(title) {
        const canvas = document.createElement("canvas");
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
            return "";
        }

        const seed = Array.from(title).reduce((sum, char) => sum + char.charCodeAt(0), 0);
        const hueA = seed % 360;
        const hueB = (seed * 1.8) % 360;

        const gradient = ctx.createLinearGradient(0, 0, 512, 512);
        gradient.addColorStop(0, `hsl(${hueA}, 70%, 48%)`);
        gradient.addColorStop(1, `hsl(${hueB}, 74%, 34%)`);

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 512, 512);

        ctx.fillStyle = "rgba(255, 255, 255, 0.93)";
        ctx.font = "700 152px Space Grotesk, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(getInitials(title), 256, 272);

        return canvas.toDataURL("image/png");
    }

    function refreshIcons() {
        if (window.lucide && typeof window.lucide.createIcons === "function") {
            window.lucide.createIcons();
        }
    }

    function applySidebarState() {
        document.body.classList.toggle("sidebar-collapsed", state.sidebarCollapsed);

        if (dom.sidebarToggleBtn) {
            dom.sidebarToggleBtn.setAttribute("aria-label", state.sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar");
            const icon = dom.sidebarToggleBtn.querySelector("i");
            if (icon) {
                icon.setAttribute("data-lucide", state.sidebarCollapsed ? "panel-left-open" : "panel-left-close");
            }
        }
    }

    function toggleSidebar() {
        state.sidebarCollapsed = !state.sidebarCollapsed;
        saveSidebarCollapsed();
        applySidebarState();
        refreshIcons();
    }

    function setControlFeedback(message, isError) {
        if (!dom.controlFeedback) return;

        window.clearTimeout(state.feedbackTimer);
        dom.controlFeedback.textContent = message || "";
        dom.controlFeedback.classList.toggle("text-red-300", Boolean(isError));
        dom.controlFeedback.classList.toggle("text-emerald-300", !isError && Boolean(message));

        if (message) {
            state.feedbackTimer = window.setTimeout(() => {
                dom.controlFeedback.textContent = "";
                dom.controlFeedback.classList.remove("text-red-300", "text-emerald-300");
            }, 2400);
        }
    }

    function safeSet(element, attr, value) {
        if (element) {
            element.setAttribute(attr, value);
        }
    }

    function trimTitle(value, maxLength) {
        if (value.length <= maxLength) return value;
        return `${value.slice(0, Math.max(0, maxLength - 3)).trim()}...`;
    }

    function buildSidebarLink(linkItem) {
        const isActive = state.activeCategory === linkItem.filter && state.currentView === "catalog";
        const activeClass = isActive
            ? "bg-indigo-500/18 text-white"
            : "text-slate-300 hover:bg-[#151d3a] hover:text-white";

        return `
            <button type="button" data-category="${linkItem.filter}" class="sidebar-link inline-flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-[15px] font-semibold transition-all duration-300 ${activeClass}" title="${escapeHtml(linkItem.label)}" aria-label="${escapeHtml(linkItem.label)}">
                <span class="inline-flex h-5 w-5 shrink-0 items-center justify-center text-indigo-300">
                    <i data-lucide="${linkItem.icon}" class="h-4 w-4"></i>
                </span>
                <span class="sidebar-label truncate">${escapeHtml(linkItem.label)}</span>
            </button>
        `;
    }

    function renderCategoryBars() {
        dom.desktopCategoryNav.innerHTML = `
            <p class="sidebar-section-title px-2.5 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-[0.13em] text-slate-500">Categories</p>
            ${sidebarCategoryLinks.map((item) => buildSidebarLink(item)).join("")}
        `;
    }

    function filteredGames() {
        const term = state.searchTerm.trim().toLowerCase();

        return visibleCatalogGames()
            .filter((game) => {
                const inCategory = state.activeCategory === "all" || game.category === state.activeCategory;
                const inSearch = !term || game._searchText.includes(term);
                return inCategory && inSearch;
            })
            .sort((a, b) => b._playsValue - a._playsValue);
    }

    function thumbnailCandidates(game) {
        const candidates = [];
        const hash = String(game.imageHash || "").trim();

        if (hash) {
            candidates.push(`https://img.gamedistribution.com/${hash}-512x512.jpeg`);
            candidates.push(`https://img.gamedistribution.com/${hash}-512x512.jpg`);
            candidates.push(`https://images.gamedistribution.com/${hash}-512x512.jpeg`);
        }

        if (game.thumbnail) {
            candidates.push(game.thumbnail);
        }

        return [...new Set(candidates.filter(Boolean))];
    }

    function getThumbnailSource(game, step) {
        const candidates = thumbnailCandidates(game);
        if (!candidates.length) {
            return createGradientPlaceholder(game.title);
        }

        const safeIndex = Math.max(0, Math.min(step, candidates.length - 1));
        return candidates[safeIndex];
    }

    function gameCardTemplate(game, index) {
        const loadingMode = index < 1 ? "eager" : "lazy";
        const fetchPriority = index < 1 ? "high" : "low";
        const fallbackMax = Math.max(thumbnailCandidates(game).length - 1, 0);

        return `
            <article data-game-open-card="${game.id}" class="catalog-tile group card-enter relative aspect-[16/9] w-full cursor-pointer overflow-hidden rounded-xl bg-[#121833]" style="animation-delay:${Math.min(index * 12, 150)}ms">
                <img
                    src="${escapeHtml(getThumbnailSource(game, 0))}"
                    alt="Play ${escapeHtml(game.title)} free on PlayArcadeX"
                    loading="${loadingMode}"
                    fetchpriority="${fetchPriority}"
                    decoding="async"
                    width="512"
                    height="512"
                    class="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                    data-game-id="${game.id}"
                    data-image-hash="${game.imageHash}"
                    data-fallback-step="0"
                    data-fallback-max="${fallbackMax}"
                />

                <div class="tile-overlay pointer-events-none absolute inset-x-0 bottom-0 px-2.5 pb-2 pt-6">
                    <h2 class="game-tile-title truncate text-sm font-bold text-white">${escapeHtml(game.title)}</h2>
                </div>
            </article>
        `;
    }

    function rowSectionTemplate(title, games, rowId) {
        if (!games.length) return "";

        return `
            <section class="catalog-row" data-row="${rowId}">
                <header class="mb-2 flex items-center justify-between gap-2">
                    <h2 class="text-[1.65rem] font-extrabold leading-none text-white">${escapeHtml(title)}</h2>
                    <span class="text-sm font-semibold text-indigo-200">View more</span>
                </header>
                <section class="catalog-grid pb-1">
                    ${games.map((game, index) => gameCardTemplate(game, index)).join("")}
                </section>
            </section>
        `;
    }

    function buildPaginationTokens(currentPage, totalPages) {
        if (totalPages <= 7) {
            return Array.from({ length: totalPages }, (_, idx) => idx + 1);
        }

        const tokens = [1];
        const left = Math.max(2, currentPage - PAGINATION_VISIBLE_SPAN);
        const right = Math.min(totalPages - 1, currentPage + PAGINATION_VISIBLE_SPAN);

        if (left > 2) {
            tokens.push("ellipsis-left");
        }

        for (let page = left; page <= right; page += 1) {
            tokens.push(page);
        }

        if (right < totalPages - 1) {
            tokens.push("ellipsis-right");
        }

        tokens.push(totalPages);
        return tokens;
    }

    function paginationTemplate(currentPage, totalPages) {
        if (totalPages <= 1) return "";

        const tokens = buildPaginationTokens(currentPage, totalPages);
        const pagesHtml = tokens
            .map((token) => {
                if (typeof token === "string") {
                    return '<span class="catalog-pagination-ellipsis" aria-hidden="true">...</span>';
                }

                const isActive = token === currentPage;
                return `
                    <button
                        type="button"
                        data-page-jump="${token}"
                        class="catalog-pagination-btn ${isActive ? "is-active" : ""}"
                        ${isActive ? 'aria-current="page"' : ""}
                        aria-label="Go to page ${token}"
                    >
                        ${token}
                    </button>
                `;
            })
            .join("");

        return `
            <nav class="catalog-pagination-wrap" aria-label="Catalog pagination">
                <div class="catalog-pagination-shell">
                    <button
                        type="button"
                        data-page-move="-1"
                        class="catalog-pagination-btn is-nav"
                        aria-label="Previous page"
                        ${currentPage <= 1 ? "disabled" : ""}
                    >
                        &larr;
                    </button>
                    ${pagesHtml}
                    <button
                        type="button"
                        data-page-move="1"
                        class="catalog-pagination-btn is-nav"
                        aria-label="Next page"
                        ${currentPage >= totalPages ? "disabled" : ""}
                    >
                        &rarr;
                    </button>
                </div>
            </nav>
        `;
    }

    function setCatalogPage(nextPage) {
        const totalPages = Math.max(1, Math.ceil(filteredGames().length / FILTER_PAGE_SIZE));
        const clampedPage = Math.max(1, Math.min(totalPages, nextPage));
        if (clampedPage === state.catalogPage) return;

        state.catalogPage = clampedPage;
        renderCatalog();

        const targetTop = Math.max(0, window.scrollY + dom.catalogView.getBoundingClientRect().top - 84);
        window.scrollTo({ top: targetTop, behavior: "smooth" });
    }

    function topGames(limit) {
        return [...visibleCatalogGames()]
            .sort((a, b) => b._playsValue - a._playsValue)
            .slice(0, limit);
    }

    function gamesFromCategory(categoryId, limit) {
        return visibleCatalogGames()
            .filter((game) => game.category === categoryId)
            .sort((a, b) => b._playsValue - a._playsValue)
            .slice(0, limit);
    }

    function renderCatalog() {
        const games = filteredGames();
        const hasFilter = Boolean(state.searchTerm.trim()) || state.activeCategory !== "all";
        dom.resultInfo.textContent = `${games.length} games found`;
        dom.catalogFiltersBar.classList.toggle("hidden", !hasFilter);

        if (!games.length) {
            dom.catalogSections.innerHTML = `
                <article class="rounded-2xl bg-[#111734] px-6 py-12 text-center">
                    <h2 class="text-lg font-semibold text-white">No games match these filters</h2>
                    <p class="mt-2 text-sm text-slate-300">Try another category or a broader keyword.</p>
                </article>
            `;
            refreshIcons();
            return;
        }

        if (hasFilter) {
            const totalPages = Math.max(1, Math.ceil(games.length / FILTER_PAGE_SIZE));
            state.catalogPage = Math.min(state.catalogPage, totalPages);

            const start = (state.catalogPage - 1) * FILTER_PAGE_SIZE;
            const pagedGames = games.slice(start, start + FILTER_PAGE_SIZE);
            const heading = state.searchTerm.trim() ? "Search results" : `${capitalize(state.activeCategory)} games`;

            dom.resultInfo.textContent = `${games.length} games found - Page ${state.catalogPage}/${totalPages}`;
            dom.catalogSections.innerHTML = `
                ${rowSectionTemplate(heading, pagedGames, "search")}
                ${paginationTemplate(state.catalogPage, totalPages)}
            `;
            refreshIcons();
            return;
        }

        state.catalogPage = 1;

        const mostPlayed = topGames(18);
        const newest = [...visibleCatalogGames()].slice().reverse().slice(0, 12);
        const sectionRows = [
            { id: "top", title: "Top picks for you", games: mostPlayed.slice(0, 10) },
            { id: "featured", title: "Featured games", games: mostPlayed.slice(4, 14) },
            { id: "new", title: "New games", games: newest },
            { id: "board", title: "Board Games", games: gamesFromCategory("puzzle", 10) },
            { id: "adventure", title: "Adventure Games", games: gamesFromCategory("action", 10) },
            { id: "arcade", title: "Arcade Games", games: gamesFromCategory("casual", 10) }
        ];

        dom.catalogSections.innerHTML = sectionRows
            .map((row) => rowSectionTemplate(row.title, row.games, row.id))
            .join("");

        refreshIcons();
    }

    function categoryInstruction(category) {
        switch (category) {
            case "action":
                return "Use quick reactions, movement rhythm, and tactical timing to maximize scores.";
            case "racing":
                return "Master acceleration windows, obstacle timing, and route consistency for faster finishes.";
            case "puzzle":
                return "Think several steps ahead and protect future board space to avoid dead-end states.";
            case "sports":
                return "Control tempo and positioning while balancing offense and defensive reads.";
            case "casual":
                return "Focus on rhythm, flow, and clean streaks to build long score multipliers.";
            default:
                return "Jump in instantly and optimize your strategy as the level complexity scales.";
        }
    }

    function renderBootScreen(game) {
        const fallbackMax = Math.max(thumbnailCandidates(game).length - 1, 0);

        dom.bootScreen.innerHTML = `
            <section class="grid gap-5 lg:grid-cols-[320px,1fr] lg:gap-6">
                <figure class="overflow-hidden rounded-2xl border border-line bg-black/35">
                    <img
                        src="${escapeHtml(getThumbnailSource(game, 0))}"
                        alt="Play ${escapeHtml(game.title)} unblocked free on PlayArcadeX"
                        width="512"
                        height="512"
                        class="h-full w-full object-cover"
                        data-game-id="${game.id}"
                        data-image-hash="${game.imageHash}"
                        data-fallback-step="0"
                        data-fallback-max="${fallbackMax}"
                    />
                </figure>

                <section class="space-y-4">
                    <p class="inline-flex items-center gap-2 rounded-full border border-brand/60 bg-indigo-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.13em] text-indigo-100">
                        <i data-lucide="rocket" class="h-3.5 w-3.5"></i>
                        Boot Screen Ready
                    </p>

                    <h1 class="text-2xl font-extrabold text-white sm:text-3xl">${escapeHtml(game.title)}</h1>

                    <p class="line-clamp-3 text-sm leading-relaxed text-slate-200 sm:text-base">${escapeHtml(game.description)}</p>

                    <div class="flex flex-wrap gap-2 text-xs sm:text-sm">
                        <span class="inline-flex items-center gap-1 rounded-lg border border-line bg-bg/65 px-3 py-1.5 text-slate-200">
                            <i data-lucide="star" class="h-3.5 w-3.5 fill-amber-300 text-amber-300"></i>
                            ${game.rating.toFixed(1)} / 5
                        </span>
                        <span class="inline-flex items-center gap-1 rounded-lg border border-line bg-bg/65 px-3 py-1.5 text-slate-200">
                            <i data-lucide="activity" class="h-3.5 w-3.5"></i>
                            ${escapeHtml(game.plays)} plays
                        </span>
                        <span class="inline-flex items-center gap-1 rounded-lg border border-line bg-bg/65 px-3 py-1.5 text-slate-200">
                            <i data-lucide="shield-check" class="h-3.5 w-3.5"></i>
                            Policy-safe launch
                        </span>
                    </div>

                    <div class="flex flex-wrap gap-2 pt-1">
                        <button type="button" data-launch-game class="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-900/45 transition-all duration-300 hover:brightness-110">
                            <i data-lucide="play-circle" class="h-4 w-4"></i>
                            Launch Game
                        </button>

                        <button type="button" data-back-catalog class="inline-flex items-center gap-2 rounded-xl border border-line bg-bg/55 px-4 py-2.5 text-sm font-semibold text-slate-100 transition-all duration-300 hover:border-brand/70 hover:text-white">
                            <i data-lucide="chevron-left" class="h-4 w-4"></i>
                            Back to Catalog
                        </button>
                    </div>
                </section>
            </section>
        `;
    }

    function renderMetaDetails(game) {
        dom.metaDetails.innerHTML = `
            <section class="space-y-3 rounded-2xl border border-line bg-card p-5 sm:p-6">
                <h2 class="text-lg font-bold text-white">Gameplay Notes</h2>
                <p class="text-sm leading-relaxed text-slate-200">${escapeHtml(game.description)}</p>
                <p class="text-sm leading-relaxed text-slate-300">${escapeHtml(categoryInstruction(game.category))}</p>
                <p class="text-xs text-slate-400">Category: ${escapeHtml(capitalize(game.category))} | Rating: ${game.rating.toFixed(1)} | Plays: ${escapeHtml(game.plays)}</p>
            </section>
        `;
    }

    function recommendationTemplate(game) {
        const fallbackMax = Math.max(thumbnailCandidates(game).length - 1, 0);

        return `
            <article data-game-open-card="${game.id}" class="recommend-tile group relative h-[84px] cursor-pointer overflow-hidden rounded-lg bg-[#141a35]">
                <img
                    src="${escapeHtml(getThumbnailSource(game, 0))}"
                    alt="Play ${escapeHtml(game.title)} free on PlayArcadeX"
                    loading="lazy"
                    decoding="async"
                    width="512"
                    height="512"
                    class="h-full w-full object-cover"
                    data-game-id="${game.id}"
                    data-image-hash="${game.imageHash}"
                    data-fallback-step="0"
                    data-fallback-max="${fallbackMax}"
                />
                <div class="recommend-overlay pointer-events-none absolute inset-x-0 bottom-0 px-2 pb-1.5 pt-5">
                    <h3 class="truncate text-[11px] font-semibold text-white">${escapeHtml(game.title)}</h3>
                </div>
            </article>
        `;
    }

    function renderRecommendations(game) {
        const pool = game
            ? [
                ...visibleCatalogGames().filter((entry) => entry.id !== game.id && entry.category === game.category),
                ...visibleCatalogGames().filter((entry) => entry.id !== game.id && entry.category !== game.category)
            ]
            : [...visibleCatalogGames()];

        const recommendations = pool
            .sort((a, b) => b._playsValue - a._playsValue)
            .slice(0, 18);

        const html = recommendations.length
            ? recommendations.map(recommendationTemplate).join("")
            : '<p class="text-sm text-slate-400">More recommendations will appear as catalog data expands.</p>';

        dom.desktopRecommendList.innerHTML = html;
        dom.mobileRecommendList.innerHTML = html;
        refreshIcons();
    }

    function applyFocusMode() {
        const shouldDim = state.currentView === "play" && state.isFocusMode;
        [dom.siteHeader, dom.desktopSidebar, dom.siteFooter].forEach((element) => {
            if (!element) return;
            element.classList.toggle("opacity-10", shouldDim);
            element.classList.toggle("pointer-events-none", shouldDim);
        });

        dom.focusModeBtn.classList.toggle("border-brand", shouldDim);
        dom.focusModeBtn.classList.toggle("bg-indigo-500/20", shouldDim);
        dom.focusModeBtn.classList.toggle("text-white", shouldDim);
        dom.focusModeLabel.textContent = shouldDim ? "Exit Focus" : "Focus Mode";
    }

    function syncFullscreenButton() {
        const active = document.fullscreenElement === dom.playerFrameHost;
        dom.fullscreenLabel.textContent = active ? "Exit Fullscreen" : "Fullscreen";
        dom.fullscreenBtn.classList.toggle("border-brand", active);
        dom.fullscreenBtn.classList.toggle("bg-indigo-500/20", active);
    }

    function unmountGameIframe() {
        const existing = dom.playerFrameHost.querySelector("iframe");
        if (existing) {
            existing.src = "";
            existing.remove();
        }
        dom.playerPlaceholder.classList.remove("hidden");
        syncFullscreenButton();
    }

    function mountGameIframe(game) {
        unmountGameIframe();

        const iframe = document.createElement("iframe");
        iframe.className = "absolute inset-0 h-full w-full border-0";
        iframe.title = `${game.title} - PlayArcadeX`;
        iframe.loading = "eager";
        iframe.referrerPolicy = "origin";
        iframe.setAttribute("sandbox", "allow-scripts allow-same-origin allow-popups allow-pointer-lock");
        iframe.setAttribute("allow", "autoplay; gamepad; fullscreen");

        const cleanGameUrl = game.iframeUrl.split("?")[0];
        const currentOrigin = window.location.origin + window.location.pathname;
        iframe.src = `${cleanGameUrl}?gd_sdk_referrer_url=${encodeURIComponent(currentOrigin)}`;

        dom.playerFrameHost.appendChild(iframe);
        dom.playerPlaceholder.classList.add("hidden");
    }

    function clearGameSchema() {
        const existing = document.getElementById(DYNAMIC_SCHEMA_ID);
        if (existing) {
            existing.remove();
        }
    }

    function injectGameSchema(game) {
        clearGameSchema();

        if (!game) return;

        const schema = {
            "@context": "https://schema.org",
            "@type": "GameApplication",
            name: game.title,
            applicationCategory: "Game",
            operatingSystem: "Any",
            url: `${BASE_META.url}#game=${encodeURIComponent(game.id)}`,
            image: game.thumbnail,
            description: game.description,
            genre: capitalize(game.category),
            aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: game.rating.toFixed(1),
                bestRating: "5",
                worstRating: "1",
                ratingCount: Math.max(50, Math.round(toNumericPlays(game.plays) / 12))
            },
            offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
                availability: "https://schema.org/InStock"
            },
            publisher: {
                "@type": "Organization",
                name: "PlayArcadeX",
                url: BASE_META.url
            }
        };

        const script = document.createElement("script");
        script.id = DYNAMIC_SCHEMA_ID;
        script.type = "application/ld+json";
        script.textContent = JSON.stringify(schema);
        document.head.appendChild(script);
    }

    function updateSeoMeta() {
        const game = activeGame();
        const inGameContext = (state.currentView === "boot" || state.currentView === "play") && Boolean(game);

        if (!inGameContext || !game) {
            document.title = BASE_META.title;
            safeSet(dom.metaDescription, "content", BASE_META.description);
            safeSet(dom.metaKeywords, "content", BASE_META.keywords);
            safeSet(dom.ogType, "content", "website");
            safeSet(dom.ogTitle, "content", BASE_META.title);
            safeSet(dom.ogDescription, "content", BASE_META.description);
            safeSet(dom.ogUrl, "content", BASE_META.url);
            safeSet(dom.ogImage, "content", BASE_META.image);
            safeSet(dom.twitterTitle, "content", BASE_META.title);
            safeSet(dom.twitterDescription, "content", BASE_META.description);
            safeSet(dom.twitterUrl, "content", BASE_META.url);
            safeSet(dom.twitterImage, "content", BASE_META.image);
            safeSet(dom.canonical, "href", BASE_META.url);
            return;
        }

        const dynamicTitleRaw = `Play ${game.title} Unblocked Free - PlayArcadeX`;
        const dynamicTitle = trimTitle(dynamicTitleRaw, 59);
        const dynamicDescription = `${game.title} is playable instantly on PlayArcadeX. Enjoy this ${capitalize(game.category)} game free in your browser with secure launch flow, ${game.rating.toFixed(1)} rating, and ${game.plays} plays.`;
        const gameUrl = `${BASE_META.url}#game=${encodeURIComponent(game.id)}`;

        document.title = dynamicTitle;
        safeSet(dom.metaDescription, "content", dynamicDescription);
        safeSet(dom.metaKeywords, "content", `${BASE_META.keywords}, ${game.title}, ${game.category} game, play unblocked free`);
        safeSet(dom.ogType, "content", "game");
        safeSet(dom.ogTitle, "content", dynamicTitle);
        safeSet(dom.ogDescription, "content", dynamicDescription);
        safeSet(dom.ogUrl, "content", gameUrl);
        safeSet(dom.ogImage, "content", game.thumbnail);
        safeSet(dom.twitterTitle, "content", dynamicTitle);
        safeSet(dom.twitterDescription, "content", dynamicDescription);
        safeSet(dom.twitterUrl, "content", gameUrl);
        safeSet(dom.twitterImage, "content", game.thumbnail);
        safeSet(dom.canonical, "href", gameUrl);
    }

    function injectSpeculationRules() {
        const urls = [...catalogGames]
            .sort((a, b) => b._playsValue - a._playsValue)
            .slice(0, 3)
            .map((game) => `${BASE_META.url}#game=${encodeURIComponent(game.id)}`);

        const rules = {
            prefetch: [{ source: "list", urls }],
            prerender: [{ source: "list", urls }]
        };

        const existing = document.getElementById(SPECULATION_SCRIPT_ID);
        if (existing) {
            existing.remove();
        }

        const script = document.createElement("script");
        script.id = SPECULATION_SCRIPT_ID;
        script.type = "speculationrules";
        script.textContent = JSON.stringify(rules);
        document.head.appendChild(script);
    }

    function openCatalogView(updateHash) {
        state.currentView = "catalog";
        state.activeGameId = null;
        state.isFocusMode = false;

        unmountGameIframe();

        dom.catalogView.classList.remove("hidden");
        dom.gameArticle.classList.add("hidden");
        dom.playArena.classList.add("hidden");

        if (updateHash) {
            window.history.replaceState({}, "", window.location.pathname);
        }

        clearGameSchema();
        updateSeoMeta();
        applyFocusMode();
        syncFullscreenButton();
        refreshIcons();
    }

    function openBootView(gameId, updateHash) {
        const game = gameById.get(gameId);
        if (!game || state.hiddenGameIds.has(game.id)) {
            openCatalogView(updateHash);
            return;
        }

        state.currentView = "boot";
        state.activeGameId = game.id;
        state.isFocusMode = false;

        unmountGameIframe();

        dom.catalogView.classList.add("hidden");
        dom.gameArticle.classList.remove("hidden");
        dom.playArena.classList.add("hidden");

        renderBootScreen(game);
        renderMetaDetails(game);
        renderRecommendations(game);

        if (updateHash) {
            window.history.replaceState({}, "", `${window.location.pathname}#game=${encodeURIComponent(game.id)}`);
        }

        injectGameSchema(game);
        updateSeoMeta();
        applyFocusMode();
        refreshIcons();

        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function openPlayView() {
        const game = activeGame();
        if (!game) return;

        state.currentView = "play";
        dom.playArena.classList.remove("hidden");

        mountGameIframe(game);
        renderMetaDetails(game);
        renderRecommendations(game);

        injectGameSchema(game);
        updateSeoMeta();
        applyFocusMode();
        syncFullscreenButton();
        refreshIcons();
    }

    function resetFilters() {
        state.searchTerm = "";
        state.activeCategory = "all";
        state.catalogPage = 1;
        dom.searchInput.value = "";

        renderCategoryBars();
        renderCatalog();
    }

    function handleCategoryChange(categoryId) {
        if (!categories.some((category) => category.id === categoryId)) return;
        state.activeCategory = categoryId;
        state.catalogPage = 1;
        renderCategoryBars();
        renderCatalog();
    }

    async function toggleFullscreen() {
        try {
            if (document.fullscreenElement === dom.playerFrameHost) {
                await document.exitFullscreen();
            } else {
                await dom.playerFrameHost.requestFullscreen();
            }
            syncFullscreenButton();
        } catch {
            setControlFeedback("Fullscreen is unavailable in this browser session.", true);
        }
    }

    function toggleFocusMode() {
        if (state.currentView !== "play") return;
        state.isFocusMode = !state.isFocusMode;
        applyFocusMode();
    }

    async function shareCurrentGame() {
        const game = activeGame();
        if (!game) return;

        const shareUrl = `${window.location.origin}${window.location.pathname}#game=${encodeURIComponent(game.id)}`;
        const shareData = {
            title: `${game.title} | PlayArcadeX`,
            text: `Play ${game.title} free on PlayArcadeX`,
            url: shareUrl
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
                return;
            } catch {
                // Fall back to clipboard if share was canceled or blocked.
            }
        }

        try {
            await navigator.clipboard.writeText(shareUrl);
            setControlFeedback("Game URL copied to clipboard.", false);
        } catch {
            setControlFeedback("Share failed. Copy the URL from your address bar.", true);
        }
    }

    function setModalOpen(dialog, open) {
        if (!dialog) return;
        if (open) {
            if (!dialog.open) dialog.showModal();
        } else if (dialog.open) {
            dialog.close();
        }
    }

    function bindModalEvents() {
        const modals = {
            privacyModal: dom.privacyModal,
            termsModal: dom.termsModal,
            aboutModal: dom.aboutModal
        };

        document.querySelectorAll("[data-modal-open]").forEach((button) => {
            button.addEventListener("click", () => {
                const id = button.getAttribute("data-modal-open");
                setModalOpen(modals[id], true);
            });
        });

        document.querySelectorAll("[data-modal-close]").forEach((button) => {
            button.addEventListener("click", () => {
                const dialog = button.closest("dialog");
                setModalOpen(dialog, false);
            });
        });

        Object.values(modals).forEach((dialog) => {
            if (!dialog) return;
            dialog.addEventListener("click", (event) => {
                const bounds = dialog.getBoundingClientRect();
                const isInside =
                    event.clientX >= bounds.left &&
                    event.clientX <= bounds.right &&
                    event.clientY >= bounds.top &&
                    event.clientY <= bounds.bottom;

                if (!isInside) {
                    setModalOpen(dialog, false);
                }
            });
        });
    }

    function handleImageFallback(event) {
        const target = event.target;
        if (!(target instanceof HTMLImageElement)) return;

        const gameId = target.dataset.gameId;
        if (!gameId) return;

        const game = gameById.get(gameId);
        if (!game) return;

        const step = Number(target.dataset.fallbackStep || "0");
        const maxStep = Number(target.dataset.fallbackMax || "0");

        if (step < maxStep) {
            const nextStep = step + 1;
            target.dataset.fallbackStep = String(nextStep);
            target.src = getThumbnailSource(game, nextStep);
            return;
        }

        target.dataset.fallbackStep = String(maxStep + 1);

        if (markGameAsHidden(gameId)) {
            const current = activeGame();
            if (current && current.id === gameId) {
                openCatalogView(true);
                return;
            }

            if (state.currentView === "catalog") {
                scheduleCatalogRefresh();
            } else {
                renderRecommendations(current);
                refreshIcons();
            }
            return;
        }

        target.src = createGradientPlaceholder(game.title);
    }

    function bootFromUrl() {
        const match = window.location.hash.match(/^#game=(.+)$/);
        if (!match) {
            openCatalogView(false);
            return;
        }

        const gameId = decodeURIComponent(match[1]);
        if (!gameById.has(gameId) || state.hiddenGameIds.has(gameId)) {
            openCatalogView(false);
            return;
        }

        openBootView(gameId, false);
    }

    function bindCoreEvents() {
        if (dom.sidebarToggleBtn) {
            dom.sidebarToggleBtn.addEventListener("click", () => {
                toggleSidebar();
            });
        }

        dom.searchForm.addEventListener("submit", (event) => {
            event.preventDefault();
        });

        dom.searchInput.addEventListener(
            "input",
            debounce((event) => {
                state.searchTerm = String(event.target.value || "").trim();
                state.catalogPage = 1;
                renderCatalog();
            }, 140)
        );

        dom.resetFiltersBtn.addEventListener("click", () => {
            resetFilters();
        });

        if (dom.randomGameBtn) {
            dom.randomGameBtn.addEventListener("click", () => {
                const pool = filteredGames();
                if (!pool.length) return;
                const randomIndex = Math.floor(Math.random() * pool.length);
                const game = pool[randomIndex];
                if (game) {
                    openBootView(game.id, true);
                }
            });
        }

        if (dom.backToTopBtn) {
            dom.backToTopBtn.addEventListener("click", () => {
                window.scrollTo({ top: 0, behavior: "smooth" });
            });
        }

        document.addEventListener("click", (event) => {
            const categoryButton = event.target.closest("[data-category]");
            if (categoryButton) {
                handleCategoryChange(categoryButton.getAttribute("data-category"));
                return;
            }

            const pageJumpButton = event.target.closest("[data-page-jump]");
            if (pageJumpButton) {
                const page = Number(pageJumpButton.getAttribute("data-page-jump") || "1");
                if (Number.isFinite(page)) {
                    setCatalogPage(page);
                }
                return;
            }

            const pageMoveButton = event.target.closest("[data-page-move]");
            if (pageMoveButton) {
                const delta = Number(pageMoveButton.getAttribute("data-page-move") || "0");
                if (Number.isFinite(delta) && delta !== 0) {
                    setCatalogPage(state.catalogPage + delta);
                }
                return;
            }

            const openTrigger = event.target.closest("[data-game-open], [data-game-open-card]");
            if (openTrigger) {
                const gameId = openTrigger.getAttribute("data-game-open") || openTrigger.getAttribute("data-game-open-card");
                if (gameId) {
                    openBootView(gameId, true);
                }
                return;
            }

            if (event.target.closest("[data-launch-game]")) {
                openPlayView();
                return;
            }

            if (event.target.closest("[data-back-catalog]")) {
                openCatalogView(true);
            }
        });

        dom.backToCatalogBtn.addEventListener("click", () => {
            openCatalogView(true);
        });

        dom.focusModeBtn.addEventListener("click", () => {
            toggleFocusMode();
        });

        dom.fullscreenBtn.addEventListener("click", async () => {
            await toggleFullscreen();
        });

        dom.shareBtn.addEventListener("click", async () => {
            await shareCurrentGame();
        });

        dom.reloadGameBtn.addEventListener("click", () => {
            if (state.currentView !== "play") return;
            const game = activeGame();
            if (!game) return;
            mountGameIframe(game);
            setControlFeedback("Game reloaded.", false);
        });

        document.addEventListener("error", handleImageFallback, true);

        document.addEventListener("fullscreenchange", () => {
            syncFullscreenButton();
        });

        window.addEventListener("hashchange", () => {
            const match = window.location.hash.match(/^#game=(.+)$/);
            if (match) {
                const gameId = decodeURIComponent(match[1]);
                if (gameById.has(gameId) && !state.hiddenGameIds.has(gameId)) {
                    openBootView(gameId, false);
                    return;
                }
            }
            if (!window.location.hash) {
                openCatalogView(false);
            }
        });

        window.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && state.currentView === "play" && state.isFocusMode) {
                state.isFocusMode = false;
                applyFocusMode();
            }
        });
    }

    function init() {
        renderCategoryBars();
        applySidebarState();
        renderCatalog();
        bindCoreEvents();
        bindModalEvents();
        injectSpeculationRules();
        bootFromUrl();
        updateSeoMeta();
        syncFullscreenButton();
        refreshIcons();
    }

    init();
})();
