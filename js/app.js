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

  var current = null;      // valitud tabeli kood
  var requestId = 0;       // vanemate päringute tulemused jäetakse kõrvale
  var states = {};         // filtrivalikud tabeli kaupa (säilivad tabelite vahel liikudes)
  var view = null;         // { config, data, source } — praegu kuvatud moodul

  var BASE_TITLE = document.title;
  var REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)");

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
            '<a href="' + esc(t.seriesVar ? TAI.sourceUrl(t) : TAI.pxwebUrl(t)) + '" target="_blank" rel="noopener">Allikas: ' +
              esc(t.seriesVar ? TAI.sourceLabel(t) : "TAI") + " " + esc(t.code) +
              ' <span aria-hidden="true">↗</span><span class="visually-hidden">(avaneb uues aknas)</span></a>' +
            '<span class="dataset__views" hidden></span>' +
            '<span class="dataset__status" role="status"></span>' +
          "</div>" +
        "</li>"
      );
    }).join("");

    listEl.addEventListener("click", function (evt) {
      var btn = evt.target.closest(".dataset__button");
      if (!btn) return;
      var config = TAI.getTable(btn.closest(".dataset").getAttribute("data-code"));
      var target = hashFor(config);
      if (location.hash === target) {
        select(config.code, { scroll: true }); // sama vaade uuesti → laadi uuesti
      } else {
        pendingScroll = true;
        location.hash = target;                // hashchange → select()
      }
    });
  }

  // ---- aadress: #KOOD?taustatunnus=3&vanus=2&sugu=vordlus ------------

  var PARAM_NAMES = { Taustatunnus: "taustatunnus", "Vanuserühm": "vanus", Sugu: "sugu" };
  var SEX_PARAM = { "1": "mehed", "2": "naised", compare: "vordlus" };

  function parseHash() {
    var raw = decodeURIComponent(location.hash.replace(/^#/, ""));
    var q = raw.indexOf("?");
    var params = {};
    (q >= 0 ? raw.slice(q + 1) : "").split("&").forEach(function (pair) {
      if (!pair) return;
      var eq = pair.indexOf("=");
      params[eq >= 0 ? pair.slice(0, eq) : pair] = eq >= 0 ? pair.slice(eq + 1) : "";
    });
    return { code: q >= 0 ? raw.slice(0, q) : raw, params: params };
  }

  function defaultState(config) {
    var state = { compareSexes: false };
    (config.filters || []).forEach(function (v) { state[v] = config.vars[v].totalValue || config.vars[v].values[0]; });
    return state;
  }

  /** Aadressi parameetritest olek; tundmatud või vigased väärtused jäetakse vaikimisi. */
  function stateFromParams(config, params) {
    var state = defaultState(config);
    (config.filters || []).forEach(function (code) {
      var val = params[PARAM_NAMES[code] || code.toLowerCase()];
      if (val == null) return;
      if (code === "Sugu") {
        if (val === SEX_PARAM.compare && config.canCompareSexes) { state.compareSexes = true; state.Sugu = "0"; }
        else if (val === SEX_PARAM["1"]) state.Sugu = "1";
        else if (val === SEX_PARAM["2"]) state.Sugu = "2";
      } else if (config.vars[code].values.indexOf(val) >= 0) {
        state[code] = val;
      }
    });
    return state;
  }

  function hashFor(config) {
    var state = states[config.code] || defaultState(config);
    var parts = [];
    (config.filters || []).forEach(function (code) {
      var name = PARAM_NAMES[code] || code.toLowerCase();
      if (code === "Sugu") {
        var key = state.compareSexes ? "compare" : state.Sugu;
        if (SEX_PARAM[key]) parts.push(name + "=" + SEX_PARAM[key]);
      } else if (state[code] != null && state[code] !== config.vars[code].totalValue) {
        parts.push(name + "=" + encodeURIComponent(state[code]));
      }
    });
    return "#" + config.code + (parts.length ? "?" + parts.join("&") : "");
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
    document.title = BASE_TITLE;
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

  /* Mooduli oma pealkirja kohal olev staatusrida (kulmu asemel): laadimine / õnnestunud / ebaõnnestunud.
     Vana kulmu sisu (nt "Eesti terviseuuring · ETU42") liigub siia viitena samale reale. */
  function statusLineHtml(config, kind, updatedText) {
    var link = TAI.externalLink(config.seriesVar ? TAI.sourceUrl(config) : TAI.pxwebUrl(config), config.eyebrow);
    if (kind === "loading") return '<p class="module__status">Laen andmeid — ' + link + "</p>";
    if (kind === "error") return '<p class="module__status module__status--error">Andmeid ei õnnestunud laadida! — ' + link + "</p>";
    if (kind !== "loaded") return '<p class="module__status"></p>';
    var now = new Date();
    var src = config.seriesVar ? TAI.sourceLabel(config) : "TAI";
    return '<p class="module__status">Andmed laaditud ' + esc(src) + " andmebaasist · " +
      esc(dateFmt.format(now) + " " + timeFmt.format(now)) + " — " + link +
      (updatedText ? " · " + esc(updatedText) : "") + "</p>";
  }

  /* Tabeli enda uuendusaeg (API vastuse "updated" väli) — kuvatakse staatusreal, allikaviite järel. */
  function tableUpdatedText(data) {
    var anyReader = data[Object.keys(data)[0]];
    var updated = anyReader && anyReader.raw.updated ? new Date(anyReader.raw.updated) : null;
    return updated && !isNaN(updated) ? "Andmed uuendatud " + dateFmt.format(updated) : null;
  }

  /* Filtrimuutusel (reload()) uuendatakse ainult juba ekraanil oleva mooduli staatusrida, mitte kogu päist. */
  function setStatus(config, kind, updatedText) {
    var el = contentEl.querySelector(".module__status");
    if (el) el.outerHTML = statusLineHtml(config, kind, updatedText);
  }

  function renderLoading(config) {
    view = null;
    contentEl.setAttribute("aria-busy", "true");
    contentEl.innerHTML =
      backLink() +
      '<header class="module__head">' +
        statusLineHtml(config, "loading") +
        '<h2 tabindex="-1">' + esc(config.fullTitle) + "</h2>" +
      "</header>" +
      '<div class="skeleton" aria-label="Laadin andmestikku ' + esc(config.title) + '">' +
        '<div class="skeleton__bar skeleton__bar--short"></div>' +
        '<div class="skeleton__bar skeleton__bar--title"></div>' +
        '<div class="skeleton__bar"></div>' +
        '<div class="skeleton__block"></div>' +
      "</div>";
  }

  function renderError(config, err) {
    view = null;
    var info = TAI.describeError(err, config);
    contentEl.setAttribute("aria-busy", "false");
    contentEl.innerHTML =
      backLink() +
      '<header class="module__head">' +
        statusLineHtml(config, "error") +
        '<h2 tabindex="-1">' + esc(config.fullTitle) + "</h2>" +
        '<p class="module__subtitle">' + esc(config.description) + "</p>" +
      "</header>" +
      '<div class="error-box" role="alert">' +
        "<h3>" + esc(info.title) + "</h3>" +
        "<p>" + esc(info.text) + "</p>" +
        '<button type="button" class="btn" data-action="retry">Proovi uuesti</button>' +
        (info.offerUpload ?
          '<div class="error-box__upload">' +
            '<label for="upload-file">Või lae andmed failina üles</label>' +
            '<p class="muted">Ava ' + TAI.externalLink(config.seriesVar ? TAI.sourceUrl(config) : TAI.pxwebUrl(config),
              "tabel " + config.code + " " + (config.seriesVar ? TAI.sourceLabel(config) : "TAI") + " andmebaasis") +
              ", vali kõik väärtused ja salvesta vormingus JSON-stat.</p>" +
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
          usage.track(usage.keyAction(config.code, "fail"));
        }).catch(function (e) {
          renderError(config, e);
        });
      });
    }
  }

  // ---- moodul ---------------------------------------------------------

  function stateOf(config) {
    if (!states[config.code]) states[config.code] = defaultState(config);
    return states[config.code];
  }

  /*
   * Valitud lõige, kui vähemalt üks filter erineb vaikeväärtusest (nt "Kokku") — kinnitatud
   * kasutajaga 18.09.2026: KPI-rea, graafikute ja tabeli kohal peab olema alati selge, milline
   * valik neid numbreid kujundab, mitte ainult callout-tekstis. Vaikefiltritega tabelivaates
   * jääb rida näitamata, et esmavaade ei koormaks üleliigse infoga (vt renderBody()).
   */
  function filterSummary(config, state) {
    var parts = (config.filters || []).map(function (code) {
      var v = config.vars[code];
      if (code === "Sugu") {
        if (state.compareSexes) return "Sugu: Mehed vrdl Naised";
        return state.Sugu != null && state.Sugu !== v.totalValue ? "Sugu: " + TAI.labelOf(config, "Sugu", state.Sugu) : null;
      }
      return state[code] != null && state[code] !== v.totalValue ? v.label + ": " + TAI.labelOf(config, code, state[code]) : null;
    }).filter(function (p) { return p != null; });
    return parts.length ? "Valitud lõige — " + parts.join(" · ") : "";
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
      if (config.canCompareSexes) options.push(["compare", "Mehed vrdl Naised"]);
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

    var meta = [];
    if (source.source === "file") meta.push("Allikas: fail " + source.fileName);

    document.title = config.title + " · " + BASE_TITLE;
    contentEl.setAttribute("aria-busy", "false");
    contentEl.innerHTML =
      backLink() +
      '<article class="module">' +
        '<header class="module__head">' +
          statusLineHtml(config, source.source === "api" ? "loaded" : "none", tableUpdatedText(data)) +
          '<h2 tabindex="-1">' + esc(config.fullTitle) + "</h2>" +
          '<p class="module__subtitle">' + esc(config.description) + "</p>" +
          (meta.length ? '<ul class="module__meta">' + meta.map(function (m) { return '<li class="pill">' + esc(m) + "</li>"; }).join("") + "</ul>" : "") +
        "</header>" +
        renderFilters(config, state) +
        '<div class="module__body" aria-live="polite"></div>' +
        '<footer class="module__footnotes">' +
          config.footnotes.map(function (f) { return "<p>" + esc(f) + "</p>"; }).join("") +
          "<p>Allikas: " + esc(config.seriesVar ? TAI.sourceLongLabel(config) : "Tervise Arengu Instituut") + ", " +
            TAI.externalLink(config.seriesVar ? TAI.sourceUrl(config) : TAI.pxwebUrl(config), "tabel " + config.code) + ".</p>" +
        "</footer>" +
      "</article>";

    renderBody();
  }

  function renderBody() {
    if (!view) return;
    var body = contentEl.querySelector(".module__body");
    if (!body) return;
    var config = view.config;
    var model = TAI.buildModel(config, view.data, stateOf(config));
    var callout = TAI.calloutText(model);

    var summary = filterSummary(config, stateOf(config));
    var html = (summary ? '<p class="filter-summary">' + esc(summary) + "</p>" : "") + TAI.renderKpis(model);
    if (callout) html += '<p class="callout">' + esc(callout) + "</p>";

    var measureLabel = config.seriesVar ? config.measureLabel : config.indicator.label;
    var unitTxt = config.seriesVar ? TAI.unitText(config) : "%";
    var yearOf = function (y) { return config.seriesVar ? TAI.yearLabel(config, y) : y; };

    if (model.trend) {
      html += '<section class="chart-section" aria-labelledby="h-trend">' +
        '<h3 id="h-trend">Trend aastate lõikes</h3>' +
        '<p class="chart-note">' + esc(measureLabel) + (unitTxt ? " (" + unitTxt + ")" : "") + ", " +
          esc(config.years.map(yearOf).join(", ")) + "</p>" +
        TAI.renderLegend(model.series) +
        '<div class="chart-holder"><svg class="chart" id="chart-trend" role="group" aria-label="Trendijoonis"></svg>' +
        '<div class="tooltip" aria-hidden="true"></div></div>' +
        (config.trendNote ? '<p class="chart-note chart-note--after">' + esc(config.trendNote) + "</p>" : "") +
        "</section>";
    }
    if (model.breakdown) {
      var b = model.breakdown;
      html += '<section class="chart-section" aria-labelledby="h-breakdown">' +
        '<h3 id="h-breakdown">' + esc(b.title) + "</h3>" +
        '<p class="chart-note">' + esc(yearOf(b.year)) + ". aasta, " + esc(measureLabel.toLowerCase()) +
          (unitTxt ? " (" + unitTxt + ")" : "") + (b.totals ? ". Katkendjoon näitab koondväärtust." : "") + "</p>" +
        TAI.renderLegend(model.series) +
        '<div class="chart-holder"><svg class="chart" id="chart-breakdown" role="group" aria-label="Tulpdiagramm"></svg>' +
        '<div class="tooltip" aria-hidden="true"></div></div>' +
        (b.expandable ? '<button type="button" class="btn btn--ghost" data-action="toggle-expand">' +
          (b.expanded ? "Näita vähem" : "Näita kõiki (" + b.totalCount + ")") + "</button>" : "") +
        "</section>";
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
      usage.track(usage.keyFilter(view.config.code, t.getAttribute("data-filter"), t.value));
    } else if (t.matches('input[name="filter-sex"]')) {
      state.compareSexes = t.value === "compare";
      state.Sugu = state.compareSexes ? "0" : t.value;
      usage.track(usage.keyFilter(view.config.code, "Sugu", t.value));
    } else {
      return;
    }
    // aadress kajastab vaadet; replaceState ei tekita hashchange'i ega uut ajaloo kirjet
    history.replaceState(null, "", hashFor(view.config));
    reload();
  });

  // "Näita kõiki" / "Näita vähem" (riikide vms kompaktse breakdown-loendi laiendus) — andmed on
  // juba laaditud (API vastuses on kõik väärtused korraga), nii et ei ole vaja uuesti pärida.
  contentEl.addEventListener("click", function (evt) {
    var btn = evt.target.closest('[data-action="toggle-expand"]');
    if (!btn || !view) return;
    var flag = view.config.views.breakdown && view.config.views.breakdown.expandFlag;
    if (!flag) return;
    var state = stateOf(view.config);
    state[flag] = !state[flag];
    renderBody();
  });

  async function reload() {
    var config = view.config;
    if (view.source.source === "file") { renderBody(); return; }

    var body = contentEl.querySelector(".module__body");
    var myRequest = ++requestId;
    body.classList.add("is-loading");
    body.setAttribute("aria-busy", "true");
    setRowStatus(config.code, "loading");
    setStatus(config, "loading");
    try {
      var data = await TAI.loadTable(config, stateOf(config));
      if (myRequest !== requestId || !view || view.config !== config) return;
      view.data = data;
      setRowStatus(config.code, null);
      renderBody();
      setStatus(config, "loaded", tableUpdatedText(data));
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
      usage.track(usage.keyDataset(code)).then(function (v) { showRowCount(code, v); });
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

  function scrollBehavior() { return REDUCED_MOTION.matches ? "auto" : "smooth"; }

  function scrollToContent() {
    if (MOBILE_QUERY.matches) contentEl.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
  }

  function focusHeading() {
    if (!MOBILE_QUERY.matches) return;
    var h = contentEl.querySelector(".module__head h2");
    if (h) h.focus({ preventScroll: true });
  }

  function onHashChange() {
    var parsed = parseHash();
    var config = TAI.getTable(parsed.code);
    var scroll = pendingScroll;
    pendingScroll = false;
    if (!config) {
      if (current) { current = null; setActiveRow(null); renderEmpty(); }
      return;
    }
    var before = JSON.stringify(states[config.code] || null);
    states[config.code] = stateFromParams(config, parsed.params);
    var filtersChanged = before !== JSON.stringify(states[config.code]);

    if (config.code !== current || scroll) {
      select(config.code, { scroll: scroll });
    } else if (filtersChanged) {
      // sama tabel, teised filtrid (nt brauseri „tagasi“ või käsitsi muudetud aadress)
      if (view && view.config === config) { renderModule(config, view.data, view.source); if (view.source.source !== "file") reload(); }
      else select(config.code);
    }
  }

  // ---- käivitus -------------------------------------------------------

  // „↑ Tagasi andmestike juurde“: keri loendini, aadressi (valitud tabelit) mitte muuta
  contentEl.addEventListener("click", function (evt) {
    var link = evt.target.closest(".back-link");
    if (!link) return;
    evt.preventDefault();
    listEl.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
    var activeBtn = listEl.querySelector(".dataset.is-active .dataset__button");
    if (activeBtn) activeBtn.focus({ preventScroll: true });
  });

  // ---- kasutusstatistika (js/usage.js, disain.md p. 2) --------------------
  // Kui teenus ei vasta, arve lihtsalt ei kuvata — leht töötab edasi.

  var usage = TAI.usage;
  var numberFmt = new Intl.NumberFormat("et-EE");

  function viewsText(n) { return numberFmt.format(n) + (n === 1 ? " vaatamine" : " vaatamist"); }

  function showCount(el, value) {
    if (!el || value == null) return;
    el.textContent = viewsText(value);
    el.hidden = false;
  }

  function showRowCount(code, value) {
    var row = rowOf(code);
    showCount(row && row.querySelector(".dataset__views"), value);
  }

  function loadViewCount() {
    usage.track("vt-startpage", { everyTime: true }).then(function (v) { showCount(document.getElementById("view-count"), v); });
    TAI.getTables().forEach(function (t) {
      usage.get(usage.keyDataset(t.code)).then(function (v) { showRowCount(t.code, v); });
    });
  }

  // andmetabeli avamine (toggle ei mullitu → capture)
  contentEl.addEventListener("toggle", function (evt) {
    if (view && evt.target.matches && evt.target.matches("details.data-details") && evt.target.open) {
      usage.track(usage.keyAction(view.config.code, "andmetabel"));
    }
  }, true);

  // TAI allikalingi klõps (loendis või moodulis; ka keskmise nupuga uude kaardi avamine)
  function onSourceClick(evt) {
    var link = evt.target.closest && evt.target.closest('a[href*="statistika.tai.ee/pxweb"], a[href*="ec.europa.eu/eurostat"]');
    if (!link) return;
    var row = link.closest(".dataset");
    var code = row ? row.getAttribute("data-code") : (contentEl.contains(link) && view ? view.config.code : null);
    if (code) usage.track(usage.keyAction(code, "allikas"));
  }
  document.addEventListener("click", onSourceClick);
  document.addEventListener("auxclick", onSourceClick);

  // printimine: andmetabel avatakse, pärast taastatakse kasutaja valik
  var reopened = [];
  window.addEventListener("beforeprint", function () {
    if (view) usage.track(usage.keyAction(view.config.code, "prindi"));
    reopened = Array.prototype.filter.call(contentEl.querySelectorAll("details.data-details"), function (d) { return !d.open; });
    reopened.forEach(function (d) { d.open = true; });
  });
  window.addEventListener("afterprint", function () {
    reopened.forEach(function (d) { d.open = false; });
    reopened = [];
  });

  renderList();
  loadViewCount();
  window.addEventListener("hashchange", onHashChange);
  if (TAI.getTable(parseHash().code)) {
    onHashChange();
  } else {
    renderEmpty();
  }
})(window.TAI);
