# TAI Vaimse Tervise Näidikulaud — TASKS.md

Hetkeseisu jälgimise fail. Iga uus sessioon (sh Claude Code'is) peaks alustama sellest failist, et
teada, kus pooleli jäädi — vt README.md tehnilise arhitektuuri ja disain.md visuaalsete otsuste jaoks.

Viimati uuendatud: 16.09.2026 (stiiliotsused tehtud, etapid 1–2 lõpetatud; järgmine: etapp 3 raamistik)

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
- ~~CORS TAI API-st pole päriselt testitud~~ — **lahendatud 16.09.2026**, töötab GitHub Pagesilt (vt samm 2).
