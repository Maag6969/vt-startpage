# TAI Vaimse Tervise Näidikulaud — Disain.md

Selles failis on kirjas visuaalsed, sisulised ja funktsionaalsed otsused, mis täiendavad README.md-s
kirjeldatud tehnilist arhitektuuri. README vastab küsimusele "millised andmed ja kuidas need liiguvad",
disain.md vastab küsimusele "kuidas see kasutajale välja näeb ja milline jutt numbrite ümber käib".

> **STAATUS: kinnitamisel (16.09.2026).** Visuaalne stiil põhineb Sotsiaalministeeriumi stiiliraamatul
> `SoM_stiiliraamat_2024.pdf` („Visuaalne suund sise- ja väliskommunikatsiooni ühtlustamiseks“, nov 2023).
> Raamatust võetakse elemente **valikuliselt** — iga otsus tehakse kasutajaga intervjuu põhjal ja
> kirjutatakse siia. Varasem sm.ee-põhine ajutine lähend on sellega asendatud.

## 1. Visuaalne stiil

### 1.1 Kinnitatud otsused (1. intervjuuring)

| Token | Väärtus | Allikas | Kasutus |
|---|---|---|---|
| `--som-keskmine-sinine` | `#4B7DFF` | põhivärv | **Juhtiv aktsentvärv:** peamised nupud, aktiivse rea aktsentriba, fookus/hover |
| `--som-tumesinine` | `#181E54` | põhivärv | Tekstiline aktsent: pealkirjad, lingid |
| `--series-1` | `#4B7DFF` | põhivärv | Graafikute 1. seeria (nt mehed / ainus seeria) |
| `--series-2` | ~~`#f17a29`~~ → **`#d4621a`** | lisavärv (oranž), tumendatud | Graafikute 2. seeria (nt naised). Raamatu oranž andis valgel 2,8:1, WCAG nõuab graafikuelementidele 3:1 → tumedam toon ~3,8:1 (intervjuu 16.09.2026, etapp 7) |

- **Font:** Roboto (Google Fonts) — sisutekst Regular 400, esiletõstmine Medium 500 / Bold 700,
  pealkirjad Light 300 / Medium / Bold (stiiliraamatu lk 6 järgi).
- **Režiim:** ainult hele teema (stiiliraamatus tumedat versiooni pole; SharePointi iframe on hele).
- **Kontrast:** `#4B7DFF` kontrast valgega on ~3,7:1 — WCAG AA tavatekstile (4,5:1) ei vasta.
  Seetõttu **lingid ja väike tekst tumesinisena**.

### 1.2 Kinnitatud otsused (2.–3. intervjuuring)

| Token | Väärtus | Kasutus |
|---|---|---|
| `--tekst-1` | `#0e0f21` (murtud must) | Põhitekst |
| `--tekst-pealkiri` | `#181E54` (tumesinine) | Pealkirjad, lingid |
| `--tekst-2` | `#52555e` | Sekundaarne tekst (AA-kontrastiga, ~7:1) |
| `--taust` | `#ffffff` | Lehe taust |
| `--joon` | `#e7eaea` (helehall) | Kaartide piirjooned, eraldajad, gridlined |
| `--sinine-15` | `#E4ECFF` | Keskmise sinise 15% toon: aktiivse rea taust, ümarate siltide taust |
| `--positiivne` | `#677c36` (tumeroheline) | KPI delta — paranemine (kontrast ~4,6:1) |
| `--negatiivne` | `#c0392b` | KPI delta — halvenemine (raamatus punast pole; oranž ei läbi AA-d) |

- **Nupud:** keskmine sinine taust, valge kiri **Roboto Bold ≥ 19px** (WCAG „suur tekst“, nõue 3:1 täidetud),
  **täielikult ümarad otsad** (pill).
- **Aktiivne rida vasakul paneelil:** taust `--sinine-15` + keskmise sinise vasakriba.
- **Ümarad vormid (pill-sildid):** eyebrow-silt („EESTI TERVISEUURING · ETU41“) ja meta-rea sildid
  (uuringuaastad jms) — taust `--sinine-15`, kiri tumesinine; lisaks nupud (vt ülal).
- **Ei kasuta:** täpilainet, vertikaaljoont pealkirja ees, joonikoone, tabelikoodi silti vasakul real.
- **Logo:** ei kasutata. Päises tekstiline pealkiri, jaluses allikaviide TAI-le. Lisatav hiljem ainult
  ametliku logofaili ja kasutusloa olemasolul.

### 1.3 Stiiliraamatu kogu palett (viiteks)

| Nimi | HEX | Märkus raamatust |
|---|---|---|
| Tumesinine | `#181E54` | põhivärv |
| Keskmine sinine | `#4B7DFF` | põhivärv; heledad taustatoonid läbipaistvusega 50% / 25% / 15% |
| Kollane | `#fcb116` | lisavärv (graafikud, esitlused) |
| Oranž | `#f17a29` | lisavärv |
| Heleroheline | `#82b663` | lisavärv |
| Tumeroheline | `#677c36` | lisavärv |
| Helesinine | `#9ad3fc` | lisavärv |
| Murtud must | `#0e0f21` | neutraalne |
| Helehall | `#e7eaea` | neutraalne |
| Valge | `#ffffff` | neutraalne |

Kujunduselemendid raamatus: täpilaine, vertikaalne joon pealkirja ees (põhivärvides või valge),
ümarad vormid, lihtsad joonikoonid — neist on kasutusel ainult ümarad vormid (vt p. 1.2).

Kõrge kontrastsus ja ligipääsetavus (WCAG AA) on riigiveebi kontekstis kohustuslik nõue, mitte lisavõimalus.

## 2. Layout

Kinnitatud intervjuus 16.09.2026 (etapp 4).

Master-leht jaguneb kaheks vertikaalseks paneeliks: vasak loendipaneel (~1/3 laiusest, min-width 320px)
ja parem kuvamisala (~2/3). Mõlemad valgel taustal, vahel helehall `#e7eaea` **püstjoon** (mitte kaardid,
mitte kleepuv loend).

### Päis
- Pealkiri **„Vaimse tervise näidikulaud“** — valge taust, tumesinine `#181E54` Roboto Medium, all helehall eraldusjoon.
  Suurus 2rem (mobiilis 1,6875rem) — 17.09.2026 suurendatud 25%.
- **Vaatamiste loendur** (intervjuu 17.09.2026): väike hall rida pealkirja all („1 234 vaatamist“). Loeb
  **lehe avamisi** (ka värskendamine = +1). Printides peidetud.

### Kasutusstatistika (intervjuu 17.09.2026)
Eesmärk: näha, millist infot kõige rohkem kasutatakse. Teenus **Abacus** (`abacus.jasoncameron.dev`, küpsisteta,
kontota; ainult koguarvud, ajalugu pole). Kood: `js/usage.js`.

| Loendur | Mida loeb |
|---|---|
| `vt-startpage` | avalehe avamine (iga kord) |
| `ds-<KOOD>` | andmestiku avamine (andmed laaditud edukalt API-st) |
| `f-<KOOD>-<filter>-<väärtus>` | kasutaja tehtud filtrivalik, nt `f-ETU41-sugu-vordlus`, `f-ETU42-vanus-1` |
| `a-<KOOD>-andmetabel/allikas/prindi/fail` | andmetabeli avamine, TAI allikalingi klõps, printimine, faili üleslaadimine |

- Sama tegevus loetakse **ühe brauseriseansi jooksul üks kord** (va avaleht); vaikevalikud ja otselingi filtrid
  ei lähe filtrite alla.
- **Andmestiku vaatamiste arv on kõigile nähtav loendi real** („57 vaatamist“, allika lingi kõrval).
- Arve suurendatakse ainult avaldatud lehel; kui teenus ei vasta, arve ei kuvata ja leht töötab edasi.
- Kogu statistika järjestatult: kohalik leht `tools/stats.html` (ainult loeb). Halduskoodid (nullimiseks)
  kohalikus failis `.counter-admin-keys.tsv` — mõlemad ei lähe avalikku repo.
- Uue tabeli/filtri lisamisel tekivad loendurite nimed automaatselt (`TAI.usage.allKeys()`), kuid Abacuses
  tuleb need enne luua (`/create`), et saada halduskood ja et statistikaleht näitaks nulle.
- Lisaks: link **„TAI tervisestatistika andmebaas ↗“** ja **laadimise aeg** („Andmed laaditud otse TAI
  andmebaasist · 16.09.2026 14:32“; nähtav pärast esimest edukat laadimist).
- Alapealkirja ei ole.

### Vasak loendipaneel
- Paneelil **pealkirja ei ole** — loend algab kohe esimese reaga; read eraldatud helehallide joontega.
- **Kogu rida on nupp** (eraldi „API“ nuppu pole): klikitav ala = pealkiri + ühelauseline kirjeldus + „›“.
- **Allika link** („Allikas: TAI ETU41 ↗“) on eraldi väike rida nupu all, sama rea sees, oma fookusega
  (link ei tohi olla nupu sees).
- Aktiivne rida: keskmise sinise `#4B7DFF` vasakriba + taust `--sinine-15`; `aria-current="true"`.
- Rea olekud: laadimisel spinner + „Laadin…“; vea korral punane tekst „Laadimine ebaõnnestus“.

### Parem kuvamisala
- **Tühi olek:** juhis „Vali vasakult andmestik“ + 2–3 lauset, mida näidikulaud näitab ja et andmed
  laaditakse reaalajas TAI andmebaasist.
- Valitud mooduli kuvamisel struktuur järgib alljärgnevat malli; meta-reas ka **tabeli ametlik
  uuenduskuupäev** API `updated` väljast (nt „Tabel uuendatud 28.04.2021“).
- Viga: pealkiri + selgitus (`TAI.describeError`), nupp „Proovi uuesti“ ja vajadusel faili üleslaadimine.

### Kitsas ekraan (< 768px)
Paneelid virnas, loend üleval. Rea valimisel keritakse automaatselt mooduli algusesse; mooduli ülaosas
link „↑ Tagasi andmestike juurde“.

### Lehe üldjalus
Ainult andmeallikas: „Andmed: Tervise Arengu Instituut, Eesti terviseuuring“ + link TAI andmebaasi.

### Aadress
Valitud tabel **ja filtrid** kajastuvad aadressis (nt `#ETU41?taustatunnus=3&vanus=2&sugu=vordlus`) —
otselink konkreetsele vaatele ja brauseri „tagasi“ töötavad (etapp 7).

### Viimistlus (intervjuu 16.09.2026, etapp 7)
- **Favicon:** SVG — keskmise sinise `#4B7DFF` ring, sees valge „V“ (logota).
- **Printimine:** loend, nupud, filtrid ja lingid „tagasi“ peidetakse; moodul trükitakse täislaiuses,
  andmetabel avatakse; valitud filtrid trükitakse tekstina mooduli pealkirja alla.
- **Lingi eelvaade:** Open Graph metaandmed (pealkiri, kirjeldus, keel) SharePointi/Teamsi/e-posti jaoks.
- **Avalik repo:** ainult lehe failid + README, disain.md, TASKS.md; abi- ja arendusfailid (testid, tööriistad,
  CORS-test, vana prototüüp) jäävad ainult kohalikku arvutisse.

## 3. Mooduli sisukorra mall (iga tabeli jaoks korduv)

Iga moodul järgib sama struktuuri, mis on laenatud "Depressiooni Trendid" näidisest:

1. **Eyebrow** — väike suurtähtedega silt (nt "EESTI TERVISEUURING · ETU41")
2. **Pealkiri (H1)** — mis andmestikku näidatakse, koos ajavahemikuga
3. **Alapealkiri** — üks lause, mis täpsustab näitajat ja lõikeid
4. **Meta-rida** — uuringuaastad, näitaja tüüp, andmete uuendamise kuupäev
5. **KPI-kaardid** — viimase aasta väärtus(ed) + delta eelmise mõõtmisega võrreldes
6. **Graafik(ud)** — vt tabelipõhised erisused allpool
7. **Callout-tekst** — lühike tõlgendav märkus (vt punkt 4)
8. **Andmetabel** (details/summary taga peidus) — toorandmed
9. **Jalus** — allikaviide TAI andmebaasile, mõistete lühiselgitus

### 3.1 Mooduli kujundusotsused (intervjuu 16.09.2026, etapp 5)

**Järjekord:** eyebrow → pealkiri → alapealkiri → meta-sildid → **filtrid** → **KPI-kaardid** → **callout** →
trendijoonis → tulpdiagramm → andmetabel → jalus.

**Filtrid:**
- Rida kohe meta-siltide all; rippmenüüd (nt Taustatunnus, Vanuserühm). Muutmine laadib andmed kohe,
  eraldi „Rakenda“ nuppu pole.
- **Sugu = ümar lüliti:** Kokku | Mehed | Naised | Mehed vrdl Naised (sõnastus muudetud 17.09.2026). Aktiivne valik tumesinine `#181E54`
  taust + valge kiri (15:1); mitteaktiivsed valge taust, helehall piirjoon, tumesinine kiri.

**KPI-kaardid:**
- Üks kaart seeria kohta (võrdlusel 2): **viimase aasta väärtus + muutus eelmise mõõtmisega** protsendipunktides
  (▲ punane = halvenemine, ▼ roheline = paranemine). Ühe aastaga tabelil (ETU43) ainult väärtus.
- Välimus: valge kaart, helehall piirjoon, number tumesinine Roboto Light suurelt.

**Callout:** sinise tooni `#E4ECFF` taust + 4px keskmise sinise vasakriba, tekst murtud must.
Tekst **genereeritakse automaatselt kuvatud numbritest** (muutub koos filtritega), järgides p. 4 reegleid.

**Trendijoonis:** väärtuse sildid punktidel + tooltip + helehallid abijooned. Seeriad: mehed/ainus seeria
sinine `#4B7DFF`, naised oranž `#f17a29`.

**Tulpdiagramm (taustatunnused):**
- Tulbad **rühmiti** (Rahvus, Haridus, Kooselu, Majanduslik aktiivsus) koos rühmapealkirjadega.
- „Kokku“ **võrdlusjoonena**.
- Valitud taustatunnus tumesinine, ülejäänud keskmine sinine.
- „Mehed vrdl Naised“ režiimis **paaristulbad** (sinine/oranž), valitud taustatunnus rõhutatud paksu sildiga.

**Andmetabel** (`<details>`, vaikimisi suletud): graafikute arvuline sisu praeguste filtritega +
link „Vaata kogu tabelit TAI andmebaasis ↗“. CSV allalaadimist ei ole.

## 4. Sisu toon ja callout-tekstid

Otsus: iga mooduli juurde lisatakse lühike tõlgendav märkus (1-2 lauset), samas vaimus nagu
"Depressiooni Trendid" näidises. Juhised sellise teksti kirjutamiseks:

- Märkus toetub otse kuvatavatele numbritele (nt "Naiste osakaal on kõigis vanuserühmades kõrgem kui
  meestel") — mitte üldistustele, mida andmed otseselt ei kata.
- Ei tehta kliinilisi ega põhjuslikke väiteid (nt mitte "see näitab, et X põhjustab Y") — ainult
  kirjeldav tõlgendus nähtava mustri kohta.
- Üks lühike definitsioon olulise mõiste kohta (nt "olulise depressiooniga" — mida see uuringus
  metoodiliselt tähendab) paigutatakse jalusesse, mitte callout'i, et callout jääks lühikeseks.

## 5. Tabelipõhised erisused

| Tabel | Peagraafik | Erisus |
|---|---|---|
| ETU41 | Trendijoonis (2006/2014/2019) + tulpvõrdlus taustatunnuste lõikes | Baasmall; kujundus p. 3.1 |
| ETU42 | Trendijoonis (2006/2014/2019) soo/vanuse lõikes + vanuserühmade tulbad | Struktuurilt identne ETU41-ga. Vanuserühm on **nii filtris kui tulpades** (valitu esile tõstetud). **Metoodikamärkus trendijoonise all** (2006/2014 vanuserühmad 16+ / 16–24); kui valitud on „15–24“, lisab callout lause, et võrdlus 2014. aastaga on ligikaudne (intervjuu 16.09.2026). |
| ETU43 | **Ainult tulpdiagramm** (soo/vanuserühma lõikes), **ilma trendijooneta** | Andmed ainult 2019. a kohta — trendijoonis pole mõttekas. Taaskasutab sama tulpdiagrammi komponenti, mis on ETU41 juures juba "Taustatunnuste võrdlus" jaoks ehitatud. KPI-kaart näitab ühte hetkeväärtust, mitte delta-muutust (võrdlusaastat pole); **kaardil selgitav rida soovitusliku uneaja kohta**. Soo vaikevalik „Kokku“ nagu teistel tabelitel (intervjuu 16.09.2026). |

## 6. Funktsionaalsed olekud

- **Laadimine**: nupul spinner, kuvamisalas kerge "skeleton" placeholder.
- **Viga (nt CORS)**: selge veatekst koos põhjendusega ja "lae fail üles" varuvariandi väljatoomine
  (vastavalt README-s kirjeldatud tehnilisele lahendusele).
- **Tooltip**: hõljutamisel graafiku elemendil kuvatakse täpne väärtus + kontekst (aasta, kategooria).
- **Tabeli näitamine/peitmine**: `<details>` element, vaikimisi suletud.
- **Ligipääsetavus**: kõik interaktiivsed elemendid klaviatuuriga kasutatavad, fookusindikaatorid
  nähtavad, kontrastsuhe vähemalt WCAG AA tasemel — riigiveebi kontekstis mitte läbiräägitav nõue.

## Järgmine samm

Visuaalse stiili põhiotsused on tehtud (p. 1). Edasi TASKS.md järgi: ETU42/ETU43 API-koodide kontroll
ja CORS-i test GitHub Pagesilt; uued stiiliotsused (kui neid tekib) tehakse jätkuvalt intervjuu kaudu.
