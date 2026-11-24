/*
 * Tervisekassa teenusmahud (24.11.2026): kaks aruannet samast andmefailist. Reeglid ja failid: TERVISEKASSA.md jaotis 9.
 *
 *  - TK-erialad „Psühhiaatria ja psühholoogia erialad“: kes osutas (eriala), kõik teenused.
 *  - TK-teenused „Psühhoteraapia ja psühholoogi teenused“: mida osutati (15 teenusekoodi), olenemata erialast.
 *
 * Andmed: Tervisekassa avaandmete aruanne „Tervishoiuteenuste kasutus ja kulud“ (https://tervisekassa.ee/koik-teenused),
 * Power BI väljavõtted → scripts/import-tervisekassa-psyh.ps1 → data/tervisekassa/psyh.json (failina avades psyh.js).
 * Lehe avamine Tervisekassat ei päri.
 *
 * Liitmise reeglid (importskript kontrollib „Total“ ridade ja koondfailide vastu):
 *  - isikute arvu ei liideta kunagi: iga lõige (sugu, vanuserühm, maakond, „kokku“) tuleb oma väljavõttest;
 *  - arvete arvu ei liideta teenuste vahel (üks arve võib sisaldada mitut teenust); erialade vahel on arved liidetavad;
 *  - teenuste hulk ja kulu on liidetavad.
 * Kui lõike väljavõtet pole (fail veel tegemata), liidetakse liidetavad näitajad olemasolevatest ridadest ja isikute arv jääb tühjaks.
 * Kaks lõiget korraga (nt sugu ja vanuserühm) ei ole toetatud: teade, mitte liidetud hinnang.
 * Määra (100 000 elaniku kohta) teadlikult pole: rahvaarvu nimetajaid aruandes ei ole.
 */
(function (TAI) {
  "use strict";

  var DATA_BASE = "data/tervisekassa/";

  // KOHAHOIDJAD: aastad, pooleliolev aasta, vaikeaastad ja diagnoosirühmade nimed tulevad andmefaili meta-osast (applyMeta).
  // Massiive muudetakse kohapeal, sest config.years, vars.*.values/labels ja provisionalYears jagavad neid.
  var YEARS = ["2024", "2025", "2026"];
  var PROVISIONAL = ["2026"];
  var YEAR_LABELS = YEARS.map(function (y) { return PROVISIONAL.indexOf(y) >= 0 ? y + " (pooleli)" : y; });
  var RHK_CODES = ["F00-F09", "F10-F19", "F20-F29", "F30-F39", "F40-F49", "F50-F59", "F60-F69", "F70-F79", "F80-F89", "F90-F98", "F99-F99"];
  var RHK_LABELS = RHK_CODES.slice();

  var ERIALAD = [
    { code: "psyhhiaatria", name: "Psühhiaatria", gen: "psühhiaatria", color: "var(--series-1)" },
    { code: "psyhholoogia", name: "Iseseisev psühholoogia", gen: "iseseisva psühholoogia", color: "var(--series-2)" },
    { code: "lastepsyhhiaatria", name: "Lastepsühhiaatria", gen: "lastepsühhiaatria", color: "var(--age-3)" }
  ];
  function eriala(code) { return ERIALAD.filter(function (e) { return e.code === code; })[0]; }

  var GROUPS = [
    { code: "koik", label: "Psühhoteraapia ja psühholoogi teenused (kokku)", short: "Psühhoteraapia ja psühholoogi teenused" },
    { code: "seansid", label: "Psühhoteraapia seansid (ka kaug- ja pereteraapia)", short: "Psühhoteraapia seansid" },
    { code: "kliiniline", label: "Kliinilise psühholoogi vastuvõtt (ka kaug- ja video)", short: "Kliinilise psühholoogi vastuvõtt" },
    { code: "noustaja", label: "Psühholoog-nõustaja vastuvõtt (ka kaug- ja video)", short: "Psühholoog-nõustaja vastuvõtt" }
  ];
  function group(code) { return GROUPS.filter(function (g) { return g.code === code; })[0]; }

  var AGES = ["0-4", "5-9", "10-14", "15-19", "20-24", "25-29", "30-34", "35-39", "40-44", "45-49", "50-54", "55-59",
    "60-64", "65-69", "70-74", "75-79", "80-84", "85+"];
  var COUNTIES = [
    ["harjumaa", "Harjumaa"], ["hiiumaa", "Hiiumaa"], ["ida-virumaa", "Ida-Virumaa"], ["jogevamaa", "Jõgevamaa"], ["jarvamaa", "Järvamaa"],
    ["laanemaa", "Läänemaa"], ["laane-virumaa", "Lääne-Virumaa"], ["polvamaa", "Põlvamaa"], ["parnumaa", "Pärnumaa"], ["raplamaa", "Raplamaa"],
    ["saaremaa", "Saaremaa"], ["tartumaa", "Tartumaa"], ["valgamaa", "Valgamaa"], ["viljandimaa", "Viljandimaa"], ["vorumaa", "Võrumaa"]
  ];
  function countyName(code) { var c = COUNTIES.filter(function (x) { return x[0] === code; })[0]; return c ? c[1] : code; }

  var MEASURES = {
    teenused: { label: "Teenuste hulk", one: "teenus", many: "teenust", additive: true },
    isikud: { label: "Isikute arv", one: "isik", many: "isikut", additive: false },
    arved: { label: "Arvete arv", one: "arve", many: "arvet", additive: true },
    kulu: { label: "Kulu Tervisekassale", one: "€", many: "€", unit: "€", additive: true }
  };
  var MEASURE_CODES = ["teenused", "isikud", "arved", "kulu"];

  var numberFmt = new Intl.NumberFormat("et-EE", { maximumFractionDigits: 0 });
  function formatCount(v) { return v == null ? "–" : numberFmt.format(v); }
  function isProvisional(y) { return PROVISIONAL.indexOf(y) >= 0; }
  function provisionalText() { return PROVISIONAL.length ? PROVISIONAL.join(". ja ") + ". aasta on pooleli" : ""; }
  function setIn(target, source) { target.length = 0; source.forEach(function (v) { target.push(v); }); }
  function isoToEt(iso) { var p = String(iso).split("-"); return p[2] + "." + p[1] + "." + p[0]; }
  function lc1(s) { return s.charAt(0).toLowerCase() + s.slice(1); }
  function amount(v, m) {
    var w = Math.round(Math.abs(v)) === 1 ? MEASURES[m].one : MEASURES[m].many;
    return formatCount(v) + " " + w;
  }
  function ageLabel(a) { return a.replace("-", "–"); }

  // ---- andmed ----------------------------------------------------------------

  /*
   * cell(tabel, võtmed, näitaja) → { v, s } (s = olemas | null | varjatud | puudub | fail-puudub).
   * fail-puudub: selle lõike väljavõtet pole veel (meta.puuduvad_failid); siis proovitakse liidetavat varianti (sum).
   */
  function createStore(d) {
    if (!d || !d.meta || !Array.isArray(d.eriala_aasta) || !Array.isArray(d.teenus_koond_aasta)) {
      throw new TAI.DataError("Tervisekassa teenuste andmefaili struktuur ei vasta oodatule.");
    }
    var present = {};
    (d.meta.sisendfailid || []).forEach(function (f) { present[f.tabel] = f.fail; });

    function match(row, keys) { for (var k in keys) if (row[k] !== keys[k]) return false; return true; }
    function rows(table, keys) { return (d[table] || []).filter(function (r) { return match(r, keys); }); }
    function cell(table, keys, m) {
      if (!present[table]) return { v: null, s: "fail-puudub" };
      var r = rows(table, keys);
      if (r.length !== 1) return { v: null, s: "puudub" };
      return { v: r[0][m], s: r[0][m + "_staatus"] };
    }
    /** Liidetava näitaja summa ridadest; isikuid ei liideta (null). masked = varjatud ridade arv (summa on siis alampiir). */
    function sum(table, keys, m, pred) {
      if (!MEASURES[m].additive || !present[table]) return { v: null, s: "fail-puudub" };
      var list = rows(table, keys).filter(pred || function () { return true; });
      if (!list.length) return { v: null, s: "puudub" };
      var total = 0, masked = 0;
      list.forEach(function (r) { if (r[m + "_staatus"] === "varjatud") masked++; else if (r[m] != null) total += r[m]; });
      return { v: total, s: "olemas", masked: masked, summed: true };
    }
    return {
      meta: d.meta, cell: cell, sum: sum, present: function (t) { return !!present[t]; }, fileOf: function (t) { return present[t]; },
      statusNote: isoToEt(d.meta.valjavotte_kuupaev) + " (andmed seisuga " + isoToEt(d.meta.allika_uuendus) + ")"
    };
  }

  // Failina (file://) avades ei saa JSON-it lugeda; sama sisu on skriptifailis psyh.js.
  function loadFallbackScript() {
    return new Promise(function (resolve, reject) {
      if (window.TAI_TERVISEKASSA_PSYH) { resolve(window.TAI_TERVISEKASSA_PSYH); return; }
      var s = document.createElement("script");
      s.src = DATA_BASE + "psyh.js";
      s.onload = function () { window.TAI_TERVISEKASSA_PSYH ? resolve(window.TAI_TERVISEKASSA_PSYH) : reject(new Error("psyh.js ei sisalda andmeid")); };
      s.onerror = function () { reject(new Error("psyh.js laadimine ebaõnnestus")); };
      document.head.appendChild(s);
    });
  }
  var loading = null, store = null;
  function loadStore() {
    if (!loading) {
      loading = TAI.fetchJson(DATA_BASE + "psyh.json").catch(function (err) {
        if (err instanceof TAI.DataError) throw err;
        return loadFallbackScript().catch(function () { throw err; });
      }).then(function (d) { store = createStore(d); return store; })
        .catch(function (err) { loading = null; throw err; });
    }
    return loading;
  }

  function applyMeta(meta) {
    setIn(YEARS, meta.aastad);
    setIn(PROVISIONAL, meta.pooleli_aastad || []);
    setIn(YEAR_LABELS, YEARS.map(function (y) { return isProvisional(y) ? y + " (pooleli)" : y; }));
    setIn(RHK_LABELS, RHK_CODES.map(function (c) {
      var r = (meta.rhk || []).filter(function (x) { return x.kood === c; })[0];
      return r ? r.nimi : c;
    }));
    var full = YEARS.filter(function (y) { return !isProvisional(y); });
    var obs = meta.vaikimisi_vaatlusaasta || full[full.length - 1] || YEARS[YEARS.length - 1];
    var cmp = meta.vaikimisi_vordlusaasta || (full.length > 1 ? full[full.length - 2] : obs);
    ["TK-erialad", "TK-teenused"].forEach(function (code) {
      var cfg = TAI.getTable(code);
      cfg.vars.Vaatlusaasta.totalValue = obs;
      cfg.vars.Vordlusaasta.totalValue = cmp;
    });
  }

  // ---- lõige: millisest tabelist väärtus tuleb ------------------------------------------

  /* Aktiivsed lõiked olekust (sugu, vanus, maakond); võrdluse ajal selle filtri enda väärtust ei arvestata. */
  function slices(state, ignore) {
    var s = {};
    if (state.Sugu && state.Sugu !== "0" && ignore !== "sugu") s.sugu = state.Sugu === "1" ? "mehed" : "naised";
    if (state["Vanuserühm"] && state["Vanuserühm"] !== "kokku" && ignore !== "vanus") s.vanus = state["Vanuserühm"];
    if (state.Maakond && state.Maakond !== "kokku" && ignore !== "maakond") s.maakond = countyName(state.Maakond);
    return s;
  }
  function sliceKind(s) { return Object.keys(s); }

  /*
   * Erialade aruande väärtus: eriala (kood või "kokku"), lõiked s ({ sugu | vanus | maakond }), aasta, näitaja.
   * Tagastab { v, s, table, masked?, summed? }.
   */
  function erialaValue(e, s, year, m) {
    var kinds = sliceKind(s);
    if (kinds.length > 1) return { v: null, s: "toetamata" };
    var suffix = kinds.length ? "_" + kinds[0] : "";
    var keys = { aasta: year };
    if (kinds.length) keys[kinds[0]] = s[kinds[0]];
    if (e === "kokku") {
      var t = "kokku_aasta" + suffix;
      var c = store.cell(t, keys, m);
      if (c.s !== "fail-puudub") return Object.assign(c, { table: t });
      // kokku-faili veel pole: liidetavad näitajad erialade ridadest (erialade vahel on ka arved liidetavad)
      var te = "eriala_aasta" + suffix;
      return Object.assign(store.sum(te, keys, m), { table: te });
    }
    var table = "eriala_aasta" + suffix;
    keys.eriala = eriala(e).name;
    var r = store.cell(table, keys, m);
    if (r.s === "puudub" && e === "lastepsyhhiaatria" && !store.cell("eriala_aasta", { aasta: year, eriala: keys.eriala }, m).v) r.s = "eriala-puudub";
    return Object.assign(r, { table: table });
  }

  /* Teenuste aruande väärtus: teenuserühm g, lõiked s, aasta, näitaja. Lõiked on ainult kõigi teenuste kohta. */
  function teenusValue(g, s, year, m) {
    var kinds = sliceKind(s);
    if (kinds.length > 1) return { v: null, s: "toetamata" };
    if (kinds.length && g !== "koik") return { v: null, s: "toetamata-ryhm" };
    var keys = { aasta: year };
    if (kinds.length) {
      keys[kinds[0]] = s[kinds[0]];
      var t = "teenus_koond_aasta_" + kinds[0];
      return Object.assign(store.cell(t, keys, m), { table: t });
    }
    if (g === "koik") return Object.assign(store.cell("teenus_koond_aasta", keys, m), { table: "teenus_koond_aasta" });
    var tg = "teenus_" + g + "_aasta";
    var c = store.cell(tg, keys, m);
    if (c.s !== "fail-puudub") return Object.assign(c, { table: tg });
    // teenuserühma faili veel pole: teenused ja kulu teenuste ridadest (arveid ja isikuid teenuste vahel ei liideta)
    if (m === "arved") return { v: null, s: "fail-puudub", table: tg };
    var codes = store.meta.teenused.filter(function (x) { return x.grupp === g; }).map(function (x) { return x.kood; });
    return Object.assign(store.sum("teenus_eriala_aasta", keys, m, function (r) { return codes.indexOf(r.teenus) >= 0; }), { table: "teenus_eriala_aasta" });
  }

  /* Teenuste hulk ja kulu osutaja eriala kaupa (teenuste ridadest); muud näitajad null. */
  function teenusByProvider(g, year, m) {
    if (m !== "teenused" && m !== "kulu") return null;
    var codes = store.meta.teenused.filter(function (x) { return g === "koik" || x.grupp === g; }).map(function (x) { return x.kood; });
    return ERIALAD.map(function (e) {
      var r = store.sum("teenus_eriala_aasta", { aasta: year, eriala: e.name }, m, function (x) { return codes.indexOf(x.teenus) >= 0; });
      return { e: e, v: r.v, masked: r.masked || 0 };
    }).filter(function (p) { return p.v != null; });
  }

  // ---- ühine mudeli osa ----------------------------------------------------------

  function axisMaxForCounts(values) {
    var max = Math.max.apply(null, values.filter(function (v) { return v != null; }).concat([0]));
    if (!max) return 5;
    var raw = (max * 1.1) / 5;
    var mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10));
    var steps = [1, 1.5, 2, 2.5, 3, 4, 5, 7.5, 10];
    for (var i = 0; i < steps.length; i++) if (steps[i] * mag >= raw) return steps[i] * mag * 5;
    return 10 * mag * 5;
  }

  function countDelta(current, previous, m) {
    if (current == null || previous == null) return null;
    var diff = current - previous;
    var direction = Math.round(diff) > 0 ? "up" : Math.round(diff) < 0 ? "down" : "flat";
    var arrow = direction === "up" ? "▲" : direction === "down" ? "▼" : "→";
    var pct = previous ? (Math.abs(diff) / previous) * 100 : null;
    return { diff: diff, pct: pct, direction: direction,
      text: arrow + " " + amount(Math.abs(diff), m) + (pct != null ? " (" + TAI.formatPct(pct) + ")" : "") };
  }

  function missingText(c, m) {
    if (c.s === "varjatud") return "Väärtus on allikas varjatud (alla 5)";
    if (c.s === "eriala-puudub") return "Eriala on andmetes alates 2026. aastast";
    if (c.s === "fail-puudub") return m === "isikud" ? "Isikute arv selle lõike kohta lisandub hiljem" : "Selle lõike andmed lisanduvad hiljem";
    return "Andmed puuduvad";
  }

  /* Seeriad → trend ja KPI-d. valueOf(series, year) → { v, s, table, masked? }. */
  function buildLines(model, series, valueOf) {
    var state = model.state, m = state.Naitaja, obs = model.latest, comp = model.prev;
    var used = {}, masked = false, summed = false;
    function track(c) { if (c.table) used[c.table] = true; if (c.masked) masked = true; if (c.summed) summed = true; return c; }
    model.trend = series.map(function (s) {
      return Object.assign({}, s, { points: YEARS.map(function (y) { return { year: y, value: track(valueOf(s, y)).v }; }) });
    });
    var sameYear = obs === comp, anyProvisional = isProvisional(obs) || isProvisional(comp);
    model.kpis = series.map(function (s) {
      var cur = track(valueOf(s, obs)), prev = track(valueOf(s, comp));
      return {
        label: s.label, color: s.color, valence: "neutral", year: obs, prevYear: sameYear ? null : comp,
        value: cur.v, delta: sameYear ? null : countDelta(cur.v, prev.v, m),
        note: cur.v == null ? null : sameYear ? "Vaatlus- ja võrdlusaasta on samad, seega muutust ei arvutata."
          : anyProvisional ? provisionalText() + ", seega võrdlus täisaastaga ei ole samaväärne." : null,
        cardLabel: s.cardLabel || (model.place || "Eesti") + ", " + lc1(s.label),   // place = valitud maakond
        missingText: missingText(cur, m),
        deltaRef: "võrreldes " + comp + ". aastaga" + (isProvisional(comp) ? " (pooleli)" : "")
      };
    });
    model.used = used; model.masked = masked; model.summed = summed;
  }

  /* Tulpdiagramm valitud aastal: items = [{ code, label, valueOf(series) }]. */
  function buildBars(model, title, inPhrase, varCode, note, items, sort) {
    var obs = model.latest, series = model.series;
    var rows = items.map(function (it) {
      return { code: it.code, label: it.label, values: series.map(function (s) {
        var c = it.valueOf(s); if (c.table) model.used[c.table] = true; if (c.masked || c.s === "varjatud") model.masked = true; return c.v;
      }) };
    }).filter(function (r) { return r.values.some(function (v) { return v != null; }); });
    if (!rows.length) return;
    if (sort) rows.sort(function (a, b) { return (b.values[0] == null ? -1 : b.values[0]) - (a.values[0] == null ? -1 : a.values[0]); });
    model.breakdown = { title: title, inPhrase: inPhrase, varCode: varCode, year: obs, note: note, selected: null, expandable: false,
      series: series, totals: null, tableTotals: null, groups: [{ label: null, items: rows }] };
  }

  function measureNote(m, extra) {
    return MEASURES[m].label + (MEASURES[m].unit ? " (" + MEASURES[m].unit + ")" : "") + (extra ? ". " + extra : "");
  }

  function sourceNote(model, scopeText) {
    var meta = store.meta;
    var files = Object.keys(model.used).map(function (t) { return store.fileOf(t); }).filter(Boolean);
    return "Selle vaate allikas: Tervisekassa (avaandmed), aruanne „" + meta.aruanne + "“ · " + scopeText +
      " · Väljavõte " + isoToEt(meta.valjavotte_kuupaev) + ", allika uuendus " + isoToEt(meta.allika_uuendus) +
      (files.length ? " · " + (files.length > 1 ? "Failid: " : "Fail: ") + files.join(", ") : "");
  }

  /* Kirjeldus: väärtus ja muutus iga seeria kohta, siis aruande märkused. */
  function valueSentences(model, subjectOf) {
    var m = model.state.Naitaja, obs = model.latest, comp = model.prev;
    var obsText = (isProvisional(obs) ? "poolelioleval " : "") + obs + ". aastal";
    var ml = lc1(MEASURES[m].label);
    var out = [];
    model.kpis.forEach(function (k) {
      if (k.value == null) return;
      var s = capitalizeFirst(subjectOf(k)) + ": " + ml + " oli " + obsText + " " + amount(k.value, m);
      if (k.delta) {
        s += k.delta.direction === "flat" ? ", sama palju kui " + comp + ". aastal"
          : ", " + amount(Math.abs(k.delta.diff), m) + (k.delta.pct != null ? " (" + TAI.formatPct(k.delta.pct) + ")" : "") + " " +
            (k.delta.direction === "up" ? "rohkem" : "vähem") + " kui " + comp + ". aastal";
      }
      out.push(s + ".");
    });
    return out;
  }

  function barSentence(model, what) {
    var b = model.breakdown;
    if (!b || model.series.length !== 1) return null;
    var valid = b.groups[0].items.filter(function (it) { return it.values[0] != null; })
      .slice().sort(function (a, c) { return c.values[0] - a.values[0]; });
    if (valid.length < 2) return null;
    return capitalizeFirst(what) + " oli see suurim: " + valid[0].label + " (" + formatCount(valid[0].values[0]) + "), järgmine " +
      valid[1].label + " (" + formatCount(valid[1].values[0]) + ").";
  }
  function capitalizeFirst(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  function closingSentences(model, extra) {
    var state = model.state, m = state.Naitaja, obs = model.latest, comp = model.prev;
    var out = (extra || []).slice();
    if (isProvisional(obs) || isProvisional(comp)) {
      out.push(obs === comp ? provisionalText() + "." : provisionalText() + ", seega võrdlus täisaastaga ei ole samaväärne.");
    }
    if (m === "isikud") out.push("Isikuid ei saa liita aastate, erialade, teenuste ega rühmade vahel.");
    if (model.summed) out.push("Osa arve on lõike väljavõtte puudumisel liidetud teenuste või erialade ridadest.");
    out.push("Teenuste mahu muutus võib peegeldada teenuste pakkumist, rahastamist ja abi otsimist; see ei näita, kui paljudel inimestel on psüühikahäire.");
    if (model.masked) out.push("Osa väikeseid väärtusi (alla 5) on allikas varjatud.");
    return out;
  }

  function unsupportedNotice(kind) {
    if (kind === "toetamata-ryhm") return "Soo, vanuserühma ja maakonna lõige on olemas ainult kõigi psühhoteraapia ja psühholoogi teenuste kohta, mitte üksiku teenuserühma kohta. Vali teenuserühmaks „Psühhoteraapia ja psühholoogi teenused (kokku)“ või lõikeks „Kokku“.";
    return "Selle kombinatsiooni koondandmed puuduvad: korraga saab valida ainult ühe lõike (sugu, vanuserühm või maakond). Isikute arvu ei saa lõigetest kokku liita, seega liidetud hinnangut ei näidata.";
  }

  // ---- ühised muutujad ------------------------------------------------------------

  function commonVars() {
    return {
      Aasta: { label: "Aasta", values: YEARS, labels: YEAR_LABELS },
      Naitaja: {
        label: "Näitaja", param: "naitaja", values: MEASURE_CODES,
        labels: MEASURE_CODES.map(function (c) { return MEASURES[c].label + (MEASURES[c].unit ? " (" + MEASURES[c].unit + ")" : ""); }),
        totalValue: "teenused"
      },
      Sugu: { label: "Sugu", values: ["0", "1", "2"], labels: ["Kokku", "Mehed", "Naised"], totalValue: "0" },
      "Vanuserühm": { label: "Vanuserühm", param: "vanus", values: ["kokku"].concat(AGES), labels: ["Kokku"].concat(AGES.map(ageLabel)), totalValue: "kokku" },
      Maakond: { label: "Maakond", param: "maakond", values: ["kokku"].concat(COUNTIES.map(function (c) { return c[0]; })),
        labels: ["Eesti kokku"].concat(COUNTIES.map(function (c) { return c[1]; })), totalValue: "kokku" },
      // totalValue siin on kohahoidja, applyMeta asendab selle andmefailist.
      Vaatlusaasta: { label: "Vaatlusaasta", values: YEARS, labels: YEAR_LABELS, totalValue: "2025" },
      Vordlusaasta: { label: "Võrdlusaasta", values: YEARS, labels: YEAR_LABELS, totalValue: "2024" },
      // tulpdiagrammi teljed (mitte filtrid)
      "Diagnoosirühm": { label: "Diagnoosirühm (RHK-10)", values: RHK_CODES, labels: RHK_LABELS },
      Osutaja: { label: "Eriala", values: ERIALAD.map(function (e) { return e.name; }), labels: ERIALAD.map(function (e) { return e.name; }) },
      Vanus: { label: "Vanuserühm", values: AGES.concat(["teadmata"]), labels: AGES.map(ageLabel).concat(["Vanus teadmata"]) },
      Maakonnad: { label: "Maakond", values: COUNTIES.map(function (c) { return c[1]; }).concat(["teadmata"]),
        labels: COUNTIES.map(function (c) { return c[1]; }).concat(["Maakond teadmata"]) }
    };
  }

  function ageBars(model, valueOfAge) {
    buildBars(model, "Vanuserühmade võrdlus", "vanuserühmade kaupa", "Vanus",
      measureNote(model.state.Naitaja, "Allika 5-aastased rühmad; rühmi ei liideta."),
      AGES.concat(["teadmata"]).map(function (a) {
        return { code: a, label: a === "teadmata" ? "Vanus teadmata" : ageLabel(a), valueOf: function (s) { return valueOfAge(s, a); } };
      }), false);
  }
  function countyBars(model, valueOfCounty) {
    buildBars(model, "Maakondade võrdlus", "maakondade kaupa", "Maakonnad",
      measureNote(model.state.Naitaja, "Patsiendi maakond; ainult arvud, mitte määrad elaniku kohta."),
      COUNTIES.map(function (c) { return c[1]; }).concat(["teadmata"]).map(function (k) {
        return { code: k, label: k === "teadmata" ? "Maakond teadmata" : k, valueOf: function (s) { return valueOfCounty(s, k); } };
      }), true);
  }

  var commonFootnotes = function (meta) {
    return [
      "Tervisekassa avaldab need andmed ise oma aruandes „" + meta.aruanne + "“; siin on samad arvud esitatud näidikulauale sobivas ülesehituses. " +
        "Andmed põhinevad makstud arvete kuupäevadel. Eriala on arve finantskonto eriala.",
      "Isikute arv on kordumatud isikud valitud aastal ja lõikes. Isikuid ei liideta aastate, erialade, teenuste, rühmade ega maakondade vahel. " +
        "Arvete arvu ei liideta teenuste vahel (üks arve võib sisaldada mitut teenust). Teenuste hulk ei ole inimeste ega visiitide arv; " +
        "teenuste hulk ja kulu on lehel ümardatud täisarvuks.",
      "Korraga saab valida ühe lõike (sugu, vanuserühm või maakond). Vanuserühmad on allika 5-aastased rühmad. Maakond on patsiendi maakond. " +
        "Väärtused alla 5 on allikas varjatud. Määra 100 000 elaniku kohta ei arvutata, sest rahvaarvu nimetajaid aruandes ei ole.",
      (PROVISIONAL.length ? provisionalText() + ". " : "") + "Allika uuendus " + isoToEt(meta.allika_uuendus) + ", väljavõte " + isoToEt(meta.valjavotte_kuupaev) +
        ". Andmed on lehel valmis failidena, lehe avamine Tervisekassa aruannet ei päri."
    ];
  };

  function source() {
    return {
      label: "Tervisekassa",
      longLabel: "Tervisekassa (avaandmed)",
      url: "https://tervisekassa.ee/koik-teenused",
      staticData: true,
      statusLine: function (link, note) {
        return TAI.escapeHtml("Andmed pärinevad aruandest Tervishoiuteenuste kasutus ja kulud · Fail eksporditud ") +
          link("Tervisekassa avaandmetest") + (note ? " " + TAI.escapeHtml(note) : "");
      },
      listLabel: "Allikas: Tervisekassa (avaandmed)",
      linkText: "aruanne „Tervishoiuteenuste kasutus ja kulud“",
      tableLinkText: "Vaata algset aruannet Tervisekassa lehel"
    };
  }

  function trendNote() {
    return (PROVISIONAL.length ? "Katkendjoon ja seest tühi punkt: " + provisionalText() + " ega ole täisaastatega samaväärne. " : "") +
      "Iga aasta on eraldi andmepunkt, aastaid ei liideta.";
  }

  // =================================================================================
  // TK-erialad: „Psühhiaatria ja psühholoogia erialad“
  // =================================================================================

  var ERIALA_OPTIONS = [["kokku", "Psühhiaatrid ja psühholoogid (kokku)"]].concat(ERIALAD.map(function (e) {
    return [e.code, e.name + (e.code === "lastepsyhhiaatria" ? " (andmetes alates 2026)" : "")];
  }));

  function erialaLabel(code) { return code === "kokku" ? "Psühhiaatrid ja psühholoogid" : eriala(code).name; }

  function buildModelErialad(config, data, state) {
    var m = state.Naitaja, obs = state.Vaatlusaasta, comp = state.Vordlusaasta;
    var model = { config: config, state: state, latest: obs, prev: comp, trend: null, kpis: [], breakdown: null };
    var ignore = state.compareSexes ? "sugu" : state.compareAges ? "vanus" : state.compareCounty ? "maakond" : null;
    var s = slices(state, ignore);
    if (sliceKind(s).length > 1) { model.notice = unsupportedNotice("toetamata"); return model; }

    var e = state.Eriala;
    var series;
    if (state.compareSpec) {
      series = ERIALAD.map(function (x) { return { code: x.code, e: x.code, label: x.name, color: x.color }; });
    } else if (state.compareSexes) {
      if (sliceKind(s).length) { model.notice = unsupportedNotice("toetamata"); return model; }
      series = [{ code: "1", e: e, sugu: "mehed", label: "Mehed", color: "var(--series-1)", cardLabel: erialaLabel(e) + ", mehed" },
                { code: "2", e: e, sugu: "naised", label: "Naised", color: "var(--series-2)", cardLabel: erialaLabel(e) + ", naised" }];
    } else {
      series = [{ code: e, e: e, label: erialaLabel(e), color: "var(--series-1)" }];
    }
    model.series = series;
    model.place = s.maakond || null;

    function sl(x) { var o = Object.assign({}, s); if (x.sugu) o.sugu = x.sugu; return o; }
    buildLines(model, series, function (x, y) { return erialaValue(x.e, sl(x), y, m); });

    if (state.compareAges) {
      ageBars(model, function (x, a) { var o = sl(x); o.vanus = a; return erialaValue(x.e, o, obs, m); });
    } else if (state.compareCounty) {
      countyBars(model, function (x, k) { var o = sl(x); o.maakond = k; return erialaValue(x.e, o, obs, m); });
    } else if (!sliceKind(s).length && !state.compareSexes) {
      // diagnoosirühmad (ainult F00–F99 arved): eriala failist või kokku failist
      buildBars(model, "Diagnoosirühmad (F-diagnoosiga arved)", "diagnoosirühmade kaupa", "Diagnoosirühm",
        measureNote(m, "Ainult arved, mille diagnoos on F00–F99; rühmi ei liideta valdkonna kogumahuks."),
        RHK_CODES.map(function (code) {
          return { code: code, label: TAI.labelOf(config, "Diagnoosirühm", code), valueOf: function (x) {
            if (x.e === "kokku") {
              var c = store.cell("kokku_aasta_rhk", { aasta: obs, rhk: code }, m);
              if (c.s !== "fail-puudub") return Object.assign(c, { table: "kokku_aasta_rhk" });
              return { v: null, s: "fail-puudub" };   // erialade summat ei tehta: isikud kattuvad ja F-fail on eraldi lõige
            }
            return Object.assign(store.cell("eriala_aasta_rhk", { aasta: obs, rhk: code, eriala: eriala(x.e).name }, m), { table: "eriala_aasta_rhk" });
          } };
        }), series.length === 1);
    }

    var scope = "Eriala: " + (state.compareSpec ? ERIALAD.map(function (x) { return x.name; }).join(", ") : erialaLabel(e) + (e === "kokku" ? " (" + ERIALAD.map(function (x) { return x.name; }).join(", ") + ")" : ""));
    model.sourceNote = sourceNote(model, scope + ", kõik teenused");
    return model;
  }

  function calloutErialad(model) {
    var state = model.state, e = state.Eriala;
    var sentences = valueSentences(model, function (k) { return k.cardLabel.replace(/^Eesti, /, ""); });
    if (!sentences.length && e === "lastepsyhhiaatria" && !state.compareSpec) sentences.push("Lastepsühhiaatria on andmetes eraldi erialana alates 2026. aastast; varasemate aastate kohta väärtusi pole.");
    var bar = model.breakdown;
    if (bar && bar.varCode === "Diagnoosirühm") { var bs = barSentence(model, "F-diagnoosiga arvetel"); if (bs) sentences.push(bs); }
    if (bar && bar.varCode === "Vanus") { var va = barSentence(model, "vanuserühmadest"); if (va) sentences.push(va + " Rühmad on 5-aastased."); }
    if (bar && bar.varCode === "Maakonnad") { var ma = barSentence(model, "maakondadest"); if (ma) sentences.push(ma + " Arvud sõltuvad maakonna rahvaarvust, määrasid aruandes pole."); }
    var extra = [];
    if ((e === "psyhhiaatria" || e === "kokku" || state.compareSpec) && (model.latest === "2026" || model.prev === "2026")) {
      extra.push("2026. aastal on lastepsühhiaatria andmetes eraldi erialana; psühhiaatria 2026. aasta arvud seda ei sisalda.");
    }
    return sentences.concat(closingSentences(model, extra)).join(" ");
  }

  TAI.registerTable({
    code: "TK-erialad",
    title: "Psühhiaatria ja psühholoogia erialad",
    fullTitle: "Psühhiaatria ja psühholoogia erialad: teenusmahud",
    description: "Tervisekassa rahastatud teenused psühhiaatria, lastepsühhiaatria ja iseseisva psühholoogia erialal: isikud, arved, teenuste hulk ja kulu aastate kaupa.",
    eyebrow: "Tervisekassa (avaandmed) · Tervishoiuteenuste kasutus ja kulud",
    group: "Tervisekassa (avaandmed)",
    ai: {
      profile: "tervisekassaTeenused",
      notes: [
        "Eriala on arve finantskonto eriala; vaates on eriala kõik teenused (vastuvõtud, haiglaravi, uuringud jm), mitte ainult psühhoteraapia.",
        "„Psühhiaatrid ja psühholoogid (kokku)“ on kolm eriala kokku; isikud on selles valikus kordumatud (sama inimene loetakse üks kord).",
        "Lastepsühhiaatria on andmetes eraldi erialana alates 2026. aastast; psühhiaatria 2026. aasta arvud seda ei sisalda. Ära tõlgenda seda psühhiaatria mahu langusena."
      ]
    },
    source: source(),
    years: YEARS,
    provisionalYears: PROVISIONAL,
    yearVar: "Aasta",
    seriesVar: "Eriala",
    measureLabel: function (state) { return MEASURES[state.Naitaja || "teenused"].label; },
    unit: function (state) { return state.Naitaja === "kulu" ? "€" : ""; },
    unitLabel: "",
    formatValue: formatCount,
    axisMax: axisMaxForCounts,
    vars: Object.assign(commonVars(), {
      Eriala: { label: "Eriala", param: "eriala", values: ERIALA_OPTIONS.map(function (o) { return o[0]; }),
        labels: ERIALA_OPTIONS.map(function (o) { return o[1]; }), totalValue: "kokku" }
    }),
    filters: ["Eriala", "Naitaja", "Sugu", "Vanuserühm", "Maakond", "Vaatlusaasta", "Vordlusaasta"],
    sliceSkip: ["Vaatlusaasta", "Vordlusaasta"],
    compare: {
      Eriala: { kind: "eriala", values: ERIALAD.map(function (x) { return x.code; }) },
      Sugu: "sugu",
      "Vanuserühm": { kind: "vanus", bars: true },
      Maakond: { kind: "maakond", bars: true }
    },
    views: { trend: true, breakdown: { var: "Diagnoosirühm" } },
    trendNote: trendNote,
    prepare: function () { return loadStore().then(function (st) { applyMeta(st.meta); }); },
    applyMeta: applyMeta,
    loadData: function () { return loadStore().then(function (st) { return { store: st }; }); },
    buildModel: buildModelErialad,
    calloutText: calloutErialad,
    footnotes: function (data) {
      var meta = data.store.meta;
      return [commonFootnotes(meta)[0],
        "Vaates on eriala kõik teenused (vastuvõtud, haiglaravi, uuringud jm). „Psühhiaatrid ja psühholoogid (kokku)“ on psühhiaatria, " +
          "lastepsühhiaatria ja iseseisva psühholoogia eriala kokku; isikud on selles valikus kordumatud.",
        "Diagnoosirühmad põhinevad arvele märgitud RHK-10 diagnoosil (F00–F99) ega näita teenuse põhjust. Osa teenuseid on arvel muu diagnoosiga, " +
          "seega diagnoosirühmade arvud on väiksemad kui eriala kogumaht. Lastepsühhiaatria on andmetes eraldi erialana alates 2026. aastast."
      ].concat(commonFootnotes(meta).slice(1));
    }
  });

  // =================================================================================
  // TK-teenused: „Psühhoteraapia ja psühholoogi teenused“
  // =================================================================================

  function buildModelTeenused(config, data, state) {
    var m = state.Naitaja, obs = state.Vaatlusaasta, comp = state.Vordlusaasta;
    var model = { config: config, state: state, latest: obs, prev: comp, trend: null, kpis: [], breakdown: null };
    var ignore = state.compareSexes ? "sugu" : state.compareAges ? "vanus" : state.compareCounty ? "maakond" : null;
    var s = slices(state, ignore);
    var g = state["Teenuserühm"];
    if (sliceKind(s).length > 1) { model.notice = unsupportedNotice("toetamata"); return model; }
    if ((sliceKind(s).length || ignore) && g !== "koik") { model.notice = unsupportedNotice("toetamata-ryhm"); return model; }

    var series;
    if (state.compareSexes) {
      series = [{ code: "1", sugu: "mehed", label: "Mehed", color: "var(--series-1)", cardLabel: group(g).short + ", mehed" },
                { code: "2", sugu: "naised", label: "Naised", color: "var(--series-2)", cardLabel: group(g).short + ", naised" }];
    } else {
      series = [{ code: g, label: group(g).short, color: "var(--series-1)" }];
    }
    model.series = series;
    model.place = s.maakond || null;
    function sl(x) { var o = Object.assign({}, s); if (x.sugu) o.sugu = x.sugu; return o; }
    buildLines(model, series, function (x, y) { return teenusValue(g, sl(x), y, m); });

    if (state.compareAges) {
      ageBars(model, function (x, a) { var o = sl(x); o.vanus = a; return teenusValue(g, o, obs, m); });
    } else if (state.compareCounty) {
      countyBars(model, function (x, k) { var o = sl(x); o.maakond = k; return teenusValue(g, o, obs, m); });
    } else if (!sliceKind(s).length && !state.compareSexes) {
      var prov = teenusByProvider(g, obs, m);
      if (prov && prov.length) {
        var total = model.kpis[0].value;
        model.providerShares = prov.map(function (p) { return { e: p.e, v: p.v, pct: total ? (p.v / total) * 100 : null }; });
        buildBars(model, "Osutaja eriala", "erialade kaupa", "Osutaja",
          measureNote(m, "Erialade summa on valitud teenuste kokkuvõte."),
          prov.map(function (p) { return { code: p.e.name, label: p.e.name, valueOf: function () { return { v: p.v, s: "olemas", table: "teenus_eriala_aasta", masked: p.masked }; } }; }), false);
        if (model.breakdown) model.breakdown.tableTotals = [total];
      } else {
        model.noBreakdownReason = m === "isikud"
          ? "Isikute arvu erialade kaupa ei näidata: sama isik võib saada teenust mitmel erialal."
          : "Arvete arvu erialade kaupa ei näidata: üks arve võib sisaldada mitut teenust, seega teenuste kaupa arveid kokku liita ei saa.";
      }
    }
    model.sourceNote = sourceNote(model, "Teenused: " + group(g).label + " · Erialad: " + ERIALAD.map(function (x) { return x.name; }).join(", "));
    return model;
  }

  function calloutTeenused(model) {
    var sentences = valueSentences(model, function (k) { return k.cardLabel.replace(/^Eesti, /, ""); });
    if (model.providerShares) {
      var parts = model.providerShares.filter(function (p) { return p.pct != null && p.v > 0; })
        .map(function (p) { return TAI.formatPct(p.pct) + " " + p.e.gen; });
      if (parts.length > 1) sentences.push("Sellest " + parts.slice(0, -1).join(", ") + " ja " + parts[parts.length - 1] + " erialal.");
    }
    if (model.noBreakdownReason) sentences.push(model.noBreakdownReason);
    var bar = model.breakdown;
    if (bar && bar.varCode === "Vanus") { var va = barSentence(model, "vanuserühmadest"); if (va) sentences.push(va + " Rühmad on 5-aastased."); }
    if (bar && bar.varCode === "Maakonnad") { var ma = barSentence(model, "maakondadest"); if (ma) sentences.push(ma + " Arvud sõltuvad maakonna rahvaarvust, määrasid aruandes pole."); }
    return sentences.concat(closingSentences(model)).join(" ");
  }

  TAI.registerTable({
    code: "TK-teenused",
    title: "Psühhoteraapia ja psühholoogi teenused",
    fullTitle: "Psühhoteraapia ja psühholoogi teenused: teenusmahud",
    description: "Tervisekassa rahastatud psühhoteraapia seansid ning kliinilise psühholoogi ja psühholoog-nõustaja vastuvõtud (15 teenusekoodi), olenemata erialast: isikud, arved, teenuste hulk ja kulu.",
    eyebrow: "Tervisekassa (avaandmed) · Tervishoiuteenuste kasutus ja kulud",
    group: "Tervisekassa (avaandmed)",
    ai: {
      profile: "tervisekassaTeenused",
      notes: [
        "Vaade on 15 teenusekoodi (7601–7640: psühhoteraapia seansid, kliinilise psühholoogi ja psühholoog-nõustaja vastuvõtud) psühhiaatria, lastepsühhiaatria ja iseseisva psühholoogia erialal kokku; isikud ja arved on kordumatud.",
        "Teenuserühma valikul on isikud ja arved selle rühma kordumatud väärtused; teenuserühmi ei liideta."
      ]
    },
    source: source(),
    years: YEARS,
    provisionalYears: PROVISIONAL,
    yearVar: "Aasta",
    seriesVar: "Teenuserühm",
    measureLabel: function (state) { return MEASURES[state.Naitaja || "teenused"].label; },
    unit: function (state) { return state.Naitaja === "kulu" ? "€" : ""; },
    unitLabel: "",
    formatValue: formatCount,
    axisMax: axisMaxForCounts,
    vars: Object.assign(commonVars(), {
      "Teenuserühm": { label: "Teenuserühm", param: "teenuseryhm", values: GROUPS.map(function (x) { return x.code; }),
        labels: GROUPS.map(function (x) { return x.label; }), totalValue: "koik" }
    }),
    filters: ["Teenuserühm", "Naitaja", "Sugu", "Vanuserühm", "Maakond", "Vaatlusaasta", "Vordlusaasta"],
    sliceSkip: ["Vaatlusaasta", "Vordlusaasta"],
    compare: { Sugu: "sugu", "Vanuserühm": { kind: "vanus", bars: true }, Maakond: { kind: "maakond", bars: true } },
    views: { trend: true, breakdown: { var: "Osutaja" } },
    trendNote: trendNote,
    prepare: function () { return loadStore().then(function (st) { applyMeta(st.meta); }); },
    applyMeta: applyMeta,
    loadData: function () { return loadStore().then(function (st) { return { store: st }; }); },
    buildModel: buildModelTeenused,
    calloutText: calloutTeenused,
    footnotes: function (data) {
      var meta = data.store.meta;
      var codes = meta.teenused.map(function (t) { return t.kood; }).join(", ");
      return [commonFootnotes(meta)[0],
        "Vaates on teenusekoodid " + codes + " (psühhoteraapia seansid, kliinilise psühholoogi ja psühholoog-nõustaja vastuvõtud, ka kaug- ja " +
          "videoteenused) psühhiaatria, lastepsühhiaatria ja iseseisva psühholoogia erialal kokku. Teenuserühma valikul on isikud ja arved selle rühma " +
          "kordumatud väärtused; soo, vanuserühma ja maakonna lõige on olemas ainult kõigi teenuste kohta."
      ].concat(commonFootnotes(meta).slice(1));
    }
  });
})(window.TAI);
