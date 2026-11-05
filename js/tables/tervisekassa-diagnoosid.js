/*
 * Tervisekassa aruanne „Diagnoosid raviandmetes“ (piloot: depressioon F32/F33). Reeglid: TERVISEKASSA.md p. 3–4.
 *
 * Aruanne on iseseisev: oma filtrid, klassifikaatorid ja vaikevalikud. Ühine on ainult kuvamine: KPI-d,
 * graafikud ja tabel tulevad module.js üldmudeli renderdusest, siin on ainult andmemudel ja callout.
 * Andmed tulevad valmis JSON-failidest (tervisekassa-adapter.js), Tervisekassa poole lehe avamisel ei pöörduta.
 *
 * Määra (100 000 elaniku kohta) siin teadlikult pole: rahvaarvu nimetajad pole kinnitatud.
 */
(function (TAI) {
  "use strict";

  var TK = TAI.tervisekassa;

  // KOHAHOIDJAD: aastad, pooleliolev aasta ja vaikeaastad tulevad meta-failist (config.prepare → applyMeta), kui aruanne avatakse.
  // Massiive muudetakse kohapeal, sest config.years, vars.*.values/labels ja provisionalYears jagavad neid.
  var YEARS = ["2021", "2022", "2023", "2024", "2025", "2026"];
  var PROVISIONAL = ["2026"];
  var YEAR_LABELS = YEARS.map(function (y) { return PROVISIONAL.indexOf(y) >= 0 ? y + " (pooleli)" : y; });
  var AGE_VALUES = ["kokku", "0-18", "19-24", "25-34", "35-64", "65+"];
  // Vanuserühmade piirid on allika omad (0–18 ei ole 0–17).
  var AGE_LABELS = ["Kõik vanused", "0–18", "19–24", "25–34", "35–64", "65+"];
  var DIAGNOSES = {
    F32F33: { short: "F32 + F33", label: "F32 + F33 (ühine valik)" },
    F32: { short: "F32", label: "F32 Depressiivne episood" },
    F33: { short: "F33", label: "F33 Korduv depressiivne häire" }
  };
  var SEX_ID = { "0": "kokku", "1": "mehed", "2": "naised" };

  var numberFmt = new Intl.NumberFormat("et-EE");
  function formatCount(v) { return v == null ? "–" : numberFmt.format(v); }
  function isProvisional(y) { return PROVISIONAL.indexOf(y) >= 0; }
  /** "2026. aasta on pooleli" (mitu: "2026. ja 2027. aasta on pooleli"); tühi, kui pooleliolevat aastat pole. */
  function provisionalText() { return PROVISIONAL.length ? PROVISIONAL.join(". ja ") + ". aasta on pooleli" : ""; }

  function setIn(target, source) { target.length = 0; source.forEach(function (v) { target.push(v); }); }

  /*
   * Meta-failist (importskript tuletab need väljavõtte failidest): aastad, pooleliolev aasta (= väljavõtte aasta) ja vaikeaastad
   * (viimane täisaasta ja sellele eelnev). Nii lisab uus väljavõte aasta ilma koodimuudatuseta ja libisemine (2026 täis, 2027
   * pooleli) toimub ise. Kutsutakse enne filtrite ja oleku loomist (config.prepare, app.js).
   */
  function applyMeta(meta) {
    var cfg = TAI.getTable("TK-diagnoosid");
    setIn(YEARS, meta.aastad);
    setIn(PROVISIONAL, meta.pooleli_aastad || []);
    setIn(YEAR_LABELS, YEARS.map(function (y) { return isProvisional(y) ? y + " (pooleli)" : y; }));
    var full = YEARS.filter(function (y) { return !isProvisional(y); });
    var obs = meta.vaikimisi_vaatlusaasta || full[full.length - 1] || YEARS[YEARS.length - 1];
    var cmp = meta.vaikimisi_vordlusaasta || (full.length > 1 ? full[full.length - 2] : obs);
    cfg.vars.Vaatlusaasta.totalValue = obs;
    cfg.vars.Vordlusaasta.totalValue = cmp;
  }
  function personWord(n) { return Math.abs(n) === 1 ? "isik" : "isikut"; }

  /** Telje ülempiir arvudele: 5 sammu, sammuks ümar arv (nt 61 819 → 75 000). */
  function axisMaxForCounts(values) {
    var max = Math.max.apply(null, values.filter(function (v) { return v != null; }).concat([0]));
    if (!max) return 5;
    var raw = (max * 1.1) / 5;
    var mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10));
    var steps = [1, 1.5, 2, 2.5, 3, 4, 5, 7.5, 10];
    for (var i = 0; i < steps.length; i++) if (steps[i] * mag >= raw) return steps[i] * mag * 5;
    return 10 * mag * 5;
  }

  /*
   * Seeriad: soo võrdlus (mehed, naised), vanuserühmade võrdlus (5 rühma, iga oma värv --age-1…5, valitud soo piires)
   * või üks seeria. Korraga on sees ainult üks võrdlus (app.js).
   */
  function seriesOf(state) {
    if (state.compareSexes) {
      return [
        { code: "1", sugu: "mehed", label: "Mehed", plural: "mehi", color: "var(--series-1)" },
        { code: "2", sugu: "naised", label: "Naised", plural: "naisi", color: "var(--series-2)" }
      ];
    }
    if (state.compareAges) {
      return AGE_VALUES.slice(1).map(function (code, i) {
        return { code: code, sugu: SEX_ID[state.Sugu], age: code, label: AGE_LABELS[i + 1], color: "var(--age-" + (i + 1) + ")" };
      });
    }
    var label = TAI.labelOf(TAI.getTable("TK-diagnoosid"), "Sugu", state.Sugu);
    return [{ code: state.Sugu, sugu: SEX_ID[state.Sugu], label: label, color: "var(--series-1)" }];
  }

  /* KPI sildil on ainult üksus ja see, mis kaarte eristab (sugu või vanuserühm võrdlusel); diagnoos, sugu ja vanuserühm on
     valitud lõike real kaardi sees või kaardirea kasti ülaosas (kasutaja otsus 05.11.2026, module.js TAI.sliceParts). */
  function cardLabel(state, series) {
    var parts = ["Eesti"];
    if (state.compareSexes) parts.push(series.label.toLowerCase());
    if (series.age) parts.push(series.label);
    return parts.join(", ");
  }

  function missingText(staatus) {
    return staatus === "varjatud" ? "Väärtus on allikas varjatud" : "Andmed puuduvad";
  }

  /** Muutus: { diff, pct, direction, text }; arv ja protsent, hinnanguta (ei „parem“ ega „halvem“). */
  function countDelta(current, previous) {
    if (current == null || previous == null) return null;
    var diff = current - previous;
    var direction = diff > 0 ? "up" : diff < 0 ? "down" : "flat";
    var arrow = direction === "up" ? "▲" : direction === "down" ? "▼" : "→";
    var pct = previous ? (Math.abs(diff) / previous) * 100 : null;
    return {
      diff: diff, pct: pct, direction: direction,
      text: arrow + " " + formatCount(Math.abs(diff)) + " " + personWord(diff) + (pct != null ? " (" + TAI.formatPct(pct) + ")" : "")
    };
  }

  function buildModel(config, data, state) {
    var store = data.store;
    var meta = store.meta;
    var diag = state.Diagnoos, age = state["Vanuserühm"];
    var obs = state.Vaatlusaasta, comp = state.Vordlusaasta;
    var series = seriesOf(state);
    var model = { config: config, state: state, series: series, latest: obs, prev: comp, trend: null, kpis: [], breakdown: null };

    var unsupported = series.some(function (s) { return !store.isSupported(diag, s.sugu); });
    if (unsupported) {
      model.notice = TK.UNSUPPORTED_MESSAGE + ". Soo järgi on väljavõte olemas ainult ühise valiku F32 + F33 kohta; " +
        "F32 ja F33 eraldi on olemas ainult valikuga „Kokku“. Puuduvat väärtust ei tuletata teistest arvudest.";
      return model;
    }

    function persons(sugu, aasta, vanus, diagnoos) {
      return store.get({ diagnoos: diagnoos || diag, sugu: sugu, aasta: aasta, vanuseryhm: vanus || age, naitaja: "isikud" });
    }

    // s.age on ainult vanuserühmade võrdluse seeriatel; muidu kehtib filtri vanuserühm
    model.trend = series.map(function (s) {
      return Object.assign({}, s, {
        points: YEARS.map(function (y) { return { year: y, value: persons(s.sugu, y, s.age).vaartus }; })
      });
    });

    var sameYear = obs === comp;
    var anyProvisional = isProvisional(obs) || isProvisional(comp);
    model.kpis = series.map(function (s) {
      var current = persons(s.sugu, obs, s.age);
      var delta = sameYear ? null : countDelta(current.vaartus, persons(s.sugu, comp, s.age).vaartus);
      var note = sameYear ? "Vaatlus- ja võrdlusaasta on samad, seega muutust ei arvutata."
        : anyProvisional ? provisionalText() + ", seega võrdlus täisaastaga ei ole samaväärne." : null;
      return {
        label: s.label, ageLabel: s.age ? s.label : null, color: s.color, valence: "neutral", year: obs, prevYear: sameYear ? null : comp,
        value: current.vaartus, delta: delta, note: current.vaartus == null ? null : note,
        cardLabel: cardLabel(state, s),
        missingText: missingText(current.staatus),
        deltaRef: "võrreldes " + comp + ". aastaga" + (isProvisional(comp) ? " (pooleli)" : "")
      };
    });

    // Vanuserühmade võrdluse ajal tulpdiagrammi pole (kasutaja otsus 05.11.2026): sama info on joontel ja KPI-kaartidel.
    if (!state.compareAges) {
      model.breakdown = {
        title: "Vanuserühmade võrdlus",
        inPhrase: "vanuserühmades",
        varCode: "Vanuserühm",
        year: obs,
        note: "Isikute arv. Vanus on 31.12 seisuga.",   // aasta on valitud lõike real (module.js TAI.breakdownSlice)
        selected: age !== "kokku" ? age : null,
        expandable: false,
        series: series,
        totals: null, // koond on rühmade summa: võrdlusjoon venitaks telge ja suruks tulbad kokku
        tableTotals: series.map(function (s) { return persons(s.sugu, obs, "kokku").vaartus; }),
        groups: [{
          label: null,
          items: AGE_VALUES.slice(1).map(function (code) {
            return {
              code: code,
              label: TAI.labelOf(config, "Vanuserühm", code),
              values: series.map(function (s) { return persons(s.sugu, obs, code).vaartus; })
            };
          })
        }]
      };
    }

    // F32 ja F33 eraldi on olemas ainult soo koondi kohta, seega kattuvust saab näidata ainult siis.
    if (!state.compareSexes && !state.compareAges && state.Sugu === "0") {
      model.overlap = {
        f32: persons("kokku", obs, age, "F32").vaartus,
        f33: persons("kokku", obs, age, "F33").vaartus,
        joint: persons("kokku", obs, age, "F32F33").vaartus
      };
    }

    model.hasGaps = series.some(function (s) {
      return YEARS.some(function (y) {
        return AGE_VALUES.some(function (a) {
          var st = persons(s.sugu, y, a).staatus;
          return st === "puudub" || st === "varjatud";
        });
      });
    });

    // Allikakirjeldus sõltub valikust: täpne diagnooside hulk, sood ja väljavõtte failid.
    var diagMeta = meta.diagnoosivalikud.filter(function (d) { return d.id === diag; })[0];
    var files = meta.sisendfailid.filter(function (f) {
      return f.diagnoos_id === diag && series.some(function (s) { return s.sugu === f.sugu; });
    }).map(function (f) { return f.fail; });
    model.sourceNote = "Selle vaate allikas: Tervisekassa (avaandmed), vaade „Üldine statistika“ · Diagnoosid: " + diagMeta.allika_nimed.join("; ") +
      " · Sugu: " + (state.compareSexes ? "Mehed, Naised" : TAI.labelOf(config, "Sugu", state.Sugu)) +
      (state.compareAges ? " · Vanuserühmad: " + AGE_LABELS.slice(1).join(", ") : "") +
      " · Väljavõte " + TK.isoToEt(meta.valjavotte_kuupaev) + ", allika uuendus " + TK.isoToEt(meta.allika_uuendus) +
      " · " + (files.length > 1 ? "Failid: " : "Fail: ") + files.join(", ");

    return model;
  }

  /* Vanuserühmade võrdluse kirjeldus: väärtused rühmiti ning kus oli muutus suurim (absoluutarvuna ja suhteliselt). */
  function ageCompareSentences(model) {
    var state = model.state, comp = model.prev, obs = model.latest;
    var diag = DIAGNOSES[state.Diagnoos].short;
    var sexText = state.Sugu === "1" ? " (mehed)" : state.Sugu === "2" ? " (naised)" : "";
    var who = state.Sugu === "1" ? "mehi" : state.Sugu === "2" ? "naisi" : "isikuid";
    var obsText = (isProvisional(obs) ? "poolelioleval " : "") + obs + ". aastal";
    var sentences = [];
    var valid = model.kpis.filter(function (k) { return k.value != null; });
    if (valid.length) {
      sentences.push("Diagnoosivalikuga " + diag + sexText + " oli " + obsText + " " + who + " vanuserühmades " +
        valid.map(function (k) { return k.ageLabel + " (" + formatCount(k.value) + ")"; }).join(", ") + ".");
    }
    var changes = model.kpis.filter(function (k) { return k.delta && k.delta.pct != null && k.delta.direction !== "flat"; });
    if (changes.length > 1) {
      var sign = function (k) { return k.delta.direction === "up" ? "+" : "−"; };
      var byAbs = changes.slice().sort(function (a, b) { return Math.abs(b.delta.diff) - Math.abs(a.delta.diff); })[0];
      var byPct = changes.slice().sort(function (a, b) { return b.delta.pct - a.delta.pct; })[0];
      sentences.push("Võrreldes " + comp + ". aastaga oli muutus absoluutarvuna suurim rühmas " + byAbs.ageLabel + " (" + sign(byAbs) +
        formatCount(Math.abs(byAbs.delta.diff)) + ") ja suhteliselt suurim rühmas " + byPct.ageLabel + " (" + sign(byPct) + TAI.formatPct(byPct.delta.pct) + ").");
    }
    sentences.push("Rühmad on eri laiusega, seega arvud ei näita rühmade suhtelist taset.");
    return sentences;
  }

  /* Callout kirjeldab kuvatud numbreid ega hinda neid (TERVISEKASSA.md p. 3, reegel 7). */
  function calloutText(model) {
    var config = model.config, state = model.state;
    var obs = model.latest, comp = model.prev;
    var diag = DIAGNOSES[state.Diagnoos].short;
    var age = state["Vanuserühm"];
    var ageText = age !== "kokku" ? " (vanuserühm " + TAI.labelOf(config, "Vanuserühm", age) + ")" : "";
    var obsText = (isProvisional(obs) ? "poolelioleval " : "") + obs + ". aastal";
    var intro = "Diagnoosivalikuga " + diag + " oli " + obsText + ageText + " ";
    var sentences = [];

    function changeClause(k) {
      if (!k.delta) return "";
      if (k.delta.direction === "flat") return "sama palju kui " + comp + ". aastal";
      return formatCount(Math.abs(k.delta.diff)) + (k.delta.pct != null ? " (" + TAI.formatPct(k.delta.pct) + ")" : "") + " " +
        (k.delta.direction === "up" ? "rohkem" : "vähem") + " kui " + comp + ". aastal";
    }

    if (state.compareAges) {
      sentences = sentences.concat(ageCompareSentences(model));
    } else if (model.kpis.length === 1 && model.kpis[0].value != null) {
      var k = model.kpis[0];
      var who = state.Sugu === "1" ? (k.value === 1 ? "mees" : "meest")
        : state.Sugu === "2" ? (k.value === 1 ? "naine" : "naist")
        : personWord(k.value);
      var clause = changeClause(k);
      sentences.push(intro + formatCount(k.value) + " " + who + (clause ? ", " + clause : "") + ".");
    } else if (model.kpis.length === 2 && model.kpis[0].value != null && model.kpis[1].value != null) {
      var men = model.kpis[0], women = model.kpis[1];
      var cm = changeClause(men), cw = changeClause(women);
      sentences.push(intro + formatCount(women.value) + " naist ja " + formatCount(men.value) + " meest.");
      if (cm && cw) sentences.push("Naisi oli " + cw + " ja mehi " + cm + ".");
    }

    var items = model.breakdown ? model.breakdown.groups[0].items : [];
    if (!model.breakdown) {
      // vanuserühmade võrdluses on tulpdiagramm peidus ja kirjeldus on juba eespool
    } else if (model.series.length === 1) {
      var valid = items.filter(function (it) { return it.values[0] != null; })
        .sort(function (a, b) { return b.values[0] - a.values[0]; });
      if (valid.length > 1) {
        var hi = valid[0], lo = valid[valid.length - 1];
        var whoPlural = state.Sugu === "1" ? "Mehi" : state.Sugu === "2" ? "Naisi" : "Isikuid";
        sentences.push(whoPlural + " oli kõige rohkem vanuserühmas " + hi.label + " (" + formatCount(hi.values[0]) + ") ja kõige vähem rühmas " +
          lo.label + " (" + formatCount(lo.values[0]) + "). Rühmad on eri laiusega, seega arvud ei näita rühmade suhtelist taset.");
      }
    } else {
      var pairs = items.filter(function (it) { return it.values[0] != null && it.values[1] != null; });
      var womenMore = pairs.filter(function (it) { return it.values[1] > it.values[0]; }).length;
      if (pairs.length) {
        sentences.push(womenMore === pairs.length ? "Naisi oli meestest rohkem kõigis " + pairs.length + " vanuserühmas."
          : womenMore === 0 ? "Mehi oli naistest rohkem kõigis " + pairs.length + " vanuserühmas."
          : "Naisi oli meestest rohkem " + womenMore + " vanuserühmas " + pairs.length + "-st.");
      }
    }

    // Kattuvus: ühine väärtus tuleb allika ühisvalikust, liidetud arvu ei kasutata kuskil näitajana.
    var o = model.overlap;
    if (o && o.f32 != null && o.f33 != null && o.joint != null) {
      if (state.Diagnoos === "F32F33") {
        sentences.push("F32 eraldi on " + formatCount(o.f32) + " ja F33 eraldi " + formatCount(o.f33) + " isikut, kuid ühise valiku väärtus on " +
          formatCount(o.joint) + ", mitte nende summa " + formatCount(o.f32 + o.f33) + ": sama isik võib kuuluda mõlemasse rühma.");
      } else {
        sentences.push("Sama isik võib kuuluda nii rühma F32 kui ka F33, seega nende arve ei saa kokku liita (ühise valiku väärtus on " + formatCount(o.joint) + ").");
      }
    }

    if (isProvisional(obs) || isProvisional(comp)) {
      sentences.push(obs === comp ? provisionalText() + "." : provisionalText() + ", seega võrdlus täisaastaga ei ole samaväärne.");
    }
    sentences.push("Isikute arvu muutus võib peegeldada abi otsimist, teenuste kasutust või kodeerimist; see ei ole levimus ega ravimata inimeste osakaal.");
    if (model.hasGaps) sentences.push("Valitud lõike kohta osa väärtusi puudub või on allikas varjatud.");
    return sentences.join(" ");
  }

  TAI.registerTable({
    code: "TK-diagnoosid",
    title: "Diagnoosid raviandmetes",
    fullTitle: "Diagnoosid raviandmetes: depressioon (F32, F33)",
    description: "Isikute arv Tervisekassa avaandmetes (arved ja retseptid): depressioon F32 ja F33.",
    eyebrow: "Tervisekassa (avaandmed) · Üldine statistika",
    group: "Tervisekassa (avaandmed)",

    source: {
      label: "Tervisekassa",
      longLabel: "Tervisekassa (avaandmed)",
      url: "https://tervisekassa.ee/vaimne-tervis-retseptide-ja-arvete-andmed",
      staticData: true,
      // Päiserida (kasutaja sõnastus 05.11.2026): "Andmed pärinevad failist Üldine statistika · Fail eksporditud
      // Tervisekassa avaandmetest 05.11.2026 (andmed seisuga 01.11.2026)"; "Tervisekassa avaandmetest" on link.
      statusLine: function (link, note) {
        return TAI.escapeHtml("Andmed pärinevad failist Üldine statistika · Fail eksporditud ") +
          link("Tervisekassa avaandmetest") + (note ? " " + TAI.escapeHtml(note) : "");
      },
      listLabel: "Allikas: Tervisekassa (avaandmed)",
      linkText: "aruanne „Vaimne tervis — retseptide ja arvete andmed“",
      tableLinkText: "Vaata algset aruannet Tervisekassa lehel"
    },

    years: YEARS,
    provisionalYears: PROVISIONAL,
    yearVar: "Aasta",
    seriesVar: "Sugu",
    measureLabel: "Isikute arv",
    unit: "",
    unitLabel: "",
    formatValue: formatCount,
    axisMax: axisMaxForCounts,

    vars: {
      Aasta: { label: "Aasta", values: YEARS, labels: YEAR_LABELS },
      Diagnoos: {
        label: "Diagnoos",
        values: ["F32F33", "F32", "F33"],
        labels: ["F32F33", "F32", "F33"].map(function (d) { return DIAGNOSES[d].label; }),
        totalValue: "F32F33"
      },
      "Vanuserühm": { label: "Vanuserühm", values: AGE_VALUES, labels: AGE_LABELS, totalValue: "kokku" },
      // Vaikimisi viimane kinnitatud täisaasta ja sellele eelnev; pooleliolev aasta on valitav, aga mitte vaikevalik.
      // totalValue siin on kohahoidja, applyMeta asendab selle meta-failist.
      Vaatlusaasta: { label: "Vaatlusaasta", values: YEARS, labels: YEAR_LABELS, totalValue: "2025" },
      Vordlusaasta: { label: "Võrdlusaasta", values: YEARS, labels: YEAR_LABELS, totalValue: "2024" },
      Sugu: { label: "Sugu", values: ["0", "1", "2"], labels: ["Kokku", "Mehed", "Naised"], totalValue: "0" }
    },

    filters: ["Diagnoos", "Vanuserühm", "Vaatlusaasta", "Vordlusaasta", "Sugu"],
    // Aastad on juba KPI sildil („· 2025“), muutuse reas („võrreldes 2024. aastaga“) ja tulpdiagrammi lõikes; lõikes neid ei korrata
    sliceSkip: ["Vaatlusaasta", "Vordlusaasta"],
    canCompareSexes: true,
    canCompareAges: true,
    views: { trend: true, breakdown: { var: "Vanuserühm" } },

    trendNote: function () {
      return (PROVISIONAL.length ? "Katkendjoon ja seest tühi punkt: " + provisionalText() + " ega ole täisaastatega samaväärne. " : "") +
        "Iga aasta on eraldi andmepunkt, aastaid ei liideta.";
    },

    // Aastad ja vaikeaastad meta-failist enne oleku loomist (app.js ensureReady); ebaõnnestumisel proovitakse uuesti
    prepare: function () { return TK.loadMeta().then(applyMeta); },
    applyMeta: applyMeta,

    loadData: function () {
      return TK.load().then(function (store) { return { store: store }; });
    },
    buildModel: buildModel,
    calloutText: calloutText,

    footnotes: function (data) {
      var meta = data.store.meta;
      return [
        "Tervisekassa avaldab need andmed ise oma aruandes; siin on samad arvud esitatud näidikulauale sobivas ülesehituses.",
        "Isikute arv näitab Tervisekassa avaandmetes (arved ja retseptid) kajastuvaid isikuid aasta kaupa. See ei ole levimus ega ravimata inimeste osakaal. " +
          "Määra 100 000 elaniku kohta ei arvutata, sest rahvaarvu nimetajad pole kinnitatud.",
        "Vanus on 31.12 seisuga. Väljavõte ei sisalda isikuid, kelle vanus on teadmata. Vanuserühmi võib ühe aasta sees liita. " +
          "Aastaid ja diagnoose ei liideta: sama isik võib olla mitmel aastal ja mõlemas diagnoosirühmas.",
        "Arved lähevad aastasse arve lõpetamise järgi ja retseptid väljakirjutamise järgi. " +
          "Retseptide arv ei ole ravimeid saanud inimeste arv ja arvete arv ei ole visiitide arv.",
        (PROVISIONAL.length ? provisionalText() + ". " : "") + "Allika uuendus " + TK.isoToEt(meta.allika_uuendus) + ", väljavõte " + TK.isoToEt(meta.valjavotte_kuupaev) +
          " (Power BI vaade „Üldine statistika“). Andmed on lehel valmis failidena, lehe avamine Tervisekassa aruannet ei päri."
      ];
    }
  });
})(window.TAI);
