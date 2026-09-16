/* ETU41 — Depressiooni sümptomite esinemine soo, vanuserühma ja taustatunnuste järgi. */
(function (TAI) {
  "use strict";

  var YEARS = ["2006", "2014", "2019"];

  TAI.registerTable({
    code: "ETU41",
    title: "Depressiooni sümptomid",
    fullTitle: "Depressiooni sümptomite esinemine soo, vanuserühma ja taustatunnuste järgi",
    description: "Olulise depressiooniga täiskasvanute osakaal aastatel 2006, 2014 ja 2019.",
    eyebrow: "Eesti terviseuuring · ETU41",
    years: YEARS,
    yearVar: "Aasta",
    indicator: {
      var: "Depressioon", positive: "1", label: "Olulise depressiooniga", unit: "%", higherIsWorse: true,
      phrase: "olulise depressiooniga {kes} osakaal"   // callout-lausete jaoks; {kes} = inimeste/meeste/naiste
    },

    vars: {
      Aasta: { label: "Aasta", values: YEARS, labels: YEARS },
      Taustatunnus: {
        label: "Taustatunnus",
        values: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
        labels: ["Kokku", "Eestlane", "Mitte-eestlane", "Kõrgharidus", "Keskharidus", "Põhiharidus või madalam",
                 "Kooselus", "Ei ole kooselus", "Majanduslikult aktiivne", "Majanduslikult mitteaktiivne"],
        totalValue: "0",
        defaultValue: "0"
      },
      Depressioon: { label: "Depressioon", values: ["0", "1"], labels: ["Olulise depressioonita", "Olulise depressiooniga"] },
      Sugu: TAI.sexVar(true),
      "Vanuserühm": TAI.ageVar(true)
    },

    // Kasutaja valitavad filtrid (järjekord = kuvamise järjekord)
    filters: ["Taustatunnus", "Vanuserühm", "Sugu"],
    canCompareSexes: true,

    views: {
      trend: true,
      breakdown: {
        var: "Taustatunnus",
        title: "Taustatunnuste võrdlus",
        inPhrase: "taustatunnuste lõikes",
        // "0" (Kokku) kuvatakse võrdlusjoonena, mitte tulbana
        groups: [
          { label: "Rahvus", values: ["1", "2"] },
          { label: "Haridus", values: ["3", "4", "5"] },
          { label: "Kooselu", values: ["6", "7"] },
          { label: "Majanduslik aktiivsus", values: ["8", "9"] }
        ]
      }
    },

    /*
     * state: { Taustatunnus, Sugu, Vanuserühm, compareSexes }
     *  trend     — kõik aastad valitud lõikes (võrdlusel mehed + naised eraldi)
     *  breakdown — viimane aasta, kõik taustatunnused
     */
    queries: function (state) {
      var cfg = TAI.getTable("ETU41");
      var sexOverride = state.compareSexes ? { Sugu: ["1", "2"] } : {};
      return {
        trend: TAI.buildQuery(cfg, TAI.selectionFromState(cfg, state, ["Taustatunnus", "Sugu", "Vanuserühm"], sexOverride)),
        breakdown: TAI.buildQuery(cfg, TAI.selectionFromState(cfg, state, ["Sugu", "Vanuserühm"], Object.assign({
          Aasta: [YEARS[YEARS.length - 1]],
          Taustatunnus: cfg.vars.Taustatunnus.values
        }, sexOverride)))
      };
    },

    footnotes: [
      "Olulise depressiooni hinnang põhineb Eesti terviseuuringu küsimustikul (vt TAI „Mõisted ja metoodika“)."
    ]
  });
})(window.TAI);
