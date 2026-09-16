# TAI Vaimse Tervise Näidikulaud — Lähteülesanne / README

## Eesmärk

Master-dashboard, kus vasak paneel (~1/3 laiusest) koondab loeteluna vaimse tervise andmeallikad Tervise
Arengu Instituudi (TAI) statistika andmebaasist, ning iga rea juures on "API" nupp, mille vajutamisel avaneb
paremas paneelis (~2/3) vastava tabeli täielik näidikulaud — reaalajas TAI PxWeb API-st laaditud andmete
põhjal.

- **Sisu ja visuaalne stiil:** referents "Depressiooni Trendid" (KPI-kaardid, legend, callout-tekstid, SVG
  graafikud, andmetabel kokkuvõttes).
- **Funktsionaalsus:** referents `tai_vaimse_tervise_dashboard.html` (live API-fetch nupp, JSON-stat2 lugeja,
  CORS-i tõrke korral faili-üleslaadimise varuplaan).

## Andmeallikad (I versioon — 3 tabelit)

Kõik pärinevad samast TAI PxWeb kaustast: `Andmebaas/05Uuringud/01ETeU/04VaimneTervis/`

| Kood | Pealkiri | API tee | Muutujad |
|---|---|---|---|
| **ETU41** | Depressiooni sümptomite esinemine soo, vanuserühma ja taustatunnuste järgi | `https://statistika.tai.ee/api/v1/et/Andmebaas/05Uuringud/01ETeU/04VaimneTervis/ETU41.px` | Aasta (2006, 2014, 2019); Taustatunnus (10 kat.); Depressioon (2); Sugu (3); Vanuserühm (8) |
| **ETU42** | Emotsionaalse distressi esinemine soo ja vanuserühma järgi | `https://statistika.tai.ee/api/v1/et/Andmebaas/05Uuringud/01ETeU/04VaimneTervis/ETU42.px` | Aasta (2006, 2014, 2019); Distress (2); Sugu (3); Vanuserühm (8) |
| **ETU43** | Uneaja piisavus soo ja vanuserühma järgi | `https://statistika.tai.ee/api/v1/et/Andmebaas/05Uuringud/01ETeU/04VaimneTervis/ETU43.px` | Aasta (ainult 2019); Piisavus (2: piisav / ebapiisav); Sugu (3); Vanuserühm (8) |

ETU41 struktuur (sh muutujate täpsed koodid) on kinnitatud töötavas prototüübis. ETU42 ja ETU43 koodid
kontrolliti TAI API metaandmete GET-päringu ja POST-proovipäringutega 16.09.2026 (vt allpool).

### Kinnitatud API-struktuur: ETU42 ja ETU43 (16.09.2026)

**ETU42 — Emotsionaalse distressi esinemine soo ja vanuserühma järgi**

| Muutuja (`code`) | Koodid | Eliminatsioon* |
|---|---|---|
| `Aasta` | `2006`, `2014`, `2019` | ei |
| `Distress` | `0` = Olulise distressita, `1` = Olulise distressiga | ei |
| `Sugu` | `0` = Mehed ja naised, `1` = Mehed, `2` = Naised | **jah** |
| `Vanuserühm` | `0` = 15 ja vanemad, `1` = 15-24, `2` = 25-34, `3` = 35-44, `4` = 45-54, `5` = 55-64, `6` = 65-74, `7` = 75 ja vanemad | **jah** |

**ETU43 — Uneaja piisavus soo ja vanuserühma järgi**

| Muutuja (`code`) | Koodid | Eliminatsioon* |
|---|---|---|
| `Aasta` | `2019` (ainus; API märgib ajamuutujaks) | ei |
| `Piisavus` | `0` = Piisav uneaeg, `1` = Ebapiisav uneaeg | ei |
| `Sugu` | `0` = Mehed ja naised, `1` = Mehed, `2` = Naised | **ei** |
| `Vanuserühm` | `0` = 15 ja vanemad, `1` = 15-24, … `7` = 75 ja vanemad (samad mis ETU42) | **ei** |

\* Eliminatsioon = muutuja võib päringust välja jätta. ETU42-s annab väljajätmine koondväärtuse
(„kokku“) ja dimensioon kaob vastusest. **ETU43-s väljajätmine ei anna koondväärtust:** vastus sisaldab
siis kõiki kategooriaid ja dimensioon jääb alles. Seepärast tuleb ETU43 päringus `Sugu` ja
`Vanuserühm` alati selgesõnaliselt kaasa panna, kogu rühma jaoks koodiga `0`.

**Olulised tähelepanekud raamistiku jaoks:**

- **Väärtused on protsendid.** Mõlemas tabelis on kategooriapaari summa 100, nt ETU42 Mehed 2006: 92,6 + 7,4.
  Prototüübi `shareWithDepression`-loogika (osa / (osa + ülejäänu) × 100) annab sama tulemuse, nii et
  ühist arvutusfunktsiooni võib kasutada. Otse näidatav väärtus on „olulise distressiga“ / „ebapiisav uneaeg“.
- **Vastuses on lisadimensioon `ContentsCode`** (suurus 1). JSON-stat2 lugeja peab seda taluma: praegune
  `readJsonStat2` jätab valikust puuduva dimensiooni vahele ja arvestab selle positsiooniks 0, mis
  suurusega 1 dimensiooni puhul on korrektne.
- **Koodide järjekord:** mõlemas tabelis on koondkategooria (`0`) indeksil 0.
- **ETU42 metoodiline märkus (API `note`):** aastatel 2006 ja 2014 olid vanuserühmad „16 ja vanemad“ ning
  „16-24“, 2019. aastal „15 ja vanemad“ ning „15-24“. See tuleb trendijoonise juures jaluses välja tuua.
- **ETU43 mõiste (API `note`):** küsimus oli keskmise ööpäevase uneaja kohta. Soovitus on alla
  18-aastastele 9 tundi, 18-aastastele ja vanematele 7–8 tundi. See läheb jaluse mõisteselgituseks.
- **Kodeering:** POST-päringu sisu peab olema UTF-8 (muutuja nimes on „ü“). Brauseri `fetch` teeb seda
  vaikimisi, kuid näiteks PowerShell 5.1 `Invoke-RestMethod` stringiga sisu puhul mitte (tulemuseks „Bad Request“).

## Tehniline arhitektuur

1. **Ühine tuummoodul** — json-stat2 lugeja (`readJsonStat2`), tooltip-loogika, veakäsitlus + faili-üleslaadimise
   varuplaan CORS-i tõrke puhuks. Kirjutatakse üks kord, taaskasutatakse kõigi kolme tabeli jaoks.
2. **Tabelipõhine konfiguratsioon** — iga tabeli jaoks eraldi: API-tee, VARS-metaandmed, `buildQuery()`
   variant, renderduse spetsiifika (millised diagrammid/KPI-d antud tabeli jaoks mõtestatud on).
3. **Master-leht** — vasak loendipaneel (rida = pealkiri + lühikirjeldus + allika viide + "API" nupp),
   parem paneel renderdab valitud tabeli mooduli.

### Failistruktuur ja raamistiku liides (etapp 3, 16.09.2026)

```
index.html                  master-leht (etapp 4)
css/styles.css              stiilid ja disainitokenid (disain.md p. 1–2)
js/core.js                  ühine tuummoodul, nimeruum window.TAI
js/module.js                mooduli sisu: andmemudel, KPI-d, automaatne callout, SVG-graafikud, andmetabel
js/app.js                   master-lehe loogika: loend, valik (#KOOD aadressis), olekud, filtrid, mooduli karkass
js/tables/etu41.js … 43.js  tabelipõhised konfiguratsioonid (TAI.registerTable)
tests/framework-test.html   ühik- ja integratsioonitestid (avada kohaliku serveri kaudu)
tools/serve.ps1             kohalik staatiline server arenduseks
cors-test.html              etapi 2 CORS-test
```

Skriptid on **tavalised `<script>`-failid, mitte ES-moodulid** — build-sammu pole ja leht töötab ka
lihtsalt failina avatuna. Laadimisjärjekord: `core.js` → tabelifailid → `module.js` → `app.js`.

Renderdaja (`module.js`) on tabelist sõltumatu: kõik tabelipõhine tuleb konfiguratsioonist
(`indicator.phrase` callout-lause jaoks kujul „… {kes} osakaal“, `views.breakdown.groups` / `inPhrase`,
`views.trend`). Puuduvad väärtused (API `..` → `null`) kuvatakse „Andmed puuduvad“ ja neid ei tuletata.

**Tabeli konfiguratsioon** (`TAI.registerTable({...})`): `code`, `title`, `fullTitle`, `description`,
`eyebrow`, `years`, `yearVar`, `indicator` (`var`, `positive`, `label`, `phrase`, `higherIsWorse`), `vars` (iga
muutuja `values`/`labels`, `elimination`, `totalValue`, `defaultValue`), `filters` (kasutaja valikud),
`canCompareSexes`, `views` (`trend: bool`, `breakdown: { var, title, inPhrase, groups? }`), `queries(state)` →
nimetatud päringud (`trend`, `breakdown`), `footnotes`. Valikulised: `trendNote` (märkus trendijoonise all),
`calloutCaveats` (`[{ var, values, text }]` — lisalause callout'i, kui filter vastab), `kpiNote` (selgitav rida
muutuseta KPI-kaardil).

Üleslaaditud fail peab sisaldama **kõiki** tabeli muutujaid; kui andmetes mõni dimensioon puudub, annab
`indicatorShare` konkreetse kategooria kohta `null`, mitte koondväärtust.

**Tuummooduli peamised funktsioonid:**

| Funktsioon | Mida teeb |
|---|---|
| `TAI.buildQuery(config, selection)` | Koostab PxWeb POST-päringu; näitaja kõigi väärtustega, eliminatsioonita muutujatele lisab koondkategooria |
| `TAI.selectionFromState(config, state, vars, overrides)` | Kasutaja valikutest päringu piirangud |
| `TAI.loadTable(config, state)` | Laeb kõik `queries(state)` päringud paralleelselt → `{ trend, breakdown }` lugejad |
| `TAI.readJsonStat2(payload)` | JSON-stat2 lugeja; `get(selection)` keeldub lugemast, kui suurem dimensioon on valimata |
| `TAI.indicatorShare(reader, config, selection)` | Näitaja osakaal protsentides |
| `TAI.readUploadedFile(file, config)` | Varuplaan: PxWebist alla laaditud JSON-stat2 fail, kontrollib tabeli vastavust |
| `TAI.NetworkError` / `HttpError` / `DataError`, `TAI.describeError(err)` | Veatüübid ja eestikeelne selgitus (+ kas pakkuda faili üleslaadimist) |
| `TAI.attachTooltip(svg, el)` | Tooltip hiire, puute ja klaviatuurifookusega |
| `TAI.formatPct`, `TAI.delta`, `TAI.escapeHtml` | Eesti numbriformaat, protsendipunktide muutus, HTML-i turvaline väljund |

## Avaldamine ja hostimine

- **Peamine tee:** GitHub Pages (kattub koolituse nõudega). Live-fetch TAI API-sse peab CORS-i osas
  GitHub Pagesilt töötama — see tuleb varakult (2. töövoo-etapp) päriselt testida, enne kolme tabeli
  valmisehitamist.
- **SharePoint-integratsioon:** GitHub Pagesil majutatud leht lisatakse SharePointi lehele "Embed"
  veebiosa kaudu (iframe). Live-fetchi turvakontekst määratakse lehe enda origin'i (GitHub Pages) järgi,
  mitte SharePointi järgi — seega peaks funktsionaalsus säilima. Vajalik: SharePointi admin peab
  "HTML Field Security" seadistuses github.io domeeni lubatud nimekirja lisama.
- **Mitte teha:** valmis HTML-faili otse SharePointi dokumendikausta üleslaadimine ja sealt avamine —
  SharePoint sunnib .html-faile tavaliselt allalaadimisele, mitte brauseris renderdamisele.
- **Varuvariant, kui iframe-embed osutub probleemseks:** tavaline hüperlink SharePointi lehel, mis avab
  dashboardi uuel vahekaardil.

## Töövoo etapid (loogilises järjekorras)

1. Andmeallikate API-struktuuri lõplik kontroll (ETU42, ETU43 täpsed kategooriakoodid).
2. CORS/live-fetch valideerimine päris GitHub Pagesilt (minimaalne ühe-tabeli testleht).
3. Korduvkasutatava raamistiku (tuummoodul + tabelikonfiguratsioon) disain ja kirjutamine.
4. Master-lehe infoarhitektuur: vasak loendipaneel + parem kuvamisala.
5. Esimese mooduli (ETU41) integreerimine master-raamistikku.
6. Teise (ETU42) ja kolmanda (ETU43) mooduli lisamine, üks korraga, testides iga sammu järel.
7. Viimistlus: disaini ühtlustamine, responsiivsus, veakäsitlus kõigi kolme tabeli jaoks.
8. Avaldamine GitHub Pagesile + SharePointi Embed-integratsioon (koos IT/admin kaasamisega HTML Field
   Security seadistuse jaoks).

## Märkused

Ehitatud TTÜ "Programmeerimine tehisintellektiga (Vibe Coding)" koolituse raames (15.–18.09.2026).
