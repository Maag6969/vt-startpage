/* ETU42 — Emotsionaalse distressi esinemine soo ja vanuserühma järgi. */
(function (TAI) {
  "use strict";

  var YEARS = ["2006", "2014", "2019"];

  TAI.registerTable({
    code: "ETU42",
    title: "Emotsionaalne distress",
    fullTitle: "Emotsionaalse distressi esinemine soo ja vanuserühma järgi",
    description: "Olulise emotsionaalse distressiga täiskasvanute osakaal {aastatel}.",
    eyebrow: "Eesti terviseuuring · ETU42",
    group: "Tervise Arengu Instituut",
    ai: {
      profile: "etu",
      notes: ["Vanuserühmade piirid erinevad aastati (2006 ja 2014: alates 16. eluaastast, 2019: alates 15. eluaastast). Nimeta seda nende aastate võrdlemisel piiranguna."]
    },
    years: YEARS,
    yearVar: "Aasta",
    indicator: {
      var: "Distress", positive: "1", label: "Olulise distressiga", unit: "%", higherIsWorse: true,
      phrase: "olulise emotsionaalse distressiga {kes} osakaal"
    },

    vars: {
      Aasta: { label: "Aasta", values: YEARS, labels: YEARS },
      Distress: { label: "Distress", values: ["0", "1"], labels: ["Olulise distressita", "Olulise distressiga"] },
      Sugu: TAI.sexVar(true),
      "Vanuserühm": TAI.ageVar(true)
    },

    filters: ["Sugu", "Vanuserühm"],
    compare: { Sugu: "sugu", "Vanuserühm": "vanus" },

    views: {
      trend: true,
      breakdown: { var: "Vanuserühm", title: "Vanuserühmade võrdlus", inPhrase: "vanuserühmade lõikes" }
    },

    queries: function (state) {
      var cfg = TAI.getTable("ETU42");
      return {
        trend: TAI.buildQuery(cfg, TAI.selectionFromState(cfg, state, ["Sugu", "Vanuserühm"], {})),
        breakdown: TAI.buildQuery(cfg, TAI.selectionFromState(cfg, state, ["Sugu"], {
          "Vanuserühm": cfg.vars["Vanuserühm"].values
        }))
      };
    },

    // Kuvatakse trendijoonise all (disain.md p. 5)
    trendNote: "Märkus: 2006. ja 2014. aastal olid vanuserühmad „16 ja vanemad“ ning „16–24“, 2019. aastal " +
      "„15 ja vanemad“ ning „15–24“.",

    // Lisalause callout'i lõppu, kui filtri väärtus vastab
    calloutCaveats: [
      { var: "Vanuserühm", values: ["1"],
        text: "Võrdlus varasemate aastatega on ligikaudne, sest 2006. ja 2014. aastal hõlmas see vanuserühm 16–24-aastaseid." }
    ],

    footnotes: [
      "Emotsionaalse distressi esinemine viimasel neljal nädalal."
    ]
  });
})(window.TAI);
