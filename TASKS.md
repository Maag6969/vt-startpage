# TAI Vaimse Tervise Näidikulaud — TASKS.md

Ainult **praegune seis, kokku lepitud kava ja lahtised otsad**. Iga uus sessioon alustab sellest failist. Kogu varasem ajalugu (otsused,
intervjuud, avastatud vead) on failis [TASKS-ARHIIV.md](TASKS-ARHIIV.md) ja seda ei kustutata. Ülesehitus: [README.md](README.md),
kujundus: [disain.md](disain.md), Tervisekassa: [TERVISEKASSA.md](TERVISEKASSA.md).

Viimati uuendatud: 06.11.2026. Avaldatud: https://maag6969.github.io/vt-startpage/ (vt `git log`).

## Praegune seis

- **Aruanded (vasaku loendi allikarühmad):** Tervise Arengu Instituut: ETU41 depressiooni sümptomid, ETU42 emotsionaalne distress,
  ETU43 uneaja piisavus. **Tervisekassa (avaandmed):** „Diagnoosid raviandmetes“ (F32/F33, valmis JSON-failid). **Eurostat:** ilc_pw01
  eluga rahulolu.
- **Ühine käitumine:** kõik lõiked on rippmenüüd; rippmenüüde all „Võrdlus“ nupud („Mehed vrdl Naised“ kõigil TAI ja Tervisekassa
  aruannetel, „Vanuserühmad vrdl“ praegu ainult Tervisekassa aruandel); vasak loend on laial ekraanil kleepuv ja uus aruanne avaneb
  alati algusest; lehe jalus ja avalehe tekst võtavad allikate loetelu loendi gruppidest; lehe avamine ei küsi Tervisekassalt midagi.
- **Testid (kohalikud, `tests/` ja `scripts/`):** `tests/regressioon.html` 74/74 (kõik tabelid, filtrid, nupud, lõige, AI-nupud, sünteetiline tabel valikuliste seadetega, „uus aasta ilmub ise“ ja
  värske laadimine päris lehel), `tests/framework-test.html` 25/25, `tests/tervisekassa-test.html` 32/32,
  `scripts/test-tervisekassa.ps1` 76/76. Tervisekassa andmete uuendamine: `scripts/import-tervisekassa.ps1` (vt TERVISEKASSA.md).

## Kava: M3-st ülevõtmine (kokku lepitud 05.11.2026)

Allikas: `../M3_kodutoo_tervishoiu_kvaliteet/M2-SOOVITUSED-M3-parandustest.md` (M3 koodi loetakse ainult lugemiseks, M3 faile siin ei muudeta).

**Reeglid:** (1) **liita funktsioon-funktsiooni haaval, mitte asendada** faile ega töötavaid asju (M2-s on kaks mudelit kõrvuti, Tervisekassa
staatilise andmeharu konksud, võrdlusnupud, kleepuv loend); (2) iga etapp lõpeb regressiooni käivitamisega; (3) valmis ja testitud töö
läheb kohe GitHubi (kasutaja 06.11.2026); (4) kujundusotsused (M3 B-osa, AI-nuppude välimus) alles pärast intervjuud avatud küsimustega; (5) mobiilivaate teemad
tehakse viimasena, seni jäävad meelde.

| # | Etapp | Seis |
|---|---|---|
| 1 | **Dokumendid:** `TASKS.md` lühikeseks, kogu vana sisu `TASKS-ARHIIV.md`-s, kava siia | tehtud 05.11.2026 |
| 2 | **Regressioon (M3 A.8):** `tests/regressioon.html` käib läbi kõik tabelid ja nende nupud/filtrid, kontrollib arve ja vigu | tehtud 05.11.2026, 35/35; käivita iga etapi lõpus (`http://localhost:8080/tests/regressioon.html`, vajab fronditud vahekaarti ja internetti, ~30 s) |
| 3 | **Aastad:** päring „kõik aastad“, `TAI.syncYears` (uus aasta ilmub ise), `TAI.describe` (kohahoidjad `{aastatel}`), aastasiltide hõrendamine (ka kaherealine „2026 (pooleli)“ sildiga), ETU ja Eurostati päringud; **Tervisekassa:** aastad, pooleliolev aasta (= väljavõtte aasta) ja vaikeaastad (viimane täisaasta ja sellele eelnev) tulevad meta-failist (importskript → `config.prepare()`), importskripti `-AllikaUuendus` on kohustuslik | tehtud 05.11.2026, regressioon 40/40. **M3 `TAI.LATEST` jäeti tahtlikult ülevõtmata:** PxWeb `top` andis ETU42 puhul 2006 (tabeli esimese aasta), mitte uusima; viimase aasta valib mudel, Eurostatil `lastTimePeriod=1`. M3 tabelite aastad võivad olla uuemad ees, seal töötab; soovitame M3-s kontrollida |
| 4 | **B.1 valitud lõige:** lõige KPI kastis (üks kaart: kaardi sees; mitu: ühine rida kasti ülaosas), iga graafiku ja andmetabeli pealkirja all, ka vaikevalikuga (kuju „Filter: väärtus · Filter: väärtus“, väike paks kiri nagu M3); vana ülemine rida kadus; võrdlusrežiimis on võrreldav filter nimetatud võrdlusena („Sugu: Mehed vrdl Naised“); tulbal on aasta ja „…lõikes“, oma võrdlustelje filter välja ja valitud rühm „esile tõstetud“ (kasutaja otsused 05.11.2026) | tehtud 05.11.2026, regressioon 45/45 |
| 5 | **Ülejäänud tehniline M3-st:** A.2 ühik, komakohad ja muutuse sõna funktsioonina; A.3 protsenditelje lagi, suuremad telje sammud arvudele, `showTotal`, perioodi järgi sorteerimine; A.4 `limit` (sama „Näita kõiki“ nupp mis `defaultValues`-il); A.5 `countyVar` (M2 `sexVar`/`ageVar` jäid muutmata, need on M3-ga samad); A.6 `taiPath`, `connectGaps`, `periodYears`, `calloutExtra`, `optionLabels`, `responseOnly`, `groups` funktsioonina, `sort: "desc"`. Lisand M3-le: `connectGaps` korral on ka tulbad ja võrdlusrida viimasest olemasolevast aastast; `calloutUnit: false` hoiab Eurostati lause endisena. Juhend `README-NAIDIS.js`-is | tehtud 06.11.2026, regressioon 69/69 (6 uut kontrolli sünteetilise tabeliga). **Tahtlikult üle võtmata:** `reference` joon (M2-l on kasutaja valitud `kpiReference`, 17.09.2026), `siblings`/`familyTitle` (loendi kujundus, vajab intervjuud), `staleLabel` (märgiks ETU tabelid „uuring lõppenud“, sisuline otsus), `TAI.silc` ja `sdmx` (pole veel tabelit, mis vajaks). Vt etapp 8 |
| 6 | **AI-nuppude tööpakett (eraldi):** metoodika [AI-ANALUUS.md](AI-ANALUUS.md) kinnitatud; `js/ai-prompt.js` (ühine juhis, profiilid `etu`/`tervisekassa`/`eurostat`, aastate märkused andmetest), nupud ja klikikäsitleja `js/app.js`-is, tumesinine nupp, loendurid `a-<KOOD>-ai-*`. Regressioonis 18 AI kontrolli | avaldatud 06.11.2026, regressioon 63/63. **Veel lahti:** kolleegid proovivad päris teenustega (AI-ANALUUS.md p. 8; ükski päris AI-vastus pole veel kontrollitud); SharePointi iframe'i kontroll koos SharePointi Embedi otsusega |
| 7 | **Mobiil:** kontrollitud 375 ja 320 px kõigil aruannetel ja võrdlustes. Parandatud: AI- ja võrdlusnupud vähemalt 40 px, tabel 320 px laiusel keritav (oli ära lõigatud). AI-nupud jäävad telefoni (kasutaja otsus): puuteekraanil teade „Kleebi“ (mitte Ctrl+V), teenus avaneb ilma akna mõõtudeta, kopeerimine iOS-i jaoks täiendatud. Sujuv kerimine töötab, printimine kontrollitud Edge'i PDF-iga (4 vaadet; tabel jääb pealkirjaga samale lehele) | tehtud 06.11.2026, regressioon 74/74. **Päris telefonis ja Ctrl+P dialoogiga pole proovitud** (kolleegide test, vt lahtised otsad) |
| 8 | **Edasised tööd planeerida:** ETU41–42 vanuserühmade võrdlus (vana mudel on soo-põhine), Tervisekassa järgmised aruanded (maakonnad, retseptid, kulud, esmased diagnoosid), rahvaarvud ja määrad; vajadusel etapist 5 üle võtmata jäänud M3 osad | pärast 1–7 |

## Lahtised otsad (ei kuulu M3 kavasse)

- **SharePointi Embed** ja **HTML Field Security** (vajab IT/admini): ootel kasutaja otsusel 16.09.2026.
- **Content-Security-Policy** päis: ootel, vajab hoolikat testimist.
- **Abacuse loendurid GoatCounterile** üle viia (kosmeetiline risk).
- **Printimine:** Edge'i PDF-iga kontrollitud (Tervisekassa, selle vanuserühmade võrdlus, ETU41 soovõrdlus, Eurostat; korras); Ctrl+P dialoog ja paber proovimata. **Päris telefon:** AI-nuppude lõikelaud ja rakenduse avanemine proovimata (kolleegide test). **Lingi eelvaade** SharePointis/Teamsis: kontrollida päris keskkonnas; eelvaatel pole pilti (`og:image`).
- **Eurostati riikide tulbas ja tabelis on EL-27 keskmise silt „Kokku“** (KPI-kaardil „EL-27 keskmine“): segadust tekitav, parandada (märgatud 06.11.2026 printimise kontrollis).
- **Tervisekassa andmepäring** Tervisekassale: kasutaja teeb ise, küsimused TERVISEKASSA.md p. 6. Kuni vastuseta pole maakondi, kordumatute
  isikute koondeid mitmele diagnoosile ega määrasid.
- **Abacus:** `ds-TK-diagnoosid`, `a-TK-diagnoosid-allikas` ja `f-TK-diagnoosid-sugu-vordlus` tekkisid vaatamisega ilma halduskoodita
  (teised Tervisekassa loendurid on loodud, halduskoodid `.counter-admin-keys.tsv`-s).
- **Lingi eelvaate tekstid** (`description`, `og:description`) on staatiline HTML: uue allika lisamisel muuda käsitsi.

## Töövihjed (korduvad lõksud)

- **Kataloog on `M2_kodutoo_VTstartpage_demo` (`kodutoo`, mitte `kodutoom`):** `Edit` kukub kokku vale teega, kontrolli enne.
- Pärast JS/CSS muutmist tee brauseris `location.reload()` (hash-navigeerimine laeb vana koodi); kohalik server: `tools/serve.ps1` (port 8080)
  või `preview_start` nimega `static`.
- Brauseripaanis tee vahekaart aktiivseks (`tabs_select`) ja pane viewport käsitsi (`resize_window`), muidu sündmused ja animatsioonid ei käitu
  usaldusväärselt; ühe skripti pikkus alla ~40 s. `file://` lehti näitab paan ainult staatilise tõmmisena: kontrolli Edge'i peitrežiimiga.
- **GitHub Pages ei käivita ehitust pärast push'i alati ise:** `gh api -X POST repos/Maag6969/vt-startpage/pages/builds`, siis oota
  `built` (`gh api repos/Maag6969/vt-startpage/pages/builds/latest`).
- Abacuse `create` annab 429, kui neid teha kiiresti: vähemalt 4 s vahega. Võtmes lubatud ainult tähed, numbrid ja `_ - .`.
- Dataviz-validaatorit saab käivitada brauseris (Node'i pole): kopeeri skript ajutiselt `tests/` kausta (gitignore) ja `import()`; kustuta pärast.
- Eesti jutumärgid JS stringides: „avav“ + sulgev “ (U+201C), mitte sirge `"`.
- Kerimiskinnitus (`overflow-anchor`) lõhub aruande vahetamisel kerimist: peab jääma `html { overflow-anchor: none }`.
- `tests/`, `tools/` ja `.counter-admin-keys.tsv` on `.gitignore`-s, avalikku repo ei lähe. `data/tervisekassa/raw/` xlsx-failid lähevad (kasutaja otsus).
- Ära klõpsa testides AI-nuppe ilma `window.open` asenduseta: need avavad välise saidi (regressioon asendab selle ise).
- **Brauseripaani iframe'is sujuv kerimine ei liigu üldse** (ka nähtavas), ülemisel tasemel liigub: `smoothScrollTo` hüppab 400 ms pärast kohale, kui leht pole liikuma hakanud. Telefoni laiust testitakse iframe'i kitsendamisega; puuteekraani asendab `matchMedia`.
- **Prindi kontroll ilma dialoogita:** `msedge --headless=new --print-to-pdf=<fail> --virtual-time-budget=9000 --user-data-dir=<ajutine> <aadress>`, siis loe PDF-i.
- **Tervisekassa uus väljavõte:** vt TERVISEKASSA.md p. 8 (`-AllikaUuendus` kohustuslik; aastad ja pooleliolev aasta tulevad failidest).
- **Regressiooni üksik „NetworkError: Failed to fetch“** tuli 06.11.2026 kahes jooksus ligi kümnest ega kordunud järgmises jooksus; ühel korral jäi ETU41 selle tõttu laadimata ja kukkus läbi ka filtrite test. Käivita uuesti, enne kui koodi kahtlustad (täpne põhjus teadmata; testid teevad palju päringuid järjest).
- **Eesti arvuvorming:** neljakohaline arv on ilma tühikuta (`1235`), tühik alates viiest kohast (`12 346`).
- **Regressioonitestis avatakse aruanded loendi rea klõpsuga, mitte aadressi otse muutes:** `#KOOD` ilma parameetriteta lähtestab selle aruande
  valikud (nii on tahtlikult), loendi rida hoiab need alles.
- Intervjueeri kasutajat avatud küsimustega, kui otsus on päriselt lahtine; täpse spetsifikatsiooni korral rakenda otse.

## Dokumentide kihid

`README.md` ülesehitus ja failid · `TASKS.md` praegune seis ja kava · `TASKS-ARHIIV.md` kogu ajalugu · `disain.md` kujundus · `TERVISEKASSA.md`
Tervisekassa allikarühma reeglid ja kontrollarvud · `AI-ANALUUS.md` AI-nuppude metoodika · `ETAPP2-JUHIS.md` ajalooline juhis · `js/tables/README-NAIDIS.js` uue tabeli konfiguratsiooni mall.
