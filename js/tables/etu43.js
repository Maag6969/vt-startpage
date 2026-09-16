/* ETU43 — Uneaja piisavus soo ja vanuserühma järgi (ainult 2019). */
(function (TAI) {
  "use strict";

  var YEARS = ["2019"];

  TAI.registerTable({
    code: "ETU43",
    title: "Uneaja piisavus",
    fullTitle: "Uneaja piisavus soo ja vanuserühma järgi",
    description: "Ebapiisava uneajaga täiskasvanute osakaal 2019. aastal.",
    eyebrow: "Eesti terviseuuring · ETU43",
    years: YEARS,
    yearVar: "Aasta",
    indicator: {
      var: "Piisavus", positive: "1", label: "Ebapiisav uneaeg", unit: "%", higherIsWorse: true,
      phrase: "ebapiisava uneajaga {kes} osakaal"
    },

    vars: {
      Aasta: { label: "Aasta", values: YEARS, labels: YEARS },
      Piisavus: { label: "Piisavus", values: ["0", "1"], labels: ["Piisav uneaeg", "Ebapiisav uneaeg"] },
      // NB! Eliminatsioonita — buildQuery lisab koondkategooria "0" ise, kui valikut pole.
      Sugu: TAI.sexVar(false),
      "Vanuserühm": TAI.ageVar(false)
    },

    filters: ["Sugu"],
    canCompareSexes: true,

    // Ainult üks aasta → trendijoonist ega delta-muutust pole (disain.md p. 5)
    views: {
      trend: false,
      breakdown: { var: "Vanuserühm", title: "Vanuserühmade võrdlus", inPhrase: "vanuserühmade lõikes" }
    },

    queries: function (state) {
      var cfg = TAI.getTable("ETU43");
      var sexes = state.compareSexes ? ["1", "2"] : [state.Sugu || "0"];
      return {
        breakdown: TAI.buildQuery(cfg, {
          Sugu: sexes,
          "Vanuserühm": cfg.vars["Vanuserühm"].values
        })
      };
    },

    // Selgitav rida KPI-kaardil (ühe aastaga tabelil muutuse rida pole)
    kpiNote: "uneaeg alla soovitatud aja (18-aastased ja vanemad: 7–8 tundi ööpäevas)",

    footnotes: [
      "Küsimus: „Kui pikk on keskmiselt Teie ööpäevane uneaeg?“ Alla 18-aastastele soovitatakse magada 9 tundi, " +
      "18-aastastele ja vanematele 7–8 tundi ööpäevas."
    ]
  });
})(window.TAI);
