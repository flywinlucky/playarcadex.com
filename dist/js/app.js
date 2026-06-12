/* PlayArcadeX — app.js (vanilla, zero deps) */
(function () {
  "use strict";

  var BASE = document.documentElement.getAttribute("data-base") || "";

  /* ---------- Mobile sidebar ---------- */
  var menuBtn = document.getElementById("menuBtn");
  var sidebar = document.getElementById("sidebar");
  if (menuBtn && sidebar) {
    menuBtn.addEventListener("click", function () {
      sidebar.classList.toggle("open");
    });
    document.addEventListener("click", function (e) {
      if (sidebar.classList.contains("open") &&
          !sidebar.contains(e.target) && e.target !== menuBtn) {
        sidebar.classList.remove("open");
      }
    });
  }

  /* ---------- Instant search (loads games.json on first keystroke) ---------- */
  var searchInput = document.getElementById("searchInput");
  var searchResultsGrid = document.getElementById("searchResults");
  var defaultSections = document.getElementById("defaultSections");
  var emptyState = document.getElementById("emptyState");
  var gamesIndex = null;
  var loading = false;

  function cardHTML(g) {
    return '<a class="card" href="' + BASE + '/game/' + g.slug + '/" title="' + escapeAttr(g.title) + '">' +
      '<img loading="lazy" decoding="async" src="' + escapeAttr(g.thumb) + '" alt="' + escapeAttr(g.title) + '" width="512" height="384">' +
      '<span class="card-title">' + escapeHTML(g.title) + '</span></a>';
  }

  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function escapeAttr(s) { return escapeHTML(s); }

  function loadIndex() {
    if (gamesIndex || loading) return Promise.resolve(gamesIndex);
    loading = true;
    return fetch(BASE + "/games.json")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        gamesIndex = data.map(function (g) {
          g._hay = (g.title + " " + g.category + " " + (g.tags || []).join(" ")).toLowerCase();
          return g;
        });
        return gamesIndex;
      })
      .finally(function () { loading = false; });
  }

  function runSearch(q) {
    q = q.trim().toLowerCase();
    if (!searchResultsGrid) return;
    if (!q) {
      searchResultsGrid.style.display = "none";
      searchResultsGrid.innerHTML = "";
      if (defaultSections) defaultSections.style.display = "";
      if (emptyState) emptyState.style.display = "none";
      return;
    }
    loadIndex().then(function (idx) {
      var hits = idx.filter(function (g) { return g._hay.indexOf(q) !== -1; }).slice(0, 60);
      if (defaultSections) defaultSections.style.display = "none";
      searchResultsGrid.style.display = "grid";
      searchResultsGrid.innerHTML = hits.map(cardHTML).join("");
      if (emptyState) emptyState.style.display = hits.length ? "none" : "block";
    });
  }

  if (searchInput) {
    var t;
    searchInput.addEventListener("input", function () {
      clearTimeout(t);
      var v = searchInput.value;
      t = setTimeout(function () { runSearch(v); }, 120);
    });
    searchInput.addEventListener("focus", function () { loadIndex(); });
  }

  /* ---------- Game page: splash -> iframe (click-to-play = fast LCP) ---------- */
  var splash = document.getElementById("gameSplash");
  var frameWrap = document.getElementById("frameWrap");
  if (splash && frameWrap) {
    var src = frameWrap.getAttribute("data-src");
    var playBtn = document.getElementById("playBtn");
    playBtn.addEventListener("click", function () {
      var iframe = document.createElement("iframe");
      iframe.src = src;
      iframe.allow = "fullscreen; autoplay; gamepad";
      iframe.setAttribute("allowfullscreen", "");
      iframe.setAttribute("title", document.title);
      frameWrap.appendChild(iframe);
      splash.remove();
    });
  }

  var fsBtn = document.getElementById("fsBtn");
  if (fsBtn && frameWrap) {
    fsBtn.addEventListener("click", function () {
      var el = frameWrap.querySelector("iframe") || frameWrap;
      if (el.requestFullscreen) el.requestFullscreen();
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    });
  }
})();
