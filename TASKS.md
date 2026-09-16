# TAI Vaimse Tervise Näidikulaud — TASKS.md

Hetkeseisu jälgimise fail. Iga uus sessioon (sh Claude Code'is) peaks alustama sellest failist, et
teada, kus pooleli jäädi — vt README.md tehnilise arhitektuuri ja disain.md visuaalsete otsuste jaoks.

Viimati uuendatud: 16.09.2026 (etapid 1–7 lõpetatud; leht jagatud tagasisideks; etapp 8 SharePoint ootel)

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

**Praegune seis (16.09.2026):** leht on jagatud GitHub Pagesi lingina TTÜ koolitajale ja kolleegidele
tagasiside saamiseks. SharePointi integratsioon ja embed-juhised tehakse hiljem, kui vaja.
Järgmine samm: koolitaja/kolleegide tagasiside läbitöötamine.

## Avatud küsimused / blokeerijad

- ~~Visuaalne stiil täpsustamata~~ — **lahendatud 16.09.2026**: allikaks SoM_stiiliraamat_2024.pdf,
  otsused tehtud kolmes intervjuuringus (vt disain.md p. 1.1–1.2).
- ~~CORS TAI API-st pole päriselt testitud~~ — **lahendatud 16.09.2026**, töötab GitHub Pagesilt (vt samm 2).
