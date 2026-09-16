# TAI Vaimse Tervise Näidikulaud — TASKS.md

Hetkeseisu jälgimise fail. Iga uus sessioon (sh Claude Code'is) peaks alustama sellest failist, et
teada, kus pooleli jäädi — vt README.md tehnilise arhitektuuri ja disain.md visuaalsete otsuste jaoks.

Viimati uuendatud: 16.09.2026 (stiiliotsused tehtud, etapp 1 lõpetatud; järgmine: etapp 2 CORS-test)

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
- [ ] Repo `vt-startpage` loodud (ootab Git + GitHub CLI paigaldust); PDF on `.gitignore`-s, avalikuks ei lähe
- [ ] Testleht GitHub Pagesile üles pandud
- [ ] Kinnitatud, et fetch() TAI API-sse töötab reaalselt sealt (mitte ainult lokaalselt/eelvaates)
- [ ] Kui ei tööta: otsustada varuvariant (faili-üleslaadimine peamiseks teeks vs proxy)

**BLOKEERIJA:** see samm pole veel tehtud — kogu edasine plaan eeldab, et see õnnestub.

## 3. Korduvkasutatava raamistiku disain ja kirjutamine
- [ ] Ühine tuummoodul (json-stat2 lugeja, tooltip, veakäsitlus, üleslaadimise varuplaan)
- [ ] Tabelipõhise konfiguratsiooni muster (API-tee, VARS, buildQuery, renderdus)

Otsused olemas (disain.md), kood veel kirjutamata.

## 4. Master-lehe infoarhitektuur
- [ ] Vasak loendipaneel (rida = pealkiri + selgitus + viide + API-nupp)
- [ ] Parem kuvamisala + tühi olek

Paigutuse otsused olemas (disain.md p. 2), kood veel kirjutamata.

## 5. Esimese mooduli (ETU41) integreerimine
- [ ] Üleslaaditud faili loogika ümber tõstetud uude raamistikku
- [ ] Visuaal viidud disain.md mallile vastavaks (eyebrow, KPI-kaardid, callout jne)

## 6. Teise ja kolmanda mooduli lisamine
- [ ] ETU42 moodul (sama struktuur mis ETU41, testida eraldi)
- [ ] ETU43 moodul (ainult tulpdiagramm, ilma trendijooneta — vt disain.md p. 5)

## 7. Viimistlus
- [ ] Disaini ühtlustamine kõigi kolme mooduli vahel
- [ ] Responsiivsus (paneelide virnastumine kitsal ekraanil)
- [ ] Veakäsitlus kontrollitud kõigi kolme tabeli jaoks

## 8. Avaldamine ja SharePointi integratsioon
- [ ] GitHub Pagesile avaldatud
- [ ] SharePointi Embed-veebiosasse lisatud
- [ ] HTML Field Security seadistus kontrollitud/lisatud (vajab IT/admini kaasamist)

## Avatud küsimused / blokeerijad

- ~~Visuaalne stiil täpsustamata~~ — **lahendatud 16.09.2026**: allikaks SoM_stiiliraamat_2024.pdf,
  otsused tehtud kolmes intervjuuringus (vt disain.md p. 1.1–1.2).
- **CORS TAI API-st pole päriselt testitud** — vt samm 2, kogu live-fetch plaan seisab selle peal.
