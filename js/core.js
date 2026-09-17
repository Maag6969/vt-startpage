/*
 * TAI vaimse tervise näidikulaud — ühine tuummoodul.
 *
 * Laetakse tavalise <script>-ina (mitte ES-moodulina), et leht töötaks ka file:// kaudu avatuna.
 * Kõik avalik liides on nimeruumis window.TAI; tabelite konfiguratsioonid registreeritakse
 * TAI.registerTable() kaudu (vt js/tables/*.js).
 */
(function (global) {
  "use strict";

  var TAI = global.TAI || {};
  global.TAI = TAI;

  TAI.API_BASE = "https://statistika.tai.ee/api/v1/et/Andmebaas/05Uuringud/01ETeU/04VaimneTervis/";
  TAI.PXWEB_BASE = "https://statistika.tai.ee/pxweb/et/Andmebaas/Andmebaas__05Uuringud__01ETeU__04VaimneTervis/";

  // ---- tabelite register ----------------------------------------------

  var tables = [];

  TAI.registerTable = function (config) {
    validateConfig(config);
    tables.push(config);
    return config;
  };

  TAI.getTables = function () { return tables.slice(); };

  TAI.getTable = function (code) {
    for (var i = 0; i < tables.length; i++) {
      if (tables[i].code === code) return tables[i];
    }
    return null;
  };

  /*
   * Kaks tabelikonfiguratsiooni kuju kehtivad kõrvuti (17.09.2026, esimene Eurostati tabel):
   *  - vana, ETU-põhine: config.indicator = { var, positive, ... } (binaarne osakaal, nt Depressioon jah/ei)
   *  - uus, üldine: config.seriesVar + config.measureLabel (suvaline väärtusteljega muutuja, nt
   *    hindamisskaala või riik) — vt js/module.js, kus kõik renderdusfunktsioonid harjutavad
   *    kumba kuju kasutada `config.seriesVar` olemasolu järgi. Uut kuju EI kanta ETU-tabelitele üle
   *    ilma eraldi otsuseta (vt TASKS.md „2. etapp“) — need jäävad vana kujuga muutumatuks.
   */
  function validateConfig(c) {
    var required = ["code", "title", "description", "vars", "years"];
    required.forEach(function (key) {
      if (!c[key]) throw new Error("Tabeli konfiguratsioonist puudub väli '" + key + "'" + (c.code ? " (" + c.code + ")" : ""));
    });
    if (!c.indicator && !c.seriesVar) {
      throw new Error(c.code + ": tabelil peab olema kas 'indicator' (vana kuju) või 'seriesVar' (uus kuju)");
    }
    if (c.indicator && !c.vars[c.indicator.var]) {
      throw new Error(c.code + ": näitaja muutujat '" + c.indicator.var + "' pole vars-is kirjeldatud");
    }
    if (c.seriesVar && !c.vars[c.seriesVar]) {
      throw new Error(c.code + ": seeriamuutujat '" + c.seriesVar + "' pole vars-is kirjeldatud");
    }
    Object.keys(c.vars).forEach(function (code) {
      var v = c.vars[code];
      if (!v.values || !v.labels || v.values.length !== v.labels.length) {
        throw new Error(c.code + ": muutuja '" + code + "' values/labels on puudu või erineva pikkusega");
      }
    });
  }

  // ---- ühised muutujad (sama kodeering ETU41/42/43-s) -----------------

  TAI.sexVar = function (elimination) {
    return {
      label: "Sugu",
      values: ["0", "1", "2"],
      labels: ["Mehed ja naised", "Mehed", "Naised"],
      totalValue: "0",
      elimination: !!elimination
    };
  };

  TAI.ageVar = function (elimination) {
    return {
      label: "Vanuserühm",
      values: ["0", "1", "2", "3", "4", "5", "6", "7"],
      labels: ["15 ja vanemad", "15–24", "25–34", "35–44", "45–54", "55–64", "65–74", "75 ja vanemad"],
      totalValue: "0",
      elimination: !!elimination
    };
  };

  TAI.apiUrl = function (config) { return TAI.API_BASE + config.code + ".px"; };
  TAI.pxwebUrl = function (config) { return TAI.PXWEB_BASE + config.code + ".px/"; };

  TAI.labelOf = function (config, varCode, value) {
    var v = config.vars[varCode];
    var i = v ? v.values.indexOf(value) : -1;
    return i >= 0 ? v.labels[i] : value;
  };

  // ---- päringu koostamine ---------------------------------------------

  /*
   * selection: { muutujaKood: [väärtused] } — ainult need muutujad, mida soovitakse piirata.
   *
   * Reeglid (kinnitatud API vastu 16.09.2026, vt README „Kinnitatud API-struktuur“):
   *  - näitaja muutuja (nt Distress) küsitakse alati kõigi väärtustega, et osakaalu saaks arvutada;
   *  - eliminatsiooniga muutuja (elimination: true) võib välja jääda → API annab koondväärtuse;
   *  - eliminatsioonita muutuja, mida pole valikus, saab vaikimisi väärtuse (defaultValue, tavaliselt "0"),
   *    sest muidu tagastab API kõik kategooriad (ETU43 Sugu/Vanuserühm).
   *  - aastamuutuja vaikimisi kõigi aastatega.
   */
  TAI.buildQuery = function (config, selection) {
    selection = selection || {};
    var query = [];

    Object.keys(config.vars).forEach(function (code) {
      var v = config.vars[code];
      var values;

      if (code === config.indicator.var) {
        values = v.values.slice();
      } else if (selection[code] && selection[code].length) {
        values = selection[code].slice();
      } else if (code === config.yearVar) {
        values = v.values.slice();
      } else if (v.elimination) {
        return; // API annab koondväärtuse
      } else {
        values = [v.defaultValue != null ? v.defaultValue : v.values[0]];
      }

      values.forEach(function (val) {
        if (v.values.indexOf(val) < 0) {
          throw new Error(config.code + ": tundmatu väärtus '" + val + "' muutujal " + code);
        }
      });
      query.push({ code: code, selection: { filter: "item", values: values } });
    });

    return { query: query, response: { format: "json-stat2" } };
  };

  /*
   * Kasutaja olekust ({ Sugu: "2", Vanuserühm: "0", ... }) päringu selection.
   * Koondkategooria ("0") jäetakse välja — buildQuery lisab selle ise vaid eliminatsioonita muutujatele.
   * overrides: { muutujaKood: [väärtused] } kirjutab üle (nt kõik vanuserühmad tulpdiagrammi jaoks).
   */
  TAI.selectionFromState = function (config, state, varCodes, overrides) {
    var sel = {};
    varCodes.forEach(function (code) {
      var val = state[code];
      if (val != null && val !== config.vars[code].totalValue) sel[code] = [val];
    });
    Object.keys(overrides || {}).forEach(function (code) { sel[code] = overrides[code]; });
    return sel;
  };

  // ---- JSON-stat2 lugeja ----------------------------------------------

  /*
   * Tagastab { get(selection), dims, ids, raw }.
   * get({ Aasta: "2019", Sugu: "1", ... }) → number | null (puuduv väärtus) | undefined (valik ei sobi).
   * Valikust puuduv dimensioon on lubatud ainult siis, kui selle suurus on 1 (nt ContentsCode);
   * suurema dimensiooni puhul tagastatakse undefined, et vale lahtrit vaikselt ei loetaks.
   */
  TAI.readJsonStat2 = function (payload) {
    var ds = payload && payload.dataset ? payload.dataset : payload;
    if (!ds || !ds.dimension || !ds.value) {
      throw new TAI.DataError("Tundmatu andmestruktuur — oodati JSON-stat2 vormingut.");
    }
    var ids = ds.id || ds.dimension.id;
    var sizes = ds.size || ds.dimension.size;
    if (!ids || !sizes || ids.length !== sizes.length) {
      throw new TAI.DataError("JSON-stat2 failist puudub dimensioonide id/size info.");
    }

    var strides = new Array(ids.length);
    strides[ids.length - 1] = 1;
    for (var i = ids.length - 2; i >= 0; i--) strides[i] = strides[i + 1] * sizes[i + 1];

    var dims = {};
    ids.forEach(function (id, i) {
      var cat = ds.dimension[id].category;
      var indexMap = {};
      if (Array.isArray(cat.index)) {
        cat.index.forEach(function (code, pos) { indexMap[code] = pos; });
      } else if (cat.index && typeof cat.index === "object") {
        indexMap = cat.index;
      } else {
        Object.keys(cat.label || {}).forEach(function (code, pos) { indexMap[code] = pos; });
      }
      dims[id] = { stride: strides[i], size: sizes[i], indexMap: indexMap, label: cat.label || {} };
    });

    var values = ds.value;

    function get(selection) {
      var offset = 0;
      for (var k = 0; k < ids.length; k++) {
        var id = ids[k];
        var d = dims[id];
        var pos;
        if (Object.prototype.hasOwnProperty.call(selection, id)) {
          pos = d.indexMap[selection[id]];
          if (pos === undefined) return undefined;
        } else if (d.size === 1) {
          pos = 0;
        } else {
          return undefined;
        }
        offset += pos * d.stride;
      }
      var v = Array.isArray(values) ? values[offset] : values[String(offset)];
      return typeof v === "number" ? v : null;
    }

    return { get: get, dims: dims, ids: ids, raw: ds };
  };

  // ---- näitaja osakaal ----------------------------------------------

  /*
   * Näitaja osakaal protsentides: positiivne / (kõik näitaja kategooriad) × 100.
   * TAI tabelid annavad juba protsendid (summa 100), valem annab siis sama väärtuse,
   * kuid töötab ka absoluutarvudega.
   */
  TAI.indicatorShare = function (reader, config, selection) {
    var ind = config.indicator;
    // Kui valik küsib konkreetset kategooriat muutujalt, mida andmetes pole, ei tohi vastuseks anda
    // koondväärtust (lugeja ignoreerib puuduvaid dimensioone) → andmed puuduvad.
    for (var code in selection) {
      if (reader.dims[code]) continue;
      var v = config.vars[code];
      if (v && v.totalValue != null && selection[code] !== v.totalValue) return null;
    }
    var total = 0, positive = null;
    var vals = config.vars[ind.var].values;
    for (var i = 0; i < vals.length; i++) {
      var sel = Object.assign({}, selection);
      sel[ind.var] = vals[i];
      var v = reader.get(sel);
      if (v == null) return null;
      total += v;
      if (vals[i] === ind.positive) positive = v;
    }
    if (!total || positive == null) return null;
    return (positive / total) * 100;
  };

  // ---- vead ---------------------------------------------------------

  function makeError(name) {
    function E(message, details) {
      this.name = name;
      this.message = message;
      this.details = details;
      this.stack = (new Error(message)).stack;
    }
    E.prototype = Object.create(Error.prototype);
    E.prototype.constructor = E;
    return E;
  }

  /** Võrgu- või CORS-tõrge: päring ei jõudnud kohale või brauser blokeeris vastuse. */
  TAI.NetworkError = makeError("NetworkError");
  /** API vastas veakoodiga (nt 400 vale päring, 403 liiga suur päring, 429 liiga palju päringuid). */
  TAI.HttpError = makeError("HttpError");
  /** Vastus või fail ei ole loetav JSON-stat2. */
  TAI.DataError = makeError("DataError");

  /*
   * Kasutajale näidatav eestikeelne selgitus + kas faili üleslaadimine on mõistlik varuvariant.
   * `config` on valikuline — kui antud ja tabelil on config.source (nt Eurostat), kasutatakse
   * allikaspetsiifilist sõnastust; muidu vaikimisi "TAI andmebaas" (tagasiühilduvus).
   */
  TAI.describeError = function (err, config) {
    var srcLabel = (config && config.source && config.source.longLabel) || "TAI andmebaas";
    var srcParen = (config && config.source) ? " (" + config.source.label + ")" : "";
    if (err instanceof TAI.NetworkError) {
      return {
        title: "Ühendus " + srcLabel + "ga ebaõnnestus",
        text: "Päring ei jõudnud kohale. Põhjus võib olla internetiühenduses, andmebaasi" + srcParen + " ajutises " +
              "kättesaamatuses või brauseri turvapiirangus (CORS). Proovi uuesti või lae andmed failina üles.",
        offerUpload: true
      };
    }
    if (err instanceof TAI.HttpError) {
      var status = err.details && err.details.status;
      var hint = status === 429 ? " Liiga palju päringuid lühikese aja jooksul — oota veidi ja proovi uuesti."
               : status === 403 ? " Päring oli andmebaasi jaoks liiga suur."
               : status === 400 ? " Päringu vorming ei sobinud andmebaasile (tõenäoliselt muutunud tabeli struktuur)."
               : "";
      return {
        title: srcLabel + srcParen + " vastas veaga (HTTP " + status + ")",
        text: "Andmeid ei õnnestunud laadida." + hint,
        offerUpload: status !== 400
      };
    }
    if (err instanceof TAI.DataError) {
      return { title: "Andmeid ei õnnestunud lugeda", text: err.message, offerUpload: true };
    }
    return { title: "Ootamatu viga", text: (err && err.message) || String(err), offerUpload: true };
  };

  // ---- andmete laadimine --------------------------------------------

  var FETCH_TIMEOUT_MS = 20000;

  /** Ühine fetch+veakäsitlus PxWeb POST-päringu ja lihtsa GET-URL-i jaoks. */
  async function doFetch(url, init) {
    var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, FETCH_TIMEOUT_MS) : null;
    var res;
    try {
      res = await fetch(url, Object.assign({}, init, { signal: controller ? controller.signal : undefined }));
    } catch (e) {
      var msg = e && e.name === "AbortError" ? "Päring aegus (" + FETCH_TIMEOUT_MS / 1000 + " s)." : (e && e.message) || "Failed to fetch";
      throw new TAI.NetworkError(msg, { cause: e });
    } finally {
      if (timer) clearTimeout(timer);
    }
    if (!res.ok) {
      throw new TAI.HttpError("API vastas staatusega " + res.status, { status: res.status });
    }
    try {
      return await res.json();
    } catch (e) {
      throw new TAI.DataError("API vastus ei olnud korrektne JSON.");
    }
  }

  /** POST-päring TAI PxWeb API-sse; tagastab JSON-stat2 lugeja. Vead on TAI.*Error tüüpi. */
  TAI.fetchJsonStat2 = async function (config, body) {
    var json = await doFetch(TAI.apiUrl(config), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    return TAI.readJsonStat2(json);
  };

  /*
   * GET-päring suvalisest URL-ist (nt Eurostat, mille API on GET+query-string, mitte POST+body
   * nagu PxWeb) — tagastab JSON-stat lugeja. Eurostati JSON-stat v1 vastus kontrollitud 17.09.2026:
   * struktuur (dimension/category/index/label, id, size, value) ühildub otse TAI.readJsonStat2-ga.
   */
  TAI.EUROSTAT_BASE = "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/";

  TAI.fetchJsonStatUrl = async function (url) {
    var json = await doFetch(url, {});
    return TAI.readJsonStat2(json);
  };

  /*
   * Tabeli allika-URL/silt: kui config.source on määratud (nt Eurostat-tabelil), kasutatakse seda;
   * muidu vaikimisi TAI PxWeb (tagasiühilduvus olemasolevate ETU-tabelitega, mis config.source-it
   * ei määra).
   */
  TAI.sourceLabel = function (config) { return (config.source && config.source.label) || "TAI"; };
  TAI.sourceLongLabel = function (config) { return (config.source && config.source.longLabel) || "Tervise Arengu Instituut"; };
  TAI.sourceUrl = function (config) { return (config.source && config.source.url) || TAI.pxwebUrl(config); };

  /*
   * Kuvatav ühikutekst: kas lühike sufiks number otsa (config.unit, vaikimisi "%"), või kui väärtus
   * pole protsent (config.unit === "") — pikem kirjeldav fraas (config.unitLabel).
   */
  TAI.unitText = function (config) {
    if (config.unit === "") return config.unitLabel || "";
    return config.unit != null ? config.unit : "%";
  };

  /** Laeb kõik konfiguratsiooni päringud (config.queries(state)) paralleelselt. Tagastab { nimi: lugeja }.
   *  Iga päring on kas PxWeb query-objekt (POST) või lihtne URL-string (GET, nt Eurostat). */
  TAI.loadTable = async function (config, state) {
    var queries = config.queries(state || {});
    var names = Object.keys(queries);
    var readers = await Promise.all(names.map(function (name) {
      var q = queries[name];
      return typeof q === "string" ? TAI.fetchJsonStatUrl(q) : TAI.fetchJsonStat2(config, q);
    }));
    var out = {};
    names.forEach(function (name, i) { out[name] = readers[i]; });
    return out;
  };

  /**
   * Varuplaan: käsitsi alla laaditud PxWeb JSON-stat2 fail.
   * Tagastab Promise<lugeja>. Kontrollib, et fail vastaks valitud tabelile (näitaja dimensioon olemas).
   */
  TAI.readUploadedFile = function (file, config) {
    return new Promise(function (resolve, reject) {
      if (!file) { reject(new TAI.DataError("Faili ei valitud.")); return; }
      var fr = new FileReader();
      fr.onload = function () {
        var json;
        try {
          json = JSON.parse(fr.result);
        } catch (e) {
          reject(new TAI.DataError("Fail „" + file.name + "“ ei ole JSON-vormingus. Vali PxWebis salvestamisel vorming JSON-stat2."));
          return;
        }
        try {
          var reader = TAI.readJsonStat2(json);
          var seriesVarName = config && (config.seriesVar || (config.indicator && config.indicator.var));
          if (config && seriesVarName && !reader.dims[seriesVarName]) {
            throw new TAI.DataError("Fail „" + file.name + "“ ei paista olevat tabel " + config.code +
              " (puudub muutuja " + seriesVarName + ").");
          }
          var missing = config ? Object.keys(config.vars).filter(function (code) { return !reader.dims[code]; }) : [];
          if (missing.length) {
            throw new TAI.DataError("Failist „" + file.name + "“ " + (missing.length > 1 ? "puuduvad muutujad " : "puudub muutuja ") +
              missing.join(", ") + ". Vali PxWebis tabelit salvestades kõigi muutujate kõik väärtused.");
          }
          resolve(reader);
        } catch (e) {
          reject(e);
        }
      };
      fr.onerror = function () { reject(new TAI.DataError("Faili „" + file.name + "“ lugemine ebaõnnestus.")); };
      fr.readAsText(file);
    });
  };

  // ---- tooltip ------------------------------------------------------

  /*
   * Graafiku elementidel peavad olema data-label ja data-value atribuudid.
   * Töötab hiire, puute ja klaviatuuriga (element peab olema tabindex="0").
   */
  TAI.attachTooltip = function (svg, tooltipEl) {
    var holder = svg.parentElement;

    function place(x, y, target) {
      tooltipEl.textContent = target.getAttribute("data-label") + ": " + target.getAttribute("data-value");
      tooltipEl.style.left = x + "px";
      tooltipEl.style.top = y + "px";
      tooltipEl.classList.add("is-visible");
    }
    function hide() { tooltipEl.classList.remove("is-visible"); }
    function markOf(el) { return el && el.closest ? el.closest("[data-value]") : null; }

    svg.addEventListener("mousemove", function (evt) {
      var t = markOf(evt.target);
      if (!t) { hide(); return; }
      var r = holder.getBoundingClientRect();
      place(evt.clientX - r.left, evt.clientY - r.top, t);
    });
    svg.addEventListener("mouseleave", hide);
    svg.addEventListener("touchstart", function (evt) {
      var t = markOf(evt.target);
      if (!t) { hide(); return; }
      var r = holder.getBoundingClientRect();
      place(evt.touches[0].clientX - r.left, evt.touches[0].clientY - r.top, t);
    }, { passive: true });
    svg.addEventListener("focusin", function (evt) {
      var t = markOf(evt.target);
      if (!t) return;
      var r = holder.getBoundingClientRect();
      var b = t.getBoundingClientRect();
      place(b.left + b.width / 2 - r.left, b.top - r.top, t);
    });
    svg.addEventListener("focusout", hide);
  };

  // ---- abifunktsioonid ----------------------------------------------

  /** Uues aknas avanev link koos ekraanilugeja märkega. text ja href escape'itakse. */
  TAI.externalLink = function (href, text) {
    return '<a href="' + TAI.escapeHtml(href) + '" target="_blank" rel="noopener">' + TAI.escapeHtml(text) +
      ' <span aria-hidden="true">↗</span><span class="visually-hidden">(avaneb uues aknas)</span></a>';
  };

  TAI.escapeHtml = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };

  var pctFormat = new Intl.NumberFormat("et-EE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  /* 12.34 → "12,3<unit>" (eesti formaat). `unit` vaikimisi "%" (tagasiühilduvus tabelitega, mis
     config.unit ei määra). Tabelid, mille väärtus pole protsent (nt hindamisskaala 0–10), määravad
     config.unit = "" (tühi, ühik selgitatakse mujal, vt TAI.unitText) või mõne muu sufiksi. */
  TAI.formatValue = function (v, unit) { return v == null ? "–" : pctFormat.format(v) + (unit != null ? unit : "%"); };

  /** 12.34 → "12,3%" (eesti formaat). */
  TAI.formatPct = function (v) { return TAI.formatValue(v, "%"); };

  /* Muutus kahe väärtuse vahel: { diff, direction: "up" | "down" | "flat", text }. `phrase` on
     ühikusõna deltateksti lõpus (vaikimisi "protsendipunkti" — tagasiühilduvus); anna tühi string,
     kui tabelil pole sobivat lühikest ühikusõna. */
  TAI.delta = function (current, previous, phrase) {
    if (current == null || previous == null) return null;
    var diff = current - previous;
    var direction = diff > 0.05 ? "up" : diff < -0.05 ? "down" : "flat";
    var arrow = direction === "up" ? "▲" : direction === "down" ? "▼" : "→";
    var p = phrase != null ? phrase : "protsendipunkti";
    return { diff: diff, direction: direction, text: arrow + " " + pctFormat.format(Math.abs(diff)) + (p ? " " + p : "") };
  };

})(window);
