# Vaimse tervise näidikulaud

**Leht:** https://maag6969.github.io/vt-startpage/
(otselink vaatele, nt https://maag6969.github.io/vt-startpage/#ETU41?sugu=vordlus)

Eesti vaimse tervise ja heaolu avaandmed ühel lehel. Vasakus loendis on andmestikud allikate kaupa kahes vaates
(„Üldvaade“ ja „Lapsed ja noored“); valitud
andmestiku näidikulaud (KPI-kaardid, trendi- ja võrdlusjoonised, automaatne kokkuvõttelause, andmetabel)
avaneb paremal. Iga vaate saab printida ja selle andmed AI-teenusesse analüüsiks kaasa võtta.

Repos on ainult leht ja selle andmed. Arendus- ja abifailid hoitakse eraldi.

## Andmestikud ja allikad

| Kood | Andmestik | Allikas | Kuidas andmed lehele jõuavad |
|---|---|---|---|
| **ETU41** | Depressiooni sümptomite esinemine soo, vanuserühma ja taustatunnuste järgi | [Tervise Arengu Instituut](https://statistika.tai.ee/pxweb/et/Andmebaas/), Eesti terviseuuring | otse TAI PxWeb API-st |
| **ETU42** | Emotsionaalse distressi esinemine soo ja vanuserühma järgi | sama | otse TAI PxWeb API-st |
| **ETU43** | Uneaja piisavus soo ja vanuserühma järgi | sama | otse TAI PxWeb API-st |
| **TK-diagnoosid** | Diagnoosid raviandmetes: depressioon (F32, F33) | [Tervisekassa avaandmed](https://tervisekassa.ee/vaimne-tervis-retseptide-ja-arvete-andmed) | ettevalmistatud failid kaustas `data/tervisekassa/` |
| **ilc_pw01** | Eluga rahulolu soo, vanuse ja hariduse lõikes, riikide võrdluses | [Eurostat](https://ec.europa.eu/eurostat/databrowser/product/view/ilc_pw01) | otse Eurostati API-st |
| **KU12**, KU121–KU123 | Depressiivsete episoodide esinemine kooliõpilaste seas viimasel 12 kuul: soo ja vanuse (11, 13, 15), piirkonna, kodukeele ja pere majandusliku olukorra järgi (vaade „Lapsed ja noored“) | [Tervise Arengu Instituut](https://statistika.tai.ee/pxweb/et/Andmebaas/Andmebaas__05Uuringud__03HBSC__01Tervis/), Kooliõpilaste tervisekäitumise uuring (HBSC) | otse TAI PxWeb API-st |
| **KU1150**, KU1151–KU1153; **KU11**, KU111–KU113 | Masenduse või kurbuse tundmine viimase kuue kuu jooksul; tervise enesehinnang (samad lõiked, vaade „Lapsed ja noored“) | sama, HBSC | otse TAI PxWeb API-st |
| **KU81**, KU811–KU813; **KU82**, KU821–KU823 | Koolis kiusamist ja küberkiusamist kogenud õpilased viimasel paaril kuul (samad lõiked, vaade „Lapsed ja noored“) | [Tervise Arengu Instituut](https://statistika.tai.ee/pxweb/et/Andmebaas/Andmebaas__05Uuringud__03HBSC__08Kiusamine/), HBSC | otse TAI PxWeb API-st |
| **PKH4** | Psühhiaatria haiglaravilt väljakirjutatud, voodipäevad ja keskmine ravikestus diagnoosirühma ja vanuserühma (0–14, 15+) järgi (vaade „Lapsed ja noored“) | [Tervise Arengu Instituut](https://statistika.tai.ee/pxweb/et/Andmebaas/Andmebaas__02Haigestumus__05Psyyhikahaired/) | otse TAI PxWeb API-st |
| **VIG13**, VIG10 | Ravi vajanud tahtlik enesekahjustus (X60–X84): inimesed ja juhud soo, vanuserühma ja elukoha järgi | [Tervise Arengu Instituut](https://statistika.tai.ee/pxweb/et/Andmebaas/Andmebaas__02Haigestumus__09Vigastused/) | otse TAI PxWeb API-st |
| **SD21** | Enesetapu tõttu surnute arv soo ja vanuserühma järgi | [Tervise Arengu Instituut](https://statistika.tai.ee/pxweb/et/Andmebaas/Andmebaas__01Rahvastik__04Surmad/), surma põhjuste register | otse TAI PxWeb API-st |
| **PH01** | Psüühika- ja käitumishäirete (F00–F99) tõttu haiglast lahkunud soo ja vanuserühma järgi | [Tervise Arengu Instituut](https://statistika.tai.ee/pxweb/et/Andmebaas/Andmebaas__03Tervishoiuteenused__02Paevaravi/) | otse TAI PxWeb API-st |

ETU tabelid asuvad PxWebi kaustas `Andmebaas/05Uuringud/01ETeU/04VaimneTervis/`, teised TAI tabelid oma kaustades (lingid tabelis). Kui otsepäring TAI-sse
ebaõnnestub, pakub leht võimalust laadida PxWebist alla laaditud JSON-stat2 fail ise üles.

## Litsentsid ja andmete kasutustingimused

**Lehe kood** (HTML, CSS, JavaScript) on avaldatud [MIT litsentsiga](LICENSE). See litsents **ei kehti andmetele
ega fontidele**: neile kehtivad allikate endi tingimused allpool.

| Osa | Omanik | Tingimused (seisuga 12.11.2026) |
|---|---|---|
| ETU41–ETU43 andmed | Tervise Arengu Instituut | Andmebaasi kasutamine on tasuta ja TAI palub andmete kasutamisel viidata allikale: kõigepealt algallikas (Eesti terviseuuring), siis avaldamiskanal (TAI tervisestatistika andmebaas) ja kasutamise kuupäev ([andmebaasi info](https://statistika.tai.ee/Resources/Info/TSTUA.html)). Eraldi nimelist litsentsi (nt CC BY) TAI ei ole välja toonud. |
| KU12, KU121–KU123 andmed | Tervise Arengu Instituut | Samad TAI andmebaasi tingimused (kontrollitud 19.11.2026): viidatakse TAI-le ja täpsemale allikale, siin algallikas Kooliõpilaste tervisekäitumise uuring (HBSC) ja uuringuaastad, seejärel andmebaas, tabel ja kasutamise kuupäev. Lehel on see vaate staatusreal ja jaluses. |
| Teised TAI tabelid (HBSC KU11, KU1150, KU81, KU82 ja nende õdetabelid; PKH4, VIG13, VIG10, SD21, PH01) | Tervise Arengu Instituut | Samad TAI andmebaasi tingimused: algallikas (HBSC, vigastuste andmed, surma põhjuste register, psüühikahäirete aruanne, haiglaravi andmed), siis TAI andmebaas, tabel ja kasutamise kuupäev. Lehel on see vaate staatusreal ja jaluses. |
| Tervisekassa andmed (`data/tervisekassa/`) | Tervisekassa | Andmed on Tervisekassa avalikult avaldatud väljavõtted ([allikaleht](https://tervisekassa.ee/vaimne-tervis-retseptide-ja-arvete-andmed)). Allikalehel ei ole litsentsi ega kasutustingimusi märgitud, seega kasutatakse andmeid allikaviitega. Failid on allika väljavõtetest JSON-kujule teisendatud; enne edasikasutamist on kindlam vaadata algallikat. |
| Eurostati andmed (ilc_pw01) | Euroopa Liit, Eurostat | Taaskasutus on lubatud allikale viidates ([Eurostati autoriõiguse teade](https://ec.europa.eu/eurostat/en/help/copyright-notice), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)). Allikas: Eurostat, ilc_pw01. Lehel on andmeid töödeldud: valitud riigid ja rühmad, eestikeelsed nimetused, joonised ja kokkuvõttelaused. Eurostat ei vastuta selle lehe ega andmete töötlemise eest. |
| Font Roboto (`fonts/`) | The Roboto Project Authors | [SIL Open Font License 1.1](fonts/OFL.txt) |

Näidikulaud ei ole ühegi andmeallika ametlik väljaanne. Ametlikud arvud ja metoodika on allikate endi lehtedel.

## Privaatsus ja turvalisus

- **Lehel ei ole isiklikke võtmeid, tokeneid ega kontosid.** Kõik andmepäringud teeb külastaja brauser otse
  avalikku, autentimist mittevajavasse teenusesse. Kui tulevikus lisandub allikas, mis nõuab autentimist, tuleb
  see enne kasutuselevõttu eraldi läbi arutada.
- **Vaatamiste loendur:** leht loendab ligikaudselt vaatamisi ja nupuvajutusi avaliku teenusega
  [Abacus](https://abacus.jasoncameron.dev) (`js/usage.js`). Teenus näeb külastaja IP-aadressi ja loenduri nime;
  lehe omanik IP-aadresse ei näe. Küpsiseid ei kasutata. Sama teade on lehe jaluses.
- **AI-nupud** lehe päises (Claude, ChatGPT, Gemini; üks komplekt kogu lehele, nad analüüsivad parajasti avatud aruannet) kopeerivad vaate andmed (valitud filtreid arvestades) koos
  ettevalmistatud analüüsi prompt'iga külastaja lõikelauale ja avavad valitud AI-teenuse külastaja enda brauseris,
  lahti seotuna näidikulaua aknast (`window.opener = null`). Seal kehtivad selle teenuse tingimused külastaja konto
  võimaluste järgi ning analüüsi kvaliteet sõltub valitud AI-mudelist (tasuta teenus võib anda väga halva tulemuse).
  AI poolne kirjeldav analüüs on eraldiseisev teenus, mille tulemus ei ole seotud näidikulauaga. Sama teade on lehe jaluses.
- **Sisupoliitika (CSP)** `index.html`-is: skriptid, stiilid ja fondid ainult lehelt endalt; päringud ainult
  andmeallikatele ja loendurile. Väliseid skripte ega CDN-e ei kasutata; väline tekst puhastatakse enne kuvamist.

## Tehniline ülevaade

Leht koosneb staatilistest failidest GitHub Pagesil, ilma serveripoolse loogika ja build-sammuta.
Skriptid on tavalised `<script>`-failid, mitte ES-moodulid, nii et leht töötab ka failina avatuna.
Laadimisjärjekord: `core.js` → tabelifailid → `module.js` → `usage.js` → `ai-prompt.js` → `app.js`.

```
index.html                  leht (loend, kuvamisala, CSP)
favicon.svg                 vahekaardi ikoon
css/styles.css              stiilid, disainitokenid ja printimise stiil
fonts/                      Roboto (OFL-litsents, fonts/OFL.txt)
js/core.js                  ühine tuummoodul, nimeruum window.TAI
js/module.js                mooduli sisu: andmemudel, KPI-d, automaatne kokkuvõte, SVG-graafikud, andmetabel.
                            Kaks mudelit: "Indicator" (ETU, binaarne osakaal + soo võrdlus) ja üldine
                            "General" (suvaline seeriamuutuja, Eurostat, Tervisekassa)
js/usage.js                 vaatamiste loendur (Abacus)
js/ai-prompt.js             AI-analüüsi juhis (ühine osa + allika profiil + ekraanil nähtav aruanne)
js/app.js                   lehe loogika: loend, valik (#KOOD aadressis), olekud, filtrid, jalus
js/tables/etu41.js … 43.js  TAI tabelite konfiguratsioonid
js/tables/eurostat-*.js     Eurostati tabelid
js/tables/tervisekassa-*.js Tervisekassa adapter ja aruanne (valmis failid, ei mingit otsepäringut)
data/tervisekassa/          Tervisekassa andmefailid (+ yldstat.js varuks failina avamisel)
```

Lehe jalus ja avalehe allikate loetelu tulevad samast kohast (`TAI.getSources()`, `core.js`). Vasaku loendi
grupp tuleb `config.group` väljalt (järjekord `TAI.GROUP_ORDER`, `core.js`).

**Otselink vaatele:** `#KOOD?taustatunnus=3&vanus=2&sugu=vordlus` (`sugu` = `mehed` | `naised` | `vordlus`;
vaikeväärtused jäetakse aadressist välja, vigased parameetrid ignoreeritakse).

Renderdaja (`module.js`) on tabelist sõltumatu: kõik tabelipõhine tuleb konfiguratsioonist
(`indicator.phrase` kokkuvõttelause jaoks kujul „… {kes} osakaal“, `views.breakdown.groups` / `inPhrase`,
`views.trend`). Puuduvad väärtused (API `..` → `null`) kuvatakse „Andmed puuduvad“ ja neid ei tuletata.

**Tabeli konfiguratsioon** (`TAI.registerTable({...})`): `code`, `title`, `fullTitle`, `description`,
`eyebrow`, `years`, `yearVar`, `indicator` (`var`, `positive`, `label`, `phrase`, `higherIsWorse`), `vars` (iga
muutuja `values`/`labels`, `elimination`, `totalValue`, `defaultValue`), `filters` (kasutaja valikud),
`compare` (võrdlusnupud filtrite all, nt `{ Sugu: "sugu", "Vanuserühm": "vanus", isced11: "haridus" }`, mitu rühmitust ühes filtris massiivina, vt `TAI.comparisonsOf`), `views` (`trend: bool`, `breakdown: { var, title, inPhrase, groups? }`), `queries(state)` →
nimetatud päringud (`trend`, `breakdown`), `footnotes`. Valikulised: `trendNote` (märkus trendijoonise all),
`calloutCaveats` (`[{ var, values, text }]` — lisalause kokkuvõttele, kui filter vastab), `kpiNote` (selgitav rida
muutuseta KPI-kaardil).

Üleslaaditud fail peab sisaldama **kõiki** tabeli muutujaid; kui andmetes mõni dimensioon puudub, annab
`indicatorShare` konkreetse kategooria kohta `null`, mitte koondväärtust.

**Tuummooduli peamised funktsioonid:**

| Funktsioon | Mida teeb |
|---|---|
| `TAI.buildQuery(config, selection)` | Koostab PxWeb POST-päringu; näitaja kõigi väärtustega, eliminatsioonita muutujatele lisab koondkategooria |
| `TAI.selectionFromState(config, state, vars, overrides)` | Kasutaja valikutest päringu piirangud |
| `TAI.loadTable(config, state)` | Laeb kõik `queries(state)` päringud paralleelselt → `{ trend, breakdown }` lugejad ja sünkroonib aastad (`syncYears`) |
| `TAI.syncYears(config, reader)` | Lisab API vastuse uuemad aastad `config.years`-ile: **uus andmeaasta ilmub ise**. `buildQuery` küsib aastaid vaikimisi „kõik API-s olevad“ (filter `all`). **NB:** PxWeb `top` ei anna viimast aastat, vaid tabeli esimese; ETU tabelites on aastad kasvavas järjekorras. Viimane aasta valitakse mudelis, Eurostatil `lastTimePeriod=1`. **Loendi periood (19.11.2026):** `TAI.checkLatestYears` küsib taustal iga API-tabeli viimast aastat (`config.latest`, `TAI.lastYear`; `config.years` jääb `syncYears`-ile) ja uuendab loendi kirjelduse; 12 h vahemälu, 3 päringut korraga, 429 peatab |
| `TAI.describe(config)` | Kirjeldus, mis ei vanane: `{aastatel}` → „aastatel 2006, 2014 ja 2019“ (üks aasta: „2019. aastal“), `{aastad}` → loetelu; viimane „AAAA–AAAA“ vahemik uueneb |
| `config.prepare()` (valikuline) | Lubadus, mida `app.js` ootab enne filtrite ja oleku loomist (Tervisekassa meta-fail: aastad, pooleliolev aasta, vaikeaastad) |
| `TAI.readJsonStat2(payload)` | JSON-stat2 lugeja; `get(selection)` keeldub lugemast, kui suurem dimensioon on valimata |
| `TAI.indicatorShare(reader, config, selection)` | Näitaja osakaal protsentides |
| `TAI.readUploadedFile(file, config)` | Varuplaan: PxWebist alla laaditud JSON-stat2 fail, kontrollib tabeli vastavust |
| `TAI.NetworkError` / `HttpError` / `DataError`, `TAI.describeError(err)` | Veatüübid ja eestikeelne selgitus (+ kas pakkuda faili üleslaadimist) |
| `TAI.attachTooltip(svg, el)` | Tooltip hiire, puute ja klaviatuurifookusega |
| `TAI.formatPct`, `TAI.delta`, `TAI.escapeHtml` | Eesti numbriformaat, protsendipunktide muutus, HTML-i turvaline väljund |

## TAI PxWeb tabelite eripärad

**ETU42: Emotsionaalse distressi esinemine soo ja vanuserühma järgi**

| Muutuja (`code`) | Koodid | Eliminatsioon* |
|---|---|---|
| `Aasta` | `2006`, `2014`, `2019` | ei |
| `Distress` | `0` = Olulise distressita, `1` = Olulise distressiga | ei |
| `Sugu` | `0` = Mehed ja naised, `1` = Mehed, `2` = Naised | **jah** |
| `Vanuserühm` | `0` = 15 ja vanemad, `1` = 15-24, `2` = 25-34, `3` = 35-44, `4` = 45-54, `5` = 55-64, `6` = 65-74, `7` = 75 ja vanemad | **jah** |

**ETU43: Uneaja piisavus soo ja vanuserühma järgi**

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

- **Väärtused on protsendid.** Kategooriapaari summa on 100, nt ETU42 Mehed 2006: 92,6 + 7,4. Otse näidatav
  väärtus on „olulise distressiga“ / „ebapiisav uneaeg“.
- **Vastuses on lisadimensioon `ContentsCode`** (suurus 1). `readJsonStat2` jätab valikust puuduva dimensiooni
  vahele ja arvestab selle positsiooniks 0, mis suurusega 1 dimensiooni puhul on korrektne.
- **Koodide järjekord:** koondkategooria (`0`) on indeksil 0.
- **ETU42 metoodiline märkus (API `note`):** aastatel 2006 ja 2014 olid vanuserühmad „16 ja vanemad“ ning
  „16-24“, 2019. aastal „15 ja vanemad“ ning „15-24“. See on toodud trendijoonise juures.
- **ETU43 mõiste (API `note`):** küsimus oli keskmise ööpäevase uneaja kohta. Soovitus on alla
  18-aastastele 9 tundi, 18-aastastele ja vanematele 7–8 tundi.
- **Kodeering:** POST-päringu sisu peab olema UTF-8 (muutuja nimes on „ü“).
