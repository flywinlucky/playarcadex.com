/* PlayArcadeX — app.js (vanilla, zero deps) */
(function () {
  "use strict";

  var BASE = document.documentElement.getAttribute("data-base") || "";

  /* ---------- Email anti-spam: reasamblam emailul din parti (botii nu-l vad) ---------- */
  (function () {
    var els = document.querySelectorAll(".cmail");
    els.forEach(function (el) {
      var u = el.getAttribute("data-u");
      var d = el.getAttribute("data-d");
      if (!u || !d) return;
      var addr = u + "@" + d;
      if (el.tagName === "A") {
        el.setAttribute("href", "mailto:" + addr);
      }
      el.textContent = addr;
    });
  })();

  /* ---------- Mobile sidebar ---------- */
  var menuBtn = document.getElementById("menuBtn");
  var sidebar = document.getElementById("sidebar");
  if (menuBtn && sidebar) {
    // overlay care acopera restul ecranului cand sidebar-ul e deschis
    var sbOverlay = document.createElement("div");
    sbOverlay.className = "sidebar-overlay";
    document.body.appendChild(sbOverlay);

    function openSidebar() {
      sidebar.classList.add("open");
      sbOverlay.classList.add("show");
      document.body.classList.add("no-scroll");
    }
    function closeSidebar() {
      sidebar.classList.remove("open");
      sbOverlay.classList.remove("show");
      document.body.classList.remove("no-scroll");
    }
    menuBtn.addEventListener("click", function (e) {
      e.preventDefault();
      if (sidebar.classList.contains("open")) closeSidebar();
      else openSidebar();
    });
    // tap pe overlay (zona goala) inchide sidebar-ul
    sbOverlay.addEventListener("click", closeSidebar);
    // tap pe un link din sidebar inchide si el (navigare curata)
    sidebar.addEventListener("click", function (e) {
      if (e.target.closest("a")) closeSidebar();
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
    var small = String(g.thumb).replace(/512x384/i, "230x230");
    var fallback = small !== g.thumb
      ? ' onerror="this.onerror=null;this.src=\'' + escapeAttr(g.thumb) + '\'"'
      : "";
    var platform = g.platform || "both";
    return '<a class="card" data-platform="' + platform + '" href="' + BASE + '/game/' + g.slug + '/" title="' + escapeAttr(g.title) + '">' +
      '<img loading="lazy" decoding="async" draggable="false" src="' + escapeAttr(small) + '"' + fallback + ' alt="' + escapeAttr(g.title) + '" width="230" height="173">' +
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

  /* ---------- GA4 events helper ---------- */
  function track(name, params) {
    try { if (typeof window.gtag === "function") window.gtag("event", name, params || {}); } catch (e) {}
  }

  /* ---------- Game page: splash -> iframe + fullscreen mode (stil Yandex Games) ---------- */
  var TRENDING_API = document.documentElement.getAttribute("data-trending-api") || "";
  var splash = document.getElementById("gameSplash");
  var frameWrap = document.getElementById("frameWrap");
  var gameStage = document.querySelector(".game-stage");
  var closeFsBtn = document.getElementById("closeFsBtn");

  var isMobile = window.matchMedia("(max-width: 900px), (pointer: coarse)").matches;
  // marcam <html> ca mobil -> CSS ascunde jocurile PC-only (data-platform="pc")
  if (isMobile) document.documentElement.classList.add("is-mobile");

  function enterGameFs() {
    if (!gameStage) return;
    gameStage.classList.add("fs-active");
    document.body.classList.add("no-scroll");
    // Fullscreen nativ unde exista (Android/desktop). Pe iPhone Safari nu exista
    // pentru div-uri — acolo ramane overlay-ul fix pe tot viewportul (ca la Yandex).
    try {
      if (gameStage.requestFullscreen) gameStage.requestFullscreen().catch(function () {});
      else if (gameStage.webkitRequestFullscreen) gameStage.webkitRequestFullscreen();
    } catch (e) {}
    // Lock pe landscape pentru jocurile landscape (functioneaza pe Android in fullscreen)
    try {
      if (gameStage.getAttribute("data-orient") === "landscape" &&
          screen.orientation && screen.orientation.lock) {
        screen.orientation.lock("landscape").catch(function () {});
      }
    } catch (e) {}
  }

  function exitGameFs() {
    if (!gameStage) return;
    gameStage.classList.remove("fs-active");
    document.body.classList.remove("no-scroll");
    try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch (e) {}
    try {
      if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen();
      else if (document.webkitFullscreenElement && document.webkitExitFullscreen) document.webkitExitFullscreen();
    } catch (e) {}
  }

  if (splash && frameWrap) {
    var src = frameWrap.getAttribute("data-src");
    var slug = frameWrap.getAttribute("data-slug");
    var gameCat = frameWrap.getAttribute("data-category");
    if (gameCat) bumpInterest(gameCat, 1); // a vizitat pagina

    function launchGame(goFullscreen) {
      if (!frameWrap.querySelector("iframe")) {
        var iframe = document.createElement("iframe");
        iframe.src = src;
        iframe.allow = "fullscreen; autoplay; gamepad";
        iframe.setAttribute("allowfullscreen", "");
        iframe.setAttribute("title", document.title);
        frameWrap.appendChild(iframe);
      }
      if (splash && splash.parentNode) splash.remove();
      if (goFullscreen) enterGameFs();
      if (slug) rememberPlayed(slug);
      if (gameCat) bumpInterest(gameCat, 3); // a jucat efectiv = semnal puternic
      track("play_game", { game_slug: slug, game_category: gameCat });
      if (TRENDING_API && slug) {
        fetch(TRENDING_API + "/hit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: slug }),
          keepalive: true
        }).catch(function () {});
      }
    }

    var playBtn = document.getElementById("playBtn");
    if (isMobile) {
      // MOBIL: jocul porneste DOAR la apasarea pe Play (intra si in fullscreen)
      playBtn.addEventListener("click", function () { launchGame(true); });
    } else {
      // PC: autoplay — jocul se lanseaza automat la deschiderea paginii, fara splash
      launchGame(false);
    }
  }

  var fsBtn = document.getElementById("fsBtn");
  if (fsBtn && gameStage) {
    fsBtn.addEventListener("click", enterGameFs);
  }
  if (closeFsBtn) {
    closeFsBtn.addEventListener("click", exitGameFs);
  }
  // Tabul "All Games" din fullscreen = iesire din joc -> inapoi la site
  var fsAllGames = document.getElementById("fsAllGames");
  if (fsAllGames) {
    fsAllGames.addEventListener("click", function (e) {
      e.preventDefault();
      exitGameFs();
      window.location.href = BASE + "/";
    });
  }
  // Daca userul iese din fullscreen nativ cu Esc/gestul de sistem, inchidem si overlay-ul
  document.addEventListener("fullscreenchange", function () {
    if (!document.fullscreenElement && gameStage && gameStage.classList.contains("fs-active")) {
      gameStage.classList.remove("fs-active");
      document.body.classList.remove("no-scroll");
    }
  });

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

  /* ---------- Interest model (personalizare pe categorii) ---------- */
  function bumpInterest(cat, points) {
    var interest = lsGet("pax_interest", {});
    interest[cat] = (interest[cat] || 0) + points;
    // cap ca un singur scor sa nu domine pentru totdeauna
    if (interest[cat] > 100) {
      for (var k in interest) interest[k] = Math.round(interest[k] / 2);
    }
    lsSet("pax_interest", interest);
  }
  function topCategories(n) {
    var interest = lsGet("pax_interest", {});
    return Object.keys(interest)
      .sort(function (a, b) { return interest[b] - interest[a]; })
      .slice(0, n);
  }

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
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
      if (i === -1) { favs.unshift(favSlug); track("add_favorite", { game_slug: favSlug }); }
      else { favs.splice(i, 1); track("remove_favorite", { game_slug: favSlug }); }
      lsSet("pax_favs", favs.slice(0, 60));
      paintFav();
    });
    paintFav();
  }

  /* ---------- Homepage: Recently Played + Favorites + Recommended + reorder ---------- */
  var recentGrid = document.getElementById("recentGrid");
  var favGrid = document.getElementById("favGrid");
  var recoGrid = document.getElementById("recoGrid");
  if (recentGrid || favGrid || recoGrid) {
    var recent = lsGet("pax_recent", []);
    var favs = lsGet("pax_favs", []);
    var topCats = topCategories(3);
    if (recent.length || favs.length || topCats.length) {
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

        /* Recommended for You: jocuri din categoriile preferate, fara cele deja jucate */
        if (recoGrid && topCats.length) {
          var seen = {};
          recent.concat(favs).forEach(function (s) { seen[s] = 1; });
          var pool = [];
          topCats.forEach(function (cat, ci) {
            var weight = [6, 4, 2][ci] || 1; // categoria #1 primeste cele mai multe sloturi
            var fromCat = shuffle(idx.filter(function (g) {
              return g.category === cat && !seen[g.slug];
            })).slice(0, weight);
            pool = pool.concat(fromCat);
          });
          if (pool.length >= 3) {
            recoGrid.innerHTML = shuffle(pool).slice(0, 12).map(cardHTML).join("");
            document.getElementById("recoSection").style.display = "";
          }
        }

        /* Reordonare categorii pe homepage dupa interes */
        var catWrap = document.getElementById("catSections");
        if (catWrap && topCats.length) {
          // in ordine inversa, ca prepend sa pastreze ordinea topului
          topCats.slice().reverse().forEach(function (cat) {
            var sec = catWrap.querySelector('.cat-sec[data-cat="' + CSS.escape(cat) + '"]');
            if (sec) catWrap.prepend(sec);
          });
        }
      });
    }
  }

  /* ---------- Trending Now (global, din API) ---------- */
  var trendingGrid = document.getElementById("trendingGrid");
  if (trendingGrid && TRENDING_API) {
    Promise.all([
      loadIndex(),
      fetch(TRENDING_API + "/top").then(function (r) { return r.json(); })
    ]).then(function (res) {
      var idx = res[0], top = res[1];
      if (!Array.isArray(top) || !top.length) return;
      var bySlug = {};
      idx.forEach(function (g) { bySlug[g.slug] = g; });
      var items = top.map(function (t) { return bySlug[t.slug || t]; }).filter(Boolean).slice(0, 12);
      if (!items.length) return;
      trendingGrid.innerHTML = items.map(cardHTML).join("");
      document.getElementById("trendingSection").style.display = "";
    }).catch(function () {});
  }

  /* ---------- Random game ---------- */
  var randomBtn = document.getElementById("randomBtn");
  if (randomBtn) {
    randomBtn.addEventListener("click", function () {
      track("random_game");
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
    var copyOriginal = copyBtn.innerHTML;
    copyBtn.addEventListener("click", function () {
      var url = copyBtn.getAttribute("data-url");
      function done() {
        copyBtn.innerHTML = "✓";
        setTimeout(function () { copyBtn.innerHTML = copyOriginal; }, 1500);
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

  /* ---------- PWA: Add to Home Screen (Android prompt + iOS instructiuni) ---------- */
  (function () {
    var installBtn = document.getElementById("installBtn");
    if (!installBtn) return;

    // detectam daca ruleaza deja ca aplicatie instalata (standalone)
    var isStandalone = window.matchMedia("(display-mode: standalone)").matches
      || window.navigator.standalone === true;
    if (isStandalone) { installBtn.hidden = true; return; }

    var ua = window.navigator.userAgent || "";
    var isIOS = /iphone|ipad|ipod/i.test(ua) && !window.MSStream;
    var isAndroid = /android/i.test(ua);
    var deferredPrompt = null;

    // Android / Chrome: capturam evenimentul nativ
    window.addEventListener("beforeinstallprompt", function (e) {
      e.preventDefault();
      deferredPrompt = e;
      installBtn.hidden = false;
    });

    // iOS: nu exista beforeinstallprompt -> aratam butonul daca e Safari mobil
    if (isIOS) {
      installBtn.hidden = false;
    }

    function showIOSInstructions() {
      var modal = document.createElement("div");
      modal.className = "pwa-modal-bg";
      modal.innerHTML =
        '<div class="pwa-modal">' +
          '<button class="pwa-close" aria-label="Close">✕</button>' +
          '<h3>Install PlayArcadeX</h3>' +
          '<p>Add PlayArcadeX to your Home Screen to play like an app — faster, fullscreen, no browser bars.</p>' +
          '<ol class="pwa-steps">' +
            '<li>Tap the <strong>Share</strong> button <span class="pwa-ios-icon">&#x2191;</span> at the bottom of Safari</li>' +
            '<li>Scroll down and tap <strong>“Add to Home Screen”</strong> <span class="pwa-ios-icon">&#x2295;</span></li>' +
            '<li>Tap <strong>“Add”</strong> in the top corner</li>' +
          '</ol>' +
          '<p class="pwa-note">Then open PlayArcadeX from your Home Screen any time!</p>' +
        '</div>';
      document.body.appendChild(modal);
      function close() { modal.remove(); }
      modal.addEventListener("click", function (e) {
        if (e.target === modal || e.target.closest(".pwa-close")) close();
      });
    }

    installBtn.addEventListener("click", function () {
      track("pwa_install_click", { platform: isIOS ? "ios" : (isAndroid ? "android" : "other") });
      if (deferredPrompt) {
        // Android: declansam promptul nativ
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(function (choice) {
          track("pwa_install_result", { outcome: choice.outcome });
          deferredPrompt = null;
          if (choice.outcome === "accepted") installBtn.hidden = true;
        });
      } else if (isIOS) {
        // iOS: aratam instructiunile (Apple nu permite prompt automat)
        showIOSInstructions();
      } else {
        // fallback desktop: instructiuni scurte
        showIOSInstructions();
      }
    });

    // dupa instalare reusita, ascundem butonul
    window.addEventListener("appinstalled", function () {
      installBtn.hidden = true;
      track("pwa_installed");
    });
  })();

  /* ---------- Mobile search toggle ---------- */
  var searchToggle = document.getElementById("searchToggle");
  var searchWrap = document.getElementById("searchWrap");
  if (searchToggle && searchWrap) {
    function openSearch() {
      searchWrap.classList.add("open");
      var inp = searchWrap.querySelector("input");
      if (inp) setTimeout(function () { inp.focus(); }, 60);
    }
    function closeSearch() {
      searchWrap.classList.remove("open");
      var inp = searchWrap.querySelector("input");
      if (inp) inp.blur();
    }
    searchToggle.addEventListener("click", function (e) {
      e.preventDefault();
      if (searchWrap.classList.contains("open")) closeSearch();
      else openSearch();
    });

    var closeBtn = document.getElementById("searchClose");
    if (closeBtn) {
      closeBtn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        closeSearch();
      });
    }

    searchWrap.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeSearch();
    });
  }

  /* ---------- Bottom actions: Random game + Back to top ---------- */
  var randomBottom = document.getElementById("randomBottomBtn");
  if (randomBottom) {
    randomBottom.addEventListener("click", function () {
      track("random_game");
      loadIndex().then(function (idx) {
        if (idx && idx.length) {
          window.location.href = BASE + "/game/" + idx[Math.floor(Math.random() * idx.length)].slug + "/";
        }
      });
    });
  }
  var backTop = document.getElementById("backTopBtn");
  if (backTop) {
    backTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* ---------- Horizontal carousel arrows (stil CrazyGames) ---------- */
  function setupRows() {
    var rows = [];
    document.querySelectorAll(".row-wrap").forEach(function (wrap) {
      var row = wrap.querySelector(".row");
      var left = wrap.querySelector(".row-arrow.left");
      var right = wrap.querySelector(".row-arrow.right");
      if (!row || !left || !right) return;
      var ctx = { wrap: wrap, row: row, left: left, right: right };
      rows.push(ctx);

      function step() {
        return Math.max(200, Math.round(row.clientWidth * 0.8));
      }
      left.addEventListener("click", function (e) {
        e.preventDefault();
        row.scrollBy({ left: -step(), behavior: "smooth" });
      });
      right.addEventListener("click", function (e) {
        e.preventDefault();
        row.scrollBy({ left: step(), behavior: "smooth" });
      });
      // scroll-ul afecteaza doar randul curent
      row.addEventListener("scroll", function () { schedule([ctx]); }, { passive: true });

      // ResizeObserver prinde si schimbarile de dimensiune cand se incarca imaginile,
      // fara sa atasam un handler pe fiecare imagine (sursa principala de reflow).
      if ("ResizeObserver" in window) {
        new ResizeObserver(function () { schedule([ctx]); }).observe(row);
      }
    });

    // Batch: acumulam randurile de actualizat si rulam o SINGURA data pe frame,
    // cu toate CITIRILE de layout grupate inainte de toate SCRIERILE -> zero thrashing.
    var pending = null, ticking = false;
    function schedule(list) {
      if (!pending) pending = [];
      (list || rows).forEach(function (c) {
        if (pending.indexOf(c) === -1) pending.push(c);
      });
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        var batch = pending; pending = null;
        // FAZA 1 — doar citiri
        var reads = batch.map(function (c) {
          return { c: c, max: c.row.scrollWidth - c.row.clientWidth, sl: c.row.scrollLeft };
        });
        // FAZA 2 — doar scrieri
        reads.forEach(function (r) {
          var c = r.c;
          if (r.max <= 4) {
            c.left.classList.add("hidden");
            c.right.classList.add("hidden");
            c.wrap.classList.add("no-overflow");
          } else {
            c.wrap.classList.remove("no-overflow");
            c.left.classList.toggle("hidden", r.sl <= 4);
            c.right.classList.toggle("hidden", r.sl >= r.max - 4);
          }
        });
      });
    }

    window.addEventListener("resize", function () { schedule(rows); });
    schedule(rows); // initial

    // Fallback daca nu exista ResizeObserver (browsere vechi)
    if (!("ResizeObserver" in window)) {
      setTimeout(function () { schedule(rows); }, 400);
      setTimeout(function () { schedule(rows); }, 1200);
    }
  }
  if (document.readyState !== "loading") setupRows();
  else document.addEventListener("DOMContentLoaded", setupRows);

  /* ---------- Mascota: roteste mesajul din bula (fara fetch, zero cost) ---------- */
  (function mascotBubble() {
    var bubble = document.getElementById("mascotBubble");
    if (!bubble) return;
    var msgs = [
      "Try this one for fun!",
      "You'll love this one!",
      "My top pick right now!",
      "This one's super addictive!",
      "Give it a go — it's great!",
      "Trust me, this one's fun!",
      "Perfect for a quick break!"
    ];
    var i = 0;
    setInterval(function () {
      i = (i + 1) % msgs.length;
      bubble.style.opacity = "0";
      setTimeout(function () {
        bubble.textContent = msgs[i];
        bubble.style.opacity = "1";
      }, 250);
    }, 3500);
    bubble.style.transition = "opacity .25s ease";
  })();
})();
