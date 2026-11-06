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

  function datasetRow(t) {
    var sourceText = (t.source && t.source.listLabel) || "Allikas: " + (t.seriesVar ? TAI.sourceLabel(t) : "TAI") + " " + t.code;
    return (
      '<li class="dataset" data-code="' + esc(t.code) + '">' +
        '<button type="button" class="dataset__button" aria-controls="content" ' +
            'aria-labelledby="ds-title-' + esc(t.code) + '" aria-describedby="ds-desc-' + esc(t.code) + '">' +
          '<span class="dataset__title" id="ds-title-' + esc(t.code) + '">' + esc(t.title) + "</span>" +
          '<span class="dataset__desc" id="ds-desc-' + esc(t.code) + '">' + esc(TAI.describe(t)) + "</span>" +
          '<span class="dataset__chevron" aria-hidden="true">›</span>' +
        "</button>" +
        '<div class="dataset__footer">' +
          '<a href="' + esc(t.seriesVar ? TAI.sourceUrl(t) : TAI.pxwebUrl(t)) + '" target="_blank" rel="noopener">' +
            esc(sourceText) +
            ' <span aria-hidden="true">↗</span><span class="visually-hidden">(avaneb uues aknas)</span></a>' +
          '<span class="dataset__views" hidden></span>' +
          '<span class="dataset__status" role="status"></span>' +
        "</div>" +
      "</li>"
    );
  }

  /* Grupid allika järgi (TAI.getTableGroups, core.js): väike hall pealkirjarida rea kohal; grupita
     tabelid jäävad pealkirjata. Iga grupp on oma <ul>, mis viitab pealkirjale aria-labelledby kaudu. */
  function renderList() {
    listEl.innerHTML = TAI.getTableGroups().map(function (g, i) {
      var id = "dataset-group-" + i;
      return (g.name ? '<h2 class="dataset-group-heading" id="' + id + '">' + esc(g.name) + "</h2>" : "") +
        '<ul class="dataset-list"' + (g.name ? ' aria-labelledby="' + id + '"' : "") + ">" +
        g.items.map(datasetRow).join("") + "</ul>";
    }).join("");

    listSignature = listSignatureNow();
    // loend joonistatakse vajadusel uuesti (uus aasta muudab kirjeldust/järjekorda): klikikäsitleja seotakse ainult üks kord
    if (!listEl._clickBound) {
      listEl._clickBound = true;
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
  }

  /* Loendi sisu allkiri (tabelite järjekord ja kirjeldused): kui API-st tuli uus aasta, muutub kirjeldus (TAI.describe) ja
     vahel ka järjekord (uusima aasta järgi); siis joonistatakse loend uuesti, aktiivne rida ja vaatamiste arvud säilivad. */
  var listSignature = "";
  var rowCounts = {};
  function listSignatureNow() {
    return TAI.getTables().map(function (t) { return t.code + "|" + TAI.describe(t); }).join("\n");
  }
  function refreshListIfChanged() {
    if (listSignatureNow() === listSignature) return;
    renderList();
    setActiveRow(current);
    Object.keys(rowCounts).forEach(function (code) { showRowCount(code, rowCounts[code]); });
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

  // Rühmasisesed võrdlused (soo, vanuse): ühised abifunktsioonid on core.js-is (TAI.comparisonsOf), sest valitud lõige (module.js) vajab neid samuti.
  var comparisonsOf = TAI.comparisonsOf;
  var comparisonFor = TAI.comparisonFor;

  function defaultState(config) {
    var state = { compareSexes: false, compareAges: false };
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
        // soo võrdlus on tähtsam kui vanuse võrdlus, kui aadressis on mõlemad
        if (val === SEX_PARAM.compare && config.canCompareSexes) { state.compareSexes = true; state.compareAges = false; state.Sugu = "0"; }
        else if (val === SEX_PARAM["1"]) state.Sugu = "1";
        else if (val === SEX_PARAM["2"]) state.Sugu = "2";
      } else if (code === "Vanuserühm" && val === "vordlus" && config.canCompareAges) {
        if (!state.compareSexes) { state.compareAges = true; state.Vanuserühm = config.vars[code].totalValue; }
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
      } else if (code === "Vanuserühm" && state.compareAges) {
        parts.push(name + "=vordlus");
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
        "<p>Näidikulaud koondab Eesti olulisemad vaimse heaolu ja tervise avaandmetena avaldatud näitajad " +
        "erinevatest andmebaasidest.</p>" +
        "<p>Avaandmed pärinevad järgmistest andmeallikatest:</p>" +
        // allikate loend tuleb vasaku loendi gruppidest, nii et uus allikas lisandub siia automaatselt
        "<ul>" + TAI.getSources().map(function (s) { return "<li>" + esc(s.name) + "</li>"; }).join("") + "</ul>" +
      "</div>";
  }

  /* Lehe jalus: sama allikate loetelu mis avalehel (TAI.getSources), nimed lingitud allika avalehele. */
  function renderFooter() {
    var footer = document.getElementById("site-footer");
    if (!footer) return;
    footer.innerHTML = "Avaandmed pärinevad järgmistest andmeallikatest: " + TAI.getSources().map(function (s) {
      return s.url ? TAI.externalLink(s.url, s.name) : esc(s.name);
    }).join(", ");
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
    // Valmis väljavõte, mitte päring allikasse: laadimise kellaaeg ei ütleks andmete seisu kohta midagi.
    // Rea sõnastuse koostab aruanne ise (source.statusLine), link tuleb siit.
    if (config.source && config.source.staticData) {
      return '<p class="module__status">' + config.source.statusLine(function (text) {
        return TAI.externalLink(TAI.sourceUrl(config), text);
      }, updatedText) + "</p>";
    }
    var now = new Date();
    var src = config.seriesVar ? TAI.sourceLabel(config) : "TAI";
    return '<p class="module__status">Andmed laaditud ' + esc(src) + " andmebaasist · " +
      esc(dateFmt.format(now) + " " + timeFmt.format(now)) + " — " + link +
      (updatedText ? " · " + esc(updatedText) : "") + "</p>";
  }

  /* Tabeli enda uuendusaeg (API vastuse "updated" väli) — kuvatakse staatusreal, allikaviite järel. */
  function tableUpdatedText(data) {
    var anyReader = data[Object.keys(data)[0]];
    if (anyReader && anyReader.statusNote) return anyReader.statusNote; // valmis väljavõte kirjeldab oma seisu ise
    var updated = anyReader && anyReader.raw.updated ? new Date(anyReader.raw.updated) : null;
    return updated && !isNaN(updated) ? "Andmed uuendatud " + dateFmt.format(updated) : null;
  }

  /* Filtrimuutusel (reload()) uuendatakse ainult juba ekraanil oleva mooduli staatusrida, mitte kogu päist. */
  function setStatus(config, kind, updatedText) {
    var el = contentEl.querySelector(".module__status");
    if (el) el.outerHTML = statusLineHtml(config, kind, updatedText);
  }

  /* Ülemine rida (nagu M3): staatusrida ja selle kõrval AI-nupud. Nupud ainult siis, kui andmed on ekraanil ja
     aruandel on AI-juhise reeglid (config.ai). .module__status peab jääma nuppudest eraldi: setStatus asendab selle. */
  function topbarHtml(config, statusHtml, withAi) {
    return '<div class="module__topbar">' + statusHtml + (withAi && TAI.aiAvailable(config) ? aiBoxHtml() : "") + "</div>";
  }

  function aiBoxHtml() {
    return '<div class="ai-box">' +
      '<div class="ai-box__row"><span class="ai-box__label">Analüüsi kuvatud andmeid AI-ga:</span>' +
        TAI.aiTargets.map(function (t) {
          return '<button type="button" class="ai-box__btn" data-ai="' + esc(t.id) + '">' + esc(t.label) + "</button>";
        }).join("") +
      "</div>" +
      '<p class="ai-box__msg" role="status" aria-live="polite"></p>' +
    "</div>";
  }

  function renderLoading(config) {
    view = null;
    contentEl.setAttribute("aria-busy", "true");
    contentEl.innerHTML =
      backLink() +
      '<header class="module__head">' +
        topbarHtml(config, statusLineHtml(config, "loading")) +
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
        topbarHtml(config, statusLineHtml(config, "error")) +
        '<h2 tabindex="-1">' + esc(config.fullTitle) + "</h2>" +
        '<p class="module__subtitle">' + esc(TAI.describe(config)) + "</p>" +
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
   * Valitud lõige (kasutaja otsus 05.11.2026, asendab 18.09.2026 reegli „näita ainult siis, kui filter erineb vaikeväärtusest“):
   * KPI kastis ning iga joonise ja andmetabeli pealkirja all on alati näha, milliste valikute (ka vaikevalik) alusel numbrid
   * kuvatakse. Selle koostavad TAI.sliceParts/trendSlice/breakdownSlice (module.js); vana ülemine rida „Valitud lõige — …“ kadus.
   */
  var SEX_OPTIONS = TAI.SEX_OPTIONS;

  /*
   * Filtrid (kasutaja otsus 05.11.2026): kõik lõiked, sh Sugu, on rippmenüüd, igal aruandel oma (config.filters järjekorras).
   * Rippmenüüde all on eraldi "Võrdlus" nupud rühmasisesteks võrdlusteks (soo ja vanuserühmade võrdlus, korraga üks). Kui
   * võrdlus on sees, näitab selle filtri menüü võrdluse rida (nt "Mehed vrdl Naised"); mõne väärtuse valimine lülitab võrdluse
   * välja, nupp ja menüü on alati kooskõlas.
   */
  function renderFilters(config, state) {
    var comps = comparisonsOf(config);
    var html = '<div class="filter-block"><div class="filters" role="group" aria-label="Filtrid">';
    (config.filters || []).forEach(function (code) {
      var v = config.vars[code];
      var id = "filter-" + code;
      var comp = comparisonFor(config, code);
      var comparing = !!(comp && state[comp.flag]);
      // optionLabels (valikuline): rippmenüü sildid hierarhia-taandega (nt „– Kardioloog“); mujal kasutatakse puhtaid labels'eid
      var optionLabels = v.optionLabels || v.labels;
      var options = code === "Sugu" ? SEX_OPTIONS : v.values.map(function (val, i) { return [val, optionLabels[i]]; });
      html += '<div class="field"><label for="' + esc(id) + '">' + esc(v.label) + "</label>" +
        '<select id="' + esc(id) + '" data-filter="' + esc(code) + '">' +
        options.map(function (o) {
          return '<option value="' + esc(o[0]) + '"' + (!comparing && state[code] === o[0] ? " selected" : "") + ">" + esc(o[1]) + "</option>";
        }).join("") +
        (comparing ? '<option value="compare" selected disabled>' + esc(comp.label) + "</option>" : "") +
        "</select></div>";
    });
    html += "</div>";
    if (comps.length) {
      html += '<div class="compare" role="group" aria-labelledby="compare-label"><span class="compare__label" id="compare-label">Võrdlus</span>' +
        '<div class="compare__options">' + comps.map(function (c) {
          return '<button type="button" class="compare-btn" id="' + c.buttonId + '" data-action="toggle-compare" data-compare="' + c.flag +
            '" aria-pressed="' + (state[c.flag] ? "true" : "false") + '">' + esc(c.label) + "</button>";
        }).join("") + "</div></div>";
    }
    return html + "</div>";
  }

  /* Filtriploki uuesti joonistamine kohapeal (nupp ja Sugu menüü peavad olema kooskõlas); fookus jääb samale elemendile. */
  function refreshFilters() {
    var block = contentEl.querySelector(".filter-block");
    if (!block || !view) return;
    var activeId = block.contains(document.activeElement) ? document.activeElement.id : "";
    block.outerHTML = renderFilters(view.config, stateOf(view.config));
    if (activeId) {
      var el = document.getElementById(activeId);
      if (el) el.focus({ preventScroll: true });
    }
  }

  /* Mooduli karkass (disain.md p. 3): eyebrow, pealkiri, alapealkiri, meta, filtrid, sisu, jalus. */
  function renderModule(config, data, source) {
    var state = stateOf(config);
    view = { config: config, data: data, source: source };

    var meta = [];
    if (source.source === "file") meta.push("Allikas: fail " + source.fileName);
    var footnotes = typeof config.footnotes === "function" ? config.footnotes(data) : config.footnotes;

    document.title = config.title + " · " + BASE_TITLE;
    contentEl.setAttribute("aria-busy", "false");
    contentEl.innerHTML =
      backLink() +
      '<article class="module">' +
        '<header class="module__head">' +
          topbarHtml(config, statusLineHtml(config, source.source === "api" ? "loaded" : "none", tableUpdatedText(data)), true) +
          '<h2 tabindex="-1">' + esc(config.fullTitle) + "</h2>" +
          '<p class="module__subtitle">' + esc(TAI.describe(config)) + "</p>" +
          (meta.length ? '<ul class="module__meta">' + meta.map(function (m) { return '<li class="pill">' + esc(m) + "</li>"; }).join("") + "</ul>" : "") +
        "</header>" +
        renderFilters(config, state) +
        '<div class="module__body" aria-live="polite"></div>' +
        '<footer class="module__footnotes">' +
          footnotes.map(function (f) { return "<p>" + esc(f) + "</p>"; }).join("") +
          "<p>Allikas: " + esc(config.seriesVar ? TAI.sourceLongLabel(config) : "Tervise Arengu Instituut") + ", " +
            TAI.externalLink(config.seriesVar ? TAI.sourceUrl(config) : TAI.pxwebUrl(config),
              (config.source && config.source.linkText) || "tabel " + config.code) + ".</p>" +
        "</footer>" +
      "</article>";

    renderBody();
  }

  function renderBody() {
    if (!view) return;
    var body = contentEl.querySelector(".module__body");
    if (!body) return;
    clearAiNotice();   // lõikelaual on nüüd teise lõike andmed: teade ja käsitsi kopeerimise tekst ei kehti enam
    var config = view.config;
    var model = TAI.buildModel(config, view.data, stateOf(config));
    setAiEnabled(!model.notice);   // numbriteta lõikes pole AI-l midagi analüüsida (ta võiks hakata ise numbreid pakkuma)
    // Toetamata filtrikombinatsioon: ainult teade, mitte tühjad kaardid ega liidetud hinnang (lõige näitab, mida valiti).
    if (model.notice) {
      body.innerHTML = TAI.sliceHtml(TAI.sliceParts(config, stateOf(config)).join(" · ")) + '<p class="callout">' + esc(model.notice) + "</p>";
      body.classList.remove("is-loading");
      body.removeAttribute("aria-busy");
      body._model = null;
      return;
    }

    var callout = TAI.calloutText(model);
    var html = TAI.renderKpis(model);   // valitud lõige on KPI kastis (module.js)
    if (callout) html += '<p class="callout">' + esc(callout) + "</p>";

    var measureLabel = config.seriesVar ? config.measureLabel : config.indicator.label;
    var unitTxt = config.seriesVar ? TAI.unitText(config, stateOf(config)) : "%";
    var yearOf = function (y) { return config.seriesVar ? TAI.yearLabel(config, y) : y; };
    var trendNote = typeof config.trendNote === "function" ? config.trendNote() : config.trendNote;   // võib sõltuda andmetest

    if (model.trend) {
      html += '<section class="chart-section" aria-labelledby="h-trend">' +
        '<h3 id="h-trend">Trend aastate lõikes</h3>' + TAI.sliceHtml(TAI.trendSlice(model)) +
        '<p class="chart-note">' + esc(measureLabel) + (unitTxt ? " (" + unitTxt + ")" : "") + ", " +
          esc(config.years.map(yearOf).join(", ")) + "</p>" +
        TAI.renderLegend(model.series) +
        '<div class="chart-holder"><svg class="chart" id="chart-trend" role="group" aria-label="Trendijoonis"></svg>' +
        '<div class="tooltip" aria-hidden="true"></div></div>' +
        (trendNote ? '<p class="chart-note chart-note--after">' + esc(trendNote) + "</p>" : "") +
        "</section>";
    }
    if (model.breakdown) {
      var b = model.breakdown;
      html += '<section class="chart-section" aria-labelledby="h-breakdown">' +
        '<h3 id="h-breakdown">' + esc(b.title) + "</h3>" + TAI.sliceHtml(TAI.breakdownSlice(model)) +
        // aasta ja lõige on juba lõike real; siin ainult mõõdik ja ühik (või aruande oma märkus)
        '<p class="chart-note">' + (b.note ? esc(b.note) : esc(measureLabel) +
          (unitTxt ? " (" + unitTxt + ")" : "") + (b.totals ? ". Katkendjoon näitab koondväärtust." : "")) + "</p>" +
        TAI.renderLegend(model.series) +
        '<div class="chart-holder"><svg class="chart" id="chart-breakdown" role="group" aria-label="Tulpdiagramm"></svg>' +
        '<div class="tooltip" aria-hidden="true"></div></div>' +
        (b.expandable ? '<button type="button" class="btn btn--ghost" data-action="toggle-expand">' +
          (b.expanded ? "Näita vähem" : "Näita kõiki (" + b.totalCount + ")") + "</button>" : "") +
        "</section>";
    }
    html += '<details class="data-details"><summary>Näita andmeid tabelina</summary>' + TAI.renderDataTables(model) + "</details>";
    if (model.sourceNote) html += '<p class="chart-note chart-note--after">' + esc(model.sourceNote) + "</p>";

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
      // väärtuse valimine menüüst lülitab selle filtri võrdluse välja; menüü kaotab seejärel võrdluse rea
      var comp = comparisonFor(view.config, t.getAttribute("data-filter"));
      if (comp && state[comp.flag]) {
        state[comp.flag] = false;
        refreshFilters();
      }
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
    var body = contentEl.querySelector(".module__body");
    var flag = body && body._model && body._model.breakdown && body._model.breakdown.expandFlag;
    if (!flag) return;
    var state = stateOf(view.config);
    state[flag] = !state[flag];
    renderBody();
  });

  // "Võrdlus" nupud: võrdlus sisse/välja. Sisse: selle filtri väärtus läheb koondile ja teine võrdlus lülitub välja (üks korraga);
  // välja: filter tagasi koondile ("Kokku").
  contentEl.addEventListener("click", function (evt) {
    var btn = evt.target.closest('[data-action="toggle-compare"]');
    if (!btn || !view) return;
    var config = view.config;
    var state = stateOf(config);
    var comp = comparisonsOf(config).filter(function (c) { return c.flag === btn.getAttribute("data-compare"); })[0];
    if (!comp) return;
    var turnOn = !state[comp.flag];
    comparisonsOf(config).forEach(function (c) { state[c.flag] = false; });
    state[comp.flag] = turnOn;
    state[comp.filter] = config.vars[comp.filter].totalValue;
    usage.track(usage.keyFilter(config.code, comp.filter, turnOn ? comp.usageOn : comp.usageOff));
    history.replaceState(null, "", hashFor(config));
    refreshFilters();
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
    setStatus(config, "loading");
    try {
      var data = await TAI.loadTable(config, stateOf(config));
      if (myRequest !== requestId || !view || view.config !== config) return;
      view.data = data;
      setRowStatus(config.code, null);
      renderBody();
      setStatus(config, "loaded", tableUpdatedText(data));
      refreshListIfChanged();
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

  /*
   * config.prepare() (valikuline, tagastab lubaduse): aruanne, mille aastad ja vaikevalikud tulevad andmefailidest
   * (Tervisekassa meta-fail), laeb need enne, kui olek ja filtrid luuakse. Tulemus jäetakse meelde (config._prepared),
   * ebaõnnestumisel proovitakse järgmisel avamisel uuesti.
   */
  function ensureReady(config) {
    if (!config.prepare || config._prepared) return Promise.resolve();
    return config.prepare().then(function () { config._prepared = true; });
  }

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
      await ensureReady(config);   // aruanne, mis vajab enne olekut oma andmete kirjeldust (nt Tervisekassa aastad)
      var data = await TAI.loadTable(config, stateOf(config));
      if (myRequest !== requestId) return;
      setRowStatus(code, null);
      renderModule(config, data, { source: "api" });
      refreshListIfChanged();
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

  /* Uue aruande avamisel algab see ülevalt (kasutaja soov 05.11.2026). Kitsas ekraanil on loend aruande kohal, seega
     keritakse alati; laial ekraanil ainult siis, kui leht on kerinud aruande algusest mööda (nt lugenud pikka
     aruannet ja valib kleepuvast loendist teise), muidu algaks uus aruanne keskelt. */
  function scrollToContent() {
    if (MOBILE_QUERY.matches) {
      contentEl.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
    } else if (contentEl.getBoundingClientRect().top < 0) {
      // laial ekraanil kohe (mitte sujuvalt): sisu vahetub ja kasvab kerimise ajal, sujuv kerimine katkeks
      contentEl.scrollIntoView({ behavior: "instant", block: "start" });
    }
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
    // olek luuakse alles pärast prepare()-i (aastad ja vaikevalikud tulevad andmetest); ebaõnnestumisel jätkub tavapäraselt,
    // select() näitab siis selge veateate
    if (config.prepare && !config._prepared && !config._prepareSkip) {
      pendingScroll = scroll;
      ensureReady(config).then(onHashChange, function () { config._prepareSkip = true; onHashChange(); });
      return;
    }
    config._prepareSkip = false;
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

  // ---- AI-analüüsi nupud (AI-ANALUUS.md, juhis: js/ai-prompt.js) -------------
  // Oma mudelit ega API-kutset pole: tekst läheb lõikelauale ja teenus avaneb külastaja enda kontol.

  // execCommand("copy") ei küsi brauseri lõikelaua-luba (Clipboard API küsib näiteks file:// alt avades)
  function copyViaTextarea(str) {
    var ta = document.createElement("textarea");
    ta.value = str;
    ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;top:0;left:0;opacity:0";
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }

  // Alati ekraani vasakus servas (AI-aken avaneb paremale), et aken seda ei kataks
  function showAiToast(text) {
    var el = document.getElementById("ai-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "ai-toast";
      el.className = "ai-toast";
      el.setAttribute("role", "status");
      el.innerHTML = '<p class="ai-toast__text"></p><button type="button" class="ai-toast__close">Selge</button>';
      el.querySelector("button").addEventListener("click", function () { el.hidden = true; });
      document.body.appendChild(el);
    }
    el.querySelector("p").textContent = text;
    el.hidden = false;
  }

  /*
   * Teise saidi lehele ei saa meie lehelt midagi kuvada. Chrome/Edge „Document Picture-in-Picture“ annab aga
   * alati peal ujuva väikese akna meie enda HTML-iga, mis jääb AI akna peale. Muudes brauserites (või kui avamine
   * ebaõnnestub, nt iframe'is) kuvatakse sama teade vasakus alanurgas.
   */
  function showAiNotice(text, aiWindow) {
    var dpip = window.documentPictureInPicture;
    if (!dpip || !dpip.requestWindow) { showAiToast(text); return; }
    dpip.requestWindow({ width: 380, height: 200 }).then(function (pip) {
      var d = pip.document;
      d.head.innerHTML = '<meta charset="utf-8"><title>Juhis</title><style>' +
        "body{margin:0;padding:16px;font:500 16px/1.4 Roboto,system-ui,sans-serif;color:#0e0f21;background:#E4ECFF;border-left:6px solid #4B7DFF;box-sizing:border-box;height:100vh}" +
        "p{margin:0 0 12px}button{font:inherit;font-size:14px;cursor:pointer;padding:5px 18px;border:0;border-radius:999px;background:#181E54;color:#fff}" +
        "</style>";
      d.body.innerHTML = '<p></p><button type="button">Sulge</button>';
      d.body.querySelector("p").textContent = text;
      d.body.querySelector("button").addEventListener("click", function () {
        // Sulgemisel läheb fookus näidikulaua aknale ja AI-aken jääks selle taha: toome AI-akna tagasi ette
        pip.addEventListener("pagehide", function () { try { if (aiWindow && !aiWindow.closed) aiWindow.focus(); } catch (e) { /* teine päritolu */ } });
        try { if (aiWindow && !aiWindow.closed) aiWindow.focus(); } catch (e) { /* teine päritolu */ }
        pip.close();
      });
    }).catch(function () { showAiToast(text); });
  }

  function setAiEnabled(on) {
    contentEl.querySelectorAll("button[data-ai]").forEach(function (b) {
      b.disabled = !on;
      if (on) b.removeAttribute("title"); else b.title = "Selles lõikes andmeid ei ole";
    });
  }

  function clearAiNotice() {
    var box = contentEl.querySelector(".ai-box");
    if (box) {
      box.querySelector(".ai-box__msg").textContent = "";
      var ta = box.querySelector(".ai-box__text");
      if (ta) ta.parentNode.removeChild(ta);
    }
    var toast = document.getElementById("ai-toast");
    if (toast) toast.hidden = true;
  }

  contentEl.addEventListener("click", function (evt) {
    var btn = evt.target.closest("button[data-ai]");
    if (!btn || !view) return;
    var target = TAI.aiTargets.filter(function (t) { return t.id === btn.getAttribute("data-ai"); })[0];
    if (!target) return;
    var box = btn.closest(".ai-box");
    var msg = box.querySelector(".ai-box__msg");
    var prompt = TAI.buildAiPrompt(view.config, contentEl);

    // Järjekord on oluline: (1) kopeeri enne uut akent, sest pärast seda pole leht fookuses ja brauser küsiks luba;
    // (2) ava AI-aken enne teate akent, sest teate akna loomine kulutab kasutaja klõpsu ja brauser blokeeriks avamise.
    var copied = copyViaTextarea(prompt);
    btn.focus({ preventScroll: true });
    var existing = box.querySelector(".ai-box__text");
    if (copied) {
      msg.textContent = "Näidikulaua andmed on kopeeritud lõikelauale. Vajuta AI vestlusaknas Ctrl+V, et sisestada need analüüsiks, ja seejärel Enter.";
      if (existing) existing.parentNode.removeChild(existing);
    } else {
      msg.textContent = "Automaatne kopeerimine ei õnnestunud. Kopeeri tekst siit käsitsi (Ctrl+A, Ctrl+C) ja kleebi avanenud vestlusaknasse:";
      if (!existing) {
        existing = document.createElement("textarea");
        existing.className = "ai-box__text";
        existing.readOnly = true;
        existing.rows = 8;
        existing.setAttribute("aria-label", "Analüüsi juhis käsitsi kopeerimiseks");
        box.appendChild(existing);
      }
      existing.value = prompt;
    }

    var w = Math.round(screen.availWidth * 0.5), h = screen.availHeight - 40;
    var left = (screen.availLeft || 0) + screen.availWidth - w, top = screen.availTop || 0;
    var opened = window.open(target.url, "tai-ai-analysis", "popup=yes,width=" + w + ",height=" + h + ",left=" + left + ",top=" + top);
    if (!opened) opened = window.open(target.url, "_blank");
    showAiNotice(msg.textContent, opened);

    usage.track(usage.keyAction(view.config.code, "ai-" + target.id));
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
    if (value != null) rowCounts[code] = value;   // jääb meelde loendi uuesti joonistamiseks (refreshListIfChanged)
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
    var link = evt.target.closest && evt.target.closest('a[href*="statistika.tai.ee/pxweb"], a[href*="ec.europa.eu/eurostat"], a[href*="tervisekassa.ee"]');
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
  renderFooter();
  loadViewCount();
  window.addEventListener("hashchange", onHashChange);
  if (TAI.getTable(parseHash().code)) {
    onHashChange();
  } else {
    renderEmpty();
  }
})(window.TAI);
