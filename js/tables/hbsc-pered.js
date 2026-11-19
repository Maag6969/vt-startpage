/*
 * HBSC tabelipered vaates „Lapsed ja noored“ (19.11.2026, T1 3. voor; otsused TEEMAIDEED.md T1 jaotis E):
 * masendus/kurbus KU1150–1153, tervise enesehinnang KU11–113, kiusamine KU81–813, küberkiusamine KU82–823.
 *
 * Sama kuju mis hbsc-ku12.js (sugu ja vanus + õdetabelid piirkond, kodukeel, majanduslik olukord), aga vastusel on mitu
 * kategooriat (nt masenduse 4 sagedusastet). Kategooria on filter (seeriamuutuja filtrina, vt module.js seriesOfGeneral):
 * TAI numbrid täpselt, midagi ei liideta. Vaikimisi „murekoht“ (defaultValue): masendus „Üle ühe korra nädalas“,
 * kiusamine „vähemalt kahel korral kuus“, tervise enesehinnang TAI esimene („Väga hea“).
 *
 * API kontrollitud 19.11.2026 (GET metaandmed ja POST): perioodid 2005/2006…2021/2022 (küberkiusamine alates 2013/2014),
 * Sugu 0/1/2, Vanus 0–3, Piirkond 0–5 (0 Eesti keskmine), kodukeel ja majanduslik olukord ilma koondita.
 * TAI märkus kõigil: „Tabelis on esitatud kaalumata andmed.“
 */
(function (TAI) {
  "use strict";

  var ALL_YEARS = ["2006", "2010", "2014", "2018", "2022"];
  var ALL_PERIODS = ["2005/2006", "2009/2010", "2013/2014", "2017/2018", "2021/2022"];

  var REGIONS = ["Eesti keskmine", "Harju ja Rapla maakond", "Ida-Viru ja Lääne-Viru maakond", "Järva, Pärnu ja Viljandi maakond",
                 "Tartu, Jõgeva, Põlva, Valga ja Võru maakond", "Hiiu, Saare ja Lääne maakond"];

  function queries(code, filterCodes, breakdownVar) {
    return function (state) {
      var cfg = TAI.getTable(code);
      var over = {};
      over[breakdownVar] = cfg.vars[breakdownVar].values;
      return {
        trend: TAI.buildQuery(cfg, TAI.selectionFromState(cfg, state, filterCodes, {})),
        breakdown: TAI.buildQuery(cfg, TAI.selectionFromState(cfg, state, filterCodes.filter(function (c) { return c !== breakdownVar; }), over))
      };
    };
  }

  /*
   * f: { codes: [peamine, piirkond, kodukeel, majandus], path, name (lühinimi pealkirjas), familyTitle, fullTitle, about (kirjelduse algus),
   *      cat: { code (API muutuja), label, param, values, labels, defaultValue, valence }, measure(code) → mõõdiku nimi,
   *      first (esimene periood, vaikimisi 2006), definition (esimene joonealune), aiMeasure }
   */
  function family(f) {
    var start = ALL_YEARS.indexOf(f.first || "2006");
    var siblings = [
      { code: f.codes[0], label: "Sugu ja vanus" },
      { code: f.codes[1], label: "Piirkond" },
      { code: f.codes[2], label: "Kodukeel" },
      { code: f.codes[3], label: "Majanduslik olukord" }
    ];
    var periodText = ALL_PERIODS[start] + "–" + ALL_PERIODS[ALL_PERIODS.length - 1];
    var footnotes = [
      f.definition + " Andmed põhinevad kooliõpilaste küsitlusel (HBSC).",
      "Uuring toimub iga nelja aasta tagant õppeaastal (nt 2021/2022); vahepealsete aastate kohta andmeid ei ole.",
      "TAI märkus: tabelis on esitatud kaalumata andmed.",
      "Mõisted ja metoodika: Tervise Arengu Instituudi andmebaasis tabeli juures (HBSC)."
    ];

    function register(i, title, description, extra) {
      var code = f.codes[i];
      var Y = ALL_YEARS.slice(start), P = ALL_PERIODS.slice(start);   // iga tabel oma massiivid (syncYears lisab uue laine)
      var vars = {
        Aasta: { label: "Õppeaasta", values: Y, labels: P }
      };
      vars[f.cat.code] = {
        label: f.cat.label, param: f.cat.param, values: f.cat.values.slice(), labels: f.cat.labels.slice(),
        defaultValue: f.cat.defaultValue, valence: f.cat.valence
      };
      Object.keys(extra.vars).forEach(function (k) { vars[k] = extra.vars[k]; });
      var filters = [f.cat.code].concat(extra.filters);
      TAI.registerTable({
        code: code,
        title: f.name + ": " + title,
        familyTitle: f.familyTitle,
        siblings: siblings,
        fullTitle: f.fullTitle,
        description: description + ", " + periodText + ".",
        eyebrow: "Kooliõpilaste tervisekäitumise uuring (HBSC) · " + code,
        group: "Tervise Arengu Instituut",
        listView: "noored",
        taiPath: f.path,
        ai: { profile: "hbsc", measure: f.aiMeasure },

        years: Y,
        yearVar: "Aasta",
        periodYears: true,
        connectGaps: true,
        seriesVar: f.cat.code,
        measureLabel: function (state) { return f.measure(state[f.cat.code] != null ? state[f.cat.code] : f.cat.defaultValue); },
        unit: "%",
        decimals: 1,
        vars: vars,
        filters: filters,
        compare: extra.compare,
        views: { trend: true, breakdown: extra.breakdown },
        queries: queries(code, filters, extra.breakdown.var),
        footnotes: footnotes
      });
    }

    register(0, "sugu ja vanus", f.about + " soo ja vanuse järgi (11, 13 ja 15 aastat)", {
      vars: {
        Sugu: {
          label: "Sugu", values: ["0", "1", "2"], labels: ["Poisid ja tüdrukud", "Poisid", "Tüdrukud"],
          optionLabels: ["Kokku", "Poisid", "Tüdrukud"], totalValue: "0"
        },
        Vanus: {
          label: "Vanus", values: ["0", "1", "2", "3"], labels: ["11-, 13- ja 15-aastased", "11-aastased", "13-aastased", "15-aastased"],
          optionLabels: ["Kokku", "11-aastased", "13-aastased", "15-aastased"], totalValue: "0"
        }
      },
      filters: ["Vanus", "Sugu"],
      compare: {
        Vanus: { kind: "vanus", label: "Vanused vrdl", buttonLabel: "Vanuste võrdlus" },
        Sugu: { kind: "sugu", label: "Poisid vrdl Tüdrukud" }
      },
      breakdown: { var: "Vanus", title: "Vanuste võrdlus", inPhrase: "vanuste lõikes" }
    });

    register(1, "piirkond", f.about + " piirkonna järgi", {
      vars: {
        Piirkond: { label: "Piirkond", param: "piirkond", values: ["0", "1", "2", "3", "4", "5"], labels: REGIONS.slice(),
                    totalValue: "0", totalLabel: "Eesti keskmine" }
      },
      filters: ["Piirkond"],
      compare: { Piirkond: "piirkond" },
      breakdown: { var: "Piirkond", title: "Piirkondade võrdlus", inPhrase: "piirkondade lõikes" }
    });

    register(2, "kodukeel", f.about + " kodus räägitava põhikeele järgi", {
      vars: {
        "Kodus räägitav põhikeel": { label: "Kodus räägitav põhikeel", param: "keel", values: ["0", "1"], labels: ["Eesti", "Mitte-eesti"] }
      },
      filters: ["Kodus räägitav põhikeel"],
      compare: { "Kodus räägitav põhikeel": "keel" },
      breakdown: { var: "Kodus räägitav põhikeel", title: "Kodukeelte võrdlus", inPhrase: "kodukeelte lõikes" }
    });

    register(3, "majanduslik olukord", f.about + " pere majandusliku olukorra järgi", {
      vars: {
        "Majanduslik olukord": { label: "Majanduslik olukord", param: "majandus", values: ["0", "1", "2"], labels: ["Hea", "Keskmine", "Halb"] }
      },
      filters: ["Majanduslik olukord"],
      compare: { "Majanduslik olukord": "majandus" },
      breakdown: { var: "Majanduslik olukord", title: "Majandusliku olukorra võrdlus", inPhrase: "majandusliku olukorra lõikes" }
    });
  }

  function phraseOf(map) { return function (code) { return map[code] || map["0"]; }; }

  // Masendus/kurbus viimase 6 kuu jooksul (KU1150–1153)
  family({
    codes: ["KU1150", "KU1151", "KU1152", "KU1153"],
    path: "05Uuringud/03HBSC/01Tervis",
    name: "Masendus või kurbus",
    familyTitle: "Masendus või kurbus koolinoortel",
    fullTitle: "Masenduse või kurbuse tundmine koolinoortel viimase kuue kuu jooksul",
    about: "Kui sageli kooliõpilased tundsid viimase kuue kuu jooksul masendust või kurbust,",
    cat: {
      code: "Masenduse/kurbuse tundmise sagedus", label: "Sagedus", param: "sagedus",
      values: ["0", "1", "2", "3"], labels: ["Üle ühe korra nädalas", "Peaaegu iga nädal", "Peaaegu iga kuu", "Harva või mitte kunagi"],
      defaultValue: "0", valence: ["negative", "negative", "neutral", "positive"]
    },
    measure: phraseOf({
      "0": "Masendust või kurbust üle ühe korra nädalas tundnud õpilaste osakaal",
      "1": "Masendust või kurbust peaaegu iga nädal tundnud õpilaste osakaal",
      "2": "Masendust või kurbust peaaegu iga kuu tundnud õpilaste osakaal",
      "3": "Masendust või kurbust harva või mitte kunagi tundnud õpilaste osakaal"
    }),
    definition: "Masenduse või kurbuse tundmise sagedus viimase kuue kuu jooksul, vastanute osakaal (%) valitud sageduse kohta; sagedusastmed kokku 100%.",
    aiMeasure: "Numbrid on kooliõpilaste küsitluse (HBSC, 11-, 13- ja 15-aastased) tulemused: vastanute osakaal, kes tundsid viimase kuue kuu jooksul masendust või kurbust valitud sagedusega. See on enesekohane hinnang, mitte arsti pandud diagnoos. TAI märkuse järgi on andmed kaalumata."
  });

  // Kiusamine koolis viimasel paaril kuul (KU81–813)
  family({
    codes: ["KU81", "KU811", "KU812", "KU813"],
    path: "05Uuringud/03HBSC/08Kiusamine",
    name: "Kiusamine koolis",
    familyTitle: "Kiusamine koolis",
    fullTitle: "Koolis kiusamist kogenud õpilased viimasel paaril kuul",
    about: "Kooliõpilaste osakaal, keda on viimasel paaril kuul koolis kiusatud,",
    cat: {
      code: "Kiusamist kogenud", label: "Kiusamise kogemus", param: "kiusamine",
      values: ["0", "1", "2"], labels: ["Ei ole kiusatud", "Kiusatud 1–2 korda", "Kiusatud vähemalt kahel korral kuus"],
      defaultValue: "2", valence: ["positive", "negative", "negative"]
    },
    measure: phraseOf({
      "0": "Koolis mitte kiusatud õpilaste osakaal",
      "1": "Koolis 1–2 korda kiusatud õpilaste osakaal",
      "2": "Koolis vähemalt kahel korral kuus kiusatud õpilaste osakaal"
    }),
    definition: "Viimasel paaril kuul koolis kiusamist kogenud õpilased, vastanute osakaal (%) valitud kategooria kohta; kategooriad kokku 100%.",
    aiMeasure: "Numbrid on kooliõpilaste küsitluse (HBSC, 11-, 13- ja 15-aastased) tulemused: vastanute osakaal, kes on viimasel paaril kuul koolis kiusamist kogenud valitud sagedusega. See on õpilaste enda vastus. TAI märkuse järgi on andmed kaalumata."
  });

  // Küberkiusamine viimasel paaril kuul (KU82–823), alates 2013/2014
  family({
    codes: ["KU82", "KU821", "KU822", "KU823"],
    path: "05Uuringud/03HBSC/08Kiusamine",
    name: "Küberkiusamine",
    familyTitle: "Küberkiusamine",
    fullTitle: "Küberkiusamist kogenud õpilased viimasel paaril kuul",
    about: "Kooliõpilaste osakaal, keda on viimasel paaril kuul küberkiusatud,",
    first: "2014",
    cat: {
      code: "Küberkiusamist kogenud", label: "Küberkiusamise kogemus", param: "kuberkiusamine",
      values: ["0", "1", "2"], labels: ["Ei ole küberkiusatud", "Küberkiusatud 1–2 korda", "Küberkiusatud vähemalt kahel korral kuus"],
      defaultValue: "2", valence: ["positive", "negative", "negative"]
    },
    measure: phraseOf({
      "0": "Mitte küberkiusatud õpilaste osakaal",
      "1": "1–2 korda küberkiusatud õpilaste osakaal",
      "2": "Vähemalt kahel korral kuus küberkiusatud õpilaste osakaal"
    }),
    definition: "Viimasel paaril kuul küberkiusamist kogenud õpilased, vastanute osakaal (%) valitud kategooria kohta; kategooriad kokku 100%. Küsimus on uuringus alates 2013/2014.",
    aiMeasure: "Numbrid on kooliõpilaste küsitluse (HBSC, 11-, 13- ja 15-aastased) tulemused: vastanute osakaal, kes on viimasel paaril kuul küberkiusamist kogenud valitud sagedusega. See on õpilaste enda vastus. Andmed on kolmest uuringulainest (alates 2013/2014). TAI märkuse järgi on andmed kaalumata."
  });

  // Tervise enesehinnang (KU11–113)
  family({
    codes: ["KU11", "KU111", "KU112", "KU113"],
    path: "05Uuringud/03HBSC/01Tervis",
    name: "Tervise enesehinnang",
    familyTitle: "Tervise enesehinnang koolinoortel",
    fullTitle: "Kooliõpilaste tervise enesehinnang",
    about: "Kuidas kooliõpilased oma tervist hindavad,",
    cat: {
      code: "Tervis", label: "Hinnang tervisele", param: "hinnang",
      values: ["0", "1", "2", "3"], labels: ["Väga hea", "Hea", "Rahuldav", "Väga halb"],
      defaultValue: "0", valence: ["positive", "positive", "neutral", "negative"]
    },
    measure: phraseOf({
      "0": "Oma tervist väga heaks hinnanud õpilaste osakaal",
      "1": "Oma tervist heaks hinnanud õpilaste osakaal",
      "2": "Oma tervist rahuldavaks hinnanud õpilaste osakaal",
      "3": "Oma tervist väga halvaks hinnanud õpilaste osakaal"
    }),
    definition: "Tervise enesehinnang, vastanute osakaal (%) valitud hinnangu kohta; hinnangud kokku 100%. Hinnangute nimed on TAI tabelist.",
    aiMeasure: "Numbrid on kooliõpilaste küsitluse (HBSC, 11-, 13- ja 15-aastased) tulemused: vastanute osakaal, kes hindasid oma tervist valitud hinnanguga. See on õpilaste enda hinnang, mitte arsti hinnang. TAI märkuse järgi on andmed kaalumata."
  });
})(window.TAI);
