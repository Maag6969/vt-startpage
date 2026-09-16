/* ETU42 — Emotsionaalse distressi esinemine soo ja vanuserühma järgi. */
(function (TAI) {
  "use strict";

  var YEARS = ["2006", "2014", "2019"];

  TAI.registerTable({
    code: "ETU42",
    title: "Emotsionaalne distress",
    fullTitle: "Emotsionaalse distressi esinemine soo ja vanuserühma järgi",
    description: "Olulise emotsionaalse distressiga täiskasvanute osakaal aastatel 2006, 2014 ja 2019.",
    eyebrow: "Eesti terviseuuring · ETU42",
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
    canCompareSexes: true,

    views: {
      trend: true,
      breakdown: { var: "Vanuserühm", title: "Vanuserühmade võrdlus", inPhrase: "vanuserühmade lõikes" }
    },

    queries: function (state) {
      var cfg = TAI.getTable("ETU42");
      var sexOverride = state.compareSexes ? { Sugu: ["1", "2"] } : {};
      return {
        trend: TAI.buildQuery(cfg, TAI.selectionFromState(cfg, state, ["Sugu", "Vanuserühm"], sexOverride)),
        breakdown: TAI.buildQuery(cfg, TAI.selectionFromState(cfg, state, ["Sugu"], Object.assign({
          Aasta: [YEARS[YEARS.length - 1]],
          "Vanuserühm": cfg.vars["Vanuserühm"].values
        }, sexOverride)))
      };
    },

    footnotes: [
      "Emotsionaalse distressi esinemine viimasel neljal nädalal.",
      "Aastatel 2006 ja 2014 olid vanuserühmad „16 ja vanemad“ ning „16–24“, 2019. aastal „15 ja vanemad“ ning „15–24“."
    ]
  });
})(window.TAI);
