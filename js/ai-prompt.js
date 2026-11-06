/*
 * AI-analüüsi juhise koostamine (metoodika ja kasutaja otsused: AI-ANALUUS.md).
 *
 * Lehel ei ole oma AI-mudelit ega API-kutset: juhis kopeeritakse lõikelauale ja külastaja kleebib selle oma
 * kontol avatud teenusesse (kopeerimine ja avamine: app.js). Juhis töötab seega iga mudeliga, ka tasutaga,
 * mistõttu kõik reeglid on tekstis endas.
 *
 * Juhis = ühine struktuur + allika profiil (config.ai.profile) + aruande enda märkused (config.ai.notes) +
 * ekraanil nähtav aruanne. Aruandel ilma config.ai väljata nuppe ei näidata: uue allika reeglid tuleb enne
 * läbi mõelda (eriti, mida selle allika number EI tähenda).
 *
 * Aastate märkused tulevad config.years ja config.provisionalYears väljadest, nii et uus aasta ei vaja juhise muutmist.
 */
(function (TAI) {
  "use strict";

  var TARGETS = [
    { id: "claude", label: "Claude", url: "https://claude.ai/new" },
    { id: "chatgpt", label: "ChatGPT", url: "https://chatgpt.com/" },
    { id: "gemini", label: "Gemini", url: "https://gemini.google.com/app" }
  ];

  var COMMON_RULES = [
    "Ära anna meditsiinilist ega isiklikku nõu ega hinda ühegi inimese tervist.",
    "Kasuta numbritena ainult allpool antud andmeid. Ära too väljast numbreid ega arvuta näitajaid, mida aruandes pole (nt levimus, määr, inimeste arv).",
    "Ära liida kattuvaid rühmi ega võrdle eri allikate numbreid, nagu mõõdaksid need sama asja.",
    "Ära esita põhjust faktina.",
    "Ära tee rühmade kohta üldistavaid ega häbimärgistavaid väiteid (nt rahvus, haridus, sugu): erinevus kirjeldab andmeid, mitte rühma omadusi.",
    "Ära järjesta riike ega piirkondi hinnanguliselt („parim“, „halvim“); võid öelda „kõrgeim“ ja „madalaim“."
  ];

  var PROFILES = {
    // TAI Eesti terviseuuring (ETU41–43)
    etu: {
      role: "vaimse tervise andmeanalüütik",
      measure: "Numbrid on küsitluse (Eesti terviseuuring) tulemused: vastanute osakaal, kelle puhul küsitlus näitas seda sümptomit või olukorda. See ei ole arsti pandud diagnoos.",
      direction: "Sõnu „paranes“ ja „halvenes“ kasuta ainult näitaja kohta (nt „sümptomite osakaalu kasv on näitaja järgi ebasoodne“). Ära kirjuta, et inimeste vaimne tervis paranes või halvenes.",
      explanations: "Võimalikke põhjuseid võid nimetada ainult oletusena.",
      advice: "võimalikud sisulised sammud ja küsimused tervisevaldkonnale",
      international: "Ära väida, et Eesti tulemused on rahvusvaheliselt hästi võrreldavad, ega seda, kus Eesti teiste riikide suhtes asub.",
      rules: []
    },
    // Tervisekassa avaandmed (TERVISEKASSA.md p. 3)
    tervisekassa: {
      role: "tervishoiu raviandmete analüütik",
      measure: "Number on isikute arv Tervisekassa arvete ja retseptide andmetes. See näitab, kui paljudel inimestel on see diagnoos raviandmetes kirjas, mitte seda, kui paljudel inimestel see haigus on.",
      direction: "Ära nimeta isikute arvu muutust halvenemiseks ega paranemiseks ja ära kasuta selle kohta sõnu „paranes“, „halvenes“, „parem“ ega „halvem“. Kirjelda muutust ainult arvudes („kasvas“, „vähenes“).",
      explanations: "Selgitustena võid nimetada ainult abi otsimist, teenuste kasutust ja kodeerimist (kuidas diagnoose kirja pannakse). Kliinilisi väiteid ära tee: ära väida midagi haiguse esinemise, raskuse ega ravi tulemuste kohta.",
      advice: "ainult küsimused andmeomanikule (Tervisekassa) ja edasiseks uurimiseks; ära soovita ravi ega tervishoiukorralduse muudatusi",
      international: "Ära väida, et need raviandmed on teiste riikide andmetega võrreldavad.",
      rules: [
        "Isikute arv ei ole levimus ega ravimata inimeste osakaal. Ära lahuta küsitluste sümptomite protsendist raviandmeid, et leida „ravimata inimesi“.",
        "Ära liida diagnoose ega aastaid: sama inimene võib olla nii F32 kui ka F33 all ja mitmel aastal. Ära arvuta ka „perioodi isikuid“.",
        "Retseptide arv ei ole ravimeid saanud inimeste arv ja arvete arv ei ole visiitide arv.",
        "Ära arvuta määrasid (nt 100 000 elaniku kohta): rahvaarve aruandes ei ole."
      ]
    },
    // Eurostat ilc_pw01
    eurostat: {
      role: "heaolu statistika analüütik",
      measure: "Number on inimeste enda hinnang eluga rahulolule skaalal 0 (üldse mitte rahul) kuni 10 (täiesti rahul). See ei ole vaimse tervise diagnoos ega haiguse näitaja.",
      direction: "Sõnu „paranes“ ja „halvenes“ kasuta ainult näitaja kohta (nt „rahulolu näitaja paranes“), mitte inimeste elu ega tervise kohta.",
      explanations: "Võimalikke põhjuseid võid nimetada ainult oletusena.",
      advice: "võimalikud sisulised sammud ja küsimused heaolu valdkonnale",
      international: "Allpool aruandes olevate riikide numbreid võid kasutada. Muid riike nimeta ainult viitena, ilma numbriteta.",
      rules: []
    }
  };

  /* Aastate märkus: üks aasta = trendi ei ole; lüngad = nimeta neid; pooleli = ei ole täisaasta. */
  function yearNotes(config) {
    var years = config.years || [];
    var notes = [];
    if (years.length === 1) {
      notes.push("Andmetes on ainult üks aasta (" + years[0] + "): trendi ega aastatevahelist muutust ära analüüsi, kirjelda osas 2 ainult erinevusi rühmade vahel.");
    } else if (years.length > 1) {
      var gaps = years.some(function (y, i) { return i > 0 && Number(y) - Number(years[i - 1]) !== 1; });
      notes.push("Andmetes on aastad " + years.join(", ") + "." + (gaps
        ? " Need ei ole järjestikused: vahele jäävate aastate kohta andmeid ei ole, nimeta seda trendi kirjeldades."
        : ""));
    }
    var open = config.provisionalYears || [];
    if (open.length) {
      notes.push(open.join(", ") + ". aasta on pooleli ega ole täisaasta: ära tõlgenda selle väiksemat arvu vähenemisena.");
    }
    return notes;
  }

  function bullets(list) { return list.map(function (r) { return "- " + r; }); }

  TAI.aiTargets = TARGETS;

  TAI.aiAvailable = function (config) { return !!(config.ai && PROFILES[config.ai.profile]); };

  /* Juhise tekst ilma aruande andmeteta (eraldi, et seda saaks testida ja üle vaadata). */
  TAI.aiInstructions = function (config) {
    var p = PROFILES[config.ai.profile];
    var rules = COMMON_RULES.concat(p.rules, config.ai.notes || [], yearNotes(config));
    return [
      "Oled " + p.role + ". Allpool on Eesti vaimse tervise näidikulaua üks aruanne koos kasutaja valitud lõikega ja kõigi ekraanil kuvatud andmetega. Kirjuta eesti keeles selge, neutraalse tooniga analüüs, mida saab lugeda ka ilma statistika taustata.",
      "",
      "Mida number tähendab: " + p.measure,
      "",
      "Kasuta täpselt seda struktuuri:",
      "1. Lühikirjeldus: mida näitaja mõõdab ja milline lõige on praegu valitud.",
      "2. Trend või muutus: suund, murdepunktid, erinevused rühmade vahel. Nimeta iga trendiväite juures, mitu andmepunkti seda toetab; kui väide põhineb ühel-kahel andmepunktil, nimeta seda esialgseks märgiks, mitte trendiks. " + p.direction,
      "3. Seosed ja võimalikud selgitused: märgi iga väide kas „andmetest tulenev“ või „oletus“. Sõnasta oletused ettevaatlikult („võib olla seotud“, „üks võimalik selgitus“); ära kasuta väljendeid „kindlasti“, „ilmselt“ ega „suure tõenäosusega“. " + p.explanations,
      "4. Soovitused: jaga kaheks: (a) " + p.advice + "; (b) mida andmestik võiks lisaks sisaldada. Sõnasta ettevaatlikult, ilma kategooriliste väideteta. Ära soovita, milliseid filtreid lehel valida: see on lugeja otsus.",
      "5. Rahvusvaheline võrdlus: kui tead samal teemal usaldusväärset avalikku allikat (nt Eurostat, OECD), nimeta see võimaliku võrdlusallikana. Välisallikast ära too numbreid, ainult viide. Ära leiuta linke; kui sa pole kindel, et leht on olemas, ütle seda. Kirjuta lingid puhtal kujul, ilma jälgimisparameetriteta (nt ilma „?utm_source=…“ lisandita). " + p.international,
      "6. Piirangud: andmete olemus, ajavahemik ja metoodika. Lõpeta analüüs nende kahe lausega: „See ei ole meditsiiniline nõuanne.“ ja „Kui sul endal on mure, tasub pöörduda perearsti või vaimse tervise spetsialisti poole.“ Telefoninumbreid ega muid kontakte ära lisa.",
      "",
      "Reeglid:"
    ].concat(bullets(rules)).join("\n");
  };

  // Väliste linkide märge („↗ avaneb uues aknas“, TAI.externalLink) on ekraanilugeja jaoks, juhises oleks see müra
  function text(el) {
    return el ? el.textContent.replace(/\s*↗?\s*\(avaneb uues aknas\)/g, "").replace(/\s+/g, " ").trim() : "";
  }

  function textsOf(root, selector) {
    return Array.prototype.map.call(root.querySelectorAll(selector), text).filter(Boolean);
  }

  function tableText(table) {
    var lines = [];
    var cap = table.querySelector("caption");
    if (cap) lines.push(text(cap));
    table.querySelectorAll("tr").forEach(function (tr) {
      var cells = Array.prototype.map.call(tr.children, text);
      if (cells.length) lines.push(cells.join(" | "));
    });
    return lines.join("\n");
  }

  /* Loeb ekraanil juba nähtava aruande, nii et AI näeb samu arve, mida kasutaja (ka peidetud andmetabelid on DOM-is). */
  TAI.buildAiPrompt = function (config, root) {
    var parts = [TAI.aiInstructions(config), "", "=== ARUANNE ==="];
    parts.push("Pealkiri: " + config.fullTitle);
    parts.push("Kirjeldus: " + TAI.describe(config));
    parts.push("Allikas: " + TAI.sourceLongLabel(config) + " (" + TAI.sourceUrl(config) + ")");

    var status = text(root.querySelector(".module__status"));
    if (status) parts.push("Andmete seis: " + status);
    // Esimene lõige dokumendis: KPI kastis või (toetamata kombinatsiooni teate korral) teate kohal
    var slice = text(root.querySelector(".kpi__slice, .kpi-block__slice, .chart-slice"));
    if (slice) parts.push("Valitud lõige: " + slice);

    var kpis = Array.prototype.map.call(root.querySelectorAll(".kpi"), function (k) {
      return textsOf(k, ".kpi__label, .kpi__value, .kpi__delta, .kpi__note, .kpi__reference").join("; ");
    }).filter(Boolean);
    if (kpis.length) parts.push("", "Võtmenäitajad:", bullets(kpis).join("\n"));

    var callout = text(root.querySelector(".callout"));
    if (callout) parts.push("", "Automaatne kokkuvõte: " + callout);

    root.querySelectorAll(".data-table").forEach(function (t) { parts.push("", tableText(t)); });

    var chartNotes = textsOf(root, ".chart-note--after");
    if (chartNotes.length) parts.push("", "Märkused:", chartNotes.join("\n"));

    var notes = textsOf(root, ".module__footnotes p");
    if (notes.length) parts.push("", "Metaandmed:", notes.join("\n"));

    return parts.join("\n");
  };
})(window.TAI);
