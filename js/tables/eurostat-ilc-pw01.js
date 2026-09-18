/*
 * Eurostat ilc_pw01 — Eluga rahulolu (0–10 hindamisskaala) soo, vanuse ja hariduse lõikes,
 * riikide võrdlusega. Esimene Eurostati andmestik vt-startpage'il (17.09.2026) — vt README.md
 * "Eurostat" jaotist ja TASKS.md piloteerimise etappe.
 *
 * KUJU: kasutab uut, üldist mudelit (config.seriesVar/measureLabel, mitte vana config.indicator) —
 * vt js/module.js "Uus, üldine andmemudel". Andmeallikas on GET+query-string (mitte PxWeb POST),
 * vt TAI.fetchJsonStatUrl / TAI.EUROSTAT_BASE core.js-is.
 *
 * OLULINE MUSTER (17.09.2026 arutelu, kuidas "riik" täidab korraga kaks rolli):
 *   - Trend/KPI: config.seriesVar = "geo", aga config.seriesValues = ["EE"] piirab seeriaks AINULT
 *     Eesti — lihtne, kiirelt haaratav joon (kasutaja soov: "pilt on poliitikakujundajale kiirelt
 *     haaratav"). EL-27 keskmine lisatakse KPI-kaardile väikese võrdlusreana (config.kpiReference),
 *     mitte teise täisseeriana.
 *   - Breakdown: views.breakdown.var on SAMA "geo" muutuja, aga täies mahus (kõik riigid) — vaikimisi
 *     kompaktne komplekt (defaultValues), "Näita kõiki" nupp avab kõik. EL-27 (totalValue) kuvatakse
 *     katkendjoonena, Eesti (highlight) tumesinisena esile tõstetud.
 *   See toimib, sest data.trend ja data.breakdown on KAKS eraldi Eurostati päringut (vt queries()) —
 *   trend küsib ainult EE+EU27_2020, breakdown küsib kõik riigid ühe (uusima) aasta kohta.
 */
(function (TAI) {
  "use strict";

  var YEARS = ["2013", "2018", "2021", "2022", "2023", "2024", "2025"];

  // [kood, Eesti nimi] — Eurostati "geo" dimensiooni väärtused, kontrollitud 17.09.2026 otse API vastu.
  var COUNTRIES = [
    ["EE", "Eesti"], ["LV", "Läti"], ["LT", "Leedu"], ["FI", "Soome"], ["SE", "Rootsi"], ["NO", "Norra"],
    ["DK", "Taani"], ["IS", "Island"], ["DE", "Saksamaa"], ["FR", "Prantsusmaa"], ["NL", "Holland"],
    ["BE", "Belgia"], ["LU", "Luksemburg"], ["AT", "Austria"], ["CH", "Šveits"], ["IE", "Iirimaa"],
    ["UK", "Ühendkuningriik"], ["ES", "Hispaania"], ["PT", "Portugal"], ["IT", "Itaalia"], ["EL", "Kreeka"],
    ["MT", "Malta"], ["CY", "Küpros"], ["PL", "Poola"], ["CZ", "Tšehhi"], ["SK", "Slovakkia"],
    ["HU", "Ungari"], ["SI", "Sloveenia"], ["HR", "Horvaatia"], ["RO", "Rumeenia"], ["BG", "Bulgaaria"],
    ["ME", "Montenegro"], ["RS", "Serbia"], ["MK", "Põhja-Makedoonia"], ["AL", "Albaania"], ["TR", "Türgi"]
  ];
  var COUNTRY_CODES = COUNTRIES.map(function (c) { return c[0]; });
  var COUNTRY_LABELS = COUNTRIES.map(function (c) { return c[1]; });
  var COUNTRY_VALENCE = COUNTRY_CODES.map(function (c) { return c === "EE" ? "positive" : "neutral"; });

  var DEFAULT_COUNTRIES = ["EE", "LV", "LT", "FI", "SE", "NO"]; // Balti + Põhjamaad (kasutaja valik 17.09.2026)

  TAI.registerTable({
    code: "ilc_pw01",
    title: "Eluga rahulolu (EL)",
    fullTitle: "Eluga rahulolu soo, vanuse ja hariduse lõikes, riikide võrdluses",
    description: "Üldine eluga rahulolu (0–10 hindamisskaala), Eesti Euroopa Liidu riikide võrdluses.",
    eyebrow: "Eurostat · ilc_pw01",

    years: YEARS,
    yearVar: "time",
    seriesVar: "geo",
    seriesValues: ["EE"],
    measureLabel: "Eluga rahulolu",
    unit: "",
    unitLabel: "hinne skaalal 0 (üldse mitte rahul) kuni 10 (täiesti rahul)",
    deltaPhrase: "palli",
    axisMax: 10,

    kpiLabel: "Kokku",
    kpiReference: { var: "geo", value: "EU27_2020", label: "EL-27 keskmine", subjectLabel: "Eesti tulemus" },

    source: {
      label: "Eurostat",
      longLabel: "Eurostat (Euroopa Liidu statistikaamet)",
      url: "https://ec.europa.eu/eurostat/databrowser/product/view/ilc_pw01"
    },

    vars: {
      time: { label: "Aasta", values: YEARS, labels: YEARS },
      geo: {
        label: "Riik",
        values: COUNTRY_CODES.concat(["EU27_2020"]),
        labels: COUNTRY_LABELS.concat(["EL-27 keskmine"]),
        valence: COUNTRY_VALENCE.concat(["neutral"]),
        totalValue: "EU27_2020"
      },
      sex: {
        label: "Sugu",
        values: ["T", "M", "F"],
        labels: ["Kokku", "Mehed", "Naised"],
        totalValue: "T"
      },
      age: {
        label: "Vanuserühm",
        values: ["Y_GE16", "Y16-24", "Y25-34", "Y25-64", "Y35-49", "Y50-64", "Y65-74", "Y_GE65", "Y_GE75"],
        labels: ["16 ja vanemad", "16–24", "25–34", "25–64", "35–49", "50–64", "65–74", "65 ja vanemad", "75 ja vanemad"],
        totalValue: "Y_GE16"
      },
      isced11: {
        label: "Haridustase",
        values: ["TOTAL", "ED0-2", "ED3_4", "ED5-8"],
        labels: ["Kokku", "Põhiharidus või madalam", "Kesk- või kutseharidus", "Kõrgharidus"],
        totalValue: "TOTAL"
      }
    },

    filters: ["sex", "age", "isced11"],

    views: {
      trend: true,
      breakdown: {
        var: "geo",
        title: "Riikide võrdlus",
        inPhrase: "riikide võrdluses",
        defaultValues: DEFAULT_COUNTRIES,
        expandFlag: "showAllCountries",
        highlight: "EE"
      }
    },

    /*
     * NB: Eurostati API nõuab korduvaid geo=-parameetreid mitmeväärtuselise valiku jaoks
     * (nt "geo=EE&geo=EU27_2020"), mitte komadega eraldatud loendit ("geo=EE,EU27_2020" annab
     * tühja tulemuse, size=0 — kontrollitud 17.09.2026 otse API vastu).
     */
    queries: function (state) {
      var cfg = TAI.getTable("ilc_pw01");
      var filters = "sex=" + (state.sex || "T") + "&age=" + (state.age || "Y_GE16") + "&isced11=" + (state.isced11 || "TOTAL");
      var base = TAI.EUROSTAT_BASE + "ilc_pw01?format=JSON&lang=EN&" + filters;
      var latest = YEARS[YEARS.length - 1];
      function geoParams(codes) { return codes.map(function (c) { return "geo=" + encodeURIComponent(c); }).join("&"); }
      return {
        // Trend: ainult Eesti + EL-27 (viimane KPI-võrdluseks, vt kpiReference), kõik aastad.
        trend: base + "&" + geoParams(["EE", "EU27_2020"]),
        // Breakdown: kõik riigid (sh EL-27 katkendjoone jaoks), ainult uusim aasta.
        breakdown: base + "&" + geoParams(cfg.vars.geo.values) + "&time=" + latest
      };
    },

    footnotes: [
      "Küsimus: „Kui rahul olete Te oma eluga üldiselt?“, hinnatud skaalal 0 (üldse mitte rahul) kuni " +
      "10 (täiesti rahul). Allikas: EL-SILC (sissetulekute ja elutingimuste uuring).",
      "Andmed pärinevad liikmesriikide endi küsitlustest ja koondatakse Eurostati poolt ühtsel kujul " +
      "kõigi Euroopa Liidu riikide võrdlemiseks."
    ]
  });
})(window.TAI);
