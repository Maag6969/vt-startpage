/*
 * NÄIDIS — see fail ei ole index.html-is <script>-ina kaasatud ega registreeru kuhugi.
 * Kopeeri nimega js/tables/<KOOD>.js, täida väärtused ja lisa index.html-i
 * <script src="js/tables/<KOOD>.js"></script> (enne js/module.js rida). Loendi järjekord tuleb
 * automaatselt (uusim aasta, siis tähestik); grupp tuleb `group` väljalt.
 *
 * M2-s on KAKS konfiguratsiooni kuju (dispatch `seriesVar` olemasolu järgi, vt js/module.js):
 *
 *  A) VANA "indicator" kuju — binaarne osakaal ("jah/ei") + soo võrdlusrežiim. Päris näited:
 *     etu41.js, etu42.js, etu43.js. Kasuta, kui näitaja on kahe kategooriaga ja Sugu võrdlus on oluline.
 *       indicator: { var: "Depressioon", positive: "1", label: "...", unit: "%", higherIsWorse: true,
 *                    phrase: "olulise depressiooniga {kes} osakaal" },
 *       filters: ["Taustatunnus", "Vanuserühm", "Sugu"], canCompareSexes: true,
 *       vars: { Sugu: TAI.sexVar(elimination), Vanuserühm: TAI.ageVar(elimination), ... }
 *
 *  B) ÜLDINE "seriesVar" kuju — suvaline seeriamuutuja, mitte-TAI allikad. Päris näide:
 *     eurostat-ilc-pw01.js. Kasuta, kui on mitu kategooriat, fikseeritud üksus (nt riik) või
 *     GET-põhine API (Eurostat; vt TAI.EUROSTAT_BASE, TAI.fetchJsonStatUrl).
 *       seriesVar: "geo", seriesValues: ["EE"],      // millised väärtused on seeriad (trend/KPI)
 *       measureLabel: "...", unit: "", unitLabel: "...", deltaPhrase: "palli", axisMax: 10,
 *       kpiSubject: "Eesti",                          // KPI silt: "Eesti kokku" / "Eesti, valitud lõige"
 *       kpiReference: { var, value, label, subjectLabel },   // väike võrdlusrida KPI-kaardil
 *       source: { label, longLabel, url },            // mitte-TAI allikas
 *       views.breakdown: { var, defaultValues, expandFlag, highlight }  // kompaktne loend + "Näita kõiki"
 *
 * ÜHISED VÄLJAD (mõlemal kujul):
 *   code, title, fullTitle, description, eyebrow, group ("Tervise Arengu Instituut" | "Eurostat" | ...; kuvatakse grupipealkirjana, järjekord TAI.GROUP_ORDER), years, yearVar,
 *   vars (kõik API muutujad, sh aasta), filters, views { trend, breakdown }, queries(state), footnotes.
 *
 * VALIKULISED SEADED ÜLDISELE KUJULE (06.11.2026, ülevõetud M3-st; ilma nendeta käitub tabel nagu varem):
 *   unit, decimals, deltaPhrase    väärtus või function(state): nt filter „Näitaja“ valib osakaalu („%“, 1 koma) või arvu ("", 0 koma)
 *   calloutUnit: false             ära korda unitLabel-it kokkuvõtte lauses (vaikimisi: üks sõna ilma sulgudeta, pikem fraas sulgudes)
 *   calloutExtra(model, fmt)       tabeli oma lisalause (string või null); ainult ekraanil olevate arvude põhjal
 *   connectGaps: true              uuring pole igal aastal: joon üle lünkade, KPI ja tulbad viimasest olemasolevast aastast
 *   periodYears: true              kaheaastased perioodid: „perioodil 2024/2025“ (aastakoodid kujul „2024/2025“)
 *   taiPath: "04THressursid/05Tootajad"   TAI tabel teises kaustas kui TAI.API_BASE
 *   vars.X.optionLabels            rippmenüü sildid (nt taandega „– Kardioloog“); mujal kasutatakse puhtaid labels'eid
 *   vars.X.responseOnly: true      dimensioon on ainult vastuses, päringus seda küsida ei saa (nt TAI ContentsCode)
 *   TAI.countyVar({ total, codes, elimination })   15 maakonda + Eesti kokku; KONTROLLI koode tabeli metaandmetest
 *   views.breakdown.limit: N       pikk tulp: joonisel N esimest + valitud rida, sama „Näita kõiki“ nupp; tabel ja lause näevad kõiki
 *   views.breakdown.sort: "desc"   suurimast väiksemani (esimese seeria järgi, puuduvad lõppu)
 *   views.breakdown.groups         massiiv või function(state)
 *   views.breakdown.showTotal      false või function(state): koondjoont ei näidata, kui koond on tulpade summa
 *   defaultValues ja limit koos: defaultValues on ülimuslik.
 *
 * AI-NUPUD (05.11.2026): `ai: { profile: "etu" | "tervisekassa" | "eurostat", notes: ["aruande enda reegel"] }`. Ilma selle väljata nuppe ei
 *   näidata: uue allika jaoks lisa js/ai-prompt.js-i oma profiil (mida number EI tähenda, millised selgitused on lubatud), vt AI-ANALUUS.md.
 *
 * AASTAD (05.11.2026): kirjuta `years` algseis (nt uusim teadaolev aasta); uus aasta lisandub API-st ise (TAI.syncYears, buildQuery
 * küsib aastaid vaikimisi "kõik"). Kirjelduses kasuta kohahoidjaid, et tekst ei vananeks: "... {aastatel}." ("aastatel 2006, 2014 ja 2019" /
 * "2019. aastal"), {aastad}. ÄRA kasuta PxWeb filtrit "top" viimase aasta jaoks (see annab tabeli esimese aasta); lase mudelil viimane valida.
 * Valikuline `prepare()` (lubadus): aruanne, mille aastad/vaikevalikud tulevad andmefailist (Tervisekassa meta), laeb need enne oleku loomist.
 *
 * MUUTUJA ROLLI OTSUSTAMINE uue tabeli puhul: vt TASKS-ARHIIV.md „Muutuja rolli otsustamise protsess".
 * Filtril, millel POLE "Kokku" väärtust, jäta `totalValue` määramata — "Valitud lõige" rida on siis alati nähtav.
 */
