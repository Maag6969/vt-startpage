# M2 piloteerimise 2. etapp — samm-sammuline juhis

Koostatud 19.10.2026. Alus: M2 `TASKS.md` „Piloteerimise etapid" (2. etapp) ja M3 praegune seis
(`../M3_kodutoo_tervishoiu_kvaliteet`, viimane töö 04.10.2026).

**Töötamise reeglid (kehtivad kogu etapi jooksul):**
- M3-st võib üle võtta **ainult tehnilist koodi** (`core.js`/`module.js`-tüüpi loogika, tabelikonfi kuju).
  **Visuaalseid/disainiotsuseid ei kanta vaikimisi üle** — iga uus disainiotsus vajab intervjuud M2-s.
- Commit teeb Claude ainult sinu palvel; enne iga commit'i kontrolli `git status`.
- Ei mingeid isiklikke võtmeid/kontosid lahenduses (README põhimõte). Kui mõni samm seda vajaks, peatu ja küsi.

---

## 0. Oluline leid enne alustamist (kontrollitud 19.10.2026)

2. etapi algne eesmärk oli: „kaasa ETU41–43 kõik TAI taustaandmed; kontrolli GET-metaandmetega, kas midagi
jäi kasutamata". Kontrollisin TAI API metaandmeid — **ükski muutuja ei ole kasutamata**:

| Tabel | TAI pakub | M2 kasutab |
|---|---|---|
| ETU41 | Aasta, Taustatunnus (10), Depressioon, Sugu, Vanuserühm (8) | kõiki |
| ETU42 | Aasta, Distress, Sugu, Vanuserühm (8) | kõiki |
| ETU43 | Aasta (ainult 2019), Piisavus, Sugu, Vanuserühm (8) | kõiki |

Seega **ETU tabelitele pole taustaandmeid juurde lisada**. 2. etapp tuleb ümber raamida: eesmärk ei ole enam
„laienda ETU tabeleid", vaid **„too M3-s valminud tehniline töö M2-sse ja kinnita muutuja-rollide
otsustamise protsess ühel väikesel, madala riskiga muudatusel"**. Allolevad sammud lähtuvad sellest.

> **Otsus 0 (sinu kinnitus vajalik):** kas raamime 2. etapi nii ümber? Kui jah, jätka. Kui tahad algset
> sõnastust hoida (nt sooviksid mõnda uut TAI tabelit juba nüüd), liigu hoopis 3. etappi.

---

## 1. Ettevalmistus (turvavõrk)

- [x] `git status` M2-s puhas; `git log -1` = `6183888` (21.10.2026 kontrollitud).
- [x] Testid rohelised: **20/20** (21.10.2026). See on „enne" seis.
- [x] `git tag etapp2-algus` tehtud (lokaalne, `6183888`). Tagasi: `git reset --hard etapp2-algus` (ainult sinu loal).
- [ ] Ava brauseris kõik 4 tabelit ja tee iga kohta üks ekraanipilt „enne" võrdluseks.

## 2. Triiv M2 ja M3 koodi vahel (diff, mitte kopeerimine)

M2 võttis M3 üldistuse üle 17.09.2026; M3 on sellest ajast edasi läinud. Enne midagi üle võtta, vaata, mis
tegelikult erineb.

- [x] Võrdlus tehtud 21.10.2026 (funktsioonide nimekirjade põhjal; `core.js` 188 ja `module.js` 621 erinevat rida —
      viimane suur just M2 kahe mudeli tõttu). Tulemus allolevas tabelis.

| Erinevus M3-s | Liik | Võta M2-sse? |
|---|---|---|
| `TAI.readSdmxJson`, `dimInfo` (core.js) — SDMX-JSON lugeja OECD jaoks | tehniline | **Ei praegu** (M2-s pole SDMX allikat; võta, kui OECD-d lisame) |
| `TAI.directionHint`, `dominantValence`, `yearRangeLabel` (module.js) | tehniline + väike UI | **Otsus 1** (vt samm 3) |
| `config.group` + rühmitatud loend (`app.js` `renderList`/`datasetRow`) | tehniline + **disain** (rühmapealkirjad, tihendatud stiil) | Tehniline osa jah (samm 4); visuaal **intervjuuga** |
| `copyViaTextarea`, `showAiNotice`, `showAiToast`, `js/ai-prompt.js` (AI-nupud) | **tootefunktsioon + disain** | **Ei** — vt „Teadlikult välja jäetud" |
| M2-s ainult: kahe mudeli dispatch (`*Indicator`/`*General`), `kpiSubject`/`kpiReference`/`cardLabel`, `seriesValues`, `axisMax`, `expandFlag` | M2 oma | Jääb; vt samm 5 |

## 3. Väike tehniline üleminek: M3 abifunktsioonid (otsus 1)

M3 `directionHint` annab „↓ väiksem = parem" tüüpi vihje, `yearRangeLabel` aastavahemiku („2011–2023").
M2-s eemaldasime 18.09.2026 päisest aastate/ühiku plaadid (kasutaja soov), seega **vajadus puudub, kui
sama taotlust ei tule**.

> **Otsus 1 (21.10.2026): EI.** Neid abifunktsioone M2-sse ei tooda; samm 3 on seega tehtud (tegemata jäetud).

## 4. Rühmitatud vasak loend (tehniline osa M3 eeskujul)

Plaani 3. etapp nõuab „TAI" ja hiljem „Tervisekassa" gruppe; M3-s on mehhanism juba valmis ja testitud.

**Tehtud 21.10.2026.** Intervjuu tulemus (otsus 3): grupid **allika järgi „Tervise Arengu Instituut" (algul „TAI", täisnimi kasutaja soovil hiljem) ja „Eurostat"**, järjekord
**Eesti ees, rahvusvaheline all** (fikseeritud, `TAI.GROUP_ORDER`), stiil **väike hall pealkirjarida rea kohal**.

- [x] M3 `renderList` loetud; **tehniline mõte üle võetud, kood ja stiil M2 omad** (M2 CSS-i tokenid, oma
      pealkirjastiil; M3 `.dataset-group-heading` stiili ei kopeeritud).
- [x] `group` lisatud neljale tabelikonfile (`etu41–43` → „Tervise Arengu Instituut", `eurostat-ilc-pw01` → „Eurostat").
- [x] `core.js`: `TAI.GROUP_ORDER`, `TAI.groupTables(list)` (puhas funktsioon, testitav), `TAI.getTableGroups()`.
      Grupi sees jääb M2 üldreegel (uusim aasta, siis tähestik). `index.html`: `<ul id="dataset-list">` → `<div>`.
- [x] `app.js`: `datasetRow()` + rühmitatud `renderList()`; pealkiri `<h2>`, iga grupp oma `<ul aria-labelledby>`.
- [x] `styles.css`: `.dataset-group-heading` (väike hall suurtähtedes rida, õhuke eraldusjoon gruppide vahel).
- [x] Uus ühiktest `groupTables…` → **21/21 testi rohelist**.
- [x] Kontrollitud brauseris: desktop, mobiil (375px, horisontaalset kerimist pole), tabeli valik (aktiivne rida,
      hash, aruanne, „Tagasi andmestike juurde" link `#dataset-list` töötab), vaatamiste loendurid rea juures.
- [ ] Veel kontrollida päris klaviatuuri/ekraanilugejaga (TAB-liikumine gruppide vahel) — brauseripaneelis ei saanud.

## 5. „Muutuja rolli otsustamise" protsess — üks proovitäitmine (see oli 2. etapi tegelik mõte)

Protsess, mida 3. etapp iga uue tabeliga kordab. Harjuta seda ühe **juba olemasoleva** tabeli peal ja
dokumenteeri tulemus:

**Tehtud 21.10.2026** — tulemus `TASKS.md` jaotises „Piloteerimise 2. etapp — tehtud".

- [x] ETU43 rollitabel koostatud. Parandus juhise esialgsele oletusele: *Vanuserühm* on ETU43-l **ainult
      breakdown-telg** (mitte filter); `filters` sisaldab vaid Sugu.
- [x] Üldmudeli sobivus kontrollitud: **ei sobi** — soo võrdlusrežiimis peaksid seeriad olema Mehed/Naised,
      üldmudel eeldab config-tasemel fikseeritud `seriesVar`/`seriesValues`.
- [x] **Otsus 2 (ei selles etapis)** põhjendus kirjutatud TASKS.md-sse.
- [x] Protsessi 6-sammuline kokkuvõte kirjutatud TASKS.md-sse (3. etapi sisend).

## 6. Dokumentatsiooni sünkroon

**Tehtud 21.10.2026.**

- [x] M2 `js/tables/README-NAIDIS.js` loodud (mõlemad kujud, M2 päris tabelitele viidetega).
- [x] README.md: `module.js` kahe mudeli selgitus ja `README-NAIDIS.js`/`group` rida failistruktuuri.
- [x] `TASKS.md`: „Piloteerimise 2. etapp — tehtud", otsused 0–3, uuendatud kuupäev.
- [x] M3 `TASKS.md` jäeti **muutmata** — M3 ei saanud M2-st midagi vastu, olemasolev viide M2 `module.js`-ile kehtib.

## 7. Lõppkontroll ja avaldamine

- [x] Testid **21/21** rohelised (20 + 1 uus `groupTables` test).
- [x] Kõik 4 tabelit brauseris laadivad ja annavad samad arvud mis enne (ETU41 10,9%, ETU42 13,6%,
      ETU43 26,2%, ilc_pw01 7,3); mobiilis loend + valik kontrollitud, veaolek ja filtrid pole selles etapis puutunud.
- [ ] **Commit + push — ootab sinu luba.** Muudetud: `core.js`, `app.js`, `index.html`, `styles.css`, 4 tabelikonfi,
      `tests/framework-test.html` (gitignore'itud, ei lähe commit'i), `README.md`, `TASKS.md`, uued
      `ETAPP2-JUHIS.md`, `js/tables/README-NAIDIS.js`.
- [ ] Pärast push'i: Ctrl+F5 (või privaatne aken) — Pages'i vahemälu näitab vana JS-i; kontrolli
      `gh api repos/Maag6969/vt-startpage/pages/builds/latest`.

---

## Teadlikult välja jäetud (mitte 2. etapi osa)

- **AI-analüüsi nupud (M3)** — see on uus tootefunktsioon (lõikelaud, popup/PiP aken, juhisetekst) koos
  disainiotsustega ja M3 tellija maitsega; vajab M2-s eraldi arutelu ja intervjuud, kui üldse soovitakse.
- **SDMX-JSON lugeja / OECD** — võta alles siis, kui M2-sse lisandub SDMX allikas.
- **Uued TAI tabelid (PKH1–PKH8, NR-tabelid), Tervisekassa** — 3.–5. etapp.
- **GitHub Pages/loendurid M3-s** — M3 oma teema.

## Otsused

| # | Küsimus | Otsus (21.10.2026) |
|---|---|---|
| 0 | Kas 2. etapp raamitakse ümber (ETU-l pole kasutamata muutujaid)? | **Jah** |
| 1 | Kas tuua M3 `directionHint`/`yearRangeLabel` M2-sse? | **Ei** (vajadust pole) |
| 2 | Kas viia ETU üldmudelile? | **Ei selles etapis** |
| 3 | Gruppide nimed, järjekord, stiil | Lahtine — intervjuu samm 4 ees |
