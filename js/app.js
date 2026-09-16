/*
 * Master-leht: vasak andmestike loend + parem kuvamisala (disain.md p. 2).
 * Mooduli sisu (KPI-d, graafikud, tabel) lisandub etappides 5–6 — renderModule() on selleks koht.
 */
(function (TAI) {
  "use strict";

  var esc = TAI.escapeHtml;
  var MOBILE_QUERY = window.matchMedia("(max-width: 767px)");

  var listEl = document.getElementById("dataset-list");
  var contentEl = document.getElementById("content");
  var loadedAtEl = document.getElementById("loaded-at");

  var current = null;      // valitud tabeli kood
  var requestId = 0;       // vanemate päringute tulemused jäetakse kõrvale

  var dateFmt = new Intl.DateTimeFormat("et-EE", { day: "2-digit", month: "2-digit", year: "numeric" });
  var timeFmt = new Intl.DateTimeFormat("et-EE", { hour: "2-digit", minute: "2-digit" });

  // ---- loend ----------------------------------------------------------

  function renderList() {
    listEl.innerHTML = TAI.getTables().map(function (t) {
      return (
        '<li class="dataset" data-code="' + esc(t.code) + '">' +
          '<button type="button" class="dataset__button" aria-controls="content" ' +
              'aria-labelledby="ds-title-' + esc(t.code) + '" aria-describedby="ds-desc-' + esc(t.code) + '">' +
            '<span class="dataset__title" id="ds-title-' + esc(t.code) + '">' + esc(t.title) + "</span>" +
            '<span class="dataset__desc" id="ds-desc-' + esc(t.code) + '">' + esc(t.description) + "</span>" +
            '<span class="dataset__chevron" aria-hidden="true">›</span>' +
          "</button>" +
          '<div class="dataset__footer">' +
            '<a href="' + esc(TAI.pxwebUrl(t)) + '" target="_blank" rel="noopener">Allikas: TAI ' + esc(t.code) +
              ' <span aria-hidden="true">↗</span><span class="visually-hidden">(avaneb uues aknas)</span></a>' +
            '<span class="dataset__status" role="status"></span>' +
          "</div>" +
        "</li>"
      );
    }).join("");

    listEl.addEventListener("click", function (evt) {
      var btn = evt.target.closest(".dataset__button");
      if (!btn) return;
      var code = btn.closest(".dataset").getAttribute("data-code");
      if (location.hash === "#" + code) {
        select(code, { scroll: true }); // sama rida uuesti → laadi uuesti
      } else {
        pendingScroll = true;
        location.hash = code;           // hashchange → select()
      }
    });
  }

  var pendingScroll = false;

  function rowOf(code) { return listEl.querySelector('.dataset[data-code="' + code + '"]'); }

  function setActiveRow(code) {
    Array.prototype.forEach.call(listEl.querySelectorAll(".dataset"), function (row) {
      var active = row.getAttribute("data-code") === code;
      row.classList.toggle("is-active", active);
      var btn = row.querySelector(".dataset__button");
      if (active) btn.setAttribute("aria-current", "true"); else btn.removeAttribute("aria-current");
    });
  }

  function setRowStatus(code, kind) {
    var row = rowOf(code);
    if (!row) return;
    var el = row.querySelector(".dataset__status");
    el.classList.toggle("is-error", kind === "error");
    el.innerHTML =
      kind === "loading" ? '<span class="spinner" aria-hidden="true"></span>Laadin…' :
      kind === "error" ? "Laadimine ebaõnnestus" : "";
  }

  // ---- kuvamisala olekud ---------------------------------------------

  function renderEmpty() {
    contentEl.innerHTML =
      '<div class="empty-state">' +
        '<h2>Vali <span class="only-wide">vasakult</span><span class="only-narrow">ülalt</span> andmestik</h2>' +
        "<p>Näidikulaud koondab Eesti terviseuuringu vaimse tervise näitajad: depressiooni sümptomid, " +
        "emotsionaalse distressi ja uneaja piisavuse soo, vanuse ja taustatunnuste lõikes.</p>" +
        "<p>Andmed laaditakse valimisel reaalajas Tervise Arengu Instituudi tervisestatistika andmebaasist, " +
        "seega näed alati avaldatud värskeimaid numbreid.</p>" +
      "</div>";
  }

  function backLink() {
    return '<a class="back-link" href="#dataset-list">↑ Tagasi andmestike juurde</a>';
  }

  function renderLoading(config) {
    contentEl.setAttribute("aria-busy", "true");
    contentEl.innerHTML =
      backLink() +
      '<div class="skeleton" aria-label="Laadin andmestikku ' + esc(config.title) + '">' +
        '<div class="skeleton__bar skeleton__bar--short"></div>' +
        '<div class="skeleton__bar skeleton__bar--title"></div>' +
        '<div class="skeleton__bar"></div>' +
        '<div class="skeleton__block"></div>' +
      "</div>";
  }

  function renderError(config, err) {
    var info = TAI.describeError(err);
    contentEl.setAttribute("aria-busy", "false");
    contentEl.innerHTML =
      backLink() +
      '<div class="error-box" role="alert">' +
        "<h3>" + esc(info.title) + "</h3>" +
        "<p>" + esc(info.text) + "</p>" +
        '<button type="button" class="btn" data-action="retry">Proovi uuesti</button>' +
        (info.offerUpload ?
          '<div class="error-box__upload">' +
            '<label for="upload-file">Või lae andmed failina üles</label>' +
            '<p class="muted">Ava <a href="' + esc(TAI.pxwebUrl(config)) + '" target="_blank" rel="noopener">tabel ' +
              esc(config.code) + " TAI andmebaasis ↗</a>, vali kõik väärtused ja salvesta vormingus JSON-stat2.</p>" +
            '<input type="file" id="upload-file" accept=".json,application/json">' +
          "</div>" : "") +
      "</div>";

    contentEl.querySelector('[data-action="retry"]').addEventListener("click", function () { select(config.code); });
    var input = contentEl.querySelector("#upload-file");
    if (input) {
      input.addEventListener("change", function () {
        var file = input.files && input.files[0];
        if (!file) return;
        TAI.readUploadedFile(file, config).then(function (reader) {
          // Üleslaaditud fail sisaldab kogu tabelit → sama lugeja teenindab kõiki vaateid.
          var data = {};
          Object.keys(config.queries({})).forEach(function (name) { data[name] = reader; });
          setRowStatus(config.code, null);
          renderModule(config, data, { source: "file", fileName: file.name });
        }).catch(function (e) {
          renderError(config, e);
        });
      });
    }
  }

  /*
   * Mooduli karkass (disain.md p. 3): eyebrow, pealkiri, alapealkiri, meta-rida, sisu, jalus.
   * Etappides 5–6 asendub .placeholder KPI-kaartide, graafikute ja andmetabeliga.
   */
  function renderModule(config, data, source) {
    var anyReader = data[Object.keys(data)[0]];
    var updated = anyReader && anyReader.raw.updated ? new Date(anyReader.raw.updated) : null;

    var meta = [];
    meta.push((config.years.length > 1 ? "Uuringuaastad " : "Uuringuaasta ") + config.years.join(" · "));
    meta.push(config.indicator.label + ", %");
    if (updated && !isNaN(updated)) meta.push("Tabel uuendatud " + dateFmt.format(updated));
    if (source.source === "file") meta.push("Allikas: fail " + source.fileName);

    contentEl.setAttribute("aria-busy", "false");
    contentEl.innerHTML =
      backLink() +
      '<article class="module">' +
        '<header class="module__head">' +
          '<span class="pill pill--eyebrow">' + esc(config.eyebrow) + "</span>" +
          '<h2 tabindex="-1">' + esc(config.fullTitle) + "</h2>" +
          '<p class="module__subtitle">' + esc(config.description) + "</p>" +
          '<ul class="module__meta">' + meta.map(function (m) { return '<li class="pill">' + esc(m) + "</li>"; }).join("") + "</ul>" +
        "</header>" +
        '<div class="placeholder">Andmed on laaditud. KPI-kaardid, graafikud ja andmetabel lisanduvad siia järgmises etapis.</div>' +
        '<footer class="module__footnotes">' +
          config.footnotes.map(function (f) { return "<p>" + esc(f) + "</p>"; }).join("") +
          '<p>Allikas: Tervise Arengu Instituut, <a href="' + esc(TAI.pxwebUrl(config)) + '" target="_blank" rel="noopener">tabel ' +
            esc(config.code) + " ↗</a>.</p>" +
        "</footer>" +
      "</article>";

    if (source.source === "api") {
      var now = new Date();
      loadedAtEl.textContent = "Andmed laaditud otse TAI andmebaasist · " + dateFmt.format(now) + " " + timeFmt.format(now);
      loadedAtEl.hidden = false;
    }
  }

  // ---- valimine -------------------------------------------------------

  async function select(code, opts) {
    opts = opts || {};
    var config = TAI.getTable(code);
    if (!config) { current = null; setActiveRow(null); renderEmpty(); return; }

    current = code;
    var myRequest = ++requestId;
    setActiveRow(code);
    TAI.getTables().forEach(function (t) { if (t.code !== code) setRowStatus(t.code, null); });
    setRowStatus(code, "loading");
    renderLoading(config);
    if (opts.scroll) scrollToContent();

    try {
      var data = await TAI.loadTable(config, defaultState(config));
      if (myRequest !== requestId) return;
      setRowStatus(code, null);
      renderModule(config, data, { source: "api" });
      if (opts.scroll) { scrollToContent(); focusHeading(); }
    } catch (err) {
      if (myRequest !== requestId) return;
      console.error(err);
      setRowStatus(code, "error");
      renderError(config, err);
      // sisu vahetus katkestab laadimise ajal alanud sujuva kerimise → keri uuesti
      if (opts.scroll) scrollToContent();
    }
  }

  function defaultState(config) {
    var state = { compareSexes: false };
    (config.filters || []).forEach(function (v) { state[v] = config.vars[v].totalValue || config.vars[v].values[0]; });
    return state;
  }

  function scrollToContent() {
    if (MOBILE_QUERY.matches) contentEl.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function focusHeading() {
    if (!MOBILE_QUERY.matches) return;
    var h = contentEl.querySelector(".module__head h2");
    if (h) h.focus({ preventScroll: true });
  }

  function onHashChange() {
    var code = decodeURIComponent(location.hash.replace(/^#/, ""));
    var scroll = pendingScroll;
    pendingScroll = false;
    if (!TAI.getTable(code)) {
      if (current) { current = null; setActiveRow(null); renderEmpty(); }
      return;
    }
    if (code !== current || scroll) select(code, { scroll: scroll });
  }

  // ---- käivitus -------------------------------------------------------

  // „↑ Tagasi andmestike juurde“: keri loendini, aadressi (valitud tabelit) mitte muuta
  contentEl.addEventListener("click", function (evt) {
    var link = evt.target.closest(".back-link");
    if (!link) return;
    evt.preventDefault();
    listEl.scrollIntoView({ behavior: "smooth", block: "start" });
    var activeBtn = listEl.querySelector(".dataset.is-active .dataset__button");
    if (activeBtn) activeBtn.focus({ preventScroll: true });
  });

  renderList();
  window.addEventListener("hashchange", onHashChange);
  if (TAI.getTable(decodeURIComponent(location.hash.replace(/^#/, "")))) {
    onHashChange();
  } else {
    renderEmpty();
  }
})(window.TAI);
