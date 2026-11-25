/*
 * AI-analüüsi juhise koostamine.
 *
 * Lehel ei ole oma AI-mudelit ega API-kutset: juhis kopeeritakse lõikelauale ja külastaja kleebib selle oma
 * kontol avatud teenusesse (kopeerimine ja avamine: app.js). Juhis töötab seega iga mudeliga, ka tasutaga,
 * mistõttu kõik reeglid on tekstis endas.
 *
 * Juhis = ühine struktuur (prompti mall v3.1, 24.11.2026) + allika profiil (config.ai.profile) + aruande enda märkused
 * (config.ai.notes) + ekraanil nähtav aruanne. Mudeli vastust leht ei näe ega töötle. Aruandel ilma config.ai väljata nuppe ei näidata: uue allika reeglid tuleb enne
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

  // Ühised üldreeglid kõigile aruannetele (prompti mall v3.1, 24.11.2026); aruande enda reeglid on profiilis ja config.ai.notes-is
  var COMMON_RULES = [
    "Ära anna meditsiinilist ega isiklikku nõu ega hinda ühegi inimese tervist.",
    "Kasuta numbritena ainult allpool antud andmeid. Kahe esitatud väärtuse vahe võid nimetada, kuid ära too väljast numbreid ega arvuta osakaale, keskmisi, suhtarve ega muid näitajaid, mida aruandes pole (nt levimus, määr, inimeste arv).",
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
    // HBSC kooliõpilaste tervisekäitumise uuring (KU12, KU121–123; 19.11.2026). Tähendus TAI tabeli märkusest.
    hbsc: {
      role: "laste ja noorte vaimse tervise andmeanalüütik",
      // KU12 tähendus; teised HBSC pered (hbsc-pered.js) annavad oma config.ai.measure
      measure: "Numbrid on kooliõpilaste küsitluse (HBSC, 11-, 13- ja 15-aastased) tulemused: vastanute osakaal, kellel on viimasel 12 kuul esinenud depressiivne episood. See ei ole arsti pandud diagnoos. TAI märkuse järgi on andmed kaalumata.",
      direction: "Sõnu „paranes“ ja „halvenes“ kasuta ainult näitaja kohta (nt „osakaalu kasv on näitaja järgi ebasoodne“). Ära kirjuta, et laste vaimne tervis paranes või halvenes.",
      explanations: "Võimalikke põhjuseid võid nimetada ainult oletusena. Ära tee järeldusi üksiku lapse, kooli ega pere kohta.",
      advice: "võimalikud sisulised sammud ja küsimused laste ja noorte vaimse tervise ennetuse valdkonnale",
      international: "HBSC on rahvusvaheline uuring, kuid ära väida, kus Eesti teiste riikide suhtes asub, ega too teiste riikide numbreid.",
      rules: [
        "Uuring toimub iga nelja aasta tagant (õppeaastad, nt 2021/2022): vahepealsete aastate kohta andmeid ei ole, ära kirjelda aastast muutust.",
        "Ära liida vanuseid ega lõikeid (sugu, piirkond, kodukeel, majanduslik olukord): need on eri rühmitused samadest vastajatest."
      ]
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
    // Tervisekassa teenusmahud (24.11.2026): psühhiaatria ja psühholoogi teenused, aruanne „Tervishoiuteenuste kasutus ja kulud“ (TERVISEKASSA.md jaotis 9)
    tervisekassaTeenused: {
      role: "tervishoiuteenuste kasutuse analüütik",
      measure: "Numbrid on Tervisekassa rahastatud teenuste maht makstud arvete järgi: isikute arv, arvete arv, teenuste hulk või kulu Tervisekassale. Need näitavad teenuste kasutust, mitte seda, kui paljudel inimestel on psüühikahäire.",
      direction: "Kirjelda muutust arvudes („kasvas“, „vähenes“). Ära nimeta teenuste mahu muutust vaimse tervise paranemiseks ega halvenemiseks.",
      explanations: "Selgitustena võid oletusena nimetada teenuse pakkumise, rahastamise, kättesaadavuse ja abi otsimise muutusi. Kliinilisi väiteid ära tee: ära väida midagi haiguse esinemise ega ravi tulemuste kohta.",
      advice: "ainult küsimused andmeomanikule (Tervisekassa) ja edasiseks uurimiseks; ära soovita ravi ega rahastamise muudatusi",
      international: "Ära väida, et need arvud on teiste riikide andmetega võrreldavad.",
      rules: [
        "Ära liida isikute arvu aastate, erialade, teenuste ega diagnoosirühmade vahel: sama inimene võib olla mitmes. Ära arvuta ka „perioodi isikuid“.",
        "Arvete arvu ei saa teenuste vahel liita: üks arve võib sisaldada mitut teenust.",
        "Teenuste hulk ei ole inimeste arv ja arvete arv ei ole visiitide arv.",
        "Diagnoosirühm on arvele märgitud diagnoos (F00–F99), mitte teenuse põhjus; diagnoosirühmade arvud ei ole valdkonna kogumaht.",
        "Ära arvuta määrasid (nt 100 000 elaniku kohta): rahvaarve aruandes ei ole."
      ]
    },
    // TAI registrid (19.11.2026): enesekahjustus VIG13/VIG10, enesetapud SD21, haiglaravi PH01 ja PKH4. Arvud, mitte määrad.
    register: {
      role: "rahvatervise statistika analüütik",
      measure: "Numbrid on Tervise Arengu Instituudi registriandmed: juhtude, inimeste või haiglaravi episoodide arv aastas (PKH4 puhul ka voodipäevad ja keskmine ravikestus). Need ei ole määrad rahvaarvu kohta ega näita haiguse levimust.",
      direction: "Kirjelda muutust arvudes („kasvas“, „vähenes“). Ära nimeta arvu muutust inimeste vaimse tervise paranemiseks ega halvenemiseks.",
      explanations: "Selgitustena võid oletusena nimetada ka abi otsimise, teenuste kättesaadavuse, registreerimise ja kodeerimise muutusi. Ära tee järeldusi üksiku inimese, kooli ega pere kohta.",
      advice: "võimalikud küsimused andmeomanikule ja ennetuse valdkonnale",
      international: "Ära väida, et need arvud on teiste riikide omadega otse võrreldavad.",
      rules: [
        "Ära arvuta määrasid (nt 100 000 elaniku kohta): rahvaarve aruandes ei ole.",
        "Väikeste arvude puhul (nt alla 18-aastased) kõigub aastane arv juhuslikult: ära tõlgenda ühe aasta muutust trendina.",
        "Ära liida kattuvaid vanuserühmi (nt 0–17 ja 15–24) ega sugusid koondiga."
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
    },
    // Statistikaamet TH76–TH79 (25.11.2026): 16-aastaste ja vanemate osatähtsus terviseseisundi järgi.
    statistikaamet: {
      role: "rahvatervise statistika analüütik",
      measure: "Number on protsent 16-aastastest ja vanematest inimestest, kes hindavad oma tervist kas „väga hea või hea“ või „halb või väga halb“ (enda hinnang, mitte arstidiagnoos). Osakaal on sama rühma sees, mitte rahvaarv.",
      direction: "Kirjelda muutust protsendipunktides („kasvas“, „vähenes“). Ära nimeta muutust rahvastiku tervise paranemiseks ega halvenemiseks.",
      explanations: "Võimalikke põhjuseid võid nimetada ainult oletusena. Ära tee järeldusi üksiku inimese ega piirkonna kohta.",
      advice: "võimalikud küsimused andmeomanikule ja tervisepoliitika valdkonnale",
      international: "Ära väida, et need numbrid on teiste riikide omadega otse võrreldavad.",
      rules: [
        "Lõigete (sissetulek, sugu ja vanus, hõiveseisund, elukoht) numbrid ei ole omavahel liidetavad: ära liida kattuvaid rühmi.",
        "Väikeste rühmade (nt maakond või vanuserühm 65+ eri lõigetes) puhul kõigub arv juhuslikult: ära tõlgenda ühe aasta muutust trendina."
      ]
    }
  };

  /* Aastate märkus: üks aasta = trendi ei ole; lüngad = nimeta neid; pooleli = ei ole täisaasta. */
  function yearNotes(config) {
    var years = config.years || [];
    var notes = [];
    if (years.length === 1) {
      notes.push("Andmetes on ainult üks aasta (" + years[0] + "): trendi ega aastatevahelist muutust ära analüüsi, kirjelda osas 2 ainult erinevusi rühmade vahel.");
    } else if (years.length > 1 && config.periodYears) {
      // Perioodid (nt HBSC „2021/2022“): koodid on aastaarvud, aga lugejale näidatakse silte
      notes.push("Andmetes on perioodid " + years.map(function (y) { return TAI.labelOf(config, config.yearVar, y); }).join(", ") + ".");
    } else if (years.length > 1) {
      // Perioodid („2024/2025“) ei ole arvud: lünkade kohta siis midagi ei väideta
      var gaps = years.every(function (y) { return /^\d+$/.test(y); }) &&
        years.some(function (y, i) { return i > 0 && Number(y) - Number(years[i - 1]) !== 1; });
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
  /*
   * Prompti mall v3.1 (24.11.2026): ühine struktuur kõigile aruannetele; aruande enda osad (mida number tähendab, suunasõnad,
   * selgitused, soovitused, rahvusvaheline võrdlus, erireeglid) tulevad profiilist (PROFILES) ja config.ai.notes-ist.
   * Jooniseid prompt ei nõua ega keela: iga AI-teenus teeb oma moodi; tekst peab olema täielik ka ilma joonisteta.
   * Lingireegel: AI-teenused lisavad vahel ise jälgimisparameetri (nt ?utm_source=chatgpt.com); seepärast ei paluta linke,
   * vaid allika nime ja otsinguvihjet, ja kui link siiski tuleb, peab see olema puhas põhiaadress.
   */
  TAI.aiInstructions = function (config) {
    var p = PROFILES[config.ai.profile];
    var special = (p.rules || []).concat(config.ai.notes || [], yearNotes(config));
    return [
      "ROLL JA EESMÄRK",
      "Oled " + p.role + ". Allpool on Eesti vaimse tervise näidikulaua üks aruanne koos kasutaja valitud lõikega ja kõigi ekraanil kuvatud andmetega. Kirjuta eesti keeles selge, neutraalse tooniga analüüs, mida saab lugeda ka ilma statistika taustata.",
      "",
      "MIDA NUMBER TÄHENDAB",
      // config.ai.measure: aruande oma selgitus (nt HBSC kiusamine), muidu profiili oma
      (config.ai.measure || p.measure),
      "",
      "VORM",
      "- Kirjuta kogu vastus eesti keeles.",
      "- Kasuta lihtteksti. Jaotise pealkiri on eraldi real kujul „1. Lühikirjeldus“, selle all on tavalised lõigud. Ära kasuta markdowni pealkirjamärke (#), tabeleid, paksu kirja ega eraldi esile tõstetud suuri numbreid. Loetelu on lubatud ainult jaotises 4.",
      "- Pikkus kokku umbes 500–800 sõna.",
      "- Vastus algab jaotisega 1 ja lõpeb jaotise 6 kahe kohustusliku lausega. Enne jaotist 1 ega pärast viimast lauset ei tohi olla midagi: ei sissejuhatust, kokkuvõtet, pakkumisi (nt „Kui soovid, võin …“) ega küsimusi lugejale.",
      "- Analüüsi tekst peab olema täielik ka ilma joonisteta: nimeta olulised arvud tekstis. Kui sinu vestlusliides lisab ise jooniseid, kasuta neis ainult allpool antud arve.",
      "",
      "STRUKTUUR (kasuta täpselt seda)",
      "",
      "1. Lühikirjeldus",
      "Mida näitaja mõõdab ja milline lõige on praegu valitud.",
      "",
      "2. Trend või muutus",
      "- Aegrida: kirjelda suunda arvudes („kasvas“, „vähenes“). Nimeta iga trendiväite juures, mitu andmepunkti seda toetab. Kui väide põhineb ühel või kahel andmepunktil, nimeta seda esialgseks märgiks, mitte trendiks. Murdepunkti nimeta ainult siis, kui andmepunkte on selle tuvastamiseks piisavalt; muidu ütle, et seda ei saa eristada.",
      "- Pooleli aasta: ära tõlgenda selle väiksemat arvu vähenemisena ega suuremat arvu lõpliku suurusena. Võid öelda, et osaline väärtus on juba suurem või väiksem kui eelmise täisaasta oma, ja lisa, et lõplik väärtus ei ole teada.",
      "- Rühmade võrdlus (nt vanus, sugu, maakond): nimeta kõrgeim ja madalaim väärtus. Kirjelda jaotuse kuju järgmiselt: enne kirjutamist võrdle iga kõrvutiste rühmade paari. Väide „alates rühmast X on iga järgmine väärtus väiksem (või suurem)“ on lubatud ainult siis, kui X on esimene rühm, millest alates see kehtib. Kui suuna sees on lõik väga väikeste erinevustega, kirjelda seda kui aeglasemat muutust, mitte kui suuna katkemist, ja too selle lõigu väärtused.",
      "- Ühe aasta rühmavõrdlus kirjeldab jaotust, mitte trendi. Nimeta, mitme rühma andmetel kirjeldus põhineb.",
      "- Kasuta hinnanguliste omadussõnade („märgatav“, „oluline“, „järsk“, „suur“) asemel arve. Sõna „oluline“ ära kasuta statistilises tähenduses.",
      "- " + p.direction,
      "",
      "3. Seosed ja võimalikud selgitused",
      "- Märgi iga väide lause alguses kas „Andmetest tulenev:“ või „Oletus:“.",
      "- Sõnasta oletused ettevaatlikult („võib olla seotud“, „üks võimalik selgitus“). Ära kasuta väljendeid „kindlasti“, „ilmselt“ ega „suure tõenäosusega“.",
      "- " + p.explanations,
      "",
      "4. Soovitused",
      "(a) " + p.advice + ". Ära esita küsimusi, mis eeldavad isikute või rühmade liitmist (nt „milliste rühmade kasvu arvelt koguarv kasvas“); küsi selle asemel, kas andmeomanikul on selline lõige olemas. Kui aruande väljad (pealkiri, kirjeldus, märkused, metaandmed) on omavahel vastuolus, sõnasta see küsimusena andmeomanikule ja ära lahenda vastuolu ise.",
      "(b) Mida andmestik võiks lisaks sisaldada.",
      "Sõnasta ettevaatlikult, ilma kategooriliste väideteta. Ära soovita, milliseid filtreid lehel valida: see on lugeja otsus.",
      "",
      "5. Rahvusvaheline võrdlus",
      "- Kui tead samal teemal usaldusväärset avalikku allikat (nt Eurostat, OECD, WHO), nimeta 1–3 neist asutuse ja väljaande või andmetabeli nimega võimaliku võrdlusallikana.",
      "- Välisallikast ära too ühtegi arvu: mitte väärtusi, osakaale, näitajate arvu ega uuringulainete aastaid. Väljaande ilmumisaasta viites on lubatud.",
      "- Ära lisa linke: nimeta allikas (asutus, väljaande või andmetabeli nimi) ja kust seda otsida. Kui sa siiski lisad lingi, peab see olema puhas põhiaadress, kus pole küsimärgi järel midagi: ilma jälgimisparameetriteta (nt ilma „?utm_source=chatgpt.com“, „?utm_source=claude“, „?utm_source=gemini“, „fbclid“ ega „gclid“ lisandita). Ära leiuta linke.",
      "- Ütle, et välisallika arvud ei ole selle aruande arvudega otse võrreldavad, ja kui tead, nimeta lühidalt põhjus (nt küsitlusandmed vs arveandmed). " + p.international,
      "",
      "6. Piirangud",
      "Andmete olemus, ajavahemik ja metoodika. Lõpeta analüüs täpselt nende kahe lausega:",
      "„See ei ole meditsiiniline nõuanne.“",
      "„Kui sul endal on mure, tasub pöörduda perearsti või vaimse tervise spetsialisti poole.“",
      "Nende järel ei tohi olla midagi. Telefoninumbreid ega muid kontakte ära lisa.",
      "",
      "ÜLDREEGLID"
    ].concat(bullets(COMMON_RULES), [
      "",
      "ENNE VASTAMIST KONTROLLI (ära näita kontrolli vastuses)",
      "- Iga arv on aruandes olemas samal kujul (tühik tuhandete eraldajana, koma kümnendmärgina).",
      "- Iga järjestuse väide („kõrgeim“, „madalaim“, „alates … väheneb“) on kontrollitud kõrvutiste väärtustega.",
      "- Igal trendiväitel on andmepunktide arv.",
      "- Jaotises 3 on iga väide märgistatud.",
      "- Jaotises 5 ei ole välisallika arve ega linke jälgimisparameetritega (kui linke üldse on).",
      "- Vastus algab jaotisega 1 ja lõpeb kahe kohustusliku lausega; nende järel pole midagi."
    ], special.length ? ["", "SELLE ARUANDE ERIPÄRAD"].concat(bullets(special)) : []).join("\n");
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
