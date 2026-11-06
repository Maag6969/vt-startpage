/* ETU41 — Depressiooni sümptomite esinemine soo, vanuserühma ja taustatunnuste järgi. */
(function (TAI) {
  "use strict";

  var YEARS = ["2006", "2014", "2019"];

  TAI.registerTable({
    code: "ETU41",
    title: "Depressiooni sümptomid",
    fullTitle: "Depressiooni sümptomite esinemine soo, vanuserühma ja taustatunnuste järgi",
    description: "Olulise depressiooniga täiskasvanute osakaal {aastatel}.",
    eyebrow: "Eesti terviseuuring · ETU41",
    group: "Tervise Arengu Instituut",
    ai: { profile: "etu" },
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
    // Taustatunnus koondab nelja eri rühmitust (vt views.breakdown.groups), seega iga rühmitus saab oma nupu; 9 joont segamini oleks mõttetu.
    compare: {
      Taustatunnus: [
        { kind: "rahvus", values: ["1", "2"] },
        { kind: "haridus", values: ["5", "4", "3"] },   // madalamast kõrgemani, värvid samad mis teistes aruannetes
        { kind: "kooselu", values: ["6", "7"] },
        { kind: "aktiivsus", values: ["8", "9"] }
      ],
      "Vanuserühm": "vanus",
      Sugu: "sugu"
    },

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
     * state: { Taustatunnus, Sugu, Vanuserühm, compareSexes, compareAges }
     *  trend     — kõik aastad valitud lõikes (võrdlusel rühmad eraldi, vt TAI.selectionFromState)
     *  breakdown — viimane aasta, kõik taustatunnused
     */
    queries: function (state) {
      var cfg = TAI.getTable("ETU41");
      return {
        trend: TAI.buildQuery(cfg, TAI.selectionFromState(cfg, state, ["Taustatunnus", "Sugu", "Vanuserühm"], {})),
        breakdown: TAI.buildQuery(cfg, TAI.selectionFromState(cfg, state, ["Sugu", "Vanuserühm"], {
          Taustatunnus: cfg.vars.Taustatunnus.values
        }))
      };
    },

    footnotes: [
      "Olulise depressiooni hinnang põhineb Eesti terviseuuringu küsimustikul (vt TAI „Mõisted ja metoodika“)."
    ]
  });
})(window.TAI);
