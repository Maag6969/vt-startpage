# TAI Vaimse Tervise Näidikulaud — Disain.md

Selles failis on kirjas visuaalsed, sisulised ja funktsionaalsed otsused, mis täiendavad README.md-s
kirjeldatud tehnilist arhitektuuri. README vastab küsimusele "millised andmed ja kuidas need liiguvad",
disain.md vastab küsimusele "kuidas see kasutajale välja näeb ja milline jutt numbrite ümber käib".

> **Arhitektuuri põhimõte (vt README.md "Põhimõte: ei mingeid isiklikke tokeneid/mandaate lahenduses"):**
> lahendus ei tohi külastajate teenindamiseks kasutada kasutaja isiklikke API-võtmeid ega kontosid — kõik
> andmepäringud käivad külastaja enda brauserist avalikesse, autentimist mittevajavatesse teenustesse.

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

**Valitud lõige (kasutaja otsus 05.11.2026, ülevõetud M3-st; asendab 18.09.2026 reegli „näita ainult siis, kui filter erineb vaikeväärtusest“):**
KPI kastis ning iga joonise ja andmetabeli pealkirja all on **alati** (ka vaikevalikuga, nt „Sugu: Kokku“) näha, milliste valikute alusel
numbrid kuvatakse. Kuju „Filtri nimi: väärtus · Filtri nimi: väärtus“, väiksem paks kiri (0,8 rem, 700, sekundaarne tekst). Üks KPI-kaart:
rida kaardi sees sildi all; mitu kaarti: üks rida ühise kasti ülaosas. Võrdlusrežiimis on võrreldav filter nimetatud võrdlusena
(„Sugu: Mehed vrdl Naised“, „Vanuserühm: Vanuserühmad vrdl“), sest see on selle graafiku valik. Tulpdiagrammil on rida „2025. aasta,
vanuserühmades · …“, tulpade enda võrdlustelje filter on välja jäetud (tulpades on kõik rühmad) ja valitud rühm on „esile tõstetud: …“.
Tervisekassa aruandes on aastafiltrid lõikest välja jäetud (`sliceSkip`), sest aasta on juba KPI sildil, muutuse reas ja tulpdiagrammi lõikes;
KPI silt on seal ainult „Eesti“ + see, mis kaarte eristab. Vana ülemine rida „Valitud lõige — …“ kadus.

**Kerimine (laial ekraanil, kasutaja soov 05.11.2026):** leht kerib tervikuna (mitte kaks eraldi kerivat akent: parem printimisel,
klaviatuuriga, iframe'is ja mobiilis). Vasak loend on **kleepuv** (`position: sticky`, kõrgus kuni ekraani kõrguseni, vajadusel
kerib ise), nii et aruande lugemise ajal on teised aruanded kohe valitavad. Uue aruande valimisel keritakse leht selle algusesse,
kui eelmise aruande lugemine on selle algusest mööda kerinud.

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
„Avaandmed pärinevad järgmistest andmeallikatest: Tervise Arengu Instituut, Tervisekassa, Eurostat“ (kasutaja sõnastus
05.11.2026). Loetelu tuleb vasaku loendi gruppidest (`TAI.getSources()`, sama allikas mis avalehe tekst), seega uus allikas
lisandub jaluses ja avalehel ise. Allika nimi on jaluses link allika avalehele; lühike nimi ja link tulevad `TAI.GROUP_INFO`-st.

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
- **Kõik lõiked, sh Sugu, on rippmenüüd** (kasutaja otsus 05.11.2026, varasem ümar soo lüliti asendati); igal aruandel on oma
  lõiked `config.filters` järjekorras. Sugu menüü: Kokku | Mehed | Naised.
- **„Võrdlus“ nupud rippmenüüde all:** eraldi rida sildiga „Võrdlus“ ja nuppudega rühmasisesteks võrdlusteks. Praegu on üks nupp,
  **Mehed vrdl Naised** (ETU41–43, Tervisekassa). Aktiivne nupp tumesinine `#181E54` taust + valge kiri (15:1), mitteaktiivne valge
  taust, helehall piirjoon, tumesinine kiri; nupp on lüliti (`aria-pressed`). Kui võrdlus on sees, näitab Sugu menüü rida
  „Mehed vrdl Naised“; mõne soo valimine menüüst lülitab võrdluse välja. Aadress ja kasutusstatistika võtmed (`sugu=vordlus`,
  `f-<KOOD>-sugu-vordlus`) jäid samaks. Eurostati aruandel soo võrdlust pole, seega nuppu seal pole.
- **Vanuserühmade võrdlus** (nupp „Vanuserühmad vrdl“ samal real; kasutaja otsused 05.11.2026): praegu **ainult Tervisekassa aruandes**
  (ETU41–42 hiljem, kui disain sobib; ETU43-l pole aastatrendi, Eurostatil on riigipõhine mudel). **Üks võrdlus korraga:** soo
  nupp lülitab vanuse nupu välja ja vastupidi. Vanuse menüü näitab võrdluse ajal rida „Vanuserühmad vrdl“; valitud sugu piirab
  (nt mehed), aadress `vanus=vordlus`, statistika `f-TK-diagnoosid-vanus-vordlus`. Trendigraafikul iga vanuserühm oma joon,
  KPI-kaart iga rühma kohta, **vanuserühmade tulpdiagramm peidetakse** (sama info on joontel ja kaartidel), joonte punktisildid
  jäetakse ära (üle kahe seeria kattuvad), väärtused on tooltipis, kaartidel ja tabelis. Callout nimetab rühmade väärtused ning
  rühmad, kus muutus oli absoluutarvuna ja suhteliselt suurim (hinnanguta).
- **Vanuserühmade värvid** (SoM lisavärvid tumendatud, kasutaja valik 05.11.2026; tokenid `--age-1…5` failis `css/styles.css`):
  0–18 oranž `#d4621a`, 19–24 helesinine `#2a8fd1`, 25–34 kollane `#b88a00`, 35–64 **lilla `#7c3fbf`**, 65+ heleroheline
  `#4e9a3a`. **Lilla on kasutaja soov 05.11.2026** (alguses oli 35–64 keskmine sinine `#4B7DFF`, aga kaks sinist oleks olnud
  eristamatud); SoM paletis lillat pole, see on teadlik erand ja kehtib läbivalt kõigis aruannetes, kus vanuserühmi võrreldakse.
  Kontrollitud dataviz-validaatoriga valgel taustal: kontrast ≥ 3,15:1 (lilla 6,3:1), kõrvuti olevate värvide halvim
  värvipimeduse ΔE 23,8 ja tavanägemisel 26,6 (nõue ≥ 8 ja ≥ 15); lilla eristub helesinisest värvipimedusel ΔE 12,3 ja
  tavanägemisel 20,3. **Piirang:** kõigi paaride kontroll ei läbiks (nt kollane ja roheline on protaanipimedusel sarnased),
  seega värv ei ole ainus eristaja: legend, tooltip, KPI-kaardid (rühm nimes) ja andmetabel on kõik olemas. SoM-i algsed tumeroheline `#677c36` ja tumesinine `#181E54` ei läbinud (liiga madal kroom või lightness). Järjekord
  on fikseeritud ja värv järgib rühma, mitte järjekorda.

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
| Tervisekassa: Diagnoosid raviandmetes | Trendijoonis 2021–2026 + vanuserühmade tulbad | Andmed valmis JSON-failidest (TERVISEKASSA.md). Vasaku loendi rida on sama mis teistel allikatel (silti „Ava aruanne“ ei kasutata; kasutaja otsus 05.11.2026), allika nimi **„Tervisekassa (avaandmed)“**. **2026 trendil katkendjoon ja seest tühi punkt**, telje silt „2026 (pooleli)“ (intervjuu 05.11.2026). KPI muutus neutraalses värvis, sest kasv ei tähenda halvenemist. Tulpadel koondi võrdlusjoont pole, koond on tabelis. |

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
