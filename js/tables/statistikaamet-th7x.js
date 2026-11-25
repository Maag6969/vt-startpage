/*
 * Statistikaamet TH76–TH79 — 16-aastaste ja vanemate terviseseisund (taustanäitaja, Üldvaade).
 * Neli õdetabelit on sama näitaja neli lõiget: sissetulek (TH76), sugu ja vanus (TH77),
 * hõiveseisund (TH78), elukoht (TH79). Üks aruanne, lõike lüliti aruande päises (siblings).
 *
 * Andmed: andmed.stat.ee (Statistikaamet, PxWeb), POST json-stat2 (sama kuju mis TAI, mitte statistika.tai.ee).
 * API kontrollitud 25.11.2026: metaandmed ja üks POST (TH77, 2019/2024/2025/2026, HGOOD ja HBAD). Ainus
 * eliminatsioonita dimensioon on Terviseseisund; Sugu (TH77), Hõiveseisund (TH78), Elukoht (TH79) ja
 * Sissetulekugrupp (TH76) on eliminatsiooniga, seega koond jääb valikust välja.
 *
 * Seeria (trend): kaks joont, „Väga hea või hea“ ja „Halb või väga halb“ (config.seriesVar = "Terviseseisund").
 */
(function (TAI) {
  "use strict";

  var API_ROOT = "https://andmed.stat.ee/api/v1/et/stat/";
  var SERIES = ["HGOOD", "HBAD"];

  var YEARS = [];
  for (var y = 2004; y <= 2026; y++) YEARS.push(String(y));

  var HEALTH_CODES = ["HGOOD", "HMED", "HBAD", "ACTRES", "ACTMED", "ACTNRES", "ILL", "NILL"];
  var HEALTH_LABELS = [
    "Väga hea või hea", "Ei hea ega halb", "Halb või väga halb",
    "Igapäevategevus suurel määral piiratud", "Igapäevategevus mõningal määral piiratud",
    "Igapäevategevus ei ole piiratud", "Pikaajaline haigus on", "Pikaajalist haigust ei ole"
  ];

  var HEALTH_COLORS = HEALTH_CODES.map(function (c) { return c === "HBAD" ? "var(--series-2)" : "var(--series-1)"; });

  var SOURCE = {
    // mootor lisab label-ile „andmebaasist“, seega omastav; longLabel on allikarea ja veateate nimi
    label: "Statistikaameti",
    longLabel: "Statistikaameti andmebaas",
    url: "https://andmed.stat.ee/et/stat"
  };

  var FOOTNOTES = [
    "Näitaja: 16-aastaste ja vanemate isikute osatähtsus (%) terviseseisundi järgi. Andmed on Statistikaameti " +
      "tabelitest TH76–TH79 (sama näitaja neli lõiget: sissetulek, sugu ja vanus, hõiveseisund, elukoht).",
    "Allikas: Statistikaamet (andmed.stat.ee), Eesti sotsiaaluuring (EU-SILC küsitlus). Tabeli avaldamiseks " +
      "vajalike andmete kogumist kaasrahastas Euroopa Liit.",
    "Terviseseisund on küsitletu enda hinnang, mitte arstidiagnoos.",
    // CC BY-SA 4.0 (kontrollitud 25.11.2026): viide allikale, litsents, töötlemise märge, töötlus sama litsentsiga
    "Statistikaameti avaandmed on jagatavad litsentsiga CC BY-SA 4.0 " +
      "(creativecommons.org/licenses/by-sa/4.0/deed.et). Sellel lehel on andmeid töödeldud: valitud on näitajad ja " +
      "rühmad, osa nimetusi on lühendatud ning joonised ja kokkuvõttelaused on lehe koostatud. Töödeldud andmed on " +
      "jagatavad sama litsentsiga."
  ];

  // Tulpdiagrammi pealkiri ja „…lõikes“ iga lõike kohta
  var CUTS = {
    TH76: { title: "Sissetulekurühmade võrdlus", inPhrase: "sissetulekurühmade lõikes" },
    TH77: { title: "Vanuserühmade võrdlus", inPhrase: "vanuserühmade lõikes" },
    TH78: { title: "Hõiveseisundite võrdlus", inPhrase: "hõiveseisundi lõikes" },
    TH79: { title: "Elukohtade võrdlus", inPhrase: "elukoha lõikes" }
  };

  // Võrdlusnupud filtrite all. Võrdlusel on iga rühma kohta üks joon: esimene seeria (väga hea või hea tervis).
  var COMPARE = {
    TH76: {
      Sissetulekugrupp: [
        { kind: "sissetulek", values: ["QU1", "QU2", "QU3", "QU4", "QU5"] },
        { kind: "vaesus", values: ["BELOW_POV", "ABOVE_POV"] }
      ]
    },
    TH77: {
      Vanuserühm: { kind: "vanus", values: ["Y16-24", "Y25-34", "Y35-44", "Y45-54", "Y55-64", "Y_GE65"] },
      Sugu: { kind: "sugu", values: ["M", "F"] }
    },
    TH78: {
      Hõiveseisund: {
        kind: "aktiivsus", label: "Hõiveseisundid vrdl", buttonLabel: "Hõiveseisundite võrdlus",
        values: ["EMP", "UNE", "RET", "INAC_OTH"]
      }
    },
    TH79: {
      Elukoht: [
        { kind: "piirkond", values: ["EE001", "EE009", "EE00A", "EE004", "EE008"] },
        { kind: "asula", values: ["URBREG", "RURREG"] }
      ]
    }
  };

  // TH77-l on filtriks ka tulpade muutuja (vanuserühm); teistel on üks filter
  var FILTERS = { TH77: ["Vanuserühm", "Sugu"] };

  // Hinnangute nimetused lauses, SERIES järjekorras
  var RATED = ["heaks või väga heaks", "halvaks või väga halvaks"];

  /* Kokkuvõttelause (config.callout, vt module.js): ainult ekraanil olevad arvud, hinnangut ei anta. */
  function callout(model, fmt, suffix) {
    var config = model.config;
    var shown = model.kpis.map(function (k, i) { return { k: k, name: RATED[i] }; })
      .filter(function (x) { return x.k.value != null; });
    var sentences = [];
    if (shown.length) {
      sentences.push(TAI.inYear(config, shown[0].k.year) + suffix + " hindas oma tervist " +
        shown.map(function (x) { return x.name + " " + fmt(x.k.value); }).join(" ning ") +
        " 16-aastastest ja vanematest.");
    }
    var changed = shown.filter(function (x) { return x.k.delta; });
    if (changed.length) {
      sentences.push("Võrreldes " + TAI.vsYear(config, changed[0].k.prevYear) + " on " + changed.map(function (x) {
        var d = x.k.delta;
        return x.name + " hindajaid " + (d.direction === "flat" ? "praktiliselt sama palju"
          : d.text.replace(/^[▲▼→]\s*/, "") + (d.direction === "up" ? " rohkem" : " vähem"));
      }).join(" ja ") + ".");
    }
    var b = model.breakdown;
    if (b) {
      var items = [];
      b.groups.forEach(function (g) { g.items.forEach(function (it) { if (it.values[0] != null) items.push(it); }); });
      if (items.length > 1) {
        items.sort(function (a, c) { return c.values[0] - a.values[0]; });
        var hi = items[0], lo = items[items.length - 1];
        var phrase = b.inPhrase.charAt(0).toUpperCase() + b.inPhrase.slice(1);
        sentences.push(phrase + " oli " + RATED[0] + " hindajate osakaal kõrgeim „" + hi.label + "“ (" + fmt(hi.values[0]) +
          ") ja madalaim „" + lo.label + "“ (" + fmt(lo.values[0]) + ").");
      }
    }
    return sentences.join(" ");
  }

  function register(code, title, siblingLabel, filterVar, breakdownVar, extraVars, description) {
    var vars = {
      Vaatlusperiood: { label: "Aasta", values: YEARS, labels: YEARS },
      Näitaja: { label: "Näitaja", values: ["PERS_PC_GE16"], labels: ["16-aastaste ja vanemate isikute osatähtsus, %"] },
      // colors: ilma selleta saaksid HGOOD (indeks 0) ja HBAD (indeks 2) sama värvi
      Terviseseisund: { label: "Terviseseisund", values: HEALTH_CODES, labels: HEALTH_LABELS, colors: HEALTH_COLORS }
    };
    Object.keys(extraVars).forEach(function (k) { vars[k] = extraVars[k]; });

    var cfg = TAI.registerTable({
      code: code,
      title: title,
      familyTitle: "Terviseseisund (16+)",
      fullTitle: "16-aastaste ja vanemate terviseseisund",
      description: description,
      eyebrow: "Statistikaamet · " + code,
      group: "Statistikaamet",
      ai: { profile: "statistikaamet" },
      apiUrl: API_ROOT + code,
      // viited (päise staatusrida, tabeli link, allikarida, AI-juhis) viivad otse selle tabeli lehele
      source: Object.assign({}, SOURCE, { url: SOURCE.url + "/" + code }),
      siblings: [
        { code: "TH76", label: "Sissetulek" },
        { code: "TH77", label: "Sugu ja vanus" },
        { code: "TH78", label: "Hõiveseisund" },
        { code: "TH79", label: "Elukoht" }
      ],

      years: YEARS,
      yearVar: "Vaatlusperiood",
      seriesVar: "Terviseseisund",
      seriesValues: SERIES,
      // võrdlusel näidatakse ainult head tervist: mõõdiku nimi peab seda ütlema
      measureLabel: function (state) {
        return TAI.activeComparison(TAI.getTable(code), state)
          ? "Oma tervist " + RATED[0] + " hindajate osakaal"
          : "16-aastaste ja vanemate osatähtsus";
      },
      unit: "%",
      decimals: 1,
      vars: vars,
      filters: FILTERS[code] || [filterVar],
      compare: COMPARE[code],
      views: {
        trend: true,
        breakdown: { var: breakdownVar, title: CUTS[code].title, inPhrase: CUTS[code].inPhrase }
      },
      callout: callout,
      footnotes: FOOTNOTES,
      queries: function (state) {
        var cfgNow = TAI.getTable(code);
        var seriesOver = { Terviseseisund: SERIES };
        var trendSel = Object.assign(TAI.selectionFromState(cfgNow, state, cfgNow.filters, {}), seriesOver);
        // tulbad arvestavad teisi filtreid (TH77: valitud sugu), tulpade muutuja ise küsitakse täies mahus
        var others = cfgNow.filters.filter(function (c) { return c !== breakdownVar; });
        var breakSel = Object.assign(TAI.selectionFromState(cfgNow, state, others, {}), seriesOver);
        breakSel[breakdownVar] = cfgNow.vars[breakdownVar].values;
        return {
          trend: TAI.buildQuery(cfgNow, trendSel),
          breakdown: TAI.buildQuery(cfgNow, breakSel)
        };
      }
    });
    return cfg;
  }

  // TH76 — sissetulekugrupp (koond „Kokku“)
  register("TH76", "Terviseseisund: sissetulek",
    "Sissetulek", "Sissetulekugrupp", "Sissetulekugrupp", {
      Sissetulekugrupp: {
        label: "Sissetulekugrupp", values: ["TOTAL", "QU1", "QU2", "QU3", "QU4", "QU5", "ABOVE_POV", "BELOW_POV"],
        labels: ["Kokku", "Madalaim kvintiil", "Teine kvintiil", "Kolmas kvintiil", "Neljas kvintiil", "Kõrgeim kvintiil",
                 "Suhtelise vaesuse piirist ülalpool", "Suhtelise vaesuse piirist allpool"],
        totalValue: "TOTAL", elimination: true
      }
    }, "16-aastaste ja vanemate terviseseisund ekvivalentnetosissetuleki järgi, 2004–2026.");

  // TH77 — sugu ja vanuserühm
  register("TH77", "Terviseseisund: sugu ja vanus",
    "Sugu ja vanus", "Sugu", "Vanuserühm", {
      // API koodid; optionLabels teeb sellest tavalise muutuja (muidu eeldab mootor ETU koode 0/1/2, vt TAI.isEtuSex)
      Sugu: {
        label: "Sugu", param: "sugu", values: ["_T", "M", "F"], labels: ["Kokku", "Mehed", "Naised"],
        optionLabels: ["Kokku", "Mehed", "Naised"], totalValue: "_T", elimination: true
      },
      Vanuserühm: {
        label: "Vanuserühm", values: ["Y_GE16", "Y16-24", "Y25-34", "Y35-44", "Y45-54", "Y55-64", "Y_GE65"],
        labels: ["Vähemalt 16 aastat", "16–24", "25–34", "35–44", "45–54", "55–64", "Vähemalt 65 aastat"],
        totalValue: "Y_GE16"
      }
    }, "16-aastaste ja vanemate terviseseisund soo ja vanuserühma järgi, 2004–2026.");

  // TH78 — hõiveseisund (koond „Kokku“)
  register("TH78", "Terviseseisund: hõiveseisund",
    "Hõiveseisund", "Hõiveseisund", "Hõiveseisund", {
      Hõiveseisund: {
        label: "Hõiveseisund", values: ["POP", "EMP", "UNE", "RET", "INAC_OTH"],
        labels: ["Kokku", "Hõivatud", "Töötud", "Pensionärid", "Muud mitteaktiivsed"], totalValue: "POP", elimination: true
      }
    }, "16-aastaste ja vanemate terviseseisund hõiveseisundi järgi, 2004–2026.");

  // TH79 — elukoht (osa Statistikaameti koodidest: Eesti, linn/maa ja viis piirkonda; maakondi pole).
  // Linn/maa: URBREG ja RURREG (andmed alates 2018); vanad URB ja RUR lõpevad aastaga 2017, seega neid ei kasutata.
  register("TH79", "Terviseseisund: elukoht",
    "Elukoht", "Elukoht", "Elukoht", {
      Elukoht: {
        label: "Elukoht",
        values: ["EE", "URBREG", "RURREG", "EE001", "EE009", "EE00A", "EE004", "EE008"],
        labels: ["Eesti", "Linnaline või väikelinnaline piirkond", "Maaline piirkond", "Põhja-Eesti", "Kesk-Eesti",
                 "Kirde-Eesti", "Lääne-Eesti", "Lõuna-Eesti"],
        totalValue: "EE", elimination: true
      }
    }, "16-aastaste ja vanemate terviseseisund elukoha järgi, 2004–2026.");
})(window.TAI);
