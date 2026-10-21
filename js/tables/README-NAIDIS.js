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
 * MUUTUJA ROLLI OTSUSTAMINE uue tabeli puhul: vt TASKS.md „Muutuja rolli otsustamise protsess".
 * Filtril, millel POLE "Kokku" väärtust, jäta `totalValue` määramata — "Valitud lõige" rida on siis alati nähtav.
 */
