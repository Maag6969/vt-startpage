/*
 * Master-leht: vasak andmestike loend + parem kuvamisala (disain.md p. 2)
 * ja valitud tabeli moodul: filtrid, KPI-d, callout, graafikud, andmetabel (disain.md p. 3.1).
 * Sõltub core.js-ist, tabelikonfiguratsioonidest ja module.js-ist.
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
  var states = {};         // filtrivalikud tabeli kaupa (säilivad tabelite vahel liikudes)
  var view = null;         // { config, data, source } — praegu kuvatud moodul

  var dateFmt = new Intl.DateTimeFormat("et-EE", { day: "2-digit", month: "2-digit", year: "numeric" });
  var timeFmt = new Intl.DateTimeFormat("et-EE", { hour: "2-digit", minute: "2-digit" });

  // ---- loend ----------------------------------------------------------

  var pendingScroll = false;

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
    view = null;
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
    view = null;
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
    view = null;
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
          // Üleslaaditud fail sisaldab kogu tabelit → sama lugeja teenindab kõiki vaateid ja filtreid.
          var data = {};
          Object.keys(config.queries(stateOf(config))).forEach(function (name) { data[name] = reader; });
          setRowStatus(config.code, null);
          renderModule(config, data, { source: "file", fileName: file.name });
        }).catch(function (e) {
          renderError(config, e);
        });
      });
    }
  }

  // ---- moodul ---------------------------------------------------------

  function stateOf(config) {
    if (!states[config.code]) {
      var state = { compareSexes: false };
      (config.filters || []).forEach(function (v) { state[v] = config.vars[v].totalValue || config.vars[v].values[0]; });
      states[config.code] = state;
    }
    return states[config.code];
  }

  function renderFilters(config, state) {
    var html = '<div class="filters" role="group" aria-label="Filtrid">';
    (config.filters || []).forEach(function (code) {
      if (code === "Sugu") return;
      var v = config.vars[code];
      var id = "filter-" + code;
      html += '<div class="field"><label for="' + esc(id) + '">' + esc(v.label) + "</label>" +
        '<select id="' + esc(id) + '" data-filter="' + esc(code) + '">' +
        v.values.map(function (val, i) {
          return '<option value="' + esc(val) + '"' + (state[code] === val ? " selected" : "") + ">" + esc(v.labels[i]) + "</option>";
        }).join("") + "</select></div>";
    });
    if ((config.filters || []).indexOf("Sugu") >= 0) {
      var current = state.compareSexes ? "compare" : state.Sugu;
      var options = [["0", "Kokku"], ["1", "Mehed"], ["2", "Naised"]];
      if (config.canCompareSexes) options.push(["compare", "Mehed vs naised"]);
      html += '<fieldset class="field segmented"><legend>Sugu</legend><div class="segmented__options">' +
        options.map(function (o) {
          return '<label><input type="radio" name="filter-sex" value="' + o[0] + '"' + (current === o[0] ? " checked" : "") + ">" +
            "<span>" + esc(o[1]) + "</span></label>";
        }).join("") + "</div></fieldset>";
    }
    return html + "</div>";
  }

  /* Mooduli karkass (disain.md p. 3): eyebrow, pealkiri, alapealkiri, meta, filtrid, sisu, jalus. */
  function renderModule(config, data, source) {
    var state = stateOf(config);
    view = { config: config, data: data, source: source };

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
        renderFilters(config, state) +
        '<div class="module__body" aria-live="polite"></div>' +
        '<footer class="module__footnotes">' +
          config.footnotes.map(function (f) { return "<p>" + esc(f) + "</p>"; }).join("") +
          '<p>Allikas: Tervise Arengu Instituut, <a href="' + esc(TAI.pxwebUrl(config)) + '" target="_blank" rel="noopener">tabel ' +
            esc(config.code) + " ↗</a>.</p>" +
        "</footer>" +
      "</article>";

    renderBody();

    if (source.source === "api") markLoaded();
  }

  function markLoaded() {
    var now = new Date();
    loadedAtEl.textContent = "Andmed laaditud otse TAI andmebaasist · " + dateFmt.format(now) + " " + timeFmt.format(now);
    loadedAtEl.hidden = false;
  }

  function renderBody() {
    if (!view) return;
    var body = contentEl.querySelector(".module__body");
    if (!body) return;
    var config = view.config;
    var model = TAI.buildModel(config, view.data, stateOf(config));
    var callout = TAI.calloutText(model);

    var html = TAI.renderKpis(model);
    if (callout) html += '<p class="callout">' + esc(callout) + "</p>";

    if (model.trend) {
      html += '<section class="chart-section" aria-labelledby="h-trend">' +
        '<h3 id="h-trend">Trend aastate lõikes</h3>' +
        '<p class="chart-note">' + esc(config.indicator.label) + " (%), " + esc(config.years.join(", ")) + "</p>" +
        TAI.renderLegend(model.series) +
        '<div class="chart-holder"><svg class="chart" id="chart-trend" role="group" aria-label="Trendijoonis"></svg>' +
        '<div class="tooltip" aria-hidden="true"></div></div></section>';
    }
    if (model.breakdown) {
      html += '<section class="chart-section" aria-labelledby="h-breakdown">' +
        '<h3 id="h-breakdown">' + esc(model.breakdown.title) + "</h3>" +
        '<p class="chart-note">' + esc(model.breakdown.year) + ". aasta, " + esc(config.indicator.label.toLowerCase()) +
          " (%). Katkendjoon näitab koondväärtust.</p>" +
        TAI.renderLegend(model.series) +
        '<div class="chart-holder"><svg class="chart" id="chart-breakdown" role="group" aria-label="Tulpdiagramm"></svg>' +
        '<div class="tooltip" aria-hidden="true"></div></div></section>';
    }
    html += '<details class="data-details"><summary>Näita andmeid tabelina</summary>' + TAI.renderDataTables(model) + "</details>";

    body.innerHTML = html;
    body.classList.remove("is-loading");
    body.removeAttribute("aria-busy");
    body._model = model;
    drawCharts();
  }

  var lastChartWidth = 0;

  function drawCharts() {
    var body = contentEl.querySelector(".module__body");
    if (!body || !body._model) return;
    var model = body._model;
    var trendSvg = body.querySelector("#chart-trend");
    var barSvg = body.querySelector("#chart-breakdown");
    var holder = body.querySelector(".chart-holder");
    if (!holder) return;
    var width = Math.floor(holder.clientWidth);
    lastChartWidth = width;
    if (trendSvg) {
      TAI.drawTrendChart(trendSvg, model, width);
      attachTooltipOnce(trendSvg);
    }
    if (barSvg) {
      TAI.drawBarChart(barSvg, model, width);
      attachTooltipOnce(barSvg);
    }
  }

  // ümberjoonistamisel (resize) sama SVG element jääb alles → kuulajaid mitte dubleerida
  function attachTooltipOnce(svg) {
    if (svg._hasTooltip) return;
    TAI.attachTooltip(svg, svg.nextElementSibling);
    svg._hasTooltip = true;
  }

  // filtrid: muutmine laadib andmed kohe (API) või arvutab failist uuesti
  contentEl.addEventListener("change", function (evt) {
    if (!view) return;
    var t = evt.target;
    var state = stateOf(view.config);
    if (t.matches("select[data-filter]")) {
      state[t.getAttribute("data-filter")] = t.value;
    } else if (t.matches('input[name="filter-sex"]')) {
      state.compareSexes = t.value === "compare";
      state.Sugu = state.compareSexes ? "0" : t.value;
    } else {
      return;
    }
    reload();
  });

  async function reload() {
    var config = view.config;
    if (view.source.source === "file") { renderBody(); return; }

    var body = contentEl.querySelector(".module__body");
    var myRequest = ++requestId;
    body.classList.add("is-loading");
    body.setAttribute("aria-busy", "true");
    setRowStatus(config.code, "loading");
    try {
      var data = await TAI.loadTable(config, stateOf(config));
      if (myRequest !== requestId || !view || view.config !== config) return;
      view.data = data;
      setRowStatus(config.code, null);
      renderBody();
      markLoaded();
    } catch (err) {
      if (myRequest !== requestId) return;
      console.error(err);
      setRowStatus(config.code, "error");
      renderError(config, err);
    }
  }

  var resizeTimer = null;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      var holder = contentEl.querySelector(".chart-holder");
      if (holder && Math.floor(holder.clientWidth) !== lastChartWidth) drawCharts();
    }, 150);
  });

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
      var data = await TAI.loadTable(config, stateOf(config));
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
