# TAI Vaimse Tervise Näidikulaud — TASKS.md

Hetkeseisu jälgimise fail. Iga uus sessioon (sh Claude Code'is) peaks alustama sellest failist, et
teada, kus pooleli jäädi — vt README.md tehnilise arhitektuuri ja disain.md visuaalsete otsuste jaoks.

Viimati uuendatud: 17.09.2026 (Eurostati esimene tabel `ilc_pw01` lisatud, vt allpool uus jaotis.
Tehnilised töövoo-etapid 1–7 lõpetatud; leht jagatud tagasisideks; etapp 8 SharePoint ootel)

## Eurostat: esimene rahvusvahelise võrdluse tabel (17.09.2026)

M3 (tervishoiu-kvaliteet) projektis oli juba tehtud `js/core.js`/`js/module.js` üldistus
(`config.seriesVar`/`measureLabel`, PxWeb POST kõrval GET-URL tugi Eurostati jaoks) — see toodi siia
üle **muutmata kujul, kõrvuti vana koodiga** (dispatch `config.seriesVar` olemasolu järgi), nii et
ETU41–43 (vana `config.indicator` kuju) jäid täiesti puutumata — kõik 20 raamistiku testi ja täpsed
vanad numbrid (Mehed 8,4%, Naised 13,1%) kontrollitud muutumatuna pärast porti.

**Uus tabel:** `js/tables/eurostat-ilc-pw01.js` — Eurostat `ilc_pw01`, eluga rahulolu (0–10 skaala),
2013–2025, Eesti + ~36 riigi võrdlus. Kasutaja eesmärk (17.09.2026): "pilt on poliitikakujundajale
kiirelt haaratav, kuid väikese vaevaga näha ka Eesti-EL keskmise-teiste riikide võrdlust".

**Lahendus (intervjuu + tehniline avastus 17.09.2026):**
- Algne plaan „Eesti vs EL-27 kaks täisseeriat trendis" ei sobinud mootoriga: sama "geo" muutuja
  peaks täitma korraga kitsa (trend/KPI) ja laia (36 riigi tulbad) rolli — konflikt, mille lahendasin
  uue `config.seriesValues` väljaga (piirab, millised `vars[seriesVar]` väärtused saavad "seeriaks",
  breakdown kasutab ikka täit väärtuste nimekirja) ja uue `config.kpiReference`-mehhanismiga (väike
  lisarida KPI-kaardil, mitte teine täisseeria).
- **Tulemus:** trend = ainult Eesti (üks lihtne joon), KPI-kaart näitab Eesti väärtust + väikest rida
  "EL-27 keskmine: 7,2 (0,1 palli kõrgem)" allpool, tulpdiagramm = riikide võrdlus (vaikimisi Balti +
  Põhjamaad, "Näita kõiki (36)" nupp avab kõik, Eesti tumesinisena esile tõstetud, EL-27 katkendjoon).
- **Leitud ja parandatud viga Eurostati API kasutuses:** mitmeväärtuseline `geo=` valik EI tööta
  komadega ("geo=EE,EU27_2020" → tühi vastus, size=0) — vajab korduvaid parameetreid
  ("geo=EE&geo=EU27_2020"). Kontrollitud otse API vastu enne ja pärast parandust.
- **Leitud ja parandatud viga graafikutel:** `niceMax()` astmestik (5/10/20/…) on mõeldud lahtise
  suurusjärguga arvudele ja venitas 0–10 hindeskaala telje 20-ni. Lisatud `config.axisMax` (fikseeritud
  ülempiir, 5 ühtlast sammu) — kasutab iga tulevane fikseeritud-skaalaga tabel (nt hinnangud, indeksid).
- **Brauseris kontrollitud:** koond (Eesti 7,3, ▲0,2 vs 2024; EL-27 7,2), tulpade vaike-/täiskomplekt
  ("Näita kõiki" nupp ei tee uut API-päringut — andmed juba laaditud), callout, andmetabel, lai- ja
  mobiilivaade (kerimist pole), loendi rea allikaviide ("Allikas: Eurostat ilc_pw01", mitte "TAI").
- **Teadlik lihtsustus:** filtri muutmine (sugu/vanus/haridus) laeb andmed API-st uuesti täies mahus
  (mõlemad päringud, sh kõik 37 riiki) — pole optimeeritud, aga URL/vastus on väike (~400 tähemärki
  päring, testitud), nii et see pole probleem.

**Taaskasutatavad uued mehhanismid (kasutatavad ka tulevastel Eurostat/muu-allika tabelitel):**
`TAI.EUROSTAT_BASE`, `TAI.fetchJsonStatUrl(url)`, `TAI.sourceLabel/sourceLongLabel/sourceUrl(config)`,
`TAI.unitText(config)`, `TAI.formatValue(v, unit)`, `config.seriesValues`, `config.kpiReference`,
`config.axisMax`, `views.breakdown.defaultValues` + `expandFlag` (kompaktne/täisloend + nupp).

## Piloteerimise etapid (andmeallikate laiendamise kava, kokku lepitud 17.09.2026)

**See jaotus on eraldiseisev allpool olevatest tehnilistest töövoo-etappidest (nummerdatud 1–9)** —
need kirjeldavad *mis andmeallikad* ja *mis järjekorras* lisanduvad, mitte üksikuid ehitussamme.
Taustaks: TAI PxWeb tabelid erinevad tugevalt mahult (mõnel 27 aastat trendi, mõnel 1; mõnel
maakonna lõige, mõnel mitte) ja mõnel tabelil on mitu võimalikku "mida me näitame" kandidaati
(nt näitaja-muutuja, mis pole binaarne, või kümnete väärtustega diagnoosihierarhia) — vt
17.09.2026 arutelu. Seetõttu otsustati minna samm-sammult, kinnitades protsessi enne mahu laiendamist.

1. **Piloteerimine (praegu, valmis).** Kolm ETU tabelit (ETU41–43), reaalajas TAI API-st, töötav
   raamistik. Tõestab, et lähenemine üldiselt töötab. ✅
2. **Olemasoleva kolme tabeli taustatunnuste laiendus.** Iga juba valitud tabeli (ETU41–43) kõik
   TAI poolt pakutavad taustaandmed kaasata, mitte ainult praegu valitud alamhulk (kontrollida
   metaandmete GET-päringuga, kas midagi jäi kasutamata). Eesmärk: katsetada "iga muutuja rolli
   otsustamise" protsessi (näitaja / filter / breakdown-telg / eraldi kirje) tuttavatel, juba
   kinnitatud tabelitel, enne kui seda uutele andmetele rakendame.
   **ALUSTADES:** vaata enne kodeerimist üle, kui kaugele on jõudnud
   [M3 (tervishoiuteenuste kvaliteet)](../M3_kodutoo_tervishoiu_kvaliteet/README.md) projekt —
   kasutaja soovitas 17.09.2026 sealt üle võtta, mis sobib. Sealses README-s on juba dokumenteeritud
   PT05/PT06/PT07/PT01 ja PTU80-82 tabelite kaudu täpselt sama „suvalise taustatelje" üldistusvajadus
   (vt seal „Arhitektuuri mõju") — kui M3 on selle `js/module.js` üldistuse juba teinud ja testinud,
   on see otse siia (ja vastupidi) taaskasutatav, mitte kahes kohas eraldi lahendatav.
   **NB (kasutaja täpsustus 17.09.2026): see puudutab ainult tehnilist koodi/arhitektuuri**
   (`core.js`-tüüpi loogika, `seriesOf()`-i üldistus, päringute koostamine, veakäsitlus).
   **Visuaalseid/disainiotsuseid (`css/styles.css`, `disain.md`) ei tohi kunagi vaikimisi teisest
   projektist üle kanda** — mõlemal näidikulaual on eraldi tellija, kelle maitse võib SoM
   stiiliraamatu piires siiski erineda, ja iga uus disainiotsus vajab oma intervjuud selles
   projektis, isegi kui M3 sai oma stiilitokenid siit üks kord kasutaja selgel soovil üle kantud
   (see oli ühekordne erand, mitte pretsedent).
3. **Uute TAI andmete lisamine 2. etapi põhimõttel.** Iga uus TAI tabel (nt `02Haigestumus/
   05Psyyhikahaired` PKH1–PKH8, `06Narkomaaniaravi` NR-tabelid — vt allpool 17.09.2026 uurimistöö)
   läbib sama protsessi: metaandmete kaardistus → muutujate rollide intervjuu → kood → test.
   Kõik TAI lingid moodustavad ühise **„TAI" grupi** vasakul loendipaneelil.
4. **Esimesed kolm Tervisekassa viidet 2. etapi põhimõttel.**
5. **Tervisekassa andmete laiendus**, moodustades vastava **„Tervisekassa" grupi**.
6. **Edasi:** muud Eesti avaandmed samas valdkonnas, kui leiame.

**Minu hinnang: plaan on mõistlik ja tehniliselt teostatav**, sequencing on hea — protsess
kinnitatakse madala riskiga tuttavatel tabelitel (2. etapp) enne uutele andmetele rakendamist
(3. etapp), ja TAI tehakse enne Tervisekassat lõpuni, mitte paralleelselt. Kaks asja, mida tasub
teada juba praegu, mitte alles siis, kui neile jõuame:

- **3. etapp nõuab `js/module.js` üldistust enne esimest tabelit, mis ei sobi ETU kujuga.**
  Praegune `seriesOf()` eeldab, et "Sugu" on põhiline võrdlustelg — PKH1-l oleks loomulikum telg
  Diagnoos, Sugu jääks tavaliseks filtriks. See tuleb lahti harutada enne PKH1 (või sarnase) lisamist,
  mitte selle käigus improviseerida.
- **„TAI" grupi moodustamine (3. etapp) on uus liidesetöö, mitte ainult andmetöö.** Vasak loendipaneel
  (`js/app.js` `renderList()`) on praegu lame nimekiri; rühmadega pealkirjastatud loendi jaoks on
  vaja väike, aga päris liidesemuudatus.
- **4. etapp ei saa tehniliselt korrata 2.–3. etapi "reaalajas API" mustrit sellisel kujul.**
  17.09.2026 uurimine kinnitas: Tervisekassa vaimse tervise andmed (`tervisekassa.ee/vaimne-tervis-
  retseptide-ja-arvete-andmed`) on Power BI embedded raport, mitte avalik JSON/CSV-liides — seda ei
  saa `fetch()`-iga tõmmata ega iframe'iga mujale manustada (`frame-ancestors 'self'`). Nende oma
  PxWeb-portaal (`statistika.tervisekassa.ee`) ei vasta praegu üldse (DNS ei resolveeru — võib-olla
  ajutine). **4. etapi käivitudes tuleb enne kokku leppida, milline tehniline muster Tervisekassa
  andmete jaoks sobib** (nt lihtne välislink-kirje, perioodiline käsitsi andmeeksport meie olemasoleva
  faili-üleslaadimise mehhanismi kaudu põhiteena, või otseühendus, kui `statistika.tervisekassa.ee`
  taastub) — see pole blokeerija praegu, aga ei tohi tulla üllatusena 4. etapis.

### 17.09.2026 uurimistulemused (andmeallikate kaardistus — sisend 3./4. etapile)

**TAI PxWeb, kaust `02Haigestumus/05Psyyhikahaired` — „Psüühika- ja käitumishäired"** (avaleht:
https://statistika.tai.ee/pxweb/et/Andmebaas/Andmebaas__02Haigestumus__05Psyyhikahaired/):
PKH1 (ambulatoorselt konsulteeritud, diagnoosi/soo/vanuse järgi), PKH2–3 (uued haigusjuhud, sh
100 000 elaniku kohta), PKH4 (haiglaravilt väljakirjutatud), PKH5 (haiglaravi näitajad, sh tahtest
olenemata hospitaliseeritud), PKH7 (psühhoaktiivsete ainete tarvitamisest tingitud häired),
PKH8 (päevaravilt lahkunud). PKH1 metaandmed kontrollitud: Aasta 1999–2025, Diagnoos (RHK-10,
täielik F-peatükk F00-F98 alamkoodideni), Vanuserühm (0/1/2 = Kokku/0-14/15+), Sugu (0/1/2, sama
kood mis ETU-tabelites), Konsultatsioonid (Kokku/Uued haigusjuhud). Uuendatud 16.06.2026.

**TAI PxWeb, kaust `02Haigestumus/06Narkomaaniaravi`** (17 NR-tabelit, F10-F19): lisaks soole/vanusele
ka maakonna, hariduse, rahvuse, majandusliku aktiivsuse lõiked mõnel tabelil.

**Tervisekassa „Vaimne tervis (retseptide ja arvete andmed)"**
(https://tervisekassa.ee/vaimne-tervis-retseptide-ja-arvete-andmed): kolm vahekaarti (Üldine
statistika — isikud/arved/summad/Tervisekassa tasutud summa; Esmased diagnoosid — F-koodide kaupa;
Maakondade statistika). **Tehniliselt Power BI embedded raport**, mitte API — `fetch()`-iga ei saa
tõmmata, `frame-ancestors 'self'` keelab iframe-manustamise mujal. Nende PxWeb-portaal
`statistika.tervisekassa.ee` (viidatud otsingumootorites) ei vasta praegu (DNS ei resolveeru).
Muu leitud: https://tervisekassa.ee/andmeparingud (ühekordsed PDF/HTML raportid, sh 2021 depressiooni
raviteekonna analüüs — mitte API).

## 1. Andmeallikate API-struktuuri lõplik kontroll
- [x] ETU41 struktuur ja täpsed kategooriakoodid kinnitatud (töötavas prototüübis)
- [x] ETU42 täpsed kategooriakoodid kinnitatud 16.09.2026 (GET + POST-proov) — vt README
      „Kinnitatud API-struktuur“
- [x] ETU43 täpsed kategooriakoodid kinnitatud 16.09.2026 — NB! `Sugu`/`Vanuserühm` pole
      eliminatsiooniga, päringus alati kaasa panna (vt README)

## 2. CORS/live-fetch valideerimine päris GitHub Pagesilt
- [x] Testleht `cors-test.html` valmis (kõik 3 tabelit, GET + POST); kohalikult `file://` (origin `null`)
      kõik päringud õnnestusid 16.09.2026
- [x] API CORS-päised kontrollitud: preflight OPTIONS → 200, `Access-Control-Allow-Origin: *`,
      `Allow-Methods: GET, POST`, `Allow-Headers: Content-Type` — suure tõenäosusega töötab ka GitHub Pagesilt
- [x] Avalik repo loodud: https://github.com/Maag6969/vt-startpage (PDF on `.gitignore`-s, avalikuks ei läinud)
- [x] GitHub Pages sisse lülitatud (haru `main`, juurkaust): https://maag6969.github.io/vt-startpage/
- [x] **Kinnitatud 16.09.2026:** https://maag6969.github.io/vt-startpage/cors-test.html — kõik 6 päringut
      (3 tabelit × GET + POST) õnnestusid originilt `https://maag6969.github.io`, konsoolis vigu pole
- [x] Varuvarianti peamiseks teeks pole vaja — live-fetch on põhitee; faili-üleslaadimine jääb ainult varuplaaniks

**Blokeerija lahendatud** — edasine plaan (live-fetch GitHub Pagesilt) kehtib.

## 3. Korduvkasutatava raamistiku disain ja kirjutamine
- [x] Ühine tuummoodul `js/core.js` (json-stat2 lugeja, päringu koostamine, veatüübid, üleslaadimise
      varuplaan, tooltip, vormindus) — vt README „Failistruktuur ja raamistiku liides“
- [x] Tabelipõhised konfiguratsioonid `js/tables/etu41.js`, `etu42.js`, `etu43.js` (renderdus tuleb etappides 5–6)
- [x] Testid `tests/framework-test.html`: 13 ühiktesti + 6 integratsioonitesti päris API vastu —
      kõik 19 läbisid 16.09.2026 (etapis 6 lisandus 1 → 20/20; käivitamine: `tools/serve.ps1` →
      http://localhost:8080/tests/framework-test.html)
- [x] `TAI.attachTooltip` kontrollitud etapis 5 päris graafikuga

## 4. Master-lehe infoarhitektuur
- [x] Stiiliotsused intervjuuga (päis, loendi rida, tühi olek, mobiil, jalus, paneelide eristus) — disain.md p. 2
- [x] `index.html` + `css/styles.css` + `js/app.js`: päis („Vaimse tervise näidikulaud“, TAI link, laadimise aeg),
      vasak loend (kogu rida nupp, allika link eraldi), tühi olek, laadimise skelett, veaolek
      („Proovi uuesti“ + faili üleslaadimine), mooduli karkass (eyebrow, pealkiri, meta-sildid koos tabeli
      uuenduskuupäevaga, jalus), lehe jalus, valik aadressis (`#ETU42`, tagasi-nupp töötab)
- [x] Brauseris kontrollitud 16.09.2026: kõigi 3 tabeli laadimine, veaolek (simuleeritud võrgutõrge),
      uuesti proovimine, faili üleslaadimine päris API JSON-iga, brauseri tagasi-nupp, laia ja mobiilivaate
      paigutus, horisontaalset kerimist pole
- [ ] Mobiilis sujuv automaatne kerimine mooduli juurde — loogika kontrollitud, kuid animatsiooni ei saanud
      arenduspaneelis näha (paneel ei joonistanud kaadreid); kontrollida päris telefonis/brauseris
- Mooduli ajutine märge asendatud etapis 5 päris sisuga

## 5. Esimese mooduli (ETU41) integreerimine
- [x] Kujundusotsused intervjuuga (filtrid, soo lüliti, KPI sisu ja stiil, trendi sildid, tulpade rühmitus,
      võrdlusrežiim, callout, andmetabel, järjekord) — disain.md p. 3.1
- [x] `js/module.js`: andmemudel, KPI-kaardid, automaatne callout, trendijoonis, rühmitatud tulpdiagramm
      („Kokku“ võrdlusjoonena, paaristulbad võrdlusel), andmetabel; `js/app.js`: filtrid + kohene uuestilaadimine,
      filtrivalikud säilivad tabelite vahel, graafikud joonistuvad laiuse muutumisel ümber
- [x] Üleslaaditud faili tee: filtrid arvutatakse failist ilma API-päringuta
- [x] Brauseris kontrollitud 16.09.2026: koond (10,9%, ▲ 2,6 pp), taustatunnuse filter + esiletõstetud tulp,
      mehed vs naised (KPI-d, 2 joont, paaristulbad, 2 võrdlusjoont), puuduvad väärtused (API `..`, nt 75+ kõrgharidus
      → „Andmed puuduvad“, callout märgib), lai + mobiilivaade (ilma horisontaalse kerimiseta), tooltip hiire ja fookusega
- [x] `TAI.attachTooltip` kontrollitud päris graafikuga
- NB! Puuduvaid väärtusi (`..`) ei tuletata „100 − teine kategooria“ kaudu — TAI on need teadlikult avaldamata jätnud

## 6. Teise ja kolmanda mooduli lisamine
- [x] Intervjuu 16.09.2026: ETU42 vanuserühm jääb nii filtrisse kui tulpadesse; metoodikamärkus trendi all +
      callout-lause „15–24“ puhul; ETU43 KPI-l soovitusliku uneaja rida; ETU43 soo vaikevalik „Kokku“ — disain.md p. 5
- [x] ETU42 moodul: trend + vanuserühmade tulbad, `trendNote`, `calloutCaveats`; kontrollitud koond (13,6%, ▲ 3,8 pp),
      15–24 võrdlus (naised 22,9%, mehed 9,5%, meeste 2014 puudub → „Muutust ei saa arvutada“, joonel tühik)
- [x] ETU43 moodul: ainult tulbad, KPI ilma muutuseta + `kpiNote`; kontrollitud koond 26,2%, võrdlus 24,7/27,4%
- [x] Faili üleslaadimine mõlemale: täisfail annab samad numbrid mis API; osaline fail lükatakse tagasi selge
      veateatega (puuduvad muutujad)
- [x] **Parandatud viga:** kui andmetes puudus dimensioon (nt osaline fail), näidati iga vanuserühma kohta vaikselt
      koondväärtust. Nüüd `indicatorShare` tagastab `null` ja `readUploadedFile` nõuab kõiki muutujaid (+ ühiktest, 20/20)
- [x] Mobiilivaade (375px): mõlemal tabelil horisontaalset kerimist pole

## 7. Viimistlus
- [x] Ülevaatus 16.09.2026: tekstikontrast AA (automaatkontroll, 0 probleemi), pealkirjade järjekord, maamärgid,
      vormisildid — korras
- [x] Parandatud ilma otsuseta: lehe `<title>` valitud tabeli järgi; kõigil uues aknas avanevatel linkidel
      ekraanilugeja märge (`TAI.externalLink`); kerimine arvestab „vähenda liikumist“ seadistust
- [x] Intervjuu: oranž → `#d4621a` (graafikukontrast ≥ 3:1); favicon (sinine ring + „V“); printimise stiil
      (valitud lõige tekstina, andmetabel avatud); Open Graph lingi eelvaade; filtrid aadressis
- [x] Kontrollitud: otselink filtritega, filtri muutus uuendab aadressi ilma uue ajaloo kirjeta, tabelite vahel
      liikudes filtrid säilivad aadressis, vigased parameetrid ignoreeritakse, brauseri „tagasi“, printvaate simulatsioon
- [x] Responsiivsus (paneelide virnastumine) ja veakäsitlus kõigi kolme tabeli jaoks — kontrollitud etappides 4–6
- [x] Avalik repo koristatud: testid, tööriistad, CORS-test ja vana prototüüp ainult kohalikus arvutis (`.gitignore`);
      git'i ajaloos on vanad versioonid endiselt nähtavad
- [ ] Päris printimine (Ctrl+P) ja lingi eelvaade SharePointis/Teamsis — kontrollida päris keskkonnas
- NB! Lingi eelvaatel pole pilti (`og:image`) — vajaks eraldi PNG-pilti

## 8. Avaldamine ja SharePointi integratsioon
- [x] GitHub Pagesile avaldatud: https://maag6969.github.io/vt-startpage/
- [ ] SharePointi Embed-veebiosasse lisatud — **ootel** (kasutaja otsus 16.09.2026)
- [ ] HTML Field Security seadistus kontrollitud/lisatud (vajab IT/admini kaasamist) — **ootel**

## 9. Täiendused pärast jagamist
- [x] 17.09.2026: soo lüliti tekst „Mehed vs naised“ → „Mehed vrdl Naised“ (ka printimise kokkuvõttes)
- [x] 17.09.2026: lehe pealkiri 25% suurem (2rem; mobiilis 1,6875rem)
- [x] 17.09.2026: vaatamiste loendur pealkirja all (intervjuu; Abacus, loeb lehe avamisi, ainult avaldatud lehel +1) —
      disain.md p. 2 „Päis“
- [x] 17.09.2026: kasutusstatistika laiendatud (intervjuu) — andmestike avamised (arv loendi real), filtrivalikud,
      lisategevused; 54 loendurit loodud Abacuses, halduskoodid `.counter-admin-keys.tsv` (gitignore);
      kohalik statistikaleht `tools/stats.html`. Kontrollitud simuleeritud avaldatud lehega: õiged loendurid,
      seansisisesed kordused ei loe, statistikaleht loeb kõik 54 (päringupiirangu tõttu aeglane, ~40 s)
- [x] `tools/serve.ps1` parandatud: HEAD-päring ega üksik viga ei peata enam serverit
- [x] 17.09.2026: turvaküsimus läbi arutatud — kas dashboard kasutab kasutaja tokeneid/mandaate. Vastus: ei,
      TAI PxWeb API ja Abacus on mõlemad avalikud kontota teenused, päring käib külastaja enda brauserist.
      Kontrollitud: pole kunagi commit'itud tokenit/võtit (ka git ajaloos), XSS-i teed pidi API andmed lehele
      ei jõua ilma escape'imata. Läbiv põhimõte kirjas README.md "Põhimõte: ei mingeid isiklikke
      tokeneid/mandaate lahenduses" ja disain.md-s.

**Ootel (kasutaja otsus 17.09.2026 — mitte praegu, hiljem kui vaja):**
- [ ] Content-Security-Policy päis (piirab, milliste domeenidega leht tohib suhelda; kaitseks nt Google Fontsi
      kompromiteerimise puhul) — vajab hoolikat testimist, et fondid/API-d/loendurid jääksid tööle
- [ ] Abacuse loendurid GoatCounterile üle viia (praegu saab loendurite nimesid teades neid võõras skript
      suvaliselt suurendada — kosmeetiline risk, statistika täpsus, mitte turvarisk)

**Praegune seis (16.09.2026):** leht on jagatud GitHub Pagesi lingina TTÜ koolitajale ja kolleegidele
tagasiside saamiseks. SharePointi integratsioon ja embed-juhised tehakse hiljem, kui vaja.
Järgmine samm: koolitaja/kolleegide tagasiside läbitöötamine.

## Avatud küsimused / blokeerijad

- ~~Visuaalne stiil täpsustamata~~ — **lahendatud 16.09.2026**: allikaks SoM_stiiliraamat_2024.pdf,
  otsused tehtud kolmes intervjuuringus (vt disain.md p. 1.1–1.2).
- ~~CORS TAI API-st pole päriselt testitud~~ — **lahendatud 16.09.2026**, töötab GitHub Pagesilt (vt samm 2).
