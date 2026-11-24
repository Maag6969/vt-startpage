/*
 * TAI registritabelid (19.11.2026, T1 3. voor; otsused TEEMAIDEED.md T1 jaotis E). Arvud, mitte määrad.
 *  - Üldvaade (elukaareülesed, vanuserühm filtris): tahtlik enesekahjustus VIG13 (ravi vajanud inimesed) + VIG10 (juhud)
 *    ühe reana lülitiga, enesetapud SD21 (aastane arv), psüühikahäirete tõttu haiglast lahkunud PH01.
 *  - Lapsed ja noored: psühhiaatriline haiglaravi PKH4 (0–14 vs 15+, mõõdik filtrina).
 *
 * Üldmudel (config.seriesVar): seeriamuutuja on fikseeritud põhjus (X60–X84, enesetapp, F00–F99); PKH4-l mõõdik filtrina.
 * API kontrollitud 19.11.2026 (GET metaandmed, POST ühe lahtriga): koodid, viimane aasta 2025, TAI märkused (joonealused allpool).
 * Muutuse hinnangut („paranemine/halvenemine“) arvudele ei anta: valence on neutraalne.
 */
(function (TAI) {
  "use strict";

  function range(from, to) { var out = []; for (var y = from; y <= to; y++) out.push(String(y)); return out; }
  function codes(n) { var out = []; for (var i = 0; i < n; i++) out.push(String(i)); return out; }

  var SEX = { label: "Sugu", values: ["0", "1", "2"], labels: ["Kokku", "Mehed", "Naised"], totalValue: "0" };
  function sex() { return Object.assign({}, SEX, { values: SEX.values.slice(), labels: SEX.labels.slice() }); }

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

  var COUNT = { unit: "", unitLabel: "", decimals: 0, deltaPhrase: "", calloutUnit: false };

  // ---- Tahtlik enesekahjustus: VIG13 inimesed, VIG10 juhud (õdetabelid) ----
  var VIG_SIBLINGS = [{ code: "VIG13", label: "Inimesed" }, { code: "VIG10", label: "Juhud" }];
  var VIG_AGES = ["Kokku", "0–17", "18 ja vanemad", "0", "1–4", "5–14", "15–24", "25–34", "35–44", "45–54", "55–64",
                  "65–74", "75–84", "85 ja vanemad", "Vanus teadmata"];
  var VIG_PLACES = { values: ["0", "00", "37", "39", "45", "50", "52", "56", "60", "64", "68", "71", "74", "79", "81", "84", "87", "999", "9999", "99999"],
    labels: ["Elukohad kokku", "Eesti", "Harju maakond", "Hiiu maakond", "Ida-Viru maakond", "Jõgeva maakond", "Järva maakond", "Lääne maakond",
             "Lääne-Viru maakond", "Põlva maakond", "Pärnu maakond", "Rapla maakond", "Saare maakond", "Tartu maakond", "Valga maakond",
             "Viljandi maakond", "Võru maakond", "Maakond teadmata", "Elukoht väljaspool Eestit", "Elukoht teadmata"] };
  var VIG_NOTES = [
    "Tahtlik enesekahjustus (RHK-10 X60–X84) vigastuse välispõhjusena Tervisekassa raviarvetel, nagu tervishoiuteenuse osutaja selle dokumenteeris. " +
      "Arv näitab ravi vajanud juhtumeid, mitte kõiki enesekahjustusi: arsti juurde mitte jõudnud juhtumid siin ei kajastu.",
    "TAI märkus: ühe aasta andmetes on ka varem saadud vigastused, mis vajasid jätkuvalt ravi; aasta lõpus saadud vigastus võib jääda järgmise aasta andmetesse.",
    "Inimesed (VIG13): iga inimene on ühe välispõhjuse rühmas üks kord, olenemata vigastuste arvust aastas. Juhud (VIG10): vigastusjuhtude arv.",
    "Vanuserühmad 0–17 ja 18 ja vanemad on koondrühmad; neid ei saa liita teiste vanuserühmadega. Elukoht on rahvastikuregistri järgi; „Elukoht teadmata“ on „Elukohad kokku“ all, kuid mitte „Eesti“ all.",
    "Mõisted ja metoodika: Tervise Arengu Instituudi andmebaasis tabeli juures."
  ];

  function registerVig(code, title, measure) {
    TAI.registerTable(Object.assign({
      code: code,
      title: "Tahtlik enesekahjustus: " + title,
      familyTitle: "Tahtlik enesekahjustus",
      siblings: VIG_SIBLINGS,
      fullTitle: "Ravi vajanud tahtlik enesekahjustus",
      description: measure + " soo, vanuserühma ja elukoha järgi, 2016–2025.",
      eyebrow: "Vigastused · " + code,
      group: "Tervise Arengu Instituut",
      taiPath: "02Haigestumus/09Vigastused",
      ai: { profile: "register" },

      years: range(2016, 2025),
      yearVar: "Aasta",
      seriesVar: "Välispõhjus (RHK-10)",
      measureLabel: measure,
      vars: {
        Aasta: { label: "Aasta", values: range(2016, 2025), labels: range(2016, 2025) },
        "Välispõhjus (RHK-10)": { label: "Välispõhjus", values: ["X60-X84"], labels: ["Tahtlik enesekahjustus (X60–X84)"], totalValue: "X60-X84", valence: ["neutral"] },
        "Vanuserühm": { label: "Vanuserühm", values: codes(15), labels: VIG_AGES.slice(), totalValue: "0" },
        Sugu: sex(),
        Elukoht: { label: "Elukoht", param: "elukoht", values: VIG_PLACES.values.slice(), labels: VIG_PLACES.labels.slice(), totalValue: "0" }
      },
      filters: ["Vanuserühm", "Sugu", "Elukoht"],
      compare: {
        "Vanuserühm": { kind: "vanus", values: ["1", "2"], label: "0–17 vrdl 18+", buttonLabel: "Laste ja täiskasvanute võrdlus" },
        Sugu: "sugu"
      },
      views: {
        trend: true,
        breakdown: { var: "Vanuserühm", title: "Vanuserühmade võrdlus", inPhrase: "vanuserühmade lõikes", showTotal: false,
                     groups: [{ label: null, values: codes(14).slice(3) }] }
      },
      queries: queries(code, ["Vanuserühm", "Sugu", "Elukoht"], "Vanuserühm"),
      footnotes: VIG_NOTES
    }, COUNT));
  }
  registerVig("VIG13", "inimesed", "Tahtliku enesekahjustuse tõttu ravi vajanud inimeste arv");
  registerVig("VIG10", "juhud", "Ravi vajanud tahtliku enesekahjustuse juhtude arv");

  // ---- Enesetapud SD21 (aastane arv) ----
  var SD_AGES = ["Kokku", "0", "1–9", "10–14", "0–17", "15–19", "20–24", "25–29", "30–34", "35–39", "40–44", "45–49", "50–54",
                 "55–59", "60–64", "65–69", "70–74", "75–79", "80–84", "85 ja vanemad", "85–89", "90–94", "95–99", "100 ja vanemad", "Vanus teadmata"];
  TAI.registerTable(Object.assign({
    code: "SD21",
    title: "Enesetapud",
    fullTitle: "Enesetapud: surmade arv",
    description: "Enesetapu tõttu surnute arv soo ja vanuserühma järgi, 1989–2025.",
    eyebrow: "Surmad · SD21",
    group: "Tervise Arengu Instituut",
    taiPath: "01Rahvastik/04Surmad",
    ai: { profile: "register", notes: ["Enesetappude arv on väike, eriti noorte vanuserühmades: aastane arv kõigub juhuslikult. Ära tõlgenda üksiku aasta tõusu või langust trendina."] },

    years: range(1989, 2025),
    yearVar: "Aasta",
    seriesVar: "Surma põhjus",
    measureLabel: "Enesetapu tõttu surnute arv",
    vars: {
      Aasta: { label: "Aasta", values: range(1989, 2025), labels: range(1989, 2025) },
      "Surma põhjus": { label: "Surma põhjus", values: ["92"], labels: ["Enesetapp (X60–X84, Y87.0)"], totalValue: "92", valence: ["neutral"] },
      Sugu: sex(),
      "Vanuserühm": { label: "Vanuserühm", values: codes(25), labels: SD_AGES.slice(), totalValue: "0" }
    },
    filters: ["Vanuserühm", "Sugu"],
    compare: {
      "Vanuserühm": { kind: "vanus", values: ["3", "5", "6"], label: "10–14, 15–19, 20–24 vrdl", buttonLabel: "Noorte vanuserühmade võrdlus" },
      Sugu: "sugu"
    },
    views: {
      trend: true,
      breakdown: { var: "Vanuserühm", title: "Vanuserühmade võrdlus", inPhrase: "vanuserühmade lõikes", showTotal: false,
                   groups: [{ label: null, values: ["3"].concat(codes(20).slice(5)) }] }
    },
    queries: queries("SD21", ["Vanuserühm", "Sugu"], "Vanuserühm"),
    footnotes: [
      "Surmade arv põhjusel enesetapp (RHK-10 X60–X84, Y87.0) surma põhjuste registri andmetel. Arv, mitte määr: rahvaarvuga ei ole jagatud.",
      "Väikeste arvude puhul (eriti alla 25-aastased) kõigub aastane arv juhuslikult; üksiku aasta muutusest ei saa järeldada trendi.",
      "TAI märkus (26.05.2026): laste puhul, kus arvud on väikesed, on soo kaupa andmed eemaldatud 0-aastastel alates 2024., 1–9-aastastel alates 2018. ja 10–14-aastastel alates 2009. aastast.",
      "TAI märkus: alates 2008. aastast erinevad andmed Statistikaameti avaldatutest (elukoha määramise erinevus). Vanuserühmad 0–17 ja 85 ja vanemad on koondrühmad.",
      "Tulpdiagrammil on vanuserühmad alates 10–14-aastastest; nooremad on filtris valitavad.",
      "Mõisted ja metoodika: Tervise Arengu Instituudi andmebaasis tabeli juures."
    ]
  }, COUNT));

  // ---- Psüühika- ja käitumishäirete tõttu haiglast lahkunud PH01 ----
  var PH_AGES = ["Kokku", "0", "1–4", "5–9", "10–14", "15–19", "20–24", "25–34", "35–44", "45–54", "55–64", "65–74",
                 "75 ja vanemad", "75–84", "85 ja vanemad"];
  TAI.registerTable(Object.assign({
    code: "PH01",
    title: "Psüühikahäirete haiglaravi",
    fullTitle: "Psüühika- ja käitumishäirete tõttu haiglast lahkunud",
    description: "Haiglast lahkunute arv põhjusel psüühika- ja käitumishäired (F00–F99) soo ja vanuserühma järgi, 2003–2025.",
    eyebrow: "Tervishoiuteenused · PH01",
    group: "Tervise Arengu Instituut",
    taiPath: "03Tervishoiuteenused/02Paevaravi",
    ai: { profile: "register" },

    years: range(2003, 2025),
    yearVar: "Aasta",
    seriesVar: "Põhjus (RHK-10)",
    measureLabel: "Psüühika- ja käitumishäirete tõttu haiglast lahkunute arv",
    vars: {
      Aasta: { label: "Aasta", values: range(2003, 2025), labels: range(2003, 2025) },
      "Ravitüüp": { label: "Ravitüüp", values: ["0"], labels: ["Ravitüüp kokku"], totalValue: "0" },
      "Põhjus (RHK-10)": { label: "Ravi põhjus", values: ["F00-F99"], labels: ["Psüühika- ja käitumishäired (F00–F99)"], totalValue: "F00-F99", valence: ["neutral"] },
      Sugu: sex(),
      "Vanuserühm": { label: "Vanuserühm", values: codes(15), labels: PH_AGES.slice(), totalValue: "0" }
    },
    filters: ["Vanuserühm", "Sugu"],
    compare: {
      "Vanuserühm": { kind: "vanus", values: ["4", "5", "6"], label: "10–14, 15–19, 20–24 vrdl", buttonLabel: "Noorte vanuserühmade võrdlus" },
      Sugu: "sugu"
    },
    views: {
      trend: true,
      breakdown: { var: "Vanuserühm", title: "Vanuserühmade võrdlus", inPhrase: "vanuserühmade lõikes", showTotal: false,
                   groups: [{ label: null, values: codes(12).slice(1).concat(["13", "14"]) }] }
    },
    queries: queries("PH01", ["Vanuserühm", "Sugu"], "Vanuserühm"),
    footnotes: [
      "Haiglast lahkunute arv, mille ravi põhjus on psüühika- ja käitumishäired (RHK-10 F00–F99); ravitüübid (aktiivravi ja õendusabi) kokku.",
      "TAI märkus: 1.10.2026 uuendati 2024. aasta andmeid. Andmed ravitüübi järgi on kogutud alates 2016. aastast.",
      "Vanuserühm „75 ja vanemad“ on koondrühm (75–84 ja 85 ja vanemad); tulpdiagrammil on alarühmad.",
      "Mõisted ja metoodika: Tervise Arengu Instituudi andmebaasis tabeli juures."
    ]
  }, COUNT));

  // ---- Laste psühhiaatriline haiglaravi PKH4 (vaade „Lapsed ja noored“) ----
  var PKH_DIAG = {
    values: ["F00-F98", "F00-F09", "F10-F19", "F20-F29", "F30-F39", "F40-F48", "F50-F59", "F60-F69", "F70-F79", "F80-F89", "F90-F98"],
    labels: ["Psüühika- ja käitumishäired (F00–F98)", "Orgaanilised psüühikahäired (F00–F09)",
             "Psühhoaktiivsete ainete tarvitamisest tingitud häired (F10–F19)", "Skisofreenia, skisotüüpsed ja luululised häired (F20–F29)",
             "Meeleoluhäired (F30–F39)", "Neurootilised, stressiga seotud ja somatoformsed häired (F40–F48)",
             "Füsioloogilise düsfunktsiooniga häired (F50–F59)", "Täiskasvanu isiksus- ja käitumishäired (F60–F69)",
             "Vaimne alaareng (F70–F79)", "Psühholoogilise arengu häired (F80–F89)", "Lapseeas alanud käitumis- ja tundeeluhäired (F90–F98)"]
  };
  var PKH_MEASURES = ["Psühhiaatria haiglaravilt väljakirjutatute arv", "Psühhiaatria haiglaravi voodipäevade arv",
                      "Psühhiaatria haiglaravi keskmine kestus (päevades)"];
  function pkhMeasure(state) { return state["Väljakirjutatud ja ravikestus"] || "0"; }

  TAI.registerTable({
    code: "PKH4",
    title: "Psühhiaatriline haiglaravi",
    fullTitle: "Psühhiaatriline haiglaravi: kõik vanused, lapsed (0–14) ja vanemad",
    description: "Psühhiaatria haiglaravilt väljakirjutatud, voodipäevad ja keskmine ravikestus diagnoosirühma järgi, 1997–2025; vanuserühmade (0–14, 15+) jaotus 2011–2025.",
    eyebrow: "Psüühikahäired · PKH4",
    group: "Tervise Arengu Instituut",
    listView: "noored",
    taiPath: "02Haigestumus/05Psyyhikahaired",
    ai: { profile: "register", notes: ["Vanuserühm „Kokku“ (kõik vanused) on andmed alates 1997; vanuserühmi on ainult kaks: 0–14 ja 15 ja vanemad, need on alates 2011. 15–17-aastased on rühmas 15 ja vanemad koos täiskasvanutega; ära tee nende kohta eraldi järeldusi."] },

    years: range(1997, 2025),
    yearVar: "Aasta",
    seriesVar: "Väljakirjutatud ja ravikestus",
    measureLabel: function (state) { return PKH_MEASURES[Number(pkhMeasure(state))]; },
    unit: "",
    unitLabel: "",
    decimals: function (state) { return pkhMeasure(state) === "2" ? 1 : 0; },
    deltaPhrase: function (state) { return pkhMeasure(state) === "2" ? "päeva" : ""; },
    calloutUnit: false,
    // keskmine ravikestus on TAI tabelis 0, kui ravijuhte polnud: see ei ole kestus, vaid andmete puudumine
    zeroIsMissing: function (state) { return pkhMeasure(state) === "2"; },
    vars: {
      Aasta: { label: "Aasta", values: range(1997, 2025), labels: range(1997, 2025) },
      "Diagnoos (RHK-10)": {
        label: "Diagnoos", param: "diagnoos", values: PKH_DIAG.values.slice(), labels: PKH_DIAG.labels.slice(),
        optionLabels: PKH_DIAG.labels.map(function (l, i) { return i ? "– " + l : l; }), totalValue: "F00-F98"
      },
      "Vanuserühm": { label: "Vanuserühm", values: ["0", "1", "2"], labels: ["Kokku", "0–14", "15 ja vanemad"], totalValue: "0", defaultValue: "0" },
      "Väljakirjutatud ja ravikestus": {
        label: "Näitaja", param: "naitaja", values: ["0", "1", "2"], labels: ["Haiglast väljakirjutatud", "Voodipäevad", "Keskmine ravikestus (päeva)"],
        defaultValue: "0", valence: ["neutral", "neutral", "neutral"]
      }
    },
    filters: ["Väljakirjutatud ja ravikestus", "Vanuserühm", "Diagnoos (RHK-10)"],
    compare: {
      "Vanuserühm": { kind: "vanus", values: ["1", "2"], label: "0–14 vrdl 15+", buttonLabel: "Vanuserühmade võrdlus" }
    },
    views: {
      trend: true,
      breakdown: { var: "Diagnoos (RHK-10)", title: "Diagnoosirühmade võrdlus", inPhrase: "diagnoosirühmade lõikes", showTotal: false, sort: "desc" }
    },
    queries: queries("PKH4", ["Väljakirjutatud ja ravikestus", "Vanuserühm", "Diagnoos (RHK-10)"], "Diagnoos (RHK-10)"),
    footnotes: [
      "Psühhiaatriahaigla, -osakonna või psühhiaatrilise voodiprofiiliga haigla statsionaarsed ravijuhud lõpliku kliinilise põhidiagnoosi järgi (TAI märkus).",
      "Vanuserühm „Kokku“ (kõik vanused) on andmed alates 1997. aastast. Vanuserühmi on kaks: 0–14 ja 15 ja vanemad; 15–17-aastased on koos täiskasvanutega. Vanuserühma kaupa on andmed alates 2011. aastast (varasemad aastad: „andmed puuduvad“).",
      "Väljakirjutatute ja voodipäevade arv on arvud, mitte määrad. Keskmine ravikestus on päevades; kui ravijuhte ei olnud, on TAI tabelis 0 ja siin „andmed puuduvad“.",
      "Andmed kogutakse iga-aastase aruandega „Psüühika- ja käitumishäired“. Mõisted ja metoodika: Tervise Arengu Instituudi andmebaasis tabeli juures."
    ]
  });
})(window.TAI);
