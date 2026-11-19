/*
 * HBSC KU12 ja õdetabelid KU121–KU123 — depressiivsete episoodide esinemine viimasel 12 kuul kooliõpilaste seas
 * (11-, 13- ja 15-aastased, Kooliõpilaste tervisekäitumise uuring HBSC). Esimene aruanne vaates „Lapsed ja noored“
 * (config.listView = "noored", 19.11.2026).
 *
 * Üks aruanne, neli lõiget (õdetabelid, lüliti „Lõige:“ aruande päises, vt app.js): KU12 sugu ja vanus (võrdlusnupud),
 * KU121 piirkond, KU122 kodukeel, KU123 majanduslik olukord (rühmad kõrvuti võrdlusnupuga; vaikimisi esimene väärtus).
 * Üldmudel (config.seriesVar), sest ETU indikaatorimudel on seotud „mehed/naised“ sõnastusega.
 *
 * API kontrollitud 19.11.2026 (GET metaandmed ja üks POST): Aasta koodid 2006…2022, sildid perioodid „2005/2006“…;
 * Episood 0 ei ole esinenud, 1 on esinenud; väärtus protsent, 1 komakoht; „Tabelis on esitatud kaalumata andmed.“
 * KU121–123-l pole soo ega vanuse muutujat; KU122 ja KU123 ei sisalda koondit (totalValue puudub).
 */
(function (TAI) {
  "use strict";

  var TAI_PATH = "05Uuringud/03HBSC/01Tervis";
  var SIBLINGS = [
    { code: "KU12", label: "Sugu ja vanus" },
    { code: "KU121", label: "Piirkond" },
    { code: "KU122", label: "Kodukeel" },
    { code: "KU123", label: "Majanduslik olukord" }
  ];

  // Iga tabel saab oma massiivid: TAI.syncYears lisab uue uuringulaine config.years-ile ja muutuja väärtustele
  function years() { return ["2006", "2010", "2014", "2018", "2022"]; }
  function periods() { return ["2005/2006", "2009/2010", "2013/2014", "2017/2018", "2021/2022"]; }

  var FOOTNOTES = [
    "Depressiivsete episoodide esinemine viimasel 12 kuul, vastanute osakaal (%). Andmed põhinevad kooliõpilaste " +
      "küsitlusel (HBSC), mitte arsti pandud diagnoosil.",
    "Uuring toimub iga nelja aasta tagant õppeaastal (nt 2021/2022); vahepealsete aastate kohta andmeid ei ole.",
    "TAI märkus: tabelis on esitatud kaalumata andmed.",
    "Mõisted ja metoodika: Tervise Arengu Instituudi andmebaasis tabeli juures (HBSC)."
  ];

  /* Ühised väljad; `extra` lisab tabeli oma muutuja, filtri, võrdluse ja tulba. */
  function register(code, title, description, extra) {
    var Y = years(), P = periods();
    var vars = {
      Aasta: { label: "Õppeaasta", values: Y, labels: P },
      Episood: { label: "Depressiivne episood", values: ["1"], labels: ["Depressiivne episood viimasel 12 kuul"], valence: ["negative"] }
    };
    Object.keys(extra.vars).forEach(function (k) { vars[k] = extra.vars[k]; });
    TAI.registerTable(Object.assign({
      code: code,
      title: title,
      familyTitle: "Depressiivsed episoodid koolinoortel",
      siblings: SIBLINGS,
      fullTitle: "Depressiivsete episoodide esinemine koolinoortel viimasel 12 kuul",
      description: description,
      eyebrow: "Kooliõpilaste tervisekäitumise uuring (HBSC) · " + code,
      group: "Tervise Arengu Instituut",
      listView: "noored",
      taiPath: TAI_PATH,
      ai: { profile: "hbsc" },

      years: Y,
      yearVar: "Aasta",
      periodYears: true,
      connectGaps: true,
      seriesVar: "Episood",
      measureLabel: "Depressiivse episoodiga õpilaste osakaal",
      unit: "%",
      decimals: 1,
      vars: vars,
      footnotes: FOOTNOTES
    }, extra.config));
  }

  /* trend: kõik lained valitud lõikes (võrdlusel rühmad eraldi); breakdown: kõik rühmad (mudel võtab viimase laine). */
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

  // KU12 — sugu ja vanus (peamine õde, ainus loendis)
  register("KU12", "Depressiivsed episoodid: sugu ja vanus",
    "11-, 13- ja 15-aastaste kooliõpilaste osakaal, kellel on viimasel 12 kuul esinenud depressiivne episood, 2005/2006–2021/2022.", {
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
      config: {
        filters: ["Vanus", "Sugu"],
        compare: {
          Vanus: { kind: "vanus", label: "Vanused vrdl", buttonLabel: "Vanuste võrdlus" },
          Sugu: { kind: "sugu", label: "Poisid vrdl Tüdrukud" }
        },
        views: { trend: true, breakdown: { var: "Vanus", title: "Vanuste võrdlus", inPhrase: "vanuste lõikes" } },
        queries: queries("KU12", ["Vanus", "Sugu"], "Vanus")
      }
    });

  // KU121 — piirkond (Eesti keskmine = koond)
  register("KU121", "Depressiivsed episoodid: piirkond",
    "Kooliõpilaste osakaal, kellel on viimasel 12 kuul esinenud depressiivne episood, piirkonna järgi, 2005/2006–2021/2022.", {
      vars: {
        Piirkond: {
          label: "Piirkond", param: "piirkond", values: ["0", "1", "2", "3", "4", "5"],
          labels: ["Eesti keskmine", "Harju ja Rapla maakond", "Ida-Viru ja Lääne-Viru maakond", "Järva, Pärnu ja Viljandi maakond",
                   "Tartu, Jõgeva, Põlva, Valga ja Võru maakond", "Hiiu, Saare ja Lääne maakond"],
          totalValue: "0", totalLabel: "Eesti keskmine"
        }
      },
      config: {
        filters: ["Piirkond"],
        compare: { Piirkond: "piirkond" },
        views: { trend: true, breakdown: { var: "Piirkond", title: "Piirkondade võrdlus", inPhrase: "piirkondade lõikes" } },
        queries: queries("KU121", ["Piirkond"], "Piirkond")
      }
    });

  // KU122 — kodukeel (koondit pole)
  register("KU122", "Depressiivsed episoodid: kodukeel",
    "Kooliõpilaste osakaal, kellel on viimasel 12 kuul esinenud depressiivne episood, kodus räägitava põhikeele järgi, 2005/2006–2021/2022.", {
      vars: {
        "Kodus räägitav põhikeel": {
          label: "Kodus räägitav põhikeel", param: "keel", values: ["0", "1"], labels: ["Eesti", "Mitte-eesti"]
        }
      },
      config: {
        filters: ["Kodus räägitav põhikeel"],
        compare: { "Kodus räägitav põhikeel": "keel" },
        views: { trend: true, breakdown: { var: "Kodus räägitav põhikeel", title: "Kodukeelte võrdlus", inPhrase: "kodukeelte lõikes" } },
        queries: queries("KU122", ["Kodus räägitav põhikeel"], "Kodus räägitav põhikeel")
      }
    });

  // KU123 — pere majanduslik olukord (koondit pole)
  register("KU123", "Depressiivsed episoodid: majanduslik olukord",
    "Kooliõpilaste osakaal, kellel on viimasel 12 kuul esinenud depressiivne episood, pere majandusliku olukorra järgi, 2005/2006–2021/2022.", {
      vars: {
        "Majanduslik olukord": {
          label: "Majanduslik olukord", param: "majandus", values: ["0", "1", "2"], labels: ["Hea", "Keskmine", "Halb"]
        }
      },
      config: {
        filters: ["Majanduslik olukord"],
        compare: { "Majanduslik olukord": "majandus" },
        views: { trend: true, breakdown: { var: "Majanduslik olukord", title: "Majandusliku olukorra võrdlus", inPhrase: "majandusliku olukorra lõikes" } },
        queries: queries("KU123", ["Majanduslik olukord"], "Majanduslik olukord")
      }
    });
})(window.TAI);
