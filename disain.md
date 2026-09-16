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
| `--series-2` | `#f17a29` | lisavärv (oranž) | Graafikute 2. seeria (nt naised) |

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

Master-leht jaguneb kaheks vertikaalseks paneeliks: vasak loendipaneel (~1/3 laiusest, min-width nt 320px)
ja parem kuvamisala (~2/3). Kitsamal ekraanil (mobiil/tahvel) paneelid virnastuvad — loend jääb üleval,
valitud mooduli sisu allpool.

### Vasak loendipaneel
Iga rida sisaldab: tabeli pealkirja (nt "Depressiooni sümptomid"), ühe-lauselist selgitust, allika viidet
väikese lingina, ja "API" nuppu. Valitud/aktiivne rida eristub visuaalselt (vasakservas keskmise sinise
`#4B7DFF` aktsentriba + taust `--sinine-15`). Nupul kolm olekut: vaikimisi ("Laadi andmed"), laadimisel
(spinner/"Laadin..."), veaolekus (punane tekst + "proovi uuesti").

### Parem kuvamisala
Tühjas olekus (enne esimest klõpsu) neutraalne juhistekst ("Vali vasakult andmeallikas"). Valitud mooduli
kuvamisel struktuur järgib alljärgnevat malli.

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
| ETU41 | Trendijoonis (2006/2014/2019) + tulpvõrdlus taustatunnuste lõikes | Baasmall, juba prototüübis olemas |
| ETU42 | Trendijoonis (2006/2014/2019) soo/vanuse lõikes | Struktuurilt identne ETU41-ga (lihtsam, vähem dimensioone) |
| ETU43 | **Ainult tulpdiagramm** (soo/vanuserühma lõikes), **ilma trendijooneta** | Andmed ainult 2019. a kohta — trendijoonis pole mõttekas. Taaskasutab sama tulpdiagrammi komponenti, mis on ETU41 juures juba "Taustatunnuste võrdlus" jaoks ehitatud. KPI-kaart näitab ühte hetkeväärtust, mitte delta-muutust (võrdlusaastat pole). |

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
