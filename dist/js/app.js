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
    var slug = frameWrap.getAttribute("data-slug");
    var playBtn = document.getElementById("playBtn");
    playBtn.addEventListener("click", function () {
      var iframe = document.createElement("iframe");
      iframe.src = src;
      iframe.allow = "fullscreen; autoplay; gamepad";
      iframe.setAttribute("allowfullscreen", "");
      iframe.setAttribute("title", document.title);
      frameWrap.appendChild(iframe);
      splash.remove();
      if (slug) rememberPlayed(slug);
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

  /* ---------- localStorage helpers (safe) ---------- */
  function lsGet(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; }
    catch (e) { return fallback; }
  }
  function lsSet(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }

  /* ---------- Recently played ---------- */
  function rememberPlayed(slug) {
    var list = lsGet("pax_recent", []).filter(function (s) { return s !== slug; });
    list.unshift(slug);
    lsSet("pax_recent", list.slice(0, 12));
  }

  /* ---------- Favorites ---------- */
  var favBtn = document.getElementById("favBtn");
  if (favBtn) {
    var favSlug = favBtn.getAttribute("data-slug");
    function paintFav() {
      var favs = lsGet("pax_favs", []);
      var on = favs.indexOf(favSlug) !== -1;
      favBtn.textContent = on ? "❤" : "♡";
      favBtn.classList.toggle("on", on);
      favBtn.setAttribute("aria-label", on ? "Remove from favorites" : "Add to favorites");
    }
    favBtn.addEventListener("click", function () {
      var favs = lsGet("pax_favs", []);
      var i = favs.indexOf(favSlug);
      if (i === -1) favs.unshift(favSlug); else favs.splice(i, 1);
      lsSet("pax_favs", favs.slice(0, 60));
      paintFav();
    });
    paintFav();
  }

  /* ---------- Homepage: fill Recently Played + Favorites sections ---------- */
  var recentGrid = document.getElementById("recentGrid");
  var favGrid = document.getElementById("favGrid");
  if (recentGrid || favGrid) {
    var recent = lsGet("pax_recent", []);
    var favs = lsGet("pax_favs", []);
    if (recent.length || favs.length) {
      loadIndex().then(function (idx) {
        var bySlug = {};
        idx.forEach(function (g) { bySlug[g.slug] = g; });
        function fill(grid, section, slugs) {
          if (!grid) return;
          var items = slugs.map(function (s) { return bySlug[s]; }).filter(Boolean);
          if (!items.length) return;
          grid.innerHTML = items.map(cardHTML).join("");
          document.getElementById(section).style.display = "";
        }
        fill(recentGrid, "recentSection", recent);
        fill(favGrid, "favSection", favs.slice(0, 12));
      });
    }
  }

  /* ---------- Random game ---------- */
  var randomBtn = document.getElementById("randomBtn");
  if (randomBtn) {
    randomBtn.addEventListener("click", function () {
      loadIndex().then(function (idx) {
        if (!idx || !idx.length) return;
        var g = idx[Math.floor(Math.random() * idx.length)];
        window.location.href = BASE + "/game/" + g.slug + "/";
      });
    });
  }

  /* ---------- Copy link ---------- */
  var copyBtn = document.getElementById("copyLinkBtn");
  if (copyBtn) {
    copyBtn.addEventListener("click", function () {
      var url = copyBtn.getAttribute("data-url");
      function done() {
        copyBtn.textContent = "✓";
        setTimeout(function () { copyBtn.textContent = "🔗"; }, 1500);
      }
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(done);
      else { window.prompt("Copy link:", url); }
    });
  }

  /* ---------- PWA: register service worker ---------- */
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("/sw.js").catch(function () {});
    });
  }
})();
